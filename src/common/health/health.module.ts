import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { BackupModule } from '../../backup/backup.module';

@Global()
@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    BackupModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
