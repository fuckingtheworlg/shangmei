import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.deviceCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { models: true } } },
    });
  }

  create(data: { name: string; icon?: string; sortOrder?: number; remark?: string }) {
    return this.prisma.deviceCategory.create({ data });
  }

  async update(id: number, data: { name?: string; icon?: string; sortOrder?: number; remark?: string }) {
    const exists = await this.prisma.deviceCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('分类不存在');
    return this.prisma.deviceCategory.update({ where: { id }, data });
  }

  async remove(id: number) {
    const count = await this.prisma.deviceModel.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException('该分类下仍有设备型号，无法删除');
    await this.prisma.deviceCategory.delete({ where: { id } });
    return { ok: true };
  }
}
