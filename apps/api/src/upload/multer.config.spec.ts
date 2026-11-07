import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { Request } from 'express';
import { createMulterOptions, generateFileName, isMimeTypeAllowed } from './multer.config';

describe('isMimeTypeAllowed', () => {
  it('matches exact types and wildcards', () => {
    expect(isMimeTypeAllowed('image/png', ['image/png'])).toBe(true);
    expect(isMimeTypeAllowed('IMAGE/WEBP', ['image/*'])).toBe(true);
    expect(isMimeTypeAllowed('application/pdf', ['image/*'])).toBe(false);
  });

  it('allows everything with an empty list', () => {
    expect(isMimeTypeAllowed('application/zip', [])).toBe(true);
  });
});

describe('generateFileName', () => {
  it('keeps a sanitized lowercase extension and drops the original name', () => {
    const name = generateFileName('../../My Photo.JPG');
    expect(name).toMatch(/^\d+-[0-9a-f-]{36}\.jpg$/);
    expect(name).not.toContain('Photo');
  });
});

describe('createMulterOptions', () => {
  const options = createMulterOptions({
    UPLOAD_DIR: '/tmp/turizm-test-uploads',
    UPLOAD_MAX_FILE_SIZE_MB: 2,
    UPLOAD_MAX_FILES: 3,
    UPLOAD_ALLOWED_MIME_TYPES: ['image/*'],
  });

  it('sets limits from envs', () => {
    expect(options.limits).toEqual({ fileSize: 2 * 1024 * 1024, files: 3 });
  });

  it('rejects disallowed MIME types with 415', () => {
    const cb = jest.fn();
    options.fileFilter?.({} as Request, { mimetype: 'application/x-msdownload' } as Express.Multer.File, cb);
    expect(cb).toHaveBeenCalledWith(expect.any(UnsupportedMediaTypeException), false);
  });

  it('accepts allowed MIME types', () => {
    const cb = jest.fn();
    options.fileFilter?.({} as Request, { mimetype: 'image/png' } as Express.Multer.File, cb);
    expect(cb).toHaveBeenCalledWith(null, true);
  });
});
