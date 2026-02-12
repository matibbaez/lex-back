import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport'; // Usamos el Guard estándar
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from './entities/user.entity'; 

@Controller('users')
@UseGuards(AuthGuard('jwt')) // 🔒 Protegemos TODAS las rutas de este controlador
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =====================================================
  // 👤 SECCIÓN MI PERFIL (Para que Mariana gestione sus datos)
  // =====================================================

  // 1. Obtener mis datos
  @Get('me')
  getMe(@GetUser() user: User) {
    return user;
  }

  // 2. Actualizar mi nombre o email
  @Patch('me')
  updateMyProfile(@GetUser() user: User, @Body() body: any) {
    return this.usersService.updateProfile(user.id, body);
  }

  // 3. Cambiar mi contraseña
  @Post('me/password')
  changeMyPassword(@GetUser() user: User, @Body() body: any) {
    // body debe traer { currentPass, newPass }
    return this.usersService.changePassword(user.id, body.currentPass, body.newPass);
  }

  // =====================================================
  // 🛠️ SECCIÓN ADMIN / CRUD GENERAL
  // =====================================================

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}