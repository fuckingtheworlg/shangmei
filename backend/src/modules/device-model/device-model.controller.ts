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
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { DeviceModelService } from './device-model.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

class CreateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsOptional() spec?: string;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() remark?: string;
}
class UpdateDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() spec?: string;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsOptional() remark?: string;
}

@Controller('device-model')
@UseGuards(RolesGuard)
export class DeviceModelController {
  constructor(private service: DeviceModelService) {}

  @Get()
  list(@Query('keyword') keyword?: string) {
    return this.service.list(keyword);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
