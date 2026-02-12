import { PartialType } from '@nestjs/mapped-types';
import { CreateCausaDto } from './create-causa.dto';

export class UpdateCausaDto extends PartialType(CreateCausaDto) {}
