import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';


async function bootstrap() {
  // rawBody: true is required for Salla webhook HMAC signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const config = app.get<ConfigService>(ConfigService);

  const STATIC_ORIGINS: string[] = config.get<string>('ALLOWED_CORS_ORIGINS', "").split(",").map((o) => o.trim());

  app.enableCors({
    origin: async (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (STATIC_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });


  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filters (order matters - specific to general)
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new DatabaseExceptionFilter(),
    new GlobalExceptionFilter(httpAdapter),
  );

  // Global interceptor
  app.useGlobalInterceptors(new LoggerInterceptor());

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
