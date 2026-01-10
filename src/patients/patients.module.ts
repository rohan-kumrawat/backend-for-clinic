import { Module } from '@nestjs/common'; 
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { MulterModule } from '@nestjs/platform-express';

import { PatientsController } from './patients.controller'; 
import { PatientsService } from './patients.service'; 

import { Patient } from './patient.entity'; 
import { PatientDocument } from './patient-document.entity';

import { PatientDocumentService } from './patient-document.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MulterConfigService } from '../common/multer/multer.config';

@Module({ 
  imports: [
    TypeOrmModule.forFeature([ 
      Patient, 
      PatientDocument 
    ]),
    MulterModule.registerAsync({ 
      useClass: MulterConfigService 
    }),
    CloudinaryModule,
  ], 
  controllers: [PatientsController], 
  providers: [ 
    PatientsService, 
    PatientDocumentService,
    MulterConfigService,
  ], 
  exports: [PatientsService], 
}
) export class PatientsModule {}