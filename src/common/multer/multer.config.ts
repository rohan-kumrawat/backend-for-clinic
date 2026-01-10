import { Injectable } from '@nestjs/common';
import { MulterModuleOptions } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Injectable()
export class MulterConfigService {
  createMulterOptions(): MulterModuleOptions {
    return {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
      },
    };
  }
}
