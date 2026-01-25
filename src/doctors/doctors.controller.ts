import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { DoctorsService, DoctorListResponse } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoleEnum } from '../common/enums/role.enum';

@Controller('doctors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // ✅ ADMIN ONLY
  @Post()
  @Roles(RoleEnum.ADMIN)
  async createDoctor(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(createDoctorDto);
  }

  // ✅ ADMIN + RECEPTIONIST
  @Get()
  async getDoctors(
    @Query() query: ListDoctorsQueryDto,
  ): Promise<DoctorListResponse> {
    return this.doctorsService.getDoctors(query);
  }

  // ✅ ADMIN ONLY
  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  async updateDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
  ) {
    return this.doctorsService.updateDoctor(id, dto);
  }

  // ✅ ADMIN ONLY (SOFT DELETE)
  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  async deleteDoctor(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.doctorsService.softDeleteDoctor(id);
  }
}
