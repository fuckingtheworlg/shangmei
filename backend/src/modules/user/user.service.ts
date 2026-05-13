import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';
import { resolveFactoryScope } from '../../common/utils/scope.util';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async list(current: UserPayload, factoryId?: number) {
    const scoped = resolveFactoryScope(current, factoryId);
    const rows = await this.prisma.user.findMany({
      where: scoped !== undefined ? { factoryId: scoped } : undefined,
      include: { factory: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      factoryId: u.factoryId,
      factoryName: u.factory.name,
      phone: u.phone,
      active: u.active,
      createdAt: u.createdAt,
    }));
  }

  async create(
    current: UserPayload,
    data: {
      username: string;
      password: string;
      name: string;
      role: UserRole;
      factoryId: number;
      phone?: string;
    },
  ) {
    if (current.role !== 'SUPER_ADMIN' && data.factoryId !== current.factoryId) {
      throw new BadRequestException('无权在其他工厂创建用户');
    }
    if (current.role !== 'SUPER_ADMIN' && data.role === 'SUPER_ADMIN') {
      throw new BadRequestException('无权创建超级管理员');
    }
    const exists = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (exists) throw new BadRequestException('账号已存在');
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        name: data.name,
        role: data.role,
        factoryId: data.factoryId,
        phone: data.phone,
      },
    });
  }

  async update(
    current: UserPayload,
    id: number,
    data: { name?: string; phone?: string; role?: UserRole; active?: boolean; factoryId?: number },
  ) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('用户不存在');
    if (current.role !== 'SUPER_ADMIN' && target.factoryId !== current.factoryId) {
      throw new BadRequestException('无权修改其他工厂用户');
    }
    if (data.role && current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('无权修改角色');
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async resetPassword(current: UserPayload, id: number, newPassword: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('用户不存在');
    if (current.role !== 'SUPER_ADMIN' && target.factoryId !== current.factoryId) {
      throw new BadRequestException('无权重置其他工厂用户密码');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { ok: true };
  }

  async remove(current: UserPayload, id: number) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('用户不存在');
    if (current.role !== 'SUPER_ADMIN' && target.factoryId !== current.factoryId) {
      throw new BadRequestException('无权删除其他工厂用户');
    }
    if (target.id === current.sub) throw new BadRequestException('不能删除自己');
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }
}
