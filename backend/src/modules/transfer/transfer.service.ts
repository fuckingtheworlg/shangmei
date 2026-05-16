import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeTargetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';
import { TransferRequestService } from './transfer-request.service';

export interface TransferInput {
  fromFactoryId: number;
  toFactoryId: number;
  targetType: ChangeTargetType;
  targetId: number;
  quantity: number;
  remark?: string;
}

/**
 * 中心免审直接调拨（保留为快捷通道，仅 SUPER_ADMIN 可用）。
 * 普通流程请走 TransferRequestService（申请-审批）。
 */
@Injectable()
export class TransferService {
  constructor(
    private prisma: PrismaService,
    private requestService: TransferRequestService,
  ) {}

  async transfer(current: UserPayload, input: TransferInput) {
    if (current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('仅彬渭中心可执行免审直接调拨');
    }
    if (input.fromFactoryId === input.toFactoryId) {
      throw new BadRequestException('调入调出工厂不能相同');
    }
    if (input.quantity <= 0) throw new BadRequestException('调动数量必须大于 0');

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

    return this.prisma.$transaction(async (tx) => {
      await this.requestService.executeTransfer(tx, {
        ...input,
        targetName,
        operatorId: current.sub,
      });
    });
  }
}
