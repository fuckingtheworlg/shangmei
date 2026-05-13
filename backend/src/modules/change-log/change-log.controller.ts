import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ChangeAction, ChangeTargetType } from '@prisma/client';
import { ChangeLogService } from './change-log.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

@Controller('change-log')
export class ChangeLogController {
  constructor(private service: ChangeLogService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('targetType') targetType?: ChangeTargetType,
    @Query('action') action?: ChangeAction,
    @Query('keyword') keyword?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
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
