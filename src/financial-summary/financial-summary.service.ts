import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FinancialSummary } from './financial-summary.entity';
import { Package } from '../packages/package.entity';
import { Payment } from '../payments/payment.entity';
import { Session } from '../sessions/session.entity';
import { FinancialStatusEnum } from '../common/enums/financial-status.enum';

@Injectable()
export class FinancialSummaryService {
  constructor(
    @InjectRepository(FinancialSummary)
    private readonly financialSummaryRepository: Repository<FinancialSummary>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Recomputes financial summary for a package.
   * This method is deterministic and transaction-safe.
   */
  async recomputeForPackage(packageId: string): Promise<FinancialSummary> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch package
      const pkg = await queryRunner.manager.findOne(Package, {
        where: { id: packageId, isDeleted: false },
      });

      if (!pkg) {
        throw new NotFoundException('Package not found');
      }

      // 2. Fetch payments
      const payments = await queryRunner.manager.find(Payment, {
        where: { packageId, isDeleted: false },
        select: ['amountPaid'],
      });

      // 3. Fetch sessions
      const sessions = await queryRunner.manager.find(Session, {
        where: { packageId, isDeleted: false },
        select: ['isFreeSession'],
      });

      // 4. Core deterministic calculations

      const totalPackageAmount = Number(pkg.totalAmount);
      const perSessionAmount = Number(pkg.perSessionAmount);

      const totalPaidAmount = payments.reduce(
        (sum, p) => sum + Number(p.amountPaid),
        0,
      );

      const consumedSessions = sessions.filter(
        (s) => !s.isFreeSession,
      ).length;

      // PAYMENT-BASED remaining payable amount
      const remainingPayableAmount =
        totalPackageAmount - totalPaidAmount;

        const carryForwardAmount = Number(pkg.carryForwardAmount || 0);
        
        let overPaidAmount = 0;
        if(remainingPayableAmount < 0) {
          overPaidAmount = Math.abs(remainingPayableAmount);
        }

      let status: FinancialStatusEnum;
      if (Math.abs(remainingPayableAmount) < 0.01) {
        status = FinancialStatusEnum.CLEAR;
      } else if (remainingPayableAmount > 0) {
        status = FinancialStatusEnum.DUE;
      } else {
        status = FinancialStatusEnum.OVERPAID;
      }

      // 5. Upsert financial summary
      const existingSummary = await queryRunner.manager.findOne(
        FinancialSummary,
        {
          where: { packageId, isDeleted: false },
        },
      );

      const summaryPayload = {
        patientId: pkg.patientId,
        packageId: pkg.id,
        totalPackageAmount,
        totalPaidAmount,
        totalSessions: pkg.totalSessions,
        consumedSessions,
        releasedSessions: pkg.releasedSessions,
        perSessionAmount,
        remainingPayableAmount,
        carryForwardAmount: Number(pkg.carryForwardAmount || 0),
        overPaidAmount,
        status,
      };

      let savedSummary: FinancialSummary;

      if (existingSummary) {
        await queryRunner.manager.update(
          FinancialSummary,
          { id: existingSummary.id },
          summaryPayload,
        );

        savedSummary = await queryRunner.manager.findOneOrFail(
          FinancialSummary,
          { where: { id: existingSummary.id } },
        );
      } else {
        const newSummary =
          this.financialSummaryRepository.create(summaryPayload);

        savedSummary = await queryRunner.manager.save(newSummary);
      }

      await queryRunner.commitTransaction();
      return savedSummary;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to recompute financial summary',
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getByPackageId(packageId: string): Promise<FinancialSummary> {
    const summary = await this.financialSummaryRepository.findOne({
      where: { packageId, isDeleted: false },
    });

    if (!summary) {
      throw new NotFoundException(
        'Financial summary not found for this package',
      );
    }

    return summary;
  }
}
