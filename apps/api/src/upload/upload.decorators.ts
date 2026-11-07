import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { envs } from '../config/envs';

interface FileUploadOptions {
  /** Form field name. Default `file`. */
  field?: string;
  required?: boolean;
}

/**
 * Single file endpoint (multipart/form-data) + Swagger docs.
 * Read the file with `@UploadedFile() file: Express.Multer.File`.
 * The module must import `UploadModule` so the global multer defaults apply.
 */
export function ApiFileUpload({ field = 'file', required = true }: FileUploadOptions = {}) {
  return applyDecorators(
    UseInterceptors(FileInterceptor(field)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: required ? [field] : [],
        properties: { [field]: { type: 'string', format: 'binary' } },
      },
    }),
  );
}

/** Multiple files under one field. Read with `@UploadedFiles() files: Express.Multer.File[]`. */
export function ApiFilesUpload({
  field = 'files',
  required = true,
  maxCount = envs.UPLOAD_MAX_FILES,
}: FileUploadOptions & { maxCount?: number } = {}) {
  return applyDecorators(
    UseInterceptors(FilesInterceptor(field, maxCount)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: required ? [field] : [],
        properties: {
          [field]: { type: 'array', maxItems: maxCount, items: { type: 'string', format: 'binary' } },
        },
      },
    }),
  );
}
