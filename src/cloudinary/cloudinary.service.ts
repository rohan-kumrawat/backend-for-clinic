import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  validateFile(file: Express.Multer.File) {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large');
    }
  }

  async upload(file: Express.Multer.File) {
    return new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'clinic/patients',
          resource_type: file.mimetype.startsWith('image') ? 'image' : 'raw',
        },
        (error, result) => {
          console.log('Cloudinary upload result:', result);
          if (error) reject(error);
          else resolve(result);
        },
      ).end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

}
