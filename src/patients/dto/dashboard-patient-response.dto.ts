export class DashboardPatientResponseDto {
  patientId!: string;
  registrationNumber!: string;
  patientName!: string;

  doctorId!: string | null;
  doctorName!: string | null;

  packageId!: string | null;
  packageStatus!: string | null;

  totalSessions!: number;
  consumedSessions!: number;
  remainingSessions!: number;
  releasedSessions!: number;

  overConsumedSessions!: number;

  totalPackageAmount!: number;
  totalPaidAmount!: number;
  remainingPayableAmount!: number;
  financialStatus!: string;
}
