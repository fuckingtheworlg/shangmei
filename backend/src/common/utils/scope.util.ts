import { ForbiddenException } from '@nestjs/common';
import { UserPayload } from '../types/user-payload.type';

/**
 * 校验当前用户是否有权限访问目标 factoryId
 * - SUPER_ADMIN（彬渭运营中心）：可访问任何工厂
 * - 其他角色：仅可访问本厂
 * 当未传 targetFactoryId 时返回用户应被限制的 factoryId（中心返回 undefined 表示不限制）
 */
export function resolveFactoryScope(
  user: UserPayload,
  targetFactoryId?: number,
): number | undefined {
  if (user.role === 'SUPER_ADMIN') {
    return targetFactoryId;
  }
  if (targetFactoryId !== undefined && targetFactoryId !== user.factoryId) {
    throw new ForbiddenException('无权访问其他工厂数据');
  }
  return user.factoryId;
}

export function assertCanWriteFactory(user: UserPayload, factoryId: number) {
  if (user.role === 'SUPER_ADMIN') return;
  if (user.role === 'FACTORY_ADMIN' && user.factoryId === factoryId) return;
  throw new ForbiddenException('当前角色无权修改此工厂数据');
}
