import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { RoleEnum } from '../src/common/enums/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  if (!username || !password || !name) {
    console.error('Missing ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_NAME');
    process.exit(1);
  }

  await authService.createUser(
    {
      username,
      password,
      name,
    },
    RoleEnum.ADMIN,
  );

  console.log('✅ Admin user created successfully');
  await app.close();
  process.exit(0);
}

bootstrap();
