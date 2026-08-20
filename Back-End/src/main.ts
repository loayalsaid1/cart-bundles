import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';

async function bootstrap() {
  // rawBody: true is required for Salla webhook HMAC signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const storefrontOrigin = process.env.SALLA_STOREFRONT_ORIGIN;
  const allowedOrigins = [frontendUrl, storefrontOrigin].filter(
    (origin): origin is string => Boolean(origin),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow non-browser clients (curl, Salla SDK server calls) without an origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

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
