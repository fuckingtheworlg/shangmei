import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeAction, ChangeTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserPayload } from '../../common/types/user-payload.type';

export interface TransferInput {
  fromFactoryId: number;
  toFactoryId: number;
  targetType: ChangeTargetType;
  targetId: number;
  quantity: number;
  remark?: string;
}

@Injectable()
export class TransferService {
  constructor(private prisma: PrismaService) {}

  async transfer(current: UserPayload, input: TransferInput) {
    if (current.role !== 'SUPER_ADMIN') {
      throw new BadRequestException('仅彬渭中心可执行跨厂调动');
    }
    if (input.fromFactoryId === input.toFactoryId) {
      throw new BadRequestException('调入调出工厂不能相同');
    }
    if (input.quantity <= 0) throw new BadRequestException('调动数量必须大于 0');

    const [fromFactory, toFactory] = await Promise.all([
      this.prisma.factory.findUnique({ where: { id: input.fromFactoryId } }),
      this.prisma.factory.findUnique({ where: { id: input.toFactoryId } }),
    ]);
    if (!fromFactory || !toFactory) throw new NotFoundException('工厂不存在');

    return this.prisma.$transaction(async (tx) => {
      let targetName = '';

      if (input.targetType === ChangeTargetType.DEVICE) {
        const device = await tx.deviceModel.findUnique({ where: { id: input.targetId } });
        if (!device) throw new NotFoundException('设备型号不存在');
        targetName = `${device.name}${device.spec ? ' / ' + device.spec : ''}`;

        const fromStock = await tx.factoryDeviceStock.findUnique({
          where: {
            factoryId_deviceModelId: {
              factoryId: input.fromFactoryId,
              deviceModelId: input.targetId,
            },
          },
        });
        if (!fromStock || fromStock.quantity < input.quantity) {
          throw new BadRequestException('调出工厂库存不足');
        }
        const fromBefore = fromStock.quantity;
        await tx.factoryDeviceStock.update({
          where: { id: fromStock.id },
          data: { quantity: fromBefore - input.quantity },
        });

        const toStock = await tx.factoryDeviceStock.upsert({
          where: {
            factoryId_deviceModelId: {
              factoryId: input.toFactoryId,
              deviceModelId: input.targetId,
            },
          },
          create: {
            factoryId: input.toFactoryId,
            deviceModelId: input.targetId,
            quantity: input.quantity,
          },
          update: { quantity: { increment: input.quantity } },
        });
        const toBefore = toStock.quantity - input.quantity;

        await this.writeTransferLogs(tx, {
          current,
          input,
          targetName,
          fromBefore,
          toBefore,
        });
      } else {
        const part = await tx.partModel.findUnique({ where: { id: input.targetId } });
        if (!part) throw new NotFoundException('配件型号不存在');
        targetName = `${part.name}${part.spec ? ' / ' + part.spec : ''}`;

        const fromStock = await tx.factoryPartStock.findUnique({
          where: {
            factoryId_partModelId: {
              factoryId: input.fromFactoryId,
              partModelId: input.targetId,
            },
          },
        });
        if (!fromStock || fromStock.quantity < input.quantity) {
          throw new BadRequestException('调出工厂库存不足');
        }
        const fromBefore = fromStock.quantity;
        await tx.factoryPartStock.update({
          where: { id: fromStock.id },
          data: { quantity: fromBefore - input.quantity },
        });

        const toStock = await tx.factoryPartStock.upsert({
          where: {
            factoryId_partModelId: {
              factoryId: input.toFactoryId,
              partModelId: input.targetId,
            },
          },
          create: {
            factoryId: input.toFactoryId,
            partModelId: input.targetId,
            quantity: input.quantity,
          },
          update: { quantity: { increment: input.quantity } },
        });
        const toBefore = toStock.quantity - input.quantity;

        await this.writeTransferLogs(tx, {
          current,
          input,
          targetName,
          fromBefore,
          toBefore,
        });
      }

      const message = await tx.transferMessage.create({
        data: {
          fromFactoryId: input.fromFactoryId,
          toFactoryId: input.toFactoryId,
          targetType: input.targetType,
          targetId: input.targetId,
          targetName,
          quantity: input.quantity,
          operatorId: current.sub,
          remark: input.remark,
        },
      });
      return message;
    });
  }

  private async writeTransferLogs(
    tx: Prisma.TransactionClient,
    ctx: {
      current: UserPayload;
      input: TransferInput;
      targetName: string;
      fromBefore: number;
      toBefore: number;
    },
  ) {
    await tx.changeLog.createMany({
      data: [
        {
          factoryId: ctx.input.fromFactoryId,
          userId: ctx.current.sub,
          targetType: ctx.input.targetType,
          targetId: ctx.input.targetId,
          targetName: ctx.targetName,
          beforeQty: ctx.fromBefore,
          afterQty: ctx.fromBefore - ctx.input.quantity,
          delta: -ctx.input.quantity,
          action: ChangeAction.TRANSFER_OUT,
          remark: ctx.input.remark,
        },
        {
          factoryId: ctx.input.toFactoryId,
          userId: ctx.current.sub,
          targetType: ctx.input.targetType,
          targetId: ctx.input.targetId,
          targetName: ctx.targetName,
          beforeQty: ctx.toBefore,
          afterQty: ctx.toBefore + ctx.input.quantity,
          delta: ctx.input.quantity,
          action: ChangeAction.TRANSFER_IN,
          remark: ctx.input.remark,
        },
      ],
    });
  }
}
