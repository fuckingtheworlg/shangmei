import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PartModelService {
  constructor(private prisma: PrismaService) {}

  list(params: { keyword?: string; deviceModelId?: number }) {
    return this.prisma.partModel.findMany({
      where: {
        deviceModelId: params.deviceModelId,
        OR: params.keyword
          ? [{ name: { contains: params.keyword } }, { spec: { contains: params.keyword } }]
          : undefined,
      },
      include: { deviceModel: true },
      orderBy: { id: 'asc' },
    });
  }

  create(data: {
    name: string;
    spec?: string;
    unit?: string;
    deviceModelId?: number;
    remark?: string;
  }) {
    return this.prisma.partModel.create({ data });
  }

  async update(
    id: number,
    data: {
      name?: string;
      spec?: string;
      unit?: string;
      deviceModelId?: number | null;
      remark?: string;
    },
  ) {
    const exists = await this.prisma.partModel.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('配件型号不存在');
    return this.prisma.partModel.update({ where: { id }, data });
  }

  async remove(id: number) {
    const stockCount = await this.prisma.factoryPartStock.count({ where: { partModelId: id } });
    if (stockCount > 0) throw new BadRequestException('该配件型号在工厂库存中仍存在，无法删除');
    await this.prisma.partModel.delete({ where: { id } });
    return { ok: true };
  }
}
