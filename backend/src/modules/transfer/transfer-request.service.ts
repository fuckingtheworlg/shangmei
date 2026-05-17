import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChangeAction,
  ChangeTargetType,
  Prisma,
  TransferRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';

export interface CreateRequestInput {
  fromFactoryId: number;
  toFactoryId: number;
  targetType: ChangeTargetType;
  targetId: number;
  quantity: number;
  applicantRemark?: string;
}

@Injectable()
export class TransferRequestService {
  constructor(private prisma: PrismaService) {}

  async create(current: UserPayload, input: CreateRequestInput) {
    if (input.fromFactoryId === input.toFactoryId) {
      throw new BadRequestException('调入调出工厂不能相同');
    }
    if (input.quantity <= 0) throw new BadRequestException('数量必须大于 0');

    // 分厂只能从本厂发起调出
    if (current.role !== 'SUPER_ADMIN' && input.fromFactoryId !== current.factoryId) {
      throw new BadRequestException('分厂只能从本厂发起调出');
    }

    const [from, to] = await Promise.all([
      this.prisma.factory.findUnique({ where: { id: input.fromFactoryId } }),
      this.prisma.factory.findUnique({ where: { id: input.toFactoryId } }),
    ]);
    if (!from || !to) throw new NotFoundException('工厂不存在');

    let targetName = '';
    if (input.targetType === ChangeTargetType.DEVICE) {
      const d = await this.prisma.deviceModel.findUnique({ where: { id: input.targetId } });
      if (!d) throw new NotFoundException('设备型号不存在');
      targetName = d.spec ? `${d.name} / ${d.spec}` : d.name;
    } else {
      const p = await this.prisma.partModel.findUnique({ where: { id: input.targetId } });
      if (!p) throw new NotFoundException('配件型号不存在');
      targetName = p.spec ? `${p.name} / ${p.spec}` : p.name;
    }

    return this.prisma.transferRequest.create({
      data: {
        fromFactoryId: input.fromFactoryId,
        toFactoryId: input.toFactoryId,
        targetType: input.targetType,
        targetId: input.targetId,
        targetName,
        quantity: input.quantity,
        applicantId: current.sub,
        applicantRemark: input.applicantRemark,
        status: TransferRequestStatus.PENDING,
      },
    });
  }

  async list(
    current: UserPayload,
    params: { status?: TransferRequestStatus; page?: number; pageSize?: number },
  ) {
    const where: Prisma.TransferRequestWhereInput = { status: params.status };
    if (current.role !== 'SUPER_ADMIN') {
      where.OR = [
        { fromFactoryId: current.factoryId },
        { toFactoryId: current.factoryId },
        { applicantId: current.sub },
      ];
    }
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
    const [total, rows] = await Promise.all([
      this.prisma.transferRequest.count({ where }),
      this.prisma.transferRequest.findMany({
        where,
        include: { fromFactory: true, toFactory: true, applicant: true, reviewer: true },
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
        fromFactoryId: r.fromFactoryId,
        fromFactoryName: r.fromFactory.name,
        toFactoryId: r.toFactoryId,
        toFactoryName: r.toFactory.name,
        targetType: r.targetType,
        targetId: r.targetId,
        targetName: r.targetName,
        quantity: r.quantity,
        status: r.status,
        applicantId: r.applicantId,
        applicantName: r.applicant.name,
        applicantRemark: r.applicantRemark,
        reviewerId: r.reviewerId,
        reviewerName: r.reviewer?.name,
        reviewRemark: r.reviewRemark,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
      })),
    };
  }

  /** 中心通过申请：执行实际调拨（事务） */
  async approve(current: UserPayload, id: number, reviewRemark?: string) {
    if (current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('仅彬渭运营中心可审批');
    }
    const req = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('申请不存在');
    if (req.status !== TransferRequestStatus.PENDING) {
      throw new BadRequestException('该申请已处理');
    }

    return this.prisma.$transaction(async (tx) => {
      // 执行实际调拨逻辑（同 TransferService.transfer，但内联以共用事务）
      await this.executeTransfer(tx, {
        fromFactoryId: req.fromFactoryId,
        toFactoryId: req.toFactoryId,
        targetType: req.targetType,
        targetId: req.targetId,
        targetName: req.targetName,
        quantity: req.quantity,
        operatorId: current.sub,
        remark: req.applicantRemark || undefined,
      });

      return tx.transferRequest.update({
        where: { id },
        data: {
          status: TransferRequestStatus.COMPLETED,
          reviewerId: current.sub,
          reviewRemark,
          reviewedAt: new Date(),
        },
      });
    });
  }

  async reject(current: UserPayload, id: number, reviewRemark: string) {
    if (current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('仅彬渭运营中心可审批');
    }
    const req = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('申请不存在');
    if (req.status !== TransferRequestStatus.PENDING) {
      throw new BadRequestException('该申请已处理');
    }
    return this.prisma.transferRequest.update({
      where: { id },
      data: {
        status: TransferRequestStatus.REJECTED,
        reviewerId: current.sub,
        reviewRemark,
        reviewedAt: new Date(),
      },
    });
  }

  async cancel(current: UserPayload, id: number) {
    const req = await this.prisma.transferRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('申请不存在');
    if (req.applicantId !== current.sub && current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('只能取消自己的申请');
    }
    if (req.status !== TransferRequestStatus.PENDING) {
      throw new BadRequestException('该申请已处理');
    }
    return this.prisma.transferRequest.update({
      where: { id },
      data: { status: TransferRequestStatus.CANCELLED },
    });
  }

  /** 待审批数（首页徽标用） */
  async pendingCount(current: UserPayload) {
    const where: Prisma.TransferRequestWhereInput = { status: TransferRequestStatus.PENDING };
    if (current.role === 'SUPER_ADMIN') {
      return { count: await this.prisma.transferRequest.count({ where }) };
    }
    where.OR = [{ fromFactoryId: current.factoryId }, { toFactoryId: current.factoryId }, { applicantId: current.sub }];
    return { count: await this.prisma.transferRequest.count({ where }) };
  }

  /** 真正执行调拨（事务内）—— 供本服务和 TransferService 复用 */
  async executeTransfer(
    tx: Prisma.TransactionClient,
    input: {
      fromFactoryId: number;
      toFactoryId: number;
      targetType: ChangeTargetType;
      targetId: number;
      targetName: string;
      quantity: number;
      operatorId: number;
      remark?: string;
    },
  ) {
    if (input.targetType === ChangeTargetType.DEVICE) {
      const fromStock = await tx.factoryDeviceStock.findUnique({
        where: {
          factoryId_deviceModelId: {
            factoryId: input.fromFactoryId,
            deviceModelId: input.targetId,
          },
        },
      });
      if (!fromStock || fromStock.qtyInUse + fromStock.qtyStandby + fromStock.qtyIdle < input.quantity) {
        throw new BadRequestException('调出工厂可用库存不足（不含停用）');
      }
      // 优先从备用 → 闲置 → 在用 扣减
      let remain = input.quantity;
      let inUse = fromStock.qtyInUse;
      let standby = fromStock.qtyStandby;
      let idle = fromStock.qtyIdle;
      const takeStandby = Math.min(remain, standby);
      standby -= takeStandby; remain -= takeStandby;
      const takeIdle = Math.min(remain, idle);
      idle -= takeIdle; remain -= takeIdle;
      const takeInUse = remain;
      inUse -= takeInUse;
      const fromTotal = inUse + standby + idle + fromStock.qtyStopped;
      await tx.factoryDeviceStock.update({
        where: { id: fromStock.id },
        data: {
          qtyInUse: inUse,
          qtyStandby: standby,
          qtyIdle: idle,
          quantity: fromTotal,
        },
      });

      // 调入方默认进"备用"桶
      const toStock = await tx.factoryDeviceStock.upsert({
        where: {
          factoryId_deviceModelId: {
            factoryId: input.toFactoryId,
            deviceModelId: input.targetId,
          },
        },
        create: {
          factoryId: input.toFactoryId,
          deviceModelId: input.targetId,
          qtyStandby: input.quantity,
          quantity: input.quantity,
        },
        update: {
          qtyStandby: { increment: input.quantity },
          quantity: { increment: input.quantity },
        },
      });

      await tx.changeLog.createMany({
        data: [
          {
            factoryId: input.fromFactoryId,
            userId: input.operatorId,
            targetType: ChangeTargetType.DEVICE,
            targetId: input.targetId,
            targetName: input.targetName,
            beforeQty: fromStock.quantity,
            afterQty: fromTotal,
            delta: -input.quantity,
            action: ChangeAction.TRANSFER_OUT,
            remark: input.remark,
          },
          {
            factoryId: input.toFactoryId,
            userId: input.operatorId,
            targetType: ChangeTargetType.DEVICE,
            targetId: input.targetId,
            targetName: input.targetName,
            beforeQty: toStock.quantity - input.quantity,
            afterQty: toStock.quantity,
            delta: input.quantity,
            action: ChangeAction.TRANSFER_IN,
            remark: input.remark,
          },
        ],
      });
    } else {
      const fromStock = await tx.factoryPartStock.findUnique({
        where: {
          factoryId_partModelId: { factoryId: input.fromFactoryId, partModelId: input.targetId },
        },
      });
      if (!fromStock || fromStock.quantity < input.quantity) {
        throw new BadRequestException('调出工厂库存不足');
      }
      await tx.factoryPartStock.update({
        where: { id: fromStock.id },
        data: { quantity: fromStock.quantity - input.quantity },
      });
      const toStock = await tx.factoryPartStock.upsert({
        where: {
          factoryId_partModelId: { factoryId: input.toFactoryId, partModelId: input.targetId },
        },
        create: {
          factoryId: input.toFactoryId,
          partModelId: input.targetId,
          quantity: input.quantity,
        },
        update: { quantity: { increment: input.quantity } },
      });
      await tx.changeLog.createMany({
        data: [
          {
            factoryId: input.fromFactoryId,
            userId: input.operatorId,
            targetType: ChangeTargetType.PART,
            targetId: input.targetId,
            targetName: input.targetName,
            beforeQty: fromStock.quantity,
            afterQty: fromStock.quantity - input.quantity,
            delta: -input.quantity,
            action: ChangeAction.TRANSFER_OUT,
            remark: input.remark,
          },
          {
            factoryId: input.toFactoryId,
            userId: input.operatorId,
            targetType: ChangeTargetType.PART,
            targetId: input.targetId,
            targetName: input.targetName,
            beforeQty: toStock.quantity - input.quantity,
            afterQty: toStock.quantity,
            delta: input.quantity,
            action: ChangeAction.TRANSFER_IN,
            remark: input.remark,
          },
        ],
      });
    }

    await tx.transferMessage.create({
      data: {
        fromFactoryId: input.fromFactoryId,
        toFactoryId: input.toFactoryId,
        targetType: input.targetType,
        targetId: input.targetId,
        targetName: input.targetName,
        quantity: input.quantity,
        operatorId: input.operatorId,
        remark: input.remark,
      },
    });
  }
}
