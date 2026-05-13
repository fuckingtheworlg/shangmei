import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeAction, ChangeTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';
import { assertCanWriteFactory, resolveFactoryScope } from '../../common/utils/scope.util';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async listDevices(current: UserPayload, factoryId?: number, keyword?: string) {
    const scoped = resolveFactoryScope(current, factoryId);
    const rows = await this.prisma.factoryDeviceStock.findMany({
      where: {
        factoryId: scoped,
        deviceModel: keyword
          ? { OR: [{ name: { contains: keyword } }, { spec: { contains: keyword } }] }
          : undefined,
      },
      include: { deviceModel: true, factory: true },
      orderBy: [{ factoryId: 'asc' }, { deviceModelId: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      factoryId: r.factoryId,
      factoryName: r.factory.name,
      deviceModelId: r.deviceModelId,
      name: r.deviceModel.name,
      spec: r.deviceModel.spec,
      unit: r.deviceModel.unit,
      quantity: r.quantity,
      remark: r.remark,
      updatedAt: r.updatedAt,
    }));
  }

  async listParts(
    current: UserPayload,
    params: { factoryId?: number; deviceModelId?: number; keyword?: string },
  ) {
    const scoped = resolveFactoryScope(current, params.factoryId);
    const rows = await this.prisma.factoryPartStock.findMany({
      where: {
        factoryId: scoped,
        partModel: {
          deviceModelId: params.deviceModelId,
          OR: params.keyword
            ? [{ name: { contains: params.keyword } }, { spec: { contains: params.keyword } }]
            : undefined,
        },
      },
      include: { partModel: { include: { deviceModel: true } }, factory: true },
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
      quantity: r.quantity,
      remark: r.remark,
      updatedAt: r.updatedAt,
    }));
  }

  /** 新增/更新某厂的设备库存（如已存在则按 quantity 覆盖，并写日志） */
  async upsertDevice(
    current: UserPayload,
    data: { factoryId: number; deviceModelId: number; quantity: number; remark?: string },
  ) {
    assertCanWriteFactory(current, data.factoryId);
    if (data.quantity < 0) throw new BadRequestException('数量不能为负');

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
          quantity: data.quantity,
          remark: data.remark,
        },
        update: { quantity: data.quantity, remark: data.remark },
      });
      await this.writeLog(tx, {
        factoryId: data.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.DEVICE,
        targetId: device.id,
        targetName: `${device.name}${device.spec ? ' / ' + device.spec : ''}`,
        beforeQty,
        afterQty: stock.quantity,
        delta: stock.quantity - beforeQty,
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
        where: {
          factoryId_partModelId: { factoryId: data.factoryId, partModelId: data.partModelId },
        },
      });
      const beforeQty = existing?.quantity ?? 0;
      const stock = await tx.factoryPartStock.upsert({
        where: {
          factoryId_partModelId: { factoryId: data.factoryId, partModelId: data.partModelId },
        },
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
        targetName: `${part.name}${part.spec ? ' / ' + part.spec : ''}`,
        beforeQty,
        afterQty: stock.quantity,
        delta: stock.quantity - beforeQty,
        action: existing ? ChangeAction.UPDATE : ChangeAction.CREATE,
        remark: data.remark,
      });
      return stock;
    });
  }

  async adjustDeviceQty(
    current: UserPayload,
    stockId: number,
    delta: number,
    remark?: string,
  ) {
    const row = await this.prisma.factoryDeviceStock.findUnique({
      where: { id: stockId },
      include: { deviceModel: true },
    });
    if (!row) throw new NotFoundException('库存不存在');
    assertCanWriteFactory(current, row.factoryId);
    const after = row.quantity + delta;
    if (after < 0) throw new BadRequestException('调整后数量不能为负');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.factoryDeviceStock.update({
        where: { id: stockId },
        data: { quantity: after },
      });
      await this.writeLog(tx, {
        factoryId: row.factoryId,
        userId: current.sub,
        targetType: ChangeTargetType.DEVICE,
        targetId: row.deviceModelId,
        targetName: `${row.deviceModel.name}${row.deviceModel.spec ? ' / ' + row.deviceModel.spec : ''}`,
        beforeQty: row.quantity,
        afterQty: after,
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
        targetName: `${row.partModel.name}${row.partModel.spec ? ' / ' + row.partModel.spec : ''}`,
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
        targetName: `${row.deviceModel.name}${row.deviceModel.spec ? ' / ' + row.deviceModel.spec : ''}`,
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
        targetName: `${row.partModel.name}${row.partModel.spec ? ' / ' + row.partModel.spec : ''}`,
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
    const [deviceAgg, partAgg, factories] = await Promise.all([
      this.prisma.factoryDeviceStock.aggregate({ where, _sum: { quantity: true } }),
      this.prisma.factoryPartStock.aggregate({ where, _sum: { quantity: true } }),
      this.prisma.factory.count(),
    ]);
    return {
      deviceTotal: deviceAgg._sum.quantity ?? 0,
      partTotal: partAgg._sum.quantity ?? 0,
      factoryCount: factories,
    };
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
