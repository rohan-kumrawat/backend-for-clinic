import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Session } from './session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { Package } from '../packages/package.entity';
import { SessionCreatedEvent } from 'src/common/events/session-created.event';
import { PackageStatusEnum } from '../common/enums/package-status.enum';
import { EVENT_PACKAGE_CLOSED, EVENT_SESSION_CREATED } from 'src/common/events/event-names';
import { PackageClosedEvent } from 'src/common/events/package-closed.event';

export interface SessionListResponse {
  data: Session[];
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSession(
  dto: CreateSessionDto,
  currentUserId: string,
): Promise<Session> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const pkg = await queryRunner.manager.findOne(Package, {
      where: { id: dto.packageId, isDeleted: false },
      lock: { mode: 'pessimistic_write' }, // 🔒 IMPORTANT
    });

    if (!pkg) {
      throw new BadRequestException('Package not found');
    }

    if (pkg.status !== PackageStatusEnum.ACTIVE) {
      throw new BadRequestException('Package is not active');
    }

    if (pkg.patientId !== dto.patientId) {
      throw new BadRequestException('Package does not belong to patient');
    }


    let shouldAutoClosePackage = false;

    if (pkg.consumedSessions >= pkg.totalSessions) {
      pkg.status = PackageStatusEnum.COMPLETED;
      shouldAutoClosePackage = true;
    }

    await queryRunner.manager.save(Package, pkg);

    const session = this.sessionRepository.create({
      patientId: dto.patientId,
      packageId: dto.packageId,
      doctorId: dto.doctorId,
      visitType: dto.visitType,
      shift: dto.shift,
      sessionDate: new Date(dto.sessionDate),
      remarks: dto.remarks || null,
      isFreeSession: dto.isFreeSession,
      createdBy: currentUserId,
    });

    const savedSession = await queryRunner.manager.save(session);

    await queryRunner.commitTransaction();

    // EVENTS AFTER COMMIT
    this.eventEmitter.emit(
      EVENT_SESSION_CREATED,
      new SessionCreatedEvent(dto.packageId),
    );

    if (shouldAutoClosePackage) {
      this.eventEmitter.emit(
        EVENT_PACKAGE_CLOSED,
        new PackageClosedEvent(dto.packageId),
      );
    }

    return savedSession;
  } catch (error) {
    await queryRunner.rollbackTransaction();

    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new InternalServerErrorException('Failed to create session');
  } finally {
    await queryRunner.release();
  }
}


  async getSessions(query: ListSessionsQueryDto): Promise<SessionListResponse> {
    const where: FindOptionsWhere<Session> = {
      isDeleted: false,
    };

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.packageId) {
      where.packageId = query.packageId;
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    try {
      const data = await this.sessionRepository.find({
        where,
        order: { sessionDate: 'DESC', createdAt: 'DESC' },
      });

      return { data };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch sessions');
    }
  }
}