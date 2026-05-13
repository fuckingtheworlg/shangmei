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
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { PartModelService } from './part-model.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

class CreateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsOptional() spec?: string;
  @IsString() @IsOptional() unit?: string;
  @IsInt() @IsOptional() deviceModelId?: number;
  @IsString() @IsOptional() remark?: string;
}
class UpdateDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() spec?: string;
  @IsString() @IsOptional() unit?: string;
  @IsInt() @IsOptional() deviceModelId?: number;
  @IsString() @IsOptional() remark?: string;
}

@Controller('part-model')
@UseGuards(RolesGuard)
export class PartModelController {
  constructor(private service: PartModelService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('deviceModelId', new ParseIntPipe({ optional: true })) deviceModelId?: number,
  ) {
    return this.service.list({ keyword, deviceModelId });
  }

  // 厂管理员和中心都能新增配件型号
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.FACTORY_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
