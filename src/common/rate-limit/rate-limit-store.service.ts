import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ABUSE_DETECTION_CONFIG, RateLimitConfig } from '../config/rate-limit.config';

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  blockedUntil?: number;
}

interface AbuseDetectionRecord {
  attempts: number;
  firstAttempt: number;
  ips: Set<string>;
}

@Injectable()
export class RateLimitStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitStoreService.name);
  
  // In-memory stores
  private readonly ipStore = new Map<string, Map<string, RateLimitRecord>>();
  private readonly usernameStore = new Map<string, AbuseDetectionRecord>();
  private readonly blockedIps = new Map<string, number>();
  
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async checkRateLimit(
    key: string,
    profile: RateLimitConfig,
  ): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    const now = Date.now();
    const windowMs = profile.windowSeconds * 1000;
    
    // Check if IP is blocked
    const blockedUntil = this.blockedIps.get(key);
    if (blockedUntil && blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        reset: blockedUntil,
      };
    }

    let record = this.ipStore.get(key);
    if (!record) {
      record = new Map();
      this.ipStore.set(key, record);
    }

    const endpointKey = `${profile.windowSeconds}-${profile.maxRequests}`;
    let endpointRecord = record.get(endpointKey);

    if (!endpointRecord || now - endpointRecord.firstRequest > windowMs) {
      // New window
      endpointRecord = {
        count: 1,
        firstRequest: now,
      };
      record.set(endpointKey, endpointRecord);
    } else {
      // Existing window
      endpointRecord.count++;
    }

    const remaining = Math.max(0, profile.maxRequests - endpointRecord.count);
    const reset = endpointRecord.firstRequest + windowMs;

    if (endpointRecord.count > profile.maxRequests) {
      // Block the IP
      const blockUntil = now + (profile.blockDurationSeconds * 1000);
      this.blockedIps.set(key, blockUntil);
      
      // Clear the record to prevent immediate retry after block expires
      record.delete(endpointKey);
      
      return {
        allowed: false,
        remaining: 0,
        reset: blockUntil,
      };
    }

    return {
      allowed: true,
      remaining,
      reset,
    };
  }

  async trackAuthAttempt(
    ip: string,
    username: string,
    config: typeof ABUSE_DETECTION_CONFIG,
  ): Promise<{ allowed: boolean; blockUntil?: number }> {
    const now = Date.now();
    const windowMs = config.DETECTION_WINDOW_MINUTES * 60 * 1000;

    // Check IP attempts
    const ipKey = `auth-${ip}`;
    const ipResult = await this.checkRateLimit(ipKey, {
      windowSeconds: config.DETECTION_WINDOW_MINUTES * 60,
      maxRequests: config.MAX_ATTEMPTS_PER_IP,
      blockDurationSeconds: 0, // We'll handle blocking separately
    });

    if (!ipResult.allowed) {
      return { allowed: false };
    }

    // Check username attempts
    let userRecord = this.usernameStore.get(username);
    if (!userRecord || now - userRecord.firstAttempt > windowMs) {
      userRecord = {
        attempts: 1,
        firstAttempt: now,
        ips: new Set([ip]),
      };
      this.usernameStore.set(username, userRecord);
    } else {
      userRecord.attempts++;
      userRecord.ips.add(ip);
    }

    if (userRecord.attempts > config.MAX_ATTEMPTS_PER_USERNAME) {
      // Account-level protection triggered
      const blockUntil = now + (config.ACCOUNT_LOCK_MINUTES * 60 * 1000);
      
      // Clear attempts to prevent immediate retry
      this.usernameStore.delete(username);
      
      return {
        allowed: false,
        blockUntil,
      };
    }

    return { allowed: true };
  }

  async blockIp(ip: string, durationMs: number): Promise<void> {
    const blockUntil = Date.now() + durationMs;
    this.blockedIps.set(ip, blockUntil);
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const blockUntil = this.blockedIps.get(ip);
    return blockUntil ? blockUntil > Date.now() : false;
  }

  getBlockedUntil(ip: string): number | null {
    const blockUntil = this.blockedIps.get(ip);
    return blockUntil && blockUntil > Date.now() ? blockUntil : null;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean blocked IPs
    for (const [ip, blockUntil] of this.blockedIps.entries()) {
      if (blockUntil <= now) {
        this.blockedIps.delete(ip);
        cleaned++;
      }
    }

    // Clean IP store (remove old windows)
    for (const [ip, records] of this.ipStore.entries()) {
      for (const [key, record] of records.entries()) {
        const [windowSeconds] = key.split('-').map(Number);
        if (now - record.firstRequest > windowSeconds * 1000) {
          records.delete(key);
          cleaned++;
        }
      }
      if (records.size === 0) {
        this.ipStore.delete(ip);
      }
    }

    // Clean username store
    for (const [username, record] of this.usernameStore.entries()) {
      const windowMs = ABUSE_DETECTION_CONFIG.DETECTION_WINDOW_MINUTES * 60 * 1000;
      if (now - record.firstAttempt > windowMs) {
        this.usernameStore.delete(username);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit records`);
    }
  }

  getStats(): {
    blockedIps: number;
    trackedIps: number;
    trackedUsernames: number;
  } {
    return {
      blockedIps: this.blockedIps.size,
      trackedIps: this.ipStore.size,
      trackedUsernames: this.usernameStore.size,
    };
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}