import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeAction, ChangeTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';
import { assertCanWriteFactory, resolveFactoryScope } from '../../common/utils/scope.util';

export type DeviceStatus = 'IN_USE' | 'STANDBY' | 'IDLE' | 'STOPPED';

const STATUS_FIELD: Record<DeviceStatus, 'qtyInUse' | 'qtyStandby' | 'qtyIdle' | 'qtyStopped'> = {
  IN_USE: 'qtyInUse',
  STANDBY: 'qtyStandby',
  IDLE: 'qtyIdle',
  STOPPED: 'qtyStopped',
};

const STATUS_LABEL: Record<DeviceStatus, string> = {
  IN_USE: '在用',
  STANDBY: '备用',
  IDLE: '闲置',
  STOPPED: '停用',
};

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async listDevices(current: UserPayload, factoryId?: number, keyword?: string, categoryId?: number) {
    const scoped = resolveFactoryScope(current, factoryId);
    const rows = await this.prisma.factoryDeviceStock.findMany({
      where: {
        factoryId: scoped,
        deviceModel: {
          categoryId: categoryId,
          OR: keyword
            ? [{ name: { contains: keyword } }, { spec: { contains: keyword } }]
            : undefined,
        },
      },
      include: { deviceModel: { include: { category: true } }, factory: true },
      orderBy: [{ factoryId: 'asc' }, { deviceModelId: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      factoryId: r.factoryId,
      factoryName: r.factory.name,
      deviceModelId: r.deviceModelId,
      categoryId: r.deviceModel.categoryId,
      categoryName: r.deviceModel.category?.name,
      name: r.deviceModel.name,
      spec: r.deviceModel.spec,
      unit: r.deviceModel.unit,
      quantity: r.quantity,
      qtyInUse: r.qtyInUse,
      qtyStandby: r.qtyStandby,
      qtyIdle: r.qtyIdle,
      qtyStopped: r.qtyStopped,
      remark: r.remark,
      updatedAt: r.updatedAt,
    }));
  }

  async listParts(
    current: UserPayload,
    params: { factoryId?: number; deviceModelId?: number; categoryId?: number; keyword?: string },
  ) {
    const scoped = resolveFactoryScope(current, params.factoryId);
    const rows = await this.prisma.factoryPartStock.findMany({
      where: {
        factoryId: scoped,
        partModel: {
          deviceModelId: params.deviceModelId,
          deviceModel: params.categoryId ? { categoryId: params.categoryId } : undefined,
          OR: params.keyword
            ? [{ name: { contains: params.keyword } }, { spec: { contains: params.keyword } }]
            : undefined,
        },
      },
      include: {
        partModel: { include: { deviceModel: { include: { category: true } } } },
        factory: true,
      },
      orderBy: [{ factoryId: 'asc' }, { partModelId: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      factoryId: r.factoryId,
      factoryName: r.factory.name,
      partModelId: r.partModelId,
      name: r.partModel.name,
      spec: r.partModel.spec,
      unit: r.partModel.unit,
      deviceModelId: r.partModel.deviceModelId,
      deviceName: r.partModel.deviceModel?.name,
      categoryId: r.partModel.deviceModel?.categoryId,
      categoryName: r.partModel.deviceModel?.category?.name,
      quantity: r.quantity,
      remark: r.remark,
      updatedAt: r.updatedAt,
    }));
  }

  /** 设备库存：传入 4 桶数量，覆盖式写入（quantity 自动 = 4 桶之和） */
  async upsertDevice(
    current: UserPayload,
    data: {
      factoryId: number;
      deviceModelId: number;
      qtyInUse?: number;
      qtyStandby?: number;
      qtyIdle?: number;
      qtyStopped?: number;
      remark?: string;
    },
  ) {
    assertCanWriteFactory(current, data.factoryId);
    const inUse = data.qtyInUse ?? 0;
    const standby = data.qtyStandby ?? 0;
    const idle = data.qtyIdle ?? 0;
    const stopped = data.qtyStopped ?? 0;
    if ([inUse, standby, idle, stopped].some((v) => v < 0)) {
      throw new BadRequestException('数量不能为负');
    }
    const total = inUse + standby + idle + stopped;

    const device = await this.prisma.deviceModel.findUnique({ where: { id: data.deviceModelId } });
    if (!device) throw new NotFoundException('设备型号不存在');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.factoryDeviceStock.findUnique({
        where: {
          factoryId_deviceModelId: {
            factoryId: data.factoryId,
            deviceModelId: data.deviceModelId,
          },
        },
      });
      const beforeQty = existing?.quantity ?? 0;
      const stock = await tx.factoryDeviceStock.upsert({
        where: {
          factoryId_deviceModelId: {
            factoryId: data.factoryId,
            deviceModelId: data.deviceModelId,
          },
        },
        create: {
          factoryId: data.factoryId,
          deviceModelId: data.deviceModelId,
          qtyInUse: inUse,
          qtyStandby: standby,
          qtyIdle: idle,
          qtyStopped: stopped,
          quantity: total,
          remark: data.remark,
        },
        update: {
          qtyInUse: inUse,
          qtyStandby: standby,
          qtyIdle: idle,
          qtyStopped: stopped,
          quantity: total,
          remark: data.remark,
        },
      });
      await this.writeLog(tx, {
        factoryId: data.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.DEVICE,
        targetId: device.id,
        targetName: this.deviceName(device.name, device.spec),
        beforeQty,
        afterQty: total,
        delta: total - beforeQty,
        action: existing ? ChangeAction.UPDATE : ChangeAction.CREATE,
        remark: data.remark,
      });
      return stock;
    });
  }

  async upsertPart(
    current: UserPayload,
    data: { factoryId: number; partModelId: number; quantity: number; remark?: string },
  ) {
    assertCanWriteFactory(current, data.factoryId);
    if (data.quantity < 0) throw new BadRequestException('数量不能为负');
    const part = await this.prisma.partModel.findUnique({ where: { id: data.partModelId } });
    if (!part) throw new NotFoundException('配件型号不存在');

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.factoryPartStock.findUnique({
        where: { factoryId_partModelId: { factoryId: data.factoryId, partModelId: data.partModelId } },
      });
      const beforeQty = existing?.quantity ?? 0;
      const stock = await tx.factoryPartStock.upsert({
        where: { factoryId_partModelId: { factoryId: data.factoryId, partModelId: data.partModelId } },
        create: {
          factoryId: data.factoryId,
          partModelId: data.partModelId,
          quantity: data.quantity,
          remark: data.remark,
        },
        update: { quantity: data.quantity, remark: data.remark },
      });
      await this.writeLog(tx, {
        factoryId: data.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.PART,
        targetId: part.id,
        targetName: this.deviceName(part.name, part.spec),
        beforeQty,
        afterQty: stock.quantity,
        delta: stock.quantity - beforeQty,
        action: existing ? ChangeAction.UPDATE : ChangeAction.CREATE,
        remark: data.remark,
      });
      return stock;
    });
  }

  /** 设备某状态桶 +/- delta */
  async adjustDeviceQty(
    current: UserPayload,
    stockId: number,
    delta: number,
    status: DeviceStatus = 'IN_USE',
    remark?: string,
  ) {
    const row = await this.prisma.factoryDeviceStock.findUnique({
      where: { id: stockId },
      include: { deviceModel: true },
    });
    if (!row) throw new NotFoundException('库存不存在');
    assertCanWriteFactory(current, row.factoryId);
    const field = STATUS_FIELD[status];
    const beforeField = row[field];
    const afterField = beforeField + delta;
    if (afterField < 0) throw new BadRequestException('调整后数量不能为负');
    const beforeTotal = row.quantity;
    const afterTotal = beforeTotal + delta;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.factoryDeviceStock.update({
        where: { id: stockId },
        data: { [field]: afterField, quantity: afterTotal },
      });
      await this.writeLog(tx, {
        factoryId: row.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.DEVICE,
        targetId: row.deviceModelId,
        targetName: `${this.deviceName(row.deviceModel.name, row.deviceModel.spec)} / ${STATUS_LABEL[status]}`,
        beforeQty: beforeTotal,
        afterQty: afterTotal,
        delta,
        action: ChangeAction.UPDATE,
        remark,
      });
      return updated;
    });
  }

  async adjustPartQty(current: UserPayload, stockId: number, delta: number, remark?: string) {
    const row = await this.prisma.factoryPartStock.findUnique({
      where: { id: stockId },
      include: { partModel: true },
    });
    if (!row) throw new NotFoundException('库存不存在');
    assertCanWriteFactory(current, row.factoryId);
    const after = row.quantity + delta;
    if (after < 0) throw new BadRequestException('调整后数量不能为负');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.factoryPartStock.update({
        where: { id: stockId },
        data: { quantity: after },
      });
      await this.writeLog(tx, {
        factoryId: row.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.PART,
        targetId: row.partModelId,
        targetName: this.deviceName(row.partModel.name, row.partModel.spec),
        beforeQty: row.quantity,
        afterQty: after,
        delta,
        action: ChangeAction.UPDATE,
        remark,
      });
      return updated;
    });
  }

  async removeDeviceStock(current: UserPayload, stockId: number) {
    const row = await this.prisma.factoryDeviceStock.findUnique({
      where: { id: stockId },
      include: { deviceModel: true },
    });
    if (!row) throw new NotFoundException('库存不存在');
    assertCanWriteFactory(current, row.factoryId);
    await this.prisma.$transaction(async (tx) => {
      await tx.factoryDeviceStock.delete({ where: { id: stockId } });
      await this.writeLog(tx, {
        factoryId: row.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.DEVICE,
        targetId: row.deviceModelId,
        targetName: this.deviceName(row.deviceModel.name, row.deviceModel.spec),
        beforeQty: row.quantity,
        afterQty: 0,
        delta: -row.quantity,
        action: ChangeAction.DELETE,
      });
    });
    return { ok: true };
  }

  async removePartStock(current: UserPayload, stockId: number) {
    const row = await this.prisma.factoryPartStock.findUnique({
      where: { id: stockId },
      include: { partModel: true },
    });
    if (!row) throw new NotFoundException('库存不存在');
    assertCanWriteFactory(current, row.factoryId);
    await this.prisma.$transaction(async (tx) => {
      await tx.factoryPartStock.delete({ where: { id: stockId } });
      await this.writeLog(tx, {
        factoryId: row.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.PART,
        targetId: row.partModelId,
        targetName: this.deviceName(row.partModel.name, row.partModel.spec),
        beforeQty: row.quantity,
        afterQty: 0,
        delta: -row.quantity,
        action: ChangeAction.DELETE,
      });
    });
    return { ok: true };
  }

  async summary(current: UserPayload, factoryId?: number) {
    const scoped = resolveFactoryScope(current, factoryId);
    const where = scoped !== undefined ? { factoryId: scoped } : {};
    const [deviceAgg, partAgg, factories, statusAgg] = await Promise.all([
      this.prisma.factoryDeviceStock.aggregate({ where, _sum: { quantity: true } }),
      this.prisma.factoryPartStock.aggregate({ where, _sum: { quantity: true } }),
      this.prisma.factory.count(),
      this.prisma.factoryDeviceStock.aggregate({
        where,
        _sum: { qtyInUse: true, qtyStandby: true, qtyIdle: true, qtyStopped: true },
      }),
    ]);
    return {
      deviceTotal: deviceAgg._sum.quantity ?? 0,
      partTotal: partAgg._sum.quantity ?? 0,
      factoryCount: factories,
      statusBreakdown: {
        inUse: statusAgg._sum.qtyInUse ?? 0,
        standby: statusAgg._sum.qtyStandby ?? 0,
        idle: statusAgg._sum.qtyIdle ?? 0,
        stopped: statusAgg._sum.qtyStopped ?? 0,
      },
    };
  }

  /** 工作台用：各厂设备数量统计 */
  async byFactory(current: UserPayload) {
    if (current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('仅中心可查看全部工厂数据');
    }
    const rows = await this.prisma.factory.findMany({
      where: { isCenter: false },
      include: {
        deviceStocks: { select: { quantity: true } },
        partStocks: { select: { quantity: true } },
      },
      orderBy: { id: 'asc' },
    });
    return rows.map((f) => ({
      factoryId: f.id,
      factoryName: f.name,
      deviceTotal: f.deviceStocks.reduce((a, b) => a + b.quantity, 0),
      partTotal: f.partStocks.reduce((a, b) => a + b.quantity, 0),
    }));
  }

  /** 工作台用：最近 N 天变动趋势 */
  async dailyTrend(current: UserPayload, days = 7) {
    const where: any = {};
    if (current.role !== 'SUPER_ADMIN') where.factoryId = current.factoryId;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    where.createdAt = { gte: since };

    const logs = await this.prisma.changeLog.findMany({
      where,
      select: { createdAt: true, delta: true },
    });
    const buckets: Record<string, { in: number; out: number; count: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { in: 0, out: 0, count: 0 };
    }
    for (const l of logs) {
      const key = l.createdAt.toISOString().slice(0, 10);
      if (!buckets[key]) continue;
      buckets[key].count += 1;
      if (l.delta > 0) buckets[key].in += l.delta;
      else if (l.delta < 0) buckets[key].out += -l.delta;
    }
    return Object.keys(buckets).map((date) => ({ date, ...buckets[date] }));
  }

  private deviceName(name: string, spec: string | null) {
    return spec ? `${name} / ${spec}` : name;
  }

  private async writeLog(
    tx: Prisma.TransactionClient,
    log: {
      factoryId: number;
      userId: number;
      targetType: ChangeTargetType;
      targetId: number;
      targetName: string;
      beforeQty: number;
      afterQty: number;
      delta: number;
      action: ChangeAction;
      remark?: string;
    },
  ) {
    await tx.changeLog.create({ data: log });
  }
}
