import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token from register/login/refresh' })
  @IsJWT()
  refreshToken!: string;
}
