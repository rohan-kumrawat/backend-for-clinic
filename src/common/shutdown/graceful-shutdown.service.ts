import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GracefulShutdownService {
  constructor(private readonly dataSource: DataSource) {
    process.on('SIGTERM', async () => {
      await this.dataSource.destroy();
      process.exit(0);
    });
  }
}