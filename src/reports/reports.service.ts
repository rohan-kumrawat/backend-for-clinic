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
  ReferralDoctorReportResponse,
} from './dto/report-response.dto';
import { TodaysDataResponseDto } from './dto/todays-data-response.dto';
import { PaymentModeEnum } from '../common/enums/payment-mode.enum';

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

  async getTodaysData(): Promise<TodaysDataResponseDto> {
    try {
      const today = new Date();
      // Format as YYYY-MM-DD for date columns
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 1. Revenue
      // Today's revenue breakdown
      const todaysPayments = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.paymentMode', 'mode')
        .addSelect('SUM(payment.amountPaid)', 'total')
        .where('payment.paymentDate = :todayStr', { todayStr })
        .andWhere('payment.isDeleted = false')
        .groupBy('payment.paymentMode')
        .getRawMany();

      let revenueTotal = 0;
      let revenueCash = 0;
      let revenueUpi = 0;
      let revenueCard = 0;

      todaysPayments.forEach(p => {
        const amount = parseFloat(p.total) || 0;
        revenueTotal += amount;
        if (p.mode === PaymentModeEnum.CASH) revenueCash += amount;
        else if (p.mode === PaymentModeEnum.UPI) revenueUpi += amount;
        else if (p.mode === PaymentModeEnum.CARD) revenueCard += amount;
      });

      // Yesterday's total revenue for percentage change
      const yesterdaysRevenueResult = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amountPaid)', 'total')
        .where('payment.paymentDate = :yesterdayStr', { yesterdayStr })
        .andWhere('payment.isDeleted = false')
        .getRawOne();

      const yesterdaysRevenue = parseFloat(yesterdaysRevenueResult?.total) || 0;
      let changePercent = 0;
      if (yesterdaysRevenue > 0) {
        changePercent = ((revenueTotal - yesterdaysRevenue) / yesterdaysRevenue) * 100;
      } else if (revenueTotal > 0) {
        changePercent = 100;
      }
      // Round to 1 decimal place
      changePercent = Math.round(changePercent * 10) / 10;


      // 2. Sessions
      const sessionsResult = await this.sessionRepository
        .createQueryBuilder('session')
        .select('COUNT(*)', 'total')
        .addSelect("SUM(CASE WHEN session.isFreeSession = true THEN 1 ELSE 0 END)", 'free')
        .addSelect("SUM(CASE WHEN session.isFreeSession = false THEN 1 ELSE 0 END)", 'paid')
        .where('session.sessionDate = :todayStr', { todayStr })
        .andWhere('session.isDeleted = false')
        .getRawOne();

      const sessionsTotal = parseInt(sessionsResult?.total) || 0;
      const sessionsFree = parseInt(sessionsResult?.free) || 0;
      const sessionsPaid = parseInt(sessionsResult?.paid) || 0;


      // 3. Patients
      // New Registrations (Created today)
      // Since createdAt is timestamptz, we need range for today
      // However, for simplicity allowing database to handle casting if possible, or constructing range in code
      // Constructing range is safer for timestamptz
      const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
      const endOfDay = new Date(todayStr + 'T23:59:59.999Z');

      const newRegistrationsCount = await this.patientRepository
        .createQueryBuilder('patient')
        .where('patient.createdAt >= :startOfDay', { startOfDay })
        .andWhere('patient.createdAt <= :endOfDay', { endOfDay })
        .andWhere('patient.isDeleted = false')
        .getCount();

      // Existing Patients Returned (Session today but created BEFORE today)
      // We check sessions strictly today, join with patient, check patient.createdAt < startOfDay
      const existingReturnedCount = await this.sessionRepository
        .createQueryBuilder('session')
        .innerJoin(Patient, 'patient', 'patient.id = session.patientId')
        .where('session.sessionDate = :todayStr', { todayStr })
        .andWhere('session.isDeleted = false')
        .andWhere('patient.createdAt < :startOfDay', { startOfDay })
        .select('COUNT(DISTINCT session.patientId)', 'count')
        .getRawOne();

      const existingPatientsReturned = parseInt(existingReturnedCount?.count) || 0;

      return {
        date: todayStr,
        revenue: {
          total: revenueTotal,
          cash: revenueCash,
          upi: revenueUpi,
          card: revenueCard,
          changeFromYesterdayPercent: changePercent,
        },
        sessions: {
          total: sessionsTotal,
          paid: sessionsPaid,
          free: sessionsFree,
        },
        patients: {
          newRegistrations: newRegistrationsCount,
          existingPatientsReturned: existingPatientsReturned,
        },
      };

    } catch (error) {
      console.error('Error fetching todays data:', error);
      throw new InternalServerErrorException('Failed to fetch today\'s data');
    }
  }
}