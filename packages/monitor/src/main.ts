import { NestFactory } from '@nestjs/core';
import logger from './logger';
import { AppModule } from './app.module';

async function bootstrap() {
  process.on('uncaughtException', function (error) {
    logger.error(error.message, error.stack, 'UnhandledExceptions');
    process.exit(1);
  });

  const app = await NestFactory.create(AppModule, {
    logger,
  });
  app.init();
  app.enableShutdownHooks();
}

bootstrap();
