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
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { DeviceStatus, StockService } from './stock.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';

class UpsertDeviceDto {
  @IsInt() factoryId!: number;
  @IsInt() deviceModelId!: number;
  @IsInt() @Min(0) @IsOptional() qtyInUse?: number;
  @IsInt() @Min(0) @IsOptional() qtyStandby?: number;
  @IsInt() @Min(0) @IsOptional() qtyIdle?: number;
  @IsInt() @Min(0) @IsOptional() qtyStopped?: number;
  @IsString() @IsOptional() remark?: string;
}
class UpsertPartDto {
  @IsInt() factoryId!: number;
  @IsInt() partModelId!: number;
  @IsInt() @Min(0) quantity!: number;
  @IsString() @IsOptional() remark?: string;
}
class AdjustDeviceDto {
  @IsInt() delta!: number;
  @IsEnum(['IN_USE', 'STANDBY', 'IDLE', 'STOPPED']) @IsOptional() status?: DeviceStatus;
  @IsString() @IsOptional() remark?: string;
}
class AdjustPartDto {
  @IsInt() delta!: number;
  @IsString() @IsOptional() remark?: string;
}

@Controller('stock')
@UseGuards(RolesGuard)
export class StockController {
  constructor(private service: StockService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: UserPayload,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
  ) {
    return this.service.summary(user, factoryId);
  }

  @Get('by-factory')
  @Roles(UserRole.SUPER_ADMIN)
  byFactory(@CurrentUser() user: UserPayload) {
    return this.service.byFactory(user);
  }

  @Get('daily-trend')
  trend(
    @CurrentUser() user: UserPayload,
    @Query('days', new OptionalParseIntPipe()) days?: number,
  ) {
    return this.service.dailyTrend(user, days ?? 7);
  }

  @Get('devices')
  listDevices(
    @CurrentUser() user: UserPayload,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
    @Query('categoryId', new OptionalParseIntPipe()) categoryId?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.listDevices(user, factoryId, keyword, categoryId);
  }

  @Get('parts')
  listParts(
    @CurrentUser() user: UserPayload,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
    @Query('deviceModelId', new OptionalParseIntPipe()) deviceModelId?: number,
    @Query('categoryId', new OptionalParseIntPipe()) categoryId?: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.listParts(user, { factoryId, deviceModelId, categoryId, keyword });
  }

  @Post('devices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  upsertDevice(@CurrentUser() user: UserPayload, @Body() dto: UpsertDeviceDto) {
    return this.service.upsertDevice(user, dto);
  }

  @Post('parts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  upsertPart(@CurrentUser() user: UserPayload, @Body() dto: UpsertPartDto) {
    return this.service.upsertPart(user, dto);
  }

  @Patch('devices/:id/adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  adjustDevice(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustDeviceDto,
  ) {
    return this.service.adjustDeviceQty(user, id, dto.delta, dto.status, dto.remark);
  }

  @Patch('parts/:id/adjust')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  adjustPart(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustPartDto,
  ) {
    return this.service.adjustPartQty(user, id, dto.delta, dto.remark);
  }

  @Delete('devices/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  removeDevice(@CurrentUser() user: UserPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeDeviceStock(user, id);
  }

  @Delete('parts/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  removePart(@CurrentUser() user: UserPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.removePartStock(user, id);
  }
}
