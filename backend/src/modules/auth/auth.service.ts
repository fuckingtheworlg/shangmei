import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { factory: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('账号不存在或已停用');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('密码错误');

    const payload: UserPayload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      factoryId: user.factoryId,
      isCenter: user.factory.isCenter,
    };
    const token = await this.jwt.signAsync(payload);
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        factoryId: user.factoryId,
        factoryName: user.factory.name,
        isCenter: user.factory.isCenter,
        phone: user.phone,
      },
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { factory: true },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      factoryId: user.factoryId,
      factoryName: user.factory.name,
      isCenter: user.factory.isCenter,
      phone: user.phone,
    };
  }
}
