export interface DoctorPerformanceResponse {
  doctorId: string;
  totalPatients: number;
  totalSessions: number;
  freeSessions: number;
  paidSessions: number;
}

export interface PatientPackageSummaryResponse {
  patientId: string;
  totalPackages: number;
  activePackages: number;
  completedPackages: number;
  closedEarlyPackages: number;
}

export interface RevenueSummaryResponse {
  totalRevenue: number;
  totalPayments: number;
  avgPaymentPerTransaction: number;
}

export interface SessionLoadResponse {
  sessionDate: string;
  totalSessions: number;
  freeSessions: number;
  paidSessions: number;
}

export interface ReferralDoctorReportResponse {
  referralDoctorId: string;
  referralDoctorName: string;
  clinicName: string | null;
  totalPatientsReferred: number;
}
