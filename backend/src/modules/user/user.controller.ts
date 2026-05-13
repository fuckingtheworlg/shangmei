import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';

class CreateUserDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsInt() factoryId!: number;
  @IsString() @IsOptional() phone?: string;
}

class UpdateUserDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEnum(UserRole) @IsOptional() role?: UserRole;
  @IsBoolean() @IsOptional() active?: boolean;
  @IsInt() @IsOptional() factoryId?: number;
}

class ResetPwdDto {
  @IsString() @MinLength(6) newPassword!: string;
}

@Controller('user')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
export class UserController {
  constructor(private service: UserService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
  ) {
    return this.service.list(user, factoryId);
  }

  @Post()
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateUserDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/reset-password')
  reset(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPwdDto,
  ) {
    return this.service.resetPassword(user, id, dto.newPassword);
  }

  @Delete(':id')
  remove(@CurrentUser() user: UserPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }
}
