// reflect-metadata must load before any decorated class so Nest can read
// the metadata emitted by emitDecoratorMetadata (DI + route reflection).
import 'reflect-metadata';
// envs must be imported before AppModule: it loads .env and fails fast on invalid config.
import { envs } from './config/envs';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { createAppLogger } from './common/logger/app-logger';
import { createValidationPipe } from './common/pipes/validation';
import { setupSwagger } from './swagger/swagger.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: createAppLogger(),
  });

  app.setGlobalPrefix(envs.API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.enableCors({
    origin: envs.CORS_ORIGINS.includes('*') ? true : envs.CORS_ORIGINS,
    credentials: true,
  });
  // Lets BullMQ workers and DB connections close cleanly on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  setupSwagger(app);

  await app.listen(envs.PORT, envs.HOST);
  Logger.log(
    `Application (${envs.NODE_ENV}) is running on: http://localhost:${envs.PORT}/${envs.API_PREFIX}`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  Logger.error('Failed to start application', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
