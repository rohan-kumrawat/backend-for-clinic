import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinancialSummaryService } from './financial-summary.service';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';

@Controller('financial-summary')
@UseGuards(AuthGuard('jwt'))
export class FinancialSummaryController {
  constructor(private readonly financialSummaryService: FinancialSummaryService) {}

  @Post('recompute/:packageId')
  async recomputeFinancialSummary(
    @Param('packageId', ParseUUIDPipe) packageId: string,
  ): Promise<FinancialSummaryResponseDto> {
    const result = await this.financialSummaryService.recomputeForPackage(
      packageId,
    );
    return this.mapToResponseDto(result);
  }

  @Get(':packageId')
  async getFinancialSummary(
    @Param('packageId', ParseUUIDPipe) packageId: string,
  ): Promise<FinancialSummaryResponseDto> {
    const result = await this.financialSummaryService.getByPackageId(packageId);
    return this.mapToResponseDto(result);
  }

  private mapToResponseDto(entity: any): FinancialSummaryResponseDto {
    return {
      id: entity.id,
      patientId: entity.patientId,
      packageId: entity.packageId,
      totalPackageAmount: Number(entity.totalPackageAmount),
      totalPaidAmount: Number(entity.totalPaidAmount),
      totalSessions: entity.totalSessions,
      consumedSessions: entity.consumedSessions,
      releasedSessions:entity.releasedSessions,
      perSessionAmount: Number(entity.perSessionAmount),
      remainingPayableAmount: Number(entity.remainingPayableAmount),
      carryForwardAmount: Number(entity.carryForwardAmount),
      overPaidAmount: Number(entity.overPaidAmount),
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}