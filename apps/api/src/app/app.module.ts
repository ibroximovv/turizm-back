import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { RequestLoggerMiddleware } from '../common/logger/request-logger.middleware';
import { envs } from '../config/envs';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AppRouterModule } from '../router';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  // Feature modules are registered in src/router/index.ts, not here.
  imports: [PrismaModule, JobsModule, AppRouterModule],
  controllers: [AppController, HealthController, TodosController],
  providers: [AppService, TodosService, { provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    if (envs.LOG_HTTP_REQUESTS) {
      consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}');
    }
  }
}
