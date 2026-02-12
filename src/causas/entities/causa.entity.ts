import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Documento } from './documento.entity'; // Ahora la creamos
import { Evento } from './evento.entity';

export enum CausaEstado {
  INICIO = 'Inicio',
  PRUEBA = 'Etapa Probatoria',
  ALEGATOS = 'Alegatos',
  SENTENCIA = 'Sentencia',
  APELACION = 'Apelación',
  ARCHIVADA = 'Archivada',
}

export enum CausaFuero {
  CIVIL = 'Civil',
  COMERCIAL = 'Comercial',
  LABORAL = 'Laboral',
  PENAL = 'Penal',
  FAMILIA = 'Familia',
  ADMINISTRATIVO = 'Administrativo'
}

@Entity('causas')
export class Causa {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 1. Datos Identificatorios
  @Column() 
  caratula: string; // Ej: "GOMEZ c/ PEREZ s/ DAÑOS"

  @Column({ nullable: true }) 
  nro_expediente: string; // Ej: "12345/2023"

  @Column({ nullable: true }) 
  juzgado: string; // Ej: "Juzgado Civil N° 4"

  @Column({ nullable: true })
  telefono_cliente: string;

  @Column({
    type: 'enum',
    enum: CausaFuero,
    default: CausaFuero.CIVIL
  })
  fuero: CausaFuero;

  // 2. Gestión y Alertas
  @Column({
    type: 'enum',
    enum: CausaEstado,
    default: CausaEstado.INICIO
  })
  estado: CausaEstado;

  @Column({ nullable: true, type: 'text' }) 
  observaciones: string;

  @CreateDateColumn() 
  fecha_alta: Date;

  @UpdateDateColumn()
  updatedAt: Date; // Sirve para saber cuándo fue el último movimiento real

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  ultima_revision: Date; // CRÍTICO: Acá vamos a guardar cuándo el abogado "miró" la causa por última vez.

  // 3. Relaciones
  
  // El Abogado/Estudio que lleva la causa
  @ManyToOne(() => User, (user) => user.causas_gestionadas)
  @JoinColumn({ name: 'abogado_id' })
  abogado: User;

  // El Cliente (Si querés que la clienta vea sus cosas)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cliente_id' })
  cliente: User | null;

  // 4. Documentación (Relación 1 a Muchos)
  @OneToMany(() => Documento, (doc) => doc.causa, { cascade: true })
  documentos: Documento[];

  // AGREGAR ESTO:
  @OneToMany(() => Evento, (evento) => evento.causa, { cascade: true })
  eventos: Evento[];
}