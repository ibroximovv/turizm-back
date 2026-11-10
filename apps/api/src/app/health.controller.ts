import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@nestjs-template/types';
import { Public } from '../modules/auth/decorators/public.decorator';

// Template endpoint: stays open after the global JwtAuthGuard.
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
