import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitStoreService } from './rate-limit-store.service';
import { SecurityMetricsService } from './security-metrics.service';
import { AbuseDetectionInterceptor } from '../interceptors/abuse-detention.interceptor';
import { RateLimitInterceptor } from '../interceptors/rate-limit.interceptor';

@Global()
@Module({
  providers: [
    RateLimitStoreService,
    SecurityMetricsService,

    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AbuseDetectionInterceptor,
    },
  ],
  exports: [
    RateLimitStoreService,
    SecurityMetricsService,
  ],
})
export class SecurityModule {}
