import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../types/user-payload.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserPayload;
  },
);
