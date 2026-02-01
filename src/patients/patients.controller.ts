import { Controller, Get, Post, Body, Query, UseGuards, Request, Patch, Param, ParseUUIDPipe, Delete, UseInterceptors, UploadedFiles, BadRequestException, } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoleEnum } from '../common/enums/role.enum';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PatientStatusEnum } from '../common/enums/patient-status.enum';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientDashboardQueryDto } from '../patients/dto/dashboard-query.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PatientDocumentService } from './patient-document.service';


@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('patients')
export class PatientsController {
  //CloudinaryService: any;
  constructor(
    private readonly patientsService: PatientsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly patientDocumentService: PatientDocumentService,
  ) { }

  @Post()
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  @UseInterceptors(
    FilesInterceptor('files', 10),
  )
  async createPatient(
    @Body() dto: CreatePatientDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files?.length) {
      for (const file of files) {
        this.cloudinaryService.validateFile(file);
      }
    }

    return this.patientsService.createPatient(dto, files || []);
  }

  @Get(':patientId/documents')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  async getPatientDocuments(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    const documents =
      await this.patientDocumentService.getDocumentsByPatientId(patientId);

    return documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileUrl: doc.fileUrl,
      fileSize: doc.fileSize,
      documentType: doc.documentType,
      uploadedAt: doc.uploadedAt,
    }));
  }

  @Post(':patientId/documents')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadPatientDocuments(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files?.length) {
      for (const file of files) {
        this.cloudinaryService.validateFile(file);
      }
    } else {
      throw new BadRequestException('No files provided');
    }

    const uploadedDocs = await this.patientsService.uploadDocuments(patientId, files);
    return {
      success: true,
      data: uploadedDocs.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        documentType: doc.documentType,
        uploadedAt: doc.uploadedAt,
      })),
    };
  }

  @Delete(':patientId/documents/:documentId')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  async deletePatientDocument(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.patientDocumentService.deleteDocument(
      patientId,
      documentId,
    );
  }



  @Get('active')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  async getActivePatients(@Query() query: ListPatientsQueryDto) {
    return this.patientsService.getActivePatients(query);
  }

  // ✅ DASHBOARD ROUTES MUST COME BEFORE :id
  @Get('active-dashboard')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  async activeDashboard(@Query() query: PatientDashboardQueryDto) {
    return this.patientsService.getDashboardPatients(query, true);
  }

  @Get('all-dashboard')
  @Roles(RoleEnum.ADMIN)
  async allDashboard(@Query() query: PatientDashboardQueryDto) {
    return this.patientsService.getDashboardPatients(query, false);
  }

  // ❗ DYNAMIC ROUTES ALWAYS LAST
  @Get(':id')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  async getPatientById(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.getPatientById(id);
  }

  @Get()
  @Roles(RoleEnum.ADMIN)
  async getPatients(@Query() query: ListPatientsQueryDto) {
    return this.patientsService.getPatients(query);
  }


  @Patch(':id')
  @Roles(RoleEnum.ADMIN, RoleEnum.RECEPTIONIST)
  @UseInterceptors(FilesInterceptor('files', 10))
  async updatePatient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files?.length) {
      for (const file of files) {
        this.cloudinaryService.validateFile(file);
      }
    }
    return this.patientsService.updatePatient(id, dto, files);
  }

  @Patch(':id/activate')
  @Roles(RoleEnum.ADMIN)
  async activatePatient(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.updatePatientStatus(id, PatientStatusEnum.ACTIVE);
  }

  @Patch(':id/deactivate')
  @Roles(RoleEnum.ADMIN)
  async deactivatePatient(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.updatePatientStatus(id, PatientStatusEnum.INACTIVE);
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  async deletePatient(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.softDeletePatient(id);
  }

  @Delete(':id/hard')
  @Roles(RoleEnum.ADMIN)
  async hardDeletePatient(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientsService.hardDeletePatient(id);
  }
}

