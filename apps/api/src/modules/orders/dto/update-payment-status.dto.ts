import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsIn(['UNPAID', 'PAID', 'FAILED', 'REFUNDED'])
  paymentStatus!: string;

  @IsOptional()
  @IsString()
  note?: string;
}
