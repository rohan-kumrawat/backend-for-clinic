export class PatientDocumentResponseDto {
  id!: string;
  fileName!: string;
  fileType!: string;
  fileUrl!: string;
  fileSize!: number;
  documentType!: string | null;
  uploadedAt!: Date;
}
