import { Module } from '@nestjs/common';
import { RateLimitStoreService } from './rate-limit-store.service';
import { RateLimitController } from './rate-limit.controller';

@Module({
  controllers: [RateLimitController],
  providers: [RateLimitStoreService],
  exports: [RateLimitStoreService],
})
export class RateLimitModule {}