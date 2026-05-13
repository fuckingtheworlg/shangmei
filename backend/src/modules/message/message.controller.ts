import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';

@Controller('message')
export class MessageController {
  constructor(private service: MessageService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.list(user, page ?? 1, pageSize ?? 20);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: UserPayload) {
    return this.service.unreadCount(user);
  }
}
