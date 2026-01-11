import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import configuration from './config/configuration';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PackagesModule } from './packages/packages.module';
import { PaymentsModule } from './payments/payments.module';
import { SessionsModule } from './sessions/sessions.module';
import { ReportsModule } from './reports/reports.module';
import { FinancialSummaryModule } from './financial-summary/financial-summary.module';
import { BackupModule } from './backup/backup.module';

import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';

// import { RolesGuard } from './common/guards/roles.guard';

import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './common/health/health.module';

import { GracefulShutdownService } from './common/shutdown/graceful-shutdown.service';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ApiHardeningMiddleware } from './common/middleware/api-hardening.middleware';
import { SecurityModule } from './common/security/security.module';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { MetricsModule } from './common/metrics/metrics.module';
import { MaintenanceInterceptor } from './common/maintenance/maintenance.interceptor';
import { ShutdownInterceptor } from './common/shutdown/shutdown.interceptor';
import { MaintenanceModule } from './common/maintenance/maintenance.module';
import { ShutdownModule } from './common/shutdown/shutdown.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { AdminSetupModule } from './admin-setup/admin-setup.module';

@Module({
  imports: [
    SecurityModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    LoggerModule,
    AuditModule,
    MaintenanceModule,
    ShutdownModule,
    DatabaseModule,
    AuthModule,
    PatientsModule,
    DoctorsModule,
    PackagesModule,
    PaymentsModule,
    SessionsModule,
    ReportsModule,
    FinancialSummaryModule,
    BackupModule,
    HealthModule,
    MetricsModule,
    IdempotencyModule,
    AdminSetupModule,
  ],

  providers: [
    GracefulShutdownService,

    // ✅ Guards
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },

    // ✅ Global error handling
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    { 
      provide: APP_INTERCEPTOR, 
      useClass: MaintenanceInterceptor 
    },
    {
      provide: APP_INTERCEPTOR, 
      useClass: ShutdownInterceptor 
    },
    {
    provide: APP_INTERCEPTOR,
    useClass: PerformanceInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, ApiHardeningMiddleware)
      .forRoutes('*');
  }
}
