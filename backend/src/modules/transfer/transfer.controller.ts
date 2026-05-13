import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ChangeTargetType, UserRole } from '@prisma/client';
import { TransferService } from './transfer.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

class TransferDto {
  @IsInt() fromFactoryId!: number;
  @IsInt() toFactoryId!: number;
  @IsEnum(ChangeTargetType) targetType!: ChangeTargetType;
  @IsInt() targetId!: number;
  @IsInt() @Min(1) quantity!: number;
  @IsString() @IsOptional() remark?: string;
}

@Controller('transfer')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class TransferController {
  constructor(private service: TransferService) {}

  @Post()
  transfer(@CurrentUser() user: UserPayload, @Body() dto: TransferDto) {
    return this.service.transfer(user, dto);
  }
}
