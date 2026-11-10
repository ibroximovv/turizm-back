import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { User } from '@nestjs-template/types';
import { BEARER_AUTH } from '../../swagger/swagger.setup';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.types';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth(BEARER_AUTH)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse()
  me(@CurrentUser() user: AuthUser): Promise<User> {
    return this.usersService.findOne(user.id);
  }
}
