import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const isProd = config.get('environment') === 'production';

        return {
          type: 'postgres',
          url: isProd ? process.env.DATABASE_URL : undefined,

          host: !isProd ? config.get('database.host') : undefined,
          port: !isProd ? config.get<number>('database.port') : undefined,
          username: !isProd ? config.get('database.username') : undefined,
          password: !isProd ? config.get('database.password') : undefined,
          database: !isProd ? config.get('database.name') : undefined,

          autoLoadEntities: true,
          synchronize: false,   
          logging: !isProd,
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };
      },
    }),

  ],
})
export class DatabaseModule { }
