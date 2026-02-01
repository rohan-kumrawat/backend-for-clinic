import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../sessions/session.entity';
import { Package } from '../packages/package.entity';
import { Payment } from '../payments/payment.entity';
import {
  DoctorPerformanceResponse,
  PatientPackageSummaryResponse,
  RevenueSummaryResponse,
  SessionLoadResponse,
  ReferralDoctorReportResponse
} from './dto/report-response.dto';
import { DoctorPerformanceFilterDto } from './dto/doctor-performance-filter.dto';
import { RevenueSummaryFilterDto } from './dto/revenue-summary-filter.dto';
import { SessionLoadFilterDto } from './dto/session-load-filter.dto';
import { Patient } from '../patients/patient.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) { }

  async getDoctorPerformance(
    filter: DoctorPerformanceFilterDto,
  ): Promise<DoctorPerformanceResponse[]> {
    try {
      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin(Patient, 'patient', 'patient.id = session.patientId')
        .select('session.doctorId', 'doctorId')
        .addSelect('COUNT(DISTINCT session.patientId)', 'totalPatients')
        .addSelect('COUNT(*)', 'totalSessions')
        .addSelect(
          'SUM(CASE WHEN session.isFreeSession = true THEN 1 ELSE 0 END)',
          'freeSessions',
        )
        .addSelect(
          'SUM(CASE WHEN session.isFreeSession = false THEN 1 ELSE 0 END)',
          'paidSessions',
        )
        .where('session.isDeleted = false')
        .andWhere('patient.isDeleted = false');

      if (filter.doctorId) {
        queryBuilder.andWhere('session.doctorId = :doctorId', {
          doctorId: filter.doctorId,
        });
      }

      if (filter.dateFrom) {
        queryBuilder.andWhere('session.sessionDate >= :dateFrom', {
          dateFrom: filter.dateFrom,
        });
      }

      if (filter.dateTo) {
        queryBuilder.andWhere('session.sessionDate <= :dateTo', {
          dateTo: filter.dateTo,
        });
      }

      queryBuilder.groupBy('session.doctorId')
        .orderBy('COUNT(*)', 'DESC')
        .addOrderBy('session.doctorId', 'ASC');

      const rawResults = await queryBuilder.getRawMany();

      return rawResults.map((row) => ({
        doctorId: row.doctorId,
        totalPatients: parseInt(row.totalPatients),
        totalSessions: parseInt(row.totalSessions),
        freeSessions: parseInt(row.freeSessions),
        paidSessions: parseInt(row.paidSessions),
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to generate doctor performance report',
      );
    }
  }

  async getPatientPackageSummary(): Promise<PatientPackageSummaryResponse[]> {
    try {
      const queryBuilder = this.packageRepository
        .createQueryBuilder('package')
        .innerJoin(Patient, 'patient', 'patient.id = package.patientId')
        .select('package.patientId', 'patient_id')
        .addSelect('COUNT(*)', 'total_packages')
        .addSelect(
          "SUM(CASE WHEN package.status = 'ACTIVE' THEN 1 ELSE 0 END)",
          'active_packages',
        )
        .addSelect(
          "SUM(CASE WHEN package.status = 'COMPLETED' THEN 1 ELSE 0 END)",
          'completed_packages',
        )
        .addSelect(
          "SUM(CASE WHEN package.status = 'CLOSED_EARLY' THEN 1 ELSE 0 END)",
          'closed_early_packages',
        )
        .addSelect(
          "SUM(CASE WHEN package.status = 'CANCELLED' THEN 1 ELSE 0 END)",
          'cancelled_packages',
        )
        .where('package.isDeleted = false')
        .andWhere('patient.isDeleted = false')
        .groupBy('package.patientId')
        .orderBy('total_packages', 'DESC');

      const rawResults = await queryBuilder.getRawMany();

      return rawResults.map((row) => ({
        patientId: row.patient_id,
        totalPackages: Number(row.total_packages),
        activePackages: Number(row.active_packages),
        completedPackages: Number(row.completed_packages),
        closedEarlyPackages: Number(row.closed_early_packages),
        cancelledPackages: Number(row.cancelled_packages),
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to generate patient package summary',
      );
    }
  }

  async getRevenueSummary(
    filter: RevenueSummaryFilterDto,
  ): Promise<RevenueSummaryResponse> {
    try {
      const queryBuilder = this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amountPaid), 0)', 'totalRevenue')
        .addSelect('COUNT(*)', 'totalPayments')
        .addSelect(
          'COALESCE(AVG(payment.amountPaid), 0)',
          'avgPaymentPerTransaction',
        )
        .where('payment.isDeleted = false');

      if (filter.paymentMode) {
        queryBuilder.andWhere('payment.paymentMode = :paymentMode', {
          paymentMode: filter.paymentMode,
        });
      }

      if (filter.dateFrom) {
        queryBuilder.andWhere('payment.paymentDate >= :dateFrom', {
          dateFrom: filter.dateFrom,
        });
      }

      if (filter.dateTo) {
        queryBuilder.andWhere('payment.paymentDate <= :dateTo', {
          dateTo: filter.dateTo,
        });
      }

      const rawResult = await queryBuilder.getRawOne();

      return {
        totalRevenue: parseFloat(rawResult.totalRevenue) || 0,
        totalPayments: parseInt(rawResult.totalPayments) || 0,
        avgPaymentPerTransaction: parseFloat(rawResult.avgPaymentPerTransaction) || 0,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to generate revenue summary',
      );
    }
  }

  async getSessionLoad(
    filter: SessionLoadFilterDto,
  ): Promise<SessionLoadResponse[]> {
    try {
      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session')
        .select('session.sessionDate', 'sessionDate')
        .addSelect('COUNT(*)', 'totalSessions')
        .addSelect(
          'SUM(CASE WHEN session.isFreeSession = true THEN 1 ELSE 0 END)',
          'freeSessions',
        )
        .addSelect(
          'SUM(CASE WHEN session.isFreeSession = false THEN 1 ELSE 0 END)',
          'paidSessions',
        )
        .where('session.isDeleted = false')
        .andWhere('session.sessionDate >= :dateFrom', {
          dateFrom: filter.dateFrom,
        })
        .andWhere('session.sessionDate <= :dateTo', {
          dateTo: filter.dateTo,
        })
        .groupBy('session.sessionDate')
        .orderBy('session.sessionDate', 'DESC');

      const rawResults = await queryBuilder.getRawMany();

      return rawResults.map((row) => ({
        sessionDate: row.sessionDate,
        totalSessions: parseInt(row.totalSessions),
        freeSessions: parseInt(row.freeSessions),
        paidSessions: parseInt(row.paidSessions),
      }));
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate session load report');
    }
  }

  async getReferralDoctorReport(): Promise<ReferralDoctorReportResponse[]> {
    try {
      const qb = this.patientRepository
        .createQueryBuilder('p')
        .select('rd.id', 'referralDoctorId')
        .addSelect('rd.name', 'referralDoctorName')
        .addSelect('rd.clinic_name', 'clinicName')
        .addSelect('COUNT(p.id)', 'totalPatientsReferred')
        .leftJoin(
          'referral_doctors',
          'rd',
          'rd.id = p."referredDoctor"',
        )
        .where('p.isDeleted = false')
        .andWhere('p."referredDoctor" IS NOT NULL')
        .groupBy('rd.id')
        .addGroupBy('rd.name')
        .addGroupBy('rd.clinic_name')
        .orderBy('COUNT(p.id)', 'DESC');

      const rawResults = await qb.getRawMany();

      return rawResults.map(row => ({
        referralDoctorId: row.referralDoctorId,
        referralDoctorName: row.referralDoctorName,
        clinicName: row.clinicName,
        totalPatientsReferred: Number(row.totalPatientsReferred),
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to generate referral doctor report',
      );
    }
  }


}