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
  
  // 1. LÍMITES DE SUBIDA
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 2. SEGURIDAD REFORZADA (Ajuste para compartir recursos)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })); 
  
  // 3. CORS EXPLÍCITO (Para que Vite no rebote)
  app.enableCors({
    origin: ['http://localhost:5173', 'https://tu-dominio-frontend.com'], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  }); 

  // 4. VALIDACIÓN
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  // --- SEED DE USUARIOS (VisionPath Automation) ---
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);
  const commonPassword = await bcrypt.hash('estudio2026', 10);

  // Definimos el staff del estudio
  const staff = [
    { 
      nombre: 'Admin Estudio', 
      email: 'admin@estudio.com', 
      role: UserRole.ADMIN,
      pass: 'PasswordSeguro123!' // El admin mantiene su pass fuerte
    },
    { 
      nombre: 'Mariana', 
      email: 'mariana@estudio.com', 
      role: UserRole.PRODUCTOR, // Solo ve sus causas
      pass: 'estudio2026'
    },
    { 
      nombre: 'Socia', // <--- Podés cambiar esto por el nombre real después
      email: 'socia@estudio.com', 
      role: UserRole.PRODUCTOR, // Solo ve sus causas
      pass: 'estudio2026'
    }
  ];

  console.log('🔄 Sincronizando usuarios del estudio...');

  for (const person of staff) {
    let user = await userRepo.findOne({ where: { email: person.email } });
    const hashedPass = await bcrypt.hash(person.pass, 10);

    if (!user) {
      user = userRepo.create({
        nombre: person.nombre,
        email: person.email,
        password: hashedPass,
        role: person.role,
        dni: '00000000',
        telefono: '0000000000',
        isApproved: true
      });
      await userRepo.save(user);
      console.log(`✅ Usuario creado: ${person.nombre} (${person.role})`);
    } else {
      // Opcional: Resetear password en cada reinicio para pruebas
      user.password = hashedPass;
      user.isApproved = true;
      await userRepo.save(user);
    }
  }
  
  console.log('🚀 Base de datos de usuarios lista.');
  // ----------------------------------

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`\n🔥 TuLex Backend operativo en: ${await app.getUrl()}`);
}
bootstrap();