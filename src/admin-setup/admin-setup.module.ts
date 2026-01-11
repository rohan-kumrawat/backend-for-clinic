import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { AdminSetupController } from './admin-setup.controller';
import { AdminSetupService } from './admin-setup.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AdminSetupController],
  providers: [AdminSetupService],
})
export class AdminSetupModule {}
