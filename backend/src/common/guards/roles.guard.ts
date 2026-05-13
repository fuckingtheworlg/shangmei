import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserPayload } from '../types/user-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const user: UserPayload = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('未授权');
    if (!required.includes(user.role)) {
      throw new ForbiddenException('当前角色无权限');
    }
    return true;
  }
}
