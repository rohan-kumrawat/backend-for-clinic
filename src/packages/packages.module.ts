import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { Package } from './package.entity';
import { PatientsModule } from '../patients/patients.module';
import { Doctor } from '../doctors/doctor.entity';
import { FinancialSummaryModule } from '../financial-summary/financial-summary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package,Doctor]),
    PatientsModule,
    FinancialSummaryModule
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}