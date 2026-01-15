import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

@Global()
@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    
  ],
  controllers: [HealthController],
})
export class HealthModule {}
