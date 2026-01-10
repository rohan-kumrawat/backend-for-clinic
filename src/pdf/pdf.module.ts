import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { PaymentReceiptBuilder } from './builders/payment-receipt.builder';
import { PatientStatementBuilder } from './builders/patient-statement.builder';
import { Payment } from '../payments/payment.entity';
import { Patient } from '../patients/patient.entity';
import { Package } from '../packages/package.entity';
import { Session } from '../sessions/session.entity';
import { FinancialSummary } from '../financial-summary/financial-summary.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Patient,
      Package,
      Session,
      FinancialSummary,
    ]),
  ],
  controllers: [PdfController],
  providers: [PdfService, PaymentReceiptBuilder, PatientStatementBuilder],
  exports: [PdfService],
})
export class PdfModule {}