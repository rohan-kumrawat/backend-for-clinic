import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  private readonly logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
      service: 'clinic-backend',
      environment: process.env.NODE_ENV || 'development',
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  });

  info(message: string, meta?: Record<string, any>) {
    this.logger.info(meta ?? {}, message);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.logger.warn(meta ?? {}, message);
  }

  error(message: string, meta?: Record<string, any>) {
    this.logger.error(meta ?? {}, message);
  }
}
