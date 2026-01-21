import { FinancialStatusEnum } from '../../common/enums/financial-status.enum';
import { PackageStatusEnum } from '../../common/enums/package-status.enum';

export class DashboardPackageResponseDto {
  packageId!: string;

  patientId!: string;
  registrationNumber!: string;
  patientName!: string;

  doctorId!: string;
  doctorName!: string;

  visitType!: string;
  packageName!: string;
  packageStatus!: PackageStatusEnum;

  totalSessions!: number;
  consumedSessions!: number;
  remainingSessions!: number;
  releasedSessions!: number;
  overConsumedSessions!: number;

  totalPackageAmount!: number;
  totalPaidAmount!: number;
  remainingPayableAmount!: number;
  financialStatus!: FinancialStatusEnum;

  createdAt!: Date;
}
