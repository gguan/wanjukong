import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateContactDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(1, 200)
  subject!: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  orderNumber?: string;

  @IsString()
  @Length(1, 5000)
  message!: string;

  /**
   * Browser locale — normalized server-side. Accepts any string; we normalize
   * to our supported set (en/ja/zh-CN/zh-TW) and fall back to 'en' otherwise.
   */
  @IsString()
  @IsOptional()
  @MaxLength(35)
  locale?: string;
}
