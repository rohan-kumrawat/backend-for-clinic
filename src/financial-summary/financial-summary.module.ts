import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialSummaryService } from './financial-summary.service';
import { FinancialSummaryController } from './financial-summary.controller';
import { FinancialSummaryListener } from './listeners/financial-summary.listener';
import { FinancialSummary } from './financial-summary.entity';
import { Package } from '../packages/package.entity';
import { Payment } from '../payments/payment.entity';
import { Session } from '../sessions/session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialSummary,
      Package,
      Payment,
      Session,
    ]),
  ],
  controllers: [FinancialSummaryController],
  providers: [FinancialSummaryService, FinancialSummaryListener],
  exports: [FinancialSummaryService],
})
export class FinancialSummaryModule {}