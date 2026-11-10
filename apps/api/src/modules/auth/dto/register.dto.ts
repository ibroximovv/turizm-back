import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** E.164: "+" followed by 8-15 digits, first digit non-zero. */
export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** "+998 (90) 123-45-67" / "998901234567" -> "+998901234567". Non-strings pass through to fail validation. */
export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/[\s\-()]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ example: 'Aziz Karimov', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: '+998901234567', description: 'International format; spaces, dashes and brackets are ignored' })
  @Transform(({ value }) => normalizePhone(value))
  @IsString()
  @Matches(PHONE_REGEX, { message: 'phone must be a valid international phone number, e.g. +998901234567' })
  phone!: string;

  @ApiPropertyOptional({ example: 'aziz@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() || undefined : value))
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ example: 'Secret123', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
