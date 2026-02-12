import { 
  Controller, Query, Get, Post, Body, Patch, Param, Delete, 
  UseGuards, Request, UseInterceptors, UploadedFile, 
  BadRequestException 
} from '@nestjs/common';
import { CausasService } from './causas.service';
import { CreateCausaDto } from './dto/create-causa.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('causas')
@UseGuards(JwtAuthGuard) // 🔒 Todo protegido con Login
export class CausasController {
  constructor(private readonly causasService: CausasService) {}

  // 1. Crear Causa
  @Post()
  create(@Body() createCausaDto: CreateCausaDto, @Request() req) {
    return this.causasService.create(createCausaDto, req.user);
  }

  // 2. Ver Mis Causas
  @Get()
  findAll(@Request() req) {
    return this.causasService.findAll(req.user);
  }

  @Get('eventos/proximos') 
  async getProximosEventos(@GetUser() user: User) {
    return this.causasService.obtenerProximosEventos(user);
  }

  @Get('eventos/todos')
  async getAllEventos(@GetUser() user: User) {
    return this.causasService.obtenerTodosEventos(user);
  }

  @Get('stats/general')
  async getStats(@GetUser() user: User) {
    return this.causasService.obtenerEstadisticas(user);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.causasService.search(query);
  }

  // 3. Ver Detalle de Causa
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.causasService.findOne(id, req.user);
  }

  // 4. Subir Documento (PDF, Word, Excel)
  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('file')) // 'file' es el nombre del campo en el form-data
  async subirDocumento(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    return this.causasService.adjuntarDocumento(id, file, req.user);
  }

  // 5. Descargar Documento (Generar Link Temporal)
  @Get('documentos/:docId/url')
  async descargarDocumento(@Param('docId') docId: string, @Request() req) {
    return this.causasService.getLinkDescarga(docId, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() body: any, 
    @GetUser() user: User
  ) {
    return this.causasService.update(id, body, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.causasService.remove(id, user);
  }

  // Borrar Evento suelto
  @Delete('eventos/:id')
  removeEvento(@Param('id') id: string, @GetUser() user: User) {
    return this.causasService.removeEvento(id, user);
  }

  @Post(':id/eventos')
  async agregarEvento(
    @Param('id') id: string,
    @Body() body: any,
    @GetUser() user: User // <--- 3. Obtenemos el usuario del token
  ) {
    // 4. Se lo pasamos al servicio
    return this.causasService.crearEvento(id, body, user);
  }
}