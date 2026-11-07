import { type INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { envs, type Envs } from '../config/envs';

export const BEARER_AUTH = 'bearer';

type SwaggerEnvs = Pick<
  Envs,
  'SWAGGER_ENABLED' | 'SWAGGER_PATH' | 'SWAGGER_TITLE' | 'SWAGGER_VERSION' | 'API_PREFIX'
>;

/**
 * Mounts Swagger UI at `/<API_PREFIX>/<SWAGGER_PATH>` (default `/api/docs`) and the
 * raw spec at `.../docs-json`. Controlled by SWAGGER_* variables; off by default in production.
 *
 * DTOs need explicit `@ApiProperty()` decorators: the build (tsdown/oxc) does not run the
 * `@nestjs/swagger` CLI plugin. Protected routes add `@ApiBearerAuth(BEARER_AUTH)`.
 */
export function setupSwagger(app: INestApplication, config: SwaggerEnvs = envs): string | null {
  if (!config.SWAGGER_ENABLED) return null;

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(config.SWAGGER_TITLE)
      .setVersion(config.SWAGGER_VERSION)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, BEARER_AUTH)
      .build(),
  );

  const path = [config.API_PREFIX, config.SWAGGER_PATH].filter(Boolean).join('/');
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  Logger.log(`Swagger UI available at /${path}`, 'Swagger');
  return path;
}
