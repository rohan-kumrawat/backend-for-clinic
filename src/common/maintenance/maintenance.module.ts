import { Module, Global } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceInterceptor } from './maintenance.interceptor';
import { MaintenanceController } from './maintenance.controller';
import { AuditModule } from '../audit/audit.module';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [AuditModule, LoggerModule],
  providers: [MaintenanceService, MaintenanceInterceptor],
  controllers: [MaintenanceController],
  exports: [MaintenanceService, MaintenanceInterceptor],
})
export class MaintenanceModule {}
