import { Module, Global } from '@nestjs/common';
import { ShutdownService } from './shutdown.service';
import { ShutdownInterceptor } from './shutdown.interceptor';
import { AuditModule } from '../audit/audit.module';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [AuditModule, LoggerModule],
  providers: [ShutdownService, ShutdownInterceptor],
  exports: [ShutdownService, ShutdownInterceptor],
})
export class ShutdownModule {}
