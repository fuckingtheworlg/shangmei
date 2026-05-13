import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async list(current: UserPayload, page = 1, pageSize = 20) {
    pageSize = Math.min(pageSize, 100);
    const where: Prisma.TransferMessageWhereInput =
      current.role === 'SUPER_ADMIN'
        ? {}
        : { OR: [{ fromFactoryId: current.factoryId }, { toFactoryId: current.factoryId }] };
    const [total, rows] = await Promise.all([
      this.prisma.transferMessage.count({ where }),
      this.prisma.transferMessage.findMany({
        where,
        include: { fromFactory: true, toFactory: true, operator: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      rows: rows.map((m) => ({
        id: m.id,
        fromFactoryId: m.fromFactoryId,
        fromFactoryName: m.fromFactory.name,
        toFactoryId: m.toFactoryId,
        toFactoryName: m.toFactory.name,
        targetType: m.targetType,
        targetId: m.targetId,
        targetName: m.targetName,
        quantity: m.quantity,
        operatorId: m.operatorId,
        operatorName: m.operator.name,
        remark: m.remark,
        createdAt: m.createdAt,
      })),
    };
  }

  /** 首页徽标用：返回本厂相关的最近 24 小时未读消息数（这里简化为总数） */
  async unreadCount(current: UserPayload) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where: Prisma.TransferMessageWhereInput =
      current.role === 'SUPER_ADMIN'
        ? { createdAt: { gte: yesterday } }
        : {
            createdAt: { gte: yesterday },
            OR: [{ fromFactoryId: current.factoryId }, { toFactoryId: current.factoryId }],
          };
    return { count: await this.prisma.transferMessage.count({ where }) };
  }
}
