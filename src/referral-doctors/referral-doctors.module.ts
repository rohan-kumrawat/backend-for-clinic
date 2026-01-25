import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralDoctor } from './referral-doctor.entity';
import { ReferralDoctorsService } from './referral-doctors.service';
import { ReferralDoctorsController } from './referral-doctors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralDoctor])],
  controllers: [ReferralDoctorsController],
  providers: [ReferralDoctorsService],
  exports: [ReferralDoctorsService],
})
export class ReferralDoctorsModule {}
