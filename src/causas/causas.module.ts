import { Module } from '@nestjs/common';
import { CausasService } from './causas.service';
import { CausasController } from './causas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Causa } from './entities/causa.entity';
import { Documento } from './entities/documento.entity';
import { StorageModule } from 'src/storage/storage.module';
import { AuthModule } from 'src/auth/auth.module';
import { MailModule } from 'src/mail/mail.module'; // <--- 1. IMPORTALO ACÁ
import { Evento } from './entities/evento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Causa, Documento, Evento]),
    StorageModule,
    AuthModule,
    MailModule 
  ],
  controllers: [CausasController],
  providers: [CausasService],
  exports: [CausasService]
})
export class CausasModule {}