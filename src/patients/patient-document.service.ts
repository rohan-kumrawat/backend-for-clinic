// src/patients/patient-document.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { PatientDocument } from './patient-document.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PatientDocumentService {
  constructor(
    @InjectRepository(PatientDocument)
    private readonly patientDocumentRepo: Repository<PatientDocument>,
    private readonly cloudinary: CloudinaryService,
    private readonly dataSource: DataSource
  ) { }

  async createDocuments(
    manager: EntityManager,
    patientId: string,
    files: Express.Multer.File[],
    queryRunner?: QueryRunner
  ): Promise<PatientDocument[]> {

    if (!files || files.length === 0) return [];

    const uploadedPublicIds: string[] = [];

    try {
      const docs: PatientDocument[] = [];

      for (const file of files) {
        this.cloudinary.validateFile(file);

        const upload = await this.cloudinary.upload(file);
        //uploadedPublicIds.push(upload.publicId);

        const doc = manager.create(PatientDocument, {
          patientId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: upload.bytes,
          cloudinaryPublicId: upload.public_id,
          fileUrl: upload.url,
          documentType: 'medical_report',
          uploadedAt: new Date(),
        });

        docs.push(doc);
      }

      return await manager.save(PatientDocument, docs);

    } catch (err) {
      for (const id of uploadedPublicIds) {
        await this.cloudinary.deleteFile(id);
      }
      throw err;
    }
  }

  async getDocumentsByPatientId(
    patientId: string,
  ): Promise<PatientDocument[]> {
    return this.patientDocumentRepo.find({
      where: {
        patientId,
        isDeleted: false,
      },
      order: {
        uploadedAt: 'DESC',
      },
    });
  }

  async deleteDocument(
    patientId: string,
    documentId: string,
  ): Promise<{ success: true }> {
    const document = await this.patientDocumentRepo.findOne({
      where: {
        id: documentId,
        patientId,
        isDeleted: false,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found for this patient');
    }

    // 1️⃣ Delete from Cloudinary
    await this.cloudinary.deleteFile(
      document.cloudinaryPublicId,
    );

    // 2️⃣ Soft delete from DB
    await this.patientDocumentRepo.update(
      { id: documentId },
      { isDeleted: true },
    );

    return { success: true };
  }

  async hardDeleteAllDocuments(
    patientId: string,
    manager: EntityManager,
  ): Promise<void> {
    const documents = await manager.find(PatientDocument, {
      where: { patientId },
      withDeleted: true, // Find ALL documents including soft deleted ones
    });

    if (documents.length > 0) {
      // 1. Delete from Cloudinary
      for (const doc of documents) {
        if (doc.cloudinaryPublicId) {
          try {
            await this.cloudinary.deleteFile(doc.cloudinaryPublicId);
          } catch (error) {
            console.error(
              `Failed to delete file from Cloudinary: ${doc.cloudinaryPublicId}`,
              error,
            );
          }
        }
      }

      // 2. Hard delete from DB
      await manager.remove(PatientDocument, documents);
    }
  }
}
