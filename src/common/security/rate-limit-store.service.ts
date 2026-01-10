import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RateLimitProfile } from '../config/security.config';
import { LoggerService } from '../logger/logger.service';

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blockedUntil?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blockDuration?: number;
  reason?: string;
}

@Injectable()
export class RateLimitStoreService implements OnModuleDestroy {
  private readonly ipStore = new Map<string, Map<string, RateLimitRecord>>();
  private readonly userStore = new Map<string, Map<string, RateLimitRecord>>();
  private readonly blockedIPs = new Map<string, number>();
  private readonly blockedUsers = new Map<string, number>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private readonly logger: LoggerService) {
    this.startCleanupJob();
  }

  async checkRateLimit(
    identifier: string,
    key: string,
    profile: RateLimitProfile,
    type: 'ip' | 'user',
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const store = type === 'ip' ? this.ipStore : this.userStore;
    const blockedStore = type === 'ip' ? this.blockedIPs : this.blockedUsers;

    // Check if blocked
    const blockedUntil = blockedStore.get(identifier);
    if (blockedUntil && blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockedUntil,
        blockDuration: blockedUntil - now,
        reason: 'BLOCKED',
      };
    }

    let recordMap = store.get(identifier);
    if (!recordMap) {
      recordMap = new Map();
      store.set(identifier, recordMap);
    }

    const recordKey = `${profile.windowMs}-${profile.maxRequests}`;
    let record = recordMap.get(recordKey);

    if (!record || now - record.firstRequest > profile.windowMs) {
      // New time window
      record = {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      };
      recordMap.set(recordKey, record);
    } else {
      // Existing window
      record.count++;
      record.lastRequest = now;
    }

    const remaining = Math.max(0, profile.maxRequests - record.count);
    const resetTime = record.firstRequest + profile.windowMs;

    if (record.count > profile.maxRequests) {
      // Block the identifier
      const blockUntil = now + profile.blockDurationMs;
      if (type === 'ip') {
        this.blockedIPs.set(identifier, blockUntil);
      } else {
        this.blockedUsers.set(identifier, blockUntil);
      }

      // Clear the record to prevent immediate retry after block
      recordMap.delete(recordKey);

      this.logger.warn('Rate limit exceeded, temporary block applied', {
        module: 'RateLimitStore',
        action: 'RATE_LIMIT_BLOCK',
        identifier,
        type,
        key,
        count: record.count,
        maxRequests: profile.maxRequests,
        blockDurationMs: profile.blockDurationMs,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: blockUntil,
        blockDuration: profile.blockDurationMs,
        reason: 'RATE_LIMIT_EXCEEDED',
      };
    }

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  }

  async applyProgressivePenalty(
    identifier: string,
    key: string,
    baseProfile: RateLimitProfile,
    penaltyLevel: number,
    type: 'ip' | 'user',
  ): Promise<RateLimitProfile> {
    if (penaltyLevel === 0) {
      return baseProfile;
    }

    // Apply progressive tightening
    const penaltyMultiplier = Math.pow(0.5, penaltyLevel); // Halve limit each level
    const penaltyDivisor = penaltyLevel + 1; // Increase block duration

    const penalizedProfile: RateLimitProfile = {
      windowMs: baseProfile.windowMs,
      maxRequests: Math.max(1, Math.floor(baseProfile.maxRequests * penaltyMultiplier)),
      blockDurationMs: baseProfile.blockDurationMs * penaltyDivisor,
    };

    this.logger.warn('Progressive penalty applied', {
      module: 'RateLimitStore',
      action: 'PROGRESSIVE_PENALTY',
      identifier,
      type,
      key,
      penaltyLevel,
      originalMax: baseProfile.maxRequests,
      penalizedMax: penalizedProfile.maxRequests,
      originalBlock: baseProfile.blockDurationMs,
      penalizedBlock: penalizedProfile.blockDurationMs,
    });

    return penalizedProfile;
  }

  blockIdentifier(
    identifier: string,
    durationMs: number,
    type: 'ip' | 'user',
    reason: string,
  ): void {
    const blockUntil = Date.now() + durationMs;
    const store = type === 'ip' ? this.blockedIPs : this.blockedUsers;
    
    store.set(identifier, blockUntil);

    this.logger.warn('Identifier blocked', {
      module: 'RateLimitStore',
      action: 'IDENTIFIER_BLOCKED',
      identifier,
      type,
      durationMs,
      reason,
      blockUntil: new Date(blockUntil).toISOString(),
    });
  }

  isBlocked(identifier: string, type: 'ip' | 'user'): boolean {
    const store = type === 'ip' ? this.blockedIPs : this.blockedUsers;
    const blockedUntil = store.get(identifier);
    return blockedUntil ? blockedUntil > Date.now() : false;
  }

  getBlockedUntil(identifier: string, type: 'ip' | 'user'): number | null {
    const store = type === 'ip' ? this.blockedIPs : this.blockedUsers;
    const blockedUntil = store.get(identifier);
    return blockedUntil && blockedUntil > Date.now() ? blockedUntil : null;
  }

  clearBlock(identifier: string, type: 'ip' | 'user'): void {
    const store = type === 'ip' ? this.blockedIPs : this.blockedUsers;
    store.delete(identifier);

    this.logger.info('Identifier block cleared', {
      module: 'RateLimitStore',
      action: 'BLOCK_CLEARED',
      identifier,
      type,
    });
  }

  getStats(): {
    blockedIPs: number;
    blockedUsers: number;
    trackedIPs: number;
    trackedUsers: number;
  } {
    const now = Date.now();
    
    // Clean expired blocks while counting
    let activeBlockedIPs = 0;
    for (const [ip, until] of this.blockedIPs.entries()) {
      if (until > now) {
        activeBlockedIPs++;
      } else {
        this.blockedIPs.delete(ip);
      }
    }

    let activeBlockedUsers = 0;
    for (const [user, until] of this.blockedUsers.entries()) {
      if (until > now) {
        activeBlockedUsers++;
      } else {
        this.blockedUsers.delete(user);
      }
    }

    return {
      blockedIPs: activeBlockedIPs,
      blockedUsers: activeBlockedUsers,
      trackedIPs: this.ipStore.size,
      trackedUsers: this.userStore.size,
    };
  }

  private startCleanupJob(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords();
    }, 5 * 60 * 1000);
  }

  private cleanupOldRecords(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean IP store
    for (const [ip, records] of this.ipStore.entries()) {
      for (const [key, record] of records.entries()) {
        const [windowMs] = key.split('-').map(Number);
        if (now - record.lastRequest > windowMs * 2) { // Keep for 2 windows
          records.delete(key);
          cleaned++;
        }
      }
      if (records.size === 0) {
        this.ipStore.delete(ip);
      }
    }

    // Clean user store
    for (const [user, records] of this.userStore.entries()) {
      for (const [key, record] of records.entries()) {
        const [windowMs] = key.split('-').map(Number);
        if (now - record.lastRequest > windowMs * 2) {
          records.delete(key);
          cleaned++;
        }
      }
      if (records.size === 0) {
        this.userStore.delete(user);
      }
    }

    if (cleaned > 0) {
      this.logger.info('Cleaned up old rate limit records', {
        module: 'RateLimitStore',
        action: 'RATE_LIMIT_CLEANUP',
        cleaned,
      });
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}