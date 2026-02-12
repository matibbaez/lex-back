import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PdfService } from './common/pdf.service';
import { ScheduleModule } from '@nestjs/schedule';

// --- Nuestros Módulos ---
import { ReclamosModule } from './reclamos/reclamos.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { CausasModule } from './causas/causas.module';

// --- Nuestras Entidades ---
import { Reclamo } from './reclamos/entities/reclamo.entity';
import { User } from './users/entities/user.entity';
import { Causa } from './causas/entities/causa.entity'; 
import { Documento } from './causas/entities/documento.entity'; 
import { Evento } from './causas/entities/evento.entity'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // 1. INTENTA OBTENER LA URL COMPLETA (Para Render)
        const dbUrl = configService.get<string>('DATABASE_URL');
        
        return {
          type: 'postgres',
          // 2. LA MAGIA: Si hay URL, la usa. Si no, usa los campos sueltos (local).
          url: dbUrl, 
          
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASS'),
          database: configService.get<string>('DB_NAME'),
          
          entities: [Reclamo, User, Causa, Documento, Evento],
          
          // En producción (Render), synchronize debe ser FALSE para no romper datos
          synchronize: configService.get<string>('NODE_ENV') !== 'production', 

          // 3. SSL OBLIGATORIO PARA SUPABASE
          ssl: { rejectUnauthorized: false }, 
          extra: {
             max: 20 
          }
        };
      },
    }),

    ReclamosModule,
    StorageModule,
    UsersModule,
    AuthModule,
    MailModule,
    CausasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PdfService 
  ],
})
export class AppModule {}