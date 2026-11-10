import { ApiProperty } from '@nestjs/swagger';
import type { AuthResponse, AuthTokens } from '@nestjs-template/types';
import { UserDto } from '../../users/dto/user.dto';

export class AuthTokensDto implements AuthTokens {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ enum: ['Bearer'] }) tokenType!: 'Bearer';
  @ApiProperty({ description: 'Access token lifetime in seconds', example: 900 }) expiresIn!: number;
  @ApiProperty({ description: 'Refresh token lifetime in seconds', example: 2592000 }) refreshExpiresIn!: number;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ type: UserDto }) user!: UserDto;
  @ApiProperty({ type: AuthTokensDto }) tokens!: AuthTokensDto;
}
