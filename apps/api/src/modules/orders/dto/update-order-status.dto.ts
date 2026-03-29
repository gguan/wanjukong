import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
