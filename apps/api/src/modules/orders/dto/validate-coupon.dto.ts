import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsInt()
  @Min(0)
  subtotalCents: number;
}
