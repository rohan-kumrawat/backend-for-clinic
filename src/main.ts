import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SECURITY_CONFIG } from './common/config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://physiodash-hub.vercel.app/',
      'https://physiodash-hub.vercel.app'
    ],
    methods: ['GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'],
    allowedHeaders: ['Origin, X-Requested-With, Content-Type, Accept, Authorization', 'x-admin-secret'],
    credentials: true,
  }
);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidUnknownValues: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();