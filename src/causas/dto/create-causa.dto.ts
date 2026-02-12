import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CausaFuero, CausaEstado } from '../entities/causa.entity';

export class CreateCausaDto {
  
  @IsNotEmpty()
  @IsString()
  caratula: string;

  @IsOptional()
  @IsString()
  nro_expediente?: string;

  @IsOptional()
  @IsString()
  juzgado?: string;

  @IsOptional()
  @IsEnum(CausaFuero)
  fuero?: CausaFuero;

  @IsOptional()
  @IsEnum(CausaEstado)
  estado?: CausaEstado;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsString()
  @IsOptional()
  telefono_cliente?: string;

  // Opcional: Si ya querés asociar un cliente al crearla
  @IsOptional()
  @IsUUID()
  clienteId?: string;
}