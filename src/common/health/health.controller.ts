import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';
import { LoggerService } from '../logger/logger.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  @Get('liveness')
  @HealthCheck()
  async liveness() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'clinic-backend',
    };
  }

  @Get('readiness')
  @HealthCheck()
  async readiness() {
    const startTime = Date.now();

    const checks = await this.health.check([
      // Database connectivity
      () => this.db.pingCheck('database', { connection: this.dataSource }),
      
      // Memory health
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB threshold
           
      // Custom application health checks
      () => this.checkAppReadiness(),
    ]);

    const durationMs = Date.now() - startTime;

    this.logger.info('Readiness check completed', {
      module: 'Health',
      action: 'READINESS_CHECK',
      durationMs,
      status: checks.status,
    });

    return {
      ...checks,
      timestamp: new Date().toISOString(),
      durationMs,
    };
  }

  

  private async checkAppReadiness(): Promise<HealthIndicatorResult> {
    try {
      // Check if app is in read-only mode
      const isReadOnly = process.env.APP_READ_ONLY === 'true';
      
      // Check if graceful shutdown is in progress
      // (In a real implementation, you would inject GracefulShutdownService)

      return {
        application: {
          status: 'up',
          mode: isReadOnly ? 'read-only' : 'read-write',
          uptime: process.uptime(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
        },
      };
    } catch (error) {
        const err = error as Error;
      return {
        application: {
          status: 'down',
          message: err.message,
        },
      };
    }
  }
}