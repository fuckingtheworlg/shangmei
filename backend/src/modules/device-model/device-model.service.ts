import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeviceModelService {
  constructor(private prisma: PrismaService) {}

  list(keyword?: string) {
    return this.prisma.deviceModel.findMany({
      where: keyword ? { OR: [{ name: { contains: keyword } }, { spec: { contains: keyword } }] } : undefined,
      orderBy: { id: 'asc' },
    });
  }

  create(data: { name: string; spec?: string; unit?: string; remark?: string }) {
    return this.prisma.deviceModel.create({ data });
  }

  async update(id: number, data: { name?: string; spec?: string; unit?: string; remark?: string }) {
    const exists = await this.prisma.deviceModel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('设备型号不存在');
    return this.prisma.deviceModel.update({ where: { id }, data });
  }

  async remove(id: number) {
    const stockCount = await this.prisma.factoryDeviceStock.count({ where: { deviceModelId: id } });
    if (stockCount > 0) throw new BadRequestException('该型号在工厂库存中仍存在，无法删除');
    const partCount = await this.prisma.partModel.count({ where: { deviceModelId: id } });
    if (partCount > 0) throw new BadRequestException('该型号下仍有配件，无法删除');
    await this.prisma.deviceModel.delete({ where: { id } });
    return { ok: true };
  }
}
