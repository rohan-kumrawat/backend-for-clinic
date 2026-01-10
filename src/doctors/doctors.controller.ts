import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DoctorsService, DoctorListResponse } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';

@Controller('doctors')
@UseGuards(AuthGuard('jwt'))
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  async createDoctor(@Body() createDoctorDto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(createDoctorDto);
  }

  @Get()
  async getDoctors(@Query() query: ListDoctorsQueryDto): Promise<DoctorListResponse> {
    return this.doctorsService.getDoctors(query);
  }
}