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
  
  // 1. PREFIJO GLOBAL (Opcional pero recomendado para producción)
  // Ahora tus rutas serán: https://tu-api.onrender.com/api/causas
  app.setGlobalPrefix('api');

  // 2. LÍMITES DE SUBIDA
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 3. SEGURIDAD REFORZADA
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })); 
  
  // 4. CORS DINÁMICO (Crucial para el deploy)
  // Usamos la variable de entorno FRONTEND_URL que pondremos en Render
  app.enableCors({
    origin: [
      'http://localhost:5173', 
      process.env.FRONTEND_URL // <-- Acá Render inyectará la URL de Vercel
    ].filter(Boolean) as string[], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  }); 

  // 5. VALIDACIÓN
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  // --- SEED DE USUARIOS (VisionPath Automation) ---
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);

  // Definimos el staff del estudio
  const staff = [
    { 
      nombre: 'Admin Estudio', 
      email: 'admin@estudio.com', 
      role: UserRole.ADMIN,
      pass: 'PasswordSeguro123!' 
    },
    { 
      nombre: 'Mariana', 
      email: 'mariana@estudio.com', 
      role: UserRole.PRODUCTOR, 
      pass: 'estudio2026'
    },
    { 
      nombre: 'Socia', 
      email: 'socia@estudio.com', 
      role: UserRole.PRODUCTOR, 
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
      // Actualizamos password por si la cambiaste en el código
      user.password = hashedPass;
      user.isApproved = true;
      await userRepo.save(user);
    }
  }
  
  console.log('🚀 Base de datos de usuarios lista.');
  // ----------------------------------

  // 6. PUERTO DINÁMICO PARA RENDER
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`\n🔥 TuLex Backend operativo en: ${await app.getUrl()}`);
}
bootstrap();