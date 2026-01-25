import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReferralDoctorsService } from './referral-doctors.service';
import { CreateReferralDoctorDto } from './dto/create-referral-doctor.dto';
import { UpdateReferralDoctorDto } from './dto/update-referral-doctor.dto';
import { ListReferralDoctorsQueryDto } from './dto/list-referral-doctor-query.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoleEnum } from '../common/enums/role.enum';

@Controller('referral-doctors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReferralDoctorsController {
  constructor(private readonly service: ReferralDoctorsService) {}

  @Post()
  @Roles(RoleEnum.ADMIN)
  async create(@Body() dto: CreateReferralDoctorDto) {
    return this.service.create(dto);
  }

  @Get()
  async list(@Query() query: ListReferralDoctorsQueryDto) {
    return this.service.list(query);
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferralDoctorDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
