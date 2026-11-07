import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { envs, type Envs } from '../config/envs';

type UploadEnvs = Pick<
  Envs,
  'UPLOAD_DIR' | 'UPLOAD_MAX_FILE_SIZE_MB' | 'UPLOAD_MAX_FILES' | 'UPLOAD_ALLOWED_MIME_TYPES'
>;

/** `image/*` matches any image; an empty allow-list accepts everything. */
export function isMimeTypeAllowed(mimeType: string, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  const mime = mimeType.toLowerCase();
  return allowed.some((pattern) => {
    const p = pattern.toLowerCase();
    return p.endsWith('/*') ? mime.startsWith(p.slice(0, -1)) : mime === p;
  });
}

/** Random, collision-free name that keeps only a sanitized extension of the original. */
export function generateFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `${Date.now()}-${randomUUID()}${ext}`;
}

/** Global multer defaults (disk storage, size/count limits, MIME allow-list) taken from UPLOAD_* envs. */
export function createMulterOptions(config: UploadEnvs = envs): MulterOptions {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        mkdirSync(config.UPLOAD_DIR, { recursive: true });
        cb(null, config.UPLOAD_DIR);
      },
      filename: (_req, file, cb) => cb(null, generateFileName(file.originalname)),
    }),
    limits: {
      fileSize: config.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
      files: config.UPLOAD_MAX_FILES,
    },
    fileFilter: (_req, file, cb) => {
      if (isMimeTypeAllowed(file.mimetype, config.UPLOAD_ALLOWED_MIME_TYPES)) {
        cb(null, true);
        return;
      }
      cb(new UnsupportedMediaTypeException(`File type "${file.mimetype}" is not allowed`), false);
    },
  };
}
