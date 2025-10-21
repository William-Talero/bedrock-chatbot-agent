import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = configService.get<string>('app.cors.origin');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`WebSocket endpoint: ws://localhost:${port}/chat`);
  logger.log(`CORS enabled for origin: ${corsOrigin}`);
}

bootstrap();
