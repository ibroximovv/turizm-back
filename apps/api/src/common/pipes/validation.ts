import { ValidationPipe, type ValidationPipeOptions } from '@nestjs/common';

/** Shared options: the global pipe (main.ts) and per-param pipes in base controllers use the same rules. */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
};

export function createValidationPipe(options: ValidationPipeOptions = {}): ValidationPipe {
  return new ValidationPipe({ ...VALIDATION_PIPE_OPTIONS, ...options });
}
