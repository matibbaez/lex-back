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

// --- Nuestras Entidades (Moldes) ---
import { Reclamo } from './reclamos/entities/reclamo.entity';
import { User } from './users/entities/user.entity';
// 1. IMPORTAR LAS NUEVAS ENTIDADES
import { Causa } from './causas/entities/causa.entity';         // <--- AGREGAR
import { Documento } from './causas/entities/documento.entity'; // <--- AGREGAR
import { Evento } from './causas/entities/evento.entity'; // <--- AGREGAR

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
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        
        entities: [Reclamo, User, Causa, Documento, Evento],
        synchronize: configService.get<string>('DB_SYNC') === 'true',

        // --- AGREGÁ ESTO SÍ O SÍ PARA SUPABASE ---
        ssl: { rejectUnauthorized: false }, 
        extra: {
           // Esto ayuda a que no explote con el Transaction Pooler
           max: 20 
        }
        // -----------------------------------------
      }),
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