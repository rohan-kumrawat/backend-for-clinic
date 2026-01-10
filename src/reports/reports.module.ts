import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Session } from '../sessions/session.entity';
import { Package } from '../packages/package.entity';
import { Payment } from '../payments/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Package, Payment]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}