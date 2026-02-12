import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt'; // <--- Importante para la password

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>, // <--- ESTE ES EL NOMBRE CORRECTO
  ) {}

  // --- CREAR USUARIO (Registro) ---
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...userData } = createUserDto;
    
    // Encriptar contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
    });

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error.code === '23505') { // Código de duplicado en Postgres
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  // --- BUSCAR TODOS ---
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // --- BUSCAR UNO POR ID ---
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  // --- BUSCAR POR EMAIL (Para Login) ---
  async findByEmail(email: string): Promise<User | undefined> { // <--- Agregamos "| undefined"
    const user = await this.usersRepository.findOne({ where: { email } });
    return user || undefined; // Convertimos null a undefined
  }

  // --- ACTUALIZAR (General) ---
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    // Si mandan password, hay que encriptarla de nuevo, pero idealmente usamos el método changePassword
    if (updateUserDto.password) {
        const salt = await bcrypt.genSalt();
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    this.usersRepository.merge(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  // --- ELIMINAR ---
  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
  }

  // =====================================================
  // 👤 MÉTODOS PARA "MI PERFIL"
  // =====================================================

  // 1. ACTUALIZAR DATOS BÁSICOS
  async updateProfile(id: string, datos: any) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Actualizamos solo lo que nos mandan (menos el password)
    if (datos.nombre) user.nombre = datos.nombre;
    // Si quisiera cambiar el email, habría que validar que no exista otro igual
    if (datos.email) user.email = datos.email;
    
    return this.usersRepository.save(user);
  }

  // 2. CAMBIAR CONTRASEÑA
  async changePassword(id: string, currentPass: string, newPass: string) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    
    // A. Verificamos que la contraseña actual sea correcta
    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new ConflictException('La contraseña actual es incorrecta'); // Usamos Conflict o BadRequest
    }

    // B. Encriptamos la nueva
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(newPass, salt);

    return this.usersRepository.save(user);
  }
}