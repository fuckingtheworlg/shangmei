import { Injectable } from '@nestjs/common';
import { ChangeAction, ChangeTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';
import { resolveFactoryScope } from '../../common/utils/scope.util';

export interface ChangeLogQuery {
  factoryId?: number;
  userId?: number;
  targetType?: ChangeTargetType;
  action?: ChangeAction;
  keyword?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ChangeLogService {
  constructor(private prisma: PrismaService) {}

  async list(current: UserPayload, q: ChangeLogQuery) {
    const scoped = resolveFactoryScope(current, q.factoryId);
    const where: Prisma.ChangeLogWhereInput = {
      factoryId: scoped,
      userId: q.userId,
      targetType: q.targetType,
      action: q.action,
      targetName: q.keyword ? { contains: q.keyword } : undefined,
      createdAt: {
        gte: q.startTime ? new Date(q.startTime) : undefined,
        lte: q.endTime ? new Date(q.endTime) : undefined,
      },
    };
    const page = q.page && q.page > 0 ? q.page : 1;
    const pageSize = q.pageSize && q.pageSize > 0 ? Math.min(q.pageSize, 200) : 20;
    const [total, rows] = await Promise.all([
      this.prisma.changeLog.count({ where }),
      this.prisma.changeLog.findMany({
        where,
        include: { user: true, factory: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      rows: rows.map((r) => ({
        id: r.id,
        factoryId: r.factoryId,
        factoryName: r.factory.name,
        userId: r.userId,
        userName: r.user.name,
        targetType: r.targetType,
        targetId: r.targetId,
        targetName: r.targetName,
        beforeQty: r.beforeQty,
        afterQty: r.afterQty,
        delta: r.delta,
        action: r.action,
        remark: r.remark,
        createdAt: r.createdAt,
      })),
    };
  }
}
