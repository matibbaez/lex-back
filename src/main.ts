import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User, UserRole } from './users/entities/user.entity';
import * as bcrypt from 'bcrypt'; 
import helmet from 'helmet';
import { json, urlencoded } from 'express'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 1. PREFIJO GLOBAL
  app.setGlobalPrefix('api');

  // 2. LÍMITES DE SUBIDA
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 3. SEGURIDAD REFORZADA
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })); 
  
  // 4. CORS (FIX DEFINITIVO)
  app.enableCors({
    origin: [
      'http://localhost:5173', 
      'https://lex-front-lemon.vercel.app', // <--- PUESTA A FUEGO (Sin barra al final)
      process.env.FRONTEND_URL // Por si algún día la ponés en Render
    ].filter(Boolean) as string[], 
    // AGREGUÉ 'OPTIONS' ACÁ ABAJO, ES CRUCIAL PARA EL PREFLIGHT:
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  }); 

  // 5. VALIDACIÓN
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  // --- SEED DE USUARIOS ---
  try {
    const dataSource = app.get(DataSource);
    const userRepo = dataSource.getRepository(User);

    const staff = [
      { nombre: 'Admin Estudio', email: 'admin@estudio.com', role: UserRole.ADMIN, pass: 'PasswordSeguro123!' },
      { nombre: 'Mariana', email: 'mariana@estudio.com', role: UserRole.PRODUCTOR, pass: 'estudio2026'},
      { nombre: 'Socia', email: 'socia@estudio.com', role: UserRole.PRODUCTOR, pass: 'estudio2026'}
    ];

    console.log('🔄 Sincronizando usuarios...');

    for (const person of staff) {
      // Usamos try-catch por si la tabla no está lista aún en el primer deploy
      try {
        let user = await userRepo.findOne({ where: { email: person.email } });
        const hashedPass = await bcrypt.hash(person.pass, 10);

        if (!user) {
          user = userRepo.create({
            nombre: person.nombre, email: person.email, password: hashedPass, role: person.role,
            dni: '00000000', telefono: '0000000000', isApproved: true
          });
          await userRepo.save(user);
          console.log(`✅ Usuario creado: ${person.nombre}`);
        } else {
          user.password = hashedPass;
          user.isApproved = true;
          await userRepo.save(user);
        }
      } catch (e) {
        console.warn(`⚠️ Error procesando usuario ${person.nombre} (ignorable si es primer deploy):`, e.message);
      }
    }
  } catch (error) {
    console.error("⚠️ Error general en seed (ignorable):", error);
  }
  // ----------------------------------

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`\n🔥 TuLex Backend operativo en: ${await app.getUrl()}`);
}
bootstrap();