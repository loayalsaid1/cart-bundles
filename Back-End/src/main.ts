import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { IncomingMessage } from 'node:http';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // rawBody: true is required for Salla webhook HMAC signature verification
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const config = app.get<ConfigService>(ConfigService);

  const STATIC_ORIGINS: string[] = config
    .get<string>('ALLOWED_CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Public, credential-less endpoints that must be reachable from any merchant
  // storefront domain (custom domains included).
  const PUBLIC_STOREFRONT_PATHS = [
    '/storefront/events',
    '/offers/storefront/',
    '/salla/products/recommendations',
  ];

  const isTrustedOrigin = (origin: string): boolean => {
    if (STATIC_ORIGINS.includes(origin)) return true;
    try {
      const hostname = new URL(origin).hostname;
      return hostname === 'salla.sa' || hostname.endsWith('.salla.sa');
    } catch {
      return false;
    }
  };

  // Required so req.ip reflects the real client behind the platform proxy
  // (storefront rate limiting keys on the caller IP).
  app.set('trust proxy', 1);

  app.enableCors(((req: IncomingMessage, callback) => {
    const origin =
      typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const path = req.url ?? '';

    if (
      PUBLIC_STOREFRONT_PATHS.some((publicPath) => path.includes(publicPath))
    ) {
      // No cookies on these routes, so reflecting the origin is safe.
      return callback(null, { origin: true, credentials: false });
    }

    if (!origin || isTrustedOrigin(origin)) {
      return callback(null, { origin: true, credentials: true });
    }

    return callback(null, { origin: false, credentials: true });
  }) as CorsOptionsDelegate<IncomingMessage>);

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
