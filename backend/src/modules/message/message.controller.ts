import { Controller, Get, Query } from '@nestjs/common';
import { MessageService } from './message.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';

@Controller('message')
export class MessageController {
  constructor(private service: MessageService) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query('page', new OptionalParseIntPipe()) page?: number,
    @Query('pageSize', new OptionalParseIntPipe()) pageSize?: number,
  ) {
    return this.service.list(user, page ?? 1, pageSize ?? 20);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: UserPayload) {
    return this.service.unreadCount(user);
  }
}
