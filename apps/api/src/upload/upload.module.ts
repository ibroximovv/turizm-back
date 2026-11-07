import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { createMulterOptions } from './multer.config';

/**
 * Import into any feature module that accepts files. It re-exports MulterModule configured
 * from UPLOAD_* envs, so `FileInterceptor` in that module uses the shared storage and limits.
 */
@Module({
  imports: [MulterModule.registerAsync({ useFactory: () => createMulterOptions() })],
  exports: [MulterModule],
})
export class UploadModule {}
