import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payment-query.dto';
import { Package } from '../packages/package.entity';
import { PaymentCreatedEvent } from 'src/common/events/payment-created.event';
import { PackageStatusEnum } from '../common/enums/package-status.enum';
import { EVENT_PAYMENT_CREATED } from 'src/common/events/event-names';

export interface PaymentListResponse {
  data: Payment[];
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    currentUserId: string,
  ): Promise<Payment> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Fetch and validate package
      const pkg = await queryRunner.manager.findOne(Package, {
        where: {
          id: dto.packageId,
          isDeleted: false,
        },
      });

      if (!pkg) {
        throw new BadRequestException('Package not found');
      }

      if (pkg.status !== PackageStatusEnum.ACTIVE) {
        throw new BadRequestException('Package is not active');
      }

      if (pkg.patientId !== dto.patientId) {
        throw new BadRequestException('Package does not belong to the specified patient');
      }

      // Step 2: Calculate released sessions
      const perSessionAmount = Number(pkg.perSessionAmount);
      const amountPaid = Number(dto.amountPaid);
      
      if (perSessionAmount <= 0) {
        throw new BadRequestException('Invalid per session amount in package');
      }

      const effectiveAmount =
        Number(pkg.carryForwardAmount || 0) + Number(dto.amountPaid);

      const newlyReleased = Math.floor(effectiveAmount / perSessionAmount);
      const newCarryForward =
        effectiveAmount - newlyReleased * perSessionAmount;

      
        // Step 3: Update package released sessions

      pkg.releasedSessions += newlyReleased;
      pkg.carryForwardAmount = newCarryForward;

        await queryRunner.manager.save(Package, pkg);

      // Step 4: Create payment record
      const payment = this.paymentRepository.create({
        patientId: dto.patientId,
        packageId: dto.packageId,
        amountPaid: amountPaid,
        paymentMode: dto.paymentMode,
        paymentDate: new Date(dto.paymentDate),
        createdBy: currentUserId,
      });

      const savedPayment = await queryRunner.manager.save(payment);

      // Step 5: Commit transaction
      await queryRunner.commitTransaction();

      //Dispatch event AFTER successful transaction commit
      this.eventEmitter.emit(
        EVENT_PAYMENT_CREATED,
        new PaymentCreatedEvent(dto.packageId),
      );

      return savedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Failed to process payment');
    } finally {
      await queryRunner.release();
    }
  }

  async getPayments(query: ListPaymentsQueryDto): Promise<PaymentListResponse> {
    const where: FindOptionsWhere<Payment> = {
      isDeleted: false,
    };

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.packageId) {
      where.packageId = query.packageId;
    }

    try {
      const data = await this.paymentRepository.find({
        where,
        order: { paymentDate: 'DESC', createdAt: 'DESC' },
      });

      return { data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch payments');
    }
  }
}