import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FactoryService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.factory.findMany({ orderBy: [{ isCenter: 'desc' }, { id: 'asc' }] });
  }

  async findOne(id: number) {
    const f = await this.prisma.factory.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('工厂不存在');
    return f;
  }

  create(data: { name: string; code?: string; remark?: string; isCenter?: boolean }) {
    return this.prisma.factory.create({ data });
  }

  update(id: number, data: { name?: string; code?: string; remark?: string }) {
    return this.prisma.factory.update({ where: { id }, data });
  }

  async remove(id: number) {
    const userCount = await this.prisma.user.count({ where: { factoryId: id } });
    if (userCount > 0) throw new BadRequestException('该工厂下仍有用户，无法删除');
    const stockCount = await this.prisma.factoryDeviceStock.count({ where: { factoryId: id } });
    if (stockCount > 0) throw new BadRequestException('该工厂下仍有库存数据，无法删除');
    await this.prisma.factory.delete({ where: { id } });
    return { ok: true };
  }
}
