import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CategoryService } from './category.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

class CreateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsOptional() icon?: string;
  @IsInt() @IsOptional() sortOrder?: number;
  @IsString() @IsOptional() remark?: string;
}
class UpdateDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() icon?: string;
  @IsInt() @IsOptional() sortOrder?: number;
  @IsString() @IsOptional() remark?: string;
}

@Controller('category')
@UseGuards(RolesGuard)
export class CategoryController {
  constructor(private service: CategoryService) {}

  @Get()
  list() { return this.service.list(); }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
