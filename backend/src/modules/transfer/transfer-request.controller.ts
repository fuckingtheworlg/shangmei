import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query,
} from '@nestjs/common';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ChangeTargetType, TransferRequestStatus } from '@prisma/client';
import { TransferRequestService } from './transfer-request.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';

class CreateReqDto {
  @IsInt() fromFactoryId!: number;
  @IsInt() toFactoryId!: number;
  @IsEnum(ChangeTargetType) targetType!: ChangeTargetType;
  @IsInt() targetId!: number;
  @IsInt() @Min(1) quantity!: number;
  @IsString() @IsOptional() applicantRemark?: string;
}

class ApproveDto {
  @IsString() @IsOptional() reviewRemark?: string;
}

class RejectDto {
  @IsString() @IsNotEmpty() reviewRemark!: string;
}

@Controller('transfer-request')
export class TransferRequestController {
  constructor(private service: TransferRequestService) {}

  @Post()
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateReqDto) {
    return this.service.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: TransferRequestStatus,
    @Query('page', new OptionalParseIntPipe()) page?: number,
    @Query('pageSize', new OptionalParseIntPipe()) pageSize?: number,
  ) {
    return this.service.list(user, { status, page, pageSize });
  }

  @Get('pending-count')
  pending(@CurrentUser() user: UserPayload) {
    return this.service.pendingCount(user);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveDto,
  ) {
    return this.service.approve(user, id, dto.reviewRemark);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDto,
  ) {
    return this.service.reject(user, id, dto.reviewRemark);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: UserPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(user, id);
  }
}
