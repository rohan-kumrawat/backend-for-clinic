export class TodaysDataResponseDto {
    date!: string;
    revenue!: {
        total: number;
        cash: number;
        upi: number;
        card: number;
        changeFromYesterdayPercent: number;
    };
    sessions!: {
        total: number;
        paid: number;
        free: number;
    };
    patients!: {
        newRegistrations: number;
        existingPatientsReturned: number;
    };
}
