import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Causa, CausaEstado } from './entities/causa.entity';
import { Documento, DocTipo } from './entities/documento.entity';
import { CreateCausaDto } from './dto/create-causa.dto';
import { StorageService } from 'src/storage/storage.service';
import { User } from 'src/users/entities/user.entity';
import { extname } from 'path';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from 'src/mail/mail.service'; 
import { LessThan } from 'typeorm';
import { Evento } from './entities/evento.entity';
import { Between } from 'typeorm'; // Agregá 'Between'
import { ILike } from 'typeorm';
import { TipoEvento } from './entities/evento.entity'; // Importá el Enum

@Injectable()
export class CausasService {
  
  constructor(
    @InjectRepository(Causa) private readonly causaRepo: Repository<Causa>,
    @InjectRepository(Documento) private readonly docRepo: Repository<Documento>,

    // AGREGAR ESTO:
    @InjectRepository(Evento) private readonly eventoRepo: Repository<Evento>,

    private readonly storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  // --- 1. VALIDACIÓN DE ARCHIVOS (Ahora soporta Office) ---
  private validarArchivo(file: Express.Multer.File) {
    const permitidos = [
      'application/pdf', 
      'image/jpeg', 
      'image/png',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ];

    if (!permitidos.includes(file.mimetype)) {
      throw new BadRequestException(`Formato no permitido: ${file.originalname}. Solo PDF, Word, Excel o Imágenes.`);
    }
    
    // Máximo 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('El archivo es muy pesado (Máx 10MB).');
    }
  }

  // --- 2. CREAR CAUSA ---
  async create(dto: CreateCausaDto, usuario: User) {
    // Si el usuario es ADMIN, puede crear; si es otro rol, vemos reglas de negocio (por ahora lo dejamos abierto)
    
    const nuevaCausa = this.causaRepo.create({
      ...dto,
      abogado: usuario, // Asignamos al creador como el abogado a cargo
      // Si vino clienteId en el DTO, TypeORM lo maneja si configuramos la relación, 
      // pero por simplicidad inicial asumimos que lo cargamos después o es null.
    });

    return this.causaRepo.save(nuevaCausa);
  }

  // --- 3. SUBIR DOCUMENTO A UNA CAUSA ---
  async adjuntarDocumento(causaId: string, file: Express.Multer.File, usuario: User) {
    const causa = await this.findOne(causaId, usuario); // Verificamos acceso primero
    
    this.validarArchivo(file);

    // Subir a Cloudflare R2 / S3
    const extension = extname(file.originalname);
    const nombreUnico = `causa-${causa.nro_expediente || 'sn'}-${Date.now()}${extension}`;
    const path = await this.storageService.uploadFile(file, 'expedientes', nombreUnico);

    // Determinar tipo para la DB
    let tipoDoc = DocTipo.OTRO;
    if (file.mimetype.includes('pdf')) tipoDoc = DocTipo.PDF;
    else if (file.mimetype.includes('image')) tipoDoc = DocTipo.IMAGEN;
    else if (file.mimetype.includes('word') || file.mimetype.includes('doc')) tipoDoc = DocTipo.WORD;
    else if (file.mimetype.includes('excel') || file.mimetype.includes('sheet')) tipoDoc = DocTipo.EXCEL;

    // Guardar referencia en DB
    const nuevoDoc = this.docRepo.create({
      nombre_archivo: file.originalname,
      path_r2: path,
      tipo: tipoDoc,
      causa: causa
    });

    return this.docRepo.save(nuevoDoc);
  }

  async search(termino: string) {
    return this.causaRepo.find({
      where: [
        { caratula: ILike(`%${termino}%`) },
        { nro_expediente: ILike(`%${termino}%`) }
      ],
      take: 5 // Para que el dropdown no sea infinito
    });
  }

  // --- 4. CONSULTAS ---

  // Ver TODAS mis causas
  async findAll(usuario: User) {
    return this.causaRepo.find({
      where: [
        { abogado: { id: usuario.id } }, // Las que gestiono
        { cliente: { id: usuario.id } }  // O las que soy cliente (para el futuro)
      ],
      order: { updatedAt: 'DESC' }
    });
  }

  // Ver UNA causa (y actualizar "ultima_revision")
  async findOne(id: string, usuario: User) {
    const causa = await this.causaRepo.findOne({ 
      where: { id },
      relations: ['documentos', 'abogado', 'cliente', 'eventos'] 
    });

    if (!causa) throw new NotFoundException('Expediente no encontrado');

    // Seguridad básica: Solo el abogado o el cliente pueden ver
    if (causa.abogado.id !== usuario.id && causa.cliente?.id !== usuario.id && usuario.role !== 'Admin') {
       throw new ForbiddenException('No tenés permiso para ver este expediente.');
    }

    // 🔥 LA CLAVE DEL LEXDOCTOR: Actualizar "ultima_revision" si es el abogado quien mira
    if (causa.abogado.id === usuario.id) {
      // Solo actualizamos si pasó más de 1 hora para no spammear la DB
      const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
      if (causa.ultima_revision < haceUnaHora) {
          causa.ultima_revision = new Date();
          await this.causaRepo.save(causa);
          // console.log(`🔄 Revisión actualizada para causa ${causa.caratula}`);
      }
    }

    return causa;
  }

  // --- 5. DESCARGAR (Generar URL firmada) ---
  async getLinkDescarga(docId: string, usuario: User) {
    // Buscamos el documento y chequeamos permisos
    const doc = await this.docRepo.findOne({ 
      where: { id: docId },
      relations: ['causa', 'causa.abogado', 'causa.cliente']
    });

    if (!doc) throw new NotFoundException('Documento no encontrado');

    const causa = doc.causa;
    if (causa.abogado.id !== usuario.id && causa.cliente?.id !== usuario.id && usuario.role !== 'Admin') {
       throw new ForbiddenException('No tenés permiso para descargar este archivo.');
    }

    // Generamos el link temporal con R2
    const url = await this.storageService.createSignedUrl(doc.path_r2);
    return { url };
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async verificarCausasDormidas() {
    console.log('⏰ Iniciando chequeo de expedientes inactivos...');

    // Definimos "Inactivo" como más de 15 días sin revisar
    const limiteDias = 10;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - limiteDias);

    // Buscamos causas cuya ultima_revision sea MENOR a la fecha límite
    // Y que NO estén terminadas (Archivada, Sentencia, etc.)
    const causasDormidas = await this.causaRepo.find({
      where: {
        ultima_revision: LessThan(fechaLimite),
        // Podríamos filtrar estado != 'Archivada', pero hagámoslo simple por ahora
      },
      relations: ['abogado']
    });

    console.log(`🔎 Se encontraron ${causasDormidas.length} causas dormidas.`);

    for (const causa of causasDormidas) {
      // Calculamos días exactos para el mail
      const dias = Math.floor((new Date().getTime() - causa.ultima_revision.getTime()) / (1000 * 3600 * 24));

      // Enviamos la alerta
      await this.mailService.sendAlertaInactividad(
        causa.abogado.email,
        causa.abogado.nombre,
        causa.caratula,
        dias
      );

      console.log(`📧 Alerta enviada a ${causa.abogado.email} por causa: ${causa.caratula}`);
    }
  }

  async crearEvento(causaId: string, datosEvento: any, user: User) { 
    
    // 2. Se lo pasamos al findOne para que no chille
    const causa = await this.findOne(causaId, user); 
    
    const nuevoEvento = this.eventoRepo.create({
      ...datosEvento,
      titulo: datosEvento.titulo,
      fecha: new Date(datosEvento.fecha), // Aseguramos que sea fecha
      tipo: datosEvento.tipo,
      descripcion: datosEvento.descripcion,
      causa: causa, 
    });

    return this.eventoRepo.save(nuevoEvento);
  }

  async obtenerProximosEventos(user: User) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Desde el inicio del día

    return this.eventoRepo.find({
      where: {
        fecha: MoreThanOrEqual(hoy), // Solo futuros o de hoy
        causa: {
          abogado: { id: user.id } // Solo de este abogado
        }
      },
      relations: ['causa'], // Para saber de qué expediente es
      order: {
        fecha: 'ASC' // Los más urgentes primero
      },
      take: 5 // Traeme solo los 5 próximos
    });
  }

  async remove(id: string, user: User) {
    // 1. Buscamos la causa asegurando que sea del usuario
    const causa = await this.findOne(id, user);
    
    // 2. Si existe, la borramos (TypeORM borra eventos y docs en cascada si está configurado)
    return this.causaRepo.remove(causa);
  }

  // --- 9. ELIMINAR UN EVENTO ESPECÍFICO ---
  async removeEvento(eventoId: string, user: User) {
    // Buscamos el evento y chequeamos que la causa pertenezca al usuario
    const evento = await this.eventoRepo.findOne({
      where: { id: eventoId },
      relations: ['causa', 'causa.abogado']
    });

    if (!evento) {
      throw new Error('Evento no encontrado');
    }

    if (evento.causa.abogado.id !== user.id) {
      throw new Error('No tenés permiso para borrar este evento');
    }

    return this.eventoRepo.remove(evento);
  }

  // --- 10. TRAER TODOS LOS EVENTOS (PARA EL CALENDARIO) ---
  async obtenerTodosEventos(user: User) {
    return this.eventoRepo.find({
      where: {
        causa: { abogado: { id: user.id } }
      },
      relations: ['causa'],
      order: { fecha: 'ASC' }
    });
  }

  async update(id: string, attrs: Partial<Causa>, user: User) {
    // 1. Buscamos la causa y verificamos que sea del usuario
    const causa = await this.findOne(id, user);

    // 2. Actualizamos solo los campos que nos manden
    Object.assign(causa, attrs);

    // 3. Guardamos
    return this.causaRepo.save(causa);
  }

  // --- 12. ESTADÍSTICAS GENERALES ---
  async obtenerEstadisticas(user: User) {
    // 1. Total de Causas
    const total = await this.causaRepo.count({ 
      where: { abogado: { id: user.id } } 
    });
    
    // 2. Causas esperando Sentencia
    const enSentencia = await this.causaRepo.count({ 
      where: { 
        abogado: { id: user.id },
        // ACÁ ESTÁ LA CLAVE: Usamos el Enum, no el texto suelto
        estado: CausaEstado.SENTENCIA // (O CausaEstado.SENTENCIA, fijate cómo te lo autocompleta)
      } 
    });

    // 3. Audiencias de este mes (Lo urgente)
    const hoy = new Date();
    const finDeMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); // Último día del mes actual

    const audienciasMes = await this.eventoRepo.count({
      where: {
        causa: { abogado: { id: user.id } },
        tipo: TipoEvento.AUDIENCIA,
        fecha: Between(hoy, finDeMes)
      }
    });

    return { total, enSentencia, audienciasMes };
  }
}