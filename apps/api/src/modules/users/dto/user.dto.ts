import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { User, UserRole } from '@nestjs-template/types';

const USER_ROLES: UserRole[] = ['USER', 'ADMIN'];

/** Swagger model of the public `User` shape. */
export class UserDto implements User {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Aziz Karimov' }) fullName!: string;
  @ApiProperty({ example: '+998901234567' }) phone!: string;
  @ApiPropertyOptional({ type: String, nullable: true, example: 'aziz@example.com' }) email!: string | null;
  @ApiProperty({ enum: USER_ROLES }) role!: UserRole;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) lastLoginAt!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
