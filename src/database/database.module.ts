import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const isProd = configService.get('environment') === 'production';

        return {
          type: 'postgres',
          url: isProd ? process.env.DATABASE_URL : undefined,

          host: !isProd ? configService.get('database.host') : undefined,
          port: !isProd ? configService.get<number>('database.port') : undefined,
          username: !isProd ? configService.get('database.username') : undefined,
          password: !isProd ? configService.get('database.password') : undefined,
          database: !isProd ? configService.get('database.name') : undefined,

          autoLoadEntities: true,
          // synchronize: configService.get<boolean>('database.sync') ?? false,
          synchronize:true,  
          logging: !isProd,
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };
      },
    }),

  ],
})
export class DatabaseModule { }
