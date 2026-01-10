import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { SECURITY_CONFIG } from '../config/security.config';

interface SecurityMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

interface OffenseRecord {
  count: number;
  firstOffense: number;
  lastOffense: number;
  penaltyLevel: number;
}

@Injectable()
export class SecurityMetricsService implements OnModuleDestroy {
  private metrics: Map<string, SecurityMetric[]> = new Map();
  private offenseStore: Map<string, Map<string, OffenseRecord>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(private readonly logger: LoggerService) {
    this.initializeMetrics();
    this.startCleanupJob();
  }

  private initializeMetrics(): void {
    const baseMetrics = [
      { name: 'rate_limit_hits', value: 0, timestamp: Date.now() },
      { name: 'auth_abuse_detected', value: 0, timestamp: Date.now() },
      { name: 'ip_blocked', value: 0, timestamp: Date.now() },
      { name: 'user_blocked', value: 0, timestamp: Date.now() },
      { name: 'payload_size_violations', value: 0, timestamp: Date.now() },
      { name: 'method_violations', value: 0, timestamp: Date.now() },
      { name: 'content_type_violations', value: 0, timestamp: Date.now() },
      { name: 'failed_logins', value: 0, timestamp: Date.now() },
      { name: 'password_reset_attempts', value: 0, timestamp: Date.now() },
    ];

    baseMetrics.forEach(metric => {
      this.metrics.set(metric.name, [metric]);
    });
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const now = Date.now();
    const metricList = this.metrics.get(name) || [];
    
    if (metricList.length === 0) {
      metricList.push({ name, value: 1, labels, timestamp: now });
    } else {
      const lastMetric = metricList[metricList.length - 1];
      lastMetric.value += 1;
      lastMetric.timestamp = now;
    }
    
    this.metrics.set(name, metricList);
  }

  recordOffense(identifier: string, type: string): OffenseRecord {
    let typeMap = this.offenseStore.get(identifier);
    if (!typeMap) {
      typeMap = new Map();
      this.offenseStore.set(identifier, typeMap);
    }

    let record = typeMap.get(type);
    const now = Date.now();

    if (!record) {
      record = {
        count: 1,
        firstOffense: now,
        lastOffense: now,
        penaltyLevel: 0,
      };
    } else {
      record.count += 1;
      record.lastOffense = now;
      
      // Increment penalty level if enough time hasn't passed
      const timeSinceFirst = now - record.firstOffense;
      if (timeSinceFirst < 24 * 60 * 60 * 1000) { // 24 hours
        record.penaltyLevel = Math.min(
          record.penaltyLevel + 1,
          SECURITY_CONFIG.abuseDetection.progressivePenaltySteps
        );
      } else {
        // Reset after 24 hours
        record.firstOffense = now;
        record.count = 1;
        record.penaltyLevel = 0;
      }
    }

    typeMap.set(type, record);
    
    // Log the offense
    this.logger.warn('Security offense recorded', {
      module: 'SecurityMetrics',
      action: 'OFFENSE_RECORDED',
      identifier,
      offenseType: type,
      count: record.count,
      penaltyLevel: record.penaltyLevel,
    });

    return record;
  }

  getOffenseRecord(identifier: string, type: string): OffenseRecord | null {
    const typeMap = this.offenseStore.get(identifier);
    if (!typeMap) return null;
    
    const record = typeMap.get(type);
    if (!record) return null;

    // Check if record is stale (older than 24 hours)
    const now = Date.now();
    if (now - record.firstOffense > 24 * 60 * 60 * 1000) {
      typeMap.delete(type);
      return null;
    }

    return record;
  }

  clearOffenses(identifier: string, type?: string): void {
    if (type) {
      const typeMap = this.offenseStore.get(identifier);
      if (typeMap) {
        typeMap.delete(type);
      }
    } else {
      this.offenseStore.delete(identifier);
    }
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        result[name] = {
          value: latest.value,
          labels: latest.labels,
          timestamp: new Date(latest.timestamp).toISOString(),
        };
      }
    }

    // Count active offense records
    let activeOffenses = 0;
    for (const typeMap of this.offenseStore.values()) {
      activeOffenses += typeMap.size;
    }
    
    result.active_offenses = { value: activeOffenses, timestamp: new Date().toISOString() };

    return result;
  }

  getSecuritySummary(): {
    totalRateLimitHits: number;
    totalAuthAbuse: number;
    totalBlocks: number;
    activeOffenses: number;
  } {
    const metrics = this.getMetrics();
    
    return {
      totalRateLimitHits: metrics.rate_limit_hits?.value || 0,
      totalAuthAbuse: metrics.auth_abuse_detected?.value || 0,
      totalBlocks: (metrics.ip_blocked?.value || 0) + (metrics.user_blocked?.value || 0),
      activeOffenses: metrics.active_offenses?.value || 0,
    };
  }

  private startCleanupJob(): void {
    // Clean up every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

    // Clean old offense records
    for (const [identifier, typeMap] of this.offenseStore.entries()) {
      for (const [type, record] of typeMap.entries()) {
        if (now - record.lastOffense > 24 * 60 * 60 * 1000) {
          typeMap.delete(type);
        }
      }
      if (typeMap.size === 0) {
        this.offenseStore.delete(identifier);
      }
    }

    // Clean old metrics (keep only last 1000 per metric)
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length > 1000) {
        this.metrics.set(name, metrics.slice(-1000));
      }
    }

    this.logger.info('Cleaned up old security data', {
      module: 'SecurityMetrics',
      action: 'SECURITY_CLEANUP',
      remainingOffenses: this.offenseStore.size,
    });
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}