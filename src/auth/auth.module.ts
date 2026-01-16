import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from './user.entity';
import { UserSession } from './user-session.entity';
import { ConfigService } from '@nestjs/config';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserSession]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const ttl = configService.get<number>('ACCESS_TOKEN_TTL_MINUTES');

    if (!ttl) {
      throw new Error('ACCESS_TOKEN_TTL_MINUTES is not defined');
    }

    return {
      secret: configService.get<string>('JWT_SECRET'),
      signOptions: {
        expiresIn: `${ttl}m`,
      },
    };
  },
}),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtStrategy],
  exports: [AuthService, SessionService, JwtStrategy],
})
export class AuthModule {}
