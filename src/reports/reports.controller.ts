import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoleEnum } from '../common/enums/role.enum';
import { ReportsService } from './reports.service';
import { DoctorPerformanceFilterDto } from './dto/doctor-performance-filter.dto';
import { RevenueSummaryFilterDto } from './dto/revenue-summary-filter.dto';
import { SessionLoadFilterDto } from './dto/session-load-filter.dto';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Get('doctor-performance')
  async getDoctorPerformance(
    @Query() filter: DoctorPerformanceFilterDto,
  ) {
    return this.reportsService.getDoctorPerformance(filter);
  }

  @Get('revenue-summary')
  async getRevenueSummary(
    @Query() filter: RevenueSummaryFilterDto,
  ) {
    return this.reportsService.getRevenueSummary(filter);
  }

  @Get('session-load')
  async getSessionLoad(
    @Query() filter: SessionLoadFilterDto,
  ) {
    return this.reportsService.getSessionLoad(filter);
  }

  @Get('patient-package-summary')
  async getPatientPackageSummary() {
    return this.reportsService.getPatientPackageSummary();
  }

  @Get('referral-doctors')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.ADMIN)
  async referralDoctorReport() {
    return this.reportsService.getReferralDoctorReport();
  }

  @Get('todays-data')
  async getTodaysData() {
    return this.reportsService.getTodaysData();
  }


}