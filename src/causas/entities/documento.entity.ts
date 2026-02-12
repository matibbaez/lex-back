import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Causa } from './causa.entity';

export enum DocTipo {
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  IMAGEN = 'img',
  OTRO = 'otro'
}

@Entity('documentos')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre_archivo: string; // Ej: "Demanda_Final.docx"

  @Column()
  path_r2: string; // La ruta en la nube (Cloudflare/S3)

  @Column({
    type: 'enum',
    enum: DocTipo,
    default: DocTipo.PDF
  })
  tipo: DocTipo;

  @CreateDateColumn()
  fecha_carga: Date;

  @ManyToOne(() => Causa, (causa) => causa.documentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'causa_id' })
  causa: Causa;
}