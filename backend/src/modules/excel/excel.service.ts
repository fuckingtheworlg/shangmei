import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ChangeAction, ChangeTargetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

@Injectable()
export class ExcelService {
  constructor(private prisma: PrismaService) {}

  // ---------- 模板 ----------
  async deviceTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('设备库存');
    ws.columns = [
      { header: '厂名称', key: 'factory', width: 18 },
      { header: '设备分类', key: 'category', width: 14 },
      { header: '设备型号', key: 'name', width: 18 },
      { header: '规格', key: 'spec', width: 18 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '在用', key: 'inUse', width: 10 },
      { header: '备用', key: 'standby', width: 10 },
      { header: '闲置', key: 'idle', width: 10 },
      { header: '停用', key: 'stopped', width: 10 },
      { header: '备注', key: 'remark', width: 24 },
    ];
    ws.addRow({
      factory: '第一分厂', category: '水泵', name: '注水泵', spec: 'ZB-200',
      unit: '台', inUse: 5, standby: 2, idle: 1, stopped: 0, remark: '',
    });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async partTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('配件库存');
    ws.columns = [
      { header: '厂名称', key: 'factory', width: 18 },
      { header: '所属设备型号(可空)', key: 'device', width: 24 },
      { header: '配件型号', key: 'name', width: 18 },
      { header: '规格', key: 'spec', width: 18 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '数量', key: 'qty', width: 10 },
      { header: '备注', key: 'remark', width: 24 },
    ];
    ws.addRow({
      factory: '第一分厂',
      device: '注水泵',
      name: '轴承',
      spec: 'NSK-6205',
      unit: '个',
      qty: 20,
      remark: '',
    });
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ---------- 导出 ----------
  async exportDeviceStock(current: UserPayload, factoryId?: number): Promise<Buffer> {
    const where = factoryId ? { factoryId } : current.role === 'SUPER_ADMIN' ? {} : { factoryId: current.factoryId };
    const rows = await this.prisma.factoryDeviceStock.findMany({
      where,
      include: { factory: true, deviceModel: { include: { category: true } } },
      orderBy: [{ factoryId: 'asc' }, { deviceModelId: 'asc' }],
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('设备库存');
    ws.columns = [
      { header: '厂名称', key: 'factory', width: 18 },
      { header: '设备分类', key: 'category', width: 14 },
      { header: '设备型号', key: 'name', width: 18 },
      { header: '规格', key: 'spec', width: 18 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '在用', key: 'inUse', width: 10 },
      { header: '备用', key: 'standby', width: 10 },
      { header: '闲置', key: 'idle', width: 10 },
      { header: '停用', key: 'stopped', width: 10 },
      { header: '总数', key: 'total', width: 10 },
      { header: '备注', key: 'remark', width: 24 },
    ];
    for (const r of rows) {
      ws.addRow({
        factory: r.factory.name,
        category: r.deviceModel.category?.name ?? '',
        name: r.deviceModel.name,
        spec: r.deviceModel.spec,
        unit: r.deviceModel.unit,
        inUse: r.qtyInUse,
        standby: r.qtyStandby,
        idle: r.qtyIdle,
        stopped: r.qtyStopped,
        total: r.quantity,
        remark: r.remark,
      });
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportPartStock(current: UserPayload, factoryId?: number): Promise<Buffer> {
    const where = factoryId ? { factoryId } : current.role === 'SUPER_ADMIN' ? {} : { factoryId: current.factoryId };
    const rows = await this.prisma.factoryPartStock.findMany({
      where,
      include: { factory: true, partModel: { include: { deviceModel: true } } },
      orderBy: [{ factoryId: 'asc' }, { partModelId: 'asc' }],
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('配件库存');
    ws.columns = [
      { header: '厂名称', key: 'factory', width: 18 },
      { header: '所属设备型号', key: 'device', width: 24 },
      { header: '配件型号', key: 'name', width: 18 },
      { header: '规格', key: 'spec', width: 18 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '数量', key: 'qty', width: 10 },
      { header: '备注', key: 'remark', width: 24 },
    ];
    for (const r of rows) {
      ws.addRow({
        factory: r.factory.name,
        device: r.partModel.deviceModel?.name ?? '',
        name: r.partModel.name,
        spec: r.partModel.spec,
        unit: r.partModel.unit,
        qty: r.quantity,
        remark: r.remark,
      });
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ---------- 导入 ----------
  async importDeviceStock(current: UserPayload, buffer: Buffer): Promise<ImportResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const ws = wb.worksheets[0];
    const result: ImportResult = { total: 0, success: 0, failed: 0, errors: [] };

    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      if (!row.getCell(1).value && !row.getCell(2).value) continue;
      result.total += 1;
      try {
        const factoryName = String(row.getCell(1).value ?? '').trim();
        const categoryName = String(row.getCell(2).value ?? '').trim();
        const name = String(row.getCell(3).value ?? '').trim();
        const spec = String(row.getCell(4).value ?? '').trim() || null;
        const unit = String(row.getCell(5).value ?? '台').trim() || '台';
        const inUse = Number(row.getCell(6).value ?? 0);
        const standby = Number(row.getCell(7).value ?? 0);
        const idle = Number(row.getCell(8).value ?? 0);
        const stopped = Number(row.getCell(9).value ?? 0);
        const remark = String(row.getCell(10).value ?? '').trim() || null;
        if (!factoryName) throw new Error('厂名称为空');
        if (!name) throw new Error('设备型号为空');
        for (const [k, v] of [['在用', inUse], ['备用', standby], ['闲置', idle], ['停用', stopped]] as const) {
          if (!Number.isFinite(v as number) || (v as number) < 0) throw new Error(`${k} 数量非法`);
        }
        const total = inUse + standby + idle + stopped;

        const factory = await this.prisma.factory.upsert({
          where: { name: factoryName },
          update: {},
          create: { name: factoryName },
        });

        let categoryId: number | null = null;
        if (categoryName) {
          const cat = await this.prisma.deviceCategory.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          categoryId = cat.id;
        }

        let device = await this.prisma.deviceModel.findFirst({ where: { name, spec } });
        if (!device) {
          device = await this.prisma.deviceModel.create({ data: { name, spec, unit, categoryId } });
        } else {
          device = await this.prisma.deviceModel.update({
            where: { id: device.id },
            data: { unit, categoryId: categoryId ?? device.categoryId },
          });
        }

        const existing = await this.prisma.factoryDeviceStock.findUnique({
          where: { factoryId_deviceModelId: { factoryId: factory.id, deviceModelId: device.id } },
        });
        const beforeQty = existing?.quantity ?? 0;
        await this.prisma.factoryDeviceStock.upsert({
          where: {
            factoryId_deviceModelId: { factoryId: factory.id, deviceModelId: device.id },
          },
          update: { qtyInUse: inUse, qtyStandby: standby, qtyIdle: idle, qtyStopped: stopped, quantity: total, remark },
          create: {
            factoryId: factory.id, deviceModelId: device.id,
            qtyInUse: inUse, qtyStandby: standby, qtyIdle: idle, qtyStopped: stopped,
            quantity: total, remark,
          },
        });
        await this.prisma.changeLog.create({
          data: {
            factoryId: factory.id,
            userId: current.sub,
            targetType: ChangeTargetType.DEVICE,
            targetId: device.id,
            targetName: `${device.name}${device.spec ? ' / ' + device.spec : ''}`,
            beforeQty,
            afterQty: total,
            delta: total - beforeQty,
            action: ChangeAction.IMPORT,
            remark: 'Excel 导入',
          },
        });
        result.success += 1;
      } catch (e: any) {
        result.failed += 1;
        result.errors.push({ row: rowNum, reason: e.message ?? '未知错误' });
      }
    }
    return result;
  }

  async importPartStock(current: UserPayload, buffer: Buffer): Promise<ImportResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const ws = wb.worksheets[0];
    const result: ImportResult = { total: 0, success: 0, failed: 0, errors: [] };

    for (let rowNum = 2; rowNum <= ws.rowCount; rowNum++) {
      const row = ws.getRow(rowNum);
      if (!row.getCell(1).value && !row.getCell(3).value) continue;
      result.total += 1;
      try {
        const factoryName = String(row.getCell(1).value ?? '').trim();
        const deviceName = String(row.getCell(2).value ?? '').trim();
        const name = String(row.getCell(3).value ?? '').trim();
        const spec = String(row.getCell(4).value ?? '').trim() || null;
        const unit = String(row.getCell(5).value ?? '个').trim() || '个';
        const qtyRaw = row.getCell(6).value;
        const remark = String(row.getCell(7).value ?? '').trim() || null;
        const qty = Number(qtyRaw);
        if (!factoryName) throw new Error('厂名称为空');
        if (!name) throw new Error('配件型号为空');
        if (!Number.isFinite(qty) || qty < 0) throw new Error('数量非法');

        const factory = await this.prisma.factory.upsert({
          where: { name: factoryName },
          update: {},
          create: { name: factoryName },
        });

        let deviceModelId: number | null = null;
        if (deviceName) {
          const device = await this.prisma.deviceModel.findFirst({
            where: { name: deviceName },
          });
          if (device) deviceModelId = device.id;
        }

        let part = await this.prisma.partModel.findFirst({
          where: { name, spec, deviceModelId },
        });
        if (!part) {
          part = await this.prisma.partModel.create({
            data: { name, spec, unit, deviceModelId },
          });
        } else if (part.unit !== unit) {
          part = await this.prisma.partModel.update({
            where: { id: part.id },
            data: { unit },
          });
        }
        const existing = await this.prisma.factoryPartStock.findUnique({
          where: { factoryId_partModelId: { factoryId: factory.id, partModelId: part.id } },
        });
        const beforeQty = existing?.quantity ?? 0;
        await this.prisma.factoryPartStock.upsert({
          where: { factoryId_partModelId: { factoryId: factory.id, partModelId: part.id } },
          update: { quantity: qty, remark },
          create: { factoryId: factory.id, partModelId: part.id, quantity: qty, remark },
        });
        await this.prisma.changeLog.create({
          data: {
            factoryId: factory.id,
            userId: current.sub,
            targetType: ChangeTargetType.PART,
            targetId: part.id,
            targetName: `${part.name}${part.spec ? ' / ' + part.spec : ''}`,
            beforeQty,
            afterQty: qty,
            delta: qty - beforeQty,
            action: ChangeAction.IMPORT,
            remark: 'Excel 导入',
          },
        });
        result.success += 1;
      } catch (e: any) {
        result.failed += 1;
        result.errors.push({ row: rowNum, reason: e.message ?? '未知错误' });
      }
    }
    return result;
  }
}
