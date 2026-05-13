import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

class UpdateProfileDto {
  @IsString() @IsOptional() @MaxLength(20)
  name?: string;

  @IsString() @IsOptional()
  avatarUrl?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.username, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: UserPayload) {
    return this.auth.me(user.sub);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: UserPayload, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.sub, dto);
  }
}
