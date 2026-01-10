import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuditService } from '../audit/audit.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(ShutdownService.name);

  private shuttingDown = false;
  private activeRequests = 0;
  private shutdownStartedAt: number | null = null;

  private readonly GRACEFUL_TIMEOUT = 30_000;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly auditService: AuditService,
    private readonly loggerService: LoggerService,
  ) {
    this.registerSignals();
  }

  private registerSignals() {
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, async () => {
        if (this.shuttingDown) return;
        await this.startShutdown(signal);
      });
    });
  }

  async startShutdown(signal: string) {
    this.shuttingDown = true;
    this.shutdownStartedAt = Date.now();

    await this.auditService.log({
  actorId: null,
  actorRole: null,
  action: 'SYSTEM_SHUTDOWN_INITIATED',
  entity: 'SYSTEM',
  method: 'SYSTEM',
  endpoint: 'SYSTEM',
  statusCode: 200,
  requestData: {
    signal,
  },
});


    this.loggerService.warn('Graceful shutdown started', {
      signal,
      activeRequests: this.activeRequests,
    });

    await this.waitForRequests();
    await this.closeResources();

    process.exit(0);
  }

  private async waitForRequests() {
    const start = Date.now();

    while (this.activeRequests > 0) {
      if (Date.now() - start > this.GRACEFUL_TIMEOUT) {
        this.logger.warn('Graceful timeout exceeded', {
          activeRequests: this.activeRequests,
        });
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  private async closeResources() {
    try {
      const dataSource = this.moduleRef.get<any>('DataSource', { strict: false });
      if (dataSource?.isInitialized) {
        await dataSource.destroy();
      }
    } catch (e) {
      this.logger.warn('DB close skipped');
    }

    await this.auditService.log({
  actorId: null,
  actorRole: null,
  action: 'SYSTEM_SHUTDOWN_COMPLETED',
  entity: 'SYSTEM',
  method: 'SYSTEM',
  endpoint: 'SYSTEM',
  statusCode: 200,
  requestData: {
    durationMs: Date.now() - (this.shutdownStartedAt ?? Date.now()),
  },
});



  }

  trackStart() {
    if (this.shuttingDown) {
      throw new Error('SHUTTING_DOWN');
    }
    this.activeRequests++;
  }

  trackEnd() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  isShutdownInProgress() {
    return this.shuttingDown;
  }

  getActiveRequests() {
    return this.activeRequests;
  }

  onModuleDestroy() {
    this.logger.debug('Shutdown module destroyed');
  }
}
