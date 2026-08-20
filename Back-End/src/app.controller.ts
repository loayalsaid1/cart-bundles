import { Controller, Get } from '@nestjs/common';
import { IsPublic } from './common/decorators';
import { AppService } from './app.service';

@Controller('v1/db')
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** GET /api/v1/db — database health check. */
  @IsPublic()
  @Get()
  healthCheck() {
    return this.appService.healthCheck();
  }
}
