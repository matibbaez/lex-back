import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Causa } from './causa.entity';

export enum TipoEvento {
  AUDIENCIA = 'Audiencia',
  VENCIMIENTO = 'Vencimiento',
  TRAMITE = 'Trámite',
  OTRO = 'Otro',
}

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titulo: string; // Ej: "Audiencia de Conciliación"

  @Column({ type: 'timestamp' })
  fecha: Date; // Ej: 2026-02-25 10:00:00

  @Column({
    type: 'enum',
    enum: TipoEvento,
    default: TipoEvento.OTRO
  })
  tipo: TipoEvento;

  @Column({ nullable: true })
  descripcion: string;

  // Relación con la Causa
  @ManyToOne(() => Causa, (causa) => causa.eventos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'causa_id' })
  causa: Causa;
}