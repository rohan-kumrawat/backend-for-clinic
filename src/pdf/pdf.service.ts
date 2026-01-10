import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { Payment } from '../payments/payment.entity';
import { Patient } from '../patients/patient.entity';
import { Package } from '../packages/package.entity';
import { Session } from '../sessions/session.entity';
import { FinancialSummary } from '../financial-summary/financial-summary.entity';
import { clinicFonts } from './fonts/fonts';
import { PaymentReceiptBuilder } from './builders/payment-receipt.builder';
import { PatientStatementBuilder } from './builders/patient-statement.builder';

@Injectable()
export class PdfService {
  private readonly printer: PdfPrinter;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(FinancialSummary)
    private readonly financialSummaryRepository: Repository<FinancialSummary>,
    private readonly paymentReceiptBuilder: PaymentReceiptBuilder,
    private readonly patientStatementBuilder: PatientStatementBuilder,
  ) {
    this.printer = new PdfPrinter(clinicFonts);
  }

  async generatePaymentReceipt(paymentId: string): Promise<Buffer> {
    try {
      // Fetch payment with patient and package data
      const payment = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoinAndSelect(Package, 'pkg', 'pkg.id = payment.packageId')
        .innerJoinAndSelect(Patient, 'patient', 'patient.id = payment.patientId')
        .select([
            'payment.id AS payment_id',
            'payment.amountPaid AS payment_amountPaid',
            'payment.paymentMode AS payment_paymentMode',
            'payment.paymentDate AS payment_paymentDate',
            'patient.name AS patient_name',
            'patient.registrationNumber AS patient_registrationNumber',
            'pkg.packageName AS pkg_packageName',
        ])
        .where('payment.id = :paymentId AND payment.isDeleted = false', { paymentId })
        .getRawOne();

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Build receipt document
      const docDefinition = this.paymentReceiptBuilder.build(payment);
      
      return this.generatePdf(docDefinition);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate payment receipt');
    }
  }

  async generatePatientStatement(
    patientId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<Buffer> {
    try {
      // Fetch patient
      const patient = await this.patientRepository.findOne({
        where: { id: patientId, isDeleted: false },
        select: ['id', 'name', 'registrationNumber', 'mobile'],
      });

      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      // Fetch all packages for patient
      const packages = await this.packageRepository.find({
        where: { patientId, isDeleted: false },
        order: { createdAt: 'DESC' },
      });

      // Fetch financial summaries for these packages
      const packageIds = packages.map(pkg => pkg.id);
      
      const financialSummaries = await this.financialSummaryRepository
        .createQueryBuilder('fs')
        .where('fs.packageId IN (:...packageIds)', { packageIds })
        .andWhere('fs.isDeleted = false')
        .getMany();

      const summaryMap = new Map(financialSummaries.map(fs => [fs.packageId, fs]));

      // Fetch payments for these packages (with date filter if provided)
      const paymentQuery = this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.packageId IN (:...packageIds)', { packageIds })
        .andWhere('payment.isDeleted = false');

      if (dateFrom) {
        paymentQuery.andWhere('payment.paymentDate >= :dateFrom', { dateFrom });
      }
      if (dateTo) {
        paymentQuery.andWhere('payment.paymentDate <= :dateTo', { dateTo });
      }

      const payments = await paymentQuery
        .orderBy('payment.paymentDate', 'ASC')
        .addOrderBy('payment.createdAt', 'ASC')
        .getMany();

      // Fetch sessions for these packages (with date filter if provided)
      const sessionQuery = this.sessionRepository
        .createQueryBuilder('session')
        .where('session.packageId IN (:...packageIds)', { packageIds })
        .andWhere('session.isDeleted = false');

      if (dateFrom) {
        sessionQuery.andWhere('session.sessionDate >= :dateFrom', { dateFrom });
      }
      if (dateTo) {
        sessionQuery.andWhere('session.sessionDate <= :dateTo', { dateTo });
      }

      const sessions = await sessionQuery
        .orderBy('session.sessionDate', 'ASC')
        .addOrderBy('session.createdAt', 'ASC')
        .getMany();

      // Group payments and sessions by package
      const paymentsByPackage = new Map<string, Payment[]>();
      const sessionsByPackage = new Map<string, Session[]>();

      payments.forEach(payment => {
        const list = paymentsByPackage.get(payment.packageId) || [];
        list.push(payment);
        paymentsByPackage.set(payment.packageId, list);
      });

      sessions.forEach(session => {
        const list = sessionsByPackage.get(session.packageId) || [];
        list.push(session);
        sessionsByPackage.set(session.packageId, list);
      });

      // Build statement document
      const docDefinition = this.patientStatementBuilder.build(
        patient,
        packages,
        summaryMap,
        paymentsByPackage,
        sessionsByPackage,
        dateFrom,
        dateTo,
      );

      return this.generatePdf(docDefinition);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to generate patient statement');
    }
  }

  private generatePdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pdfDoc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        pdfDoc.on('error', (error) => {
          reject(error);
        });

        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}