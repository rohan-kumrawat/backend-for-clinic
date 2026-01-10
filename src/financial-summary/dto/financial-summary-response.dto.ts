export class FinancialSummaryResponseDto {
  id!: string;
  patientId!: string;
  packageId!: string;
  totalPackageAmount!: number;
  totalPaidAmount!: number;
  totalSessions!: number;
  consumedSessions!: number;
  perSessionAmount!: number;
  remainingPayableAmount!: number;
  carryForwardAmount!: number;
  overPaidAmount!: number;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
  releasedSessions!: number;
}