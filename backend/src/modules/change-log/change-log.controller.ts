import { Controller, Get, Query } from '@nestjs/common';
import { ChangeAction, ChangeTargetType } from '@prisma/client';
import { ChangeLogService } from './change-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';

@Controller('change-log')
export class ChangeLogController {
  constructor(private service: ChangeLogService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
    @Query('userId', new OptionalParseIntPipe()) userId?: number,
    @Query('targetType') targetType?: ChangeTargetType,
    @Query('action') action?: ChangeAction,
    @Query('keyword') keyword?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page', new OptionalParseIntPipe()) page?: number,
    @Query('pageSize', new OptionalParseIntPipe()) pageSize?: number,
  ) {
    return this.service.list(user, {
      factoryId,
      userId,
      targetType,
      action,
      keyword,
      startTime,
      endTime,
      page,
      pageSize,
    });
  }
}
