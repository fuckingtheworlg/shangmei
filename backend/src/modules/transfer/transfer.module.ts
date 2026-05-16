import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { TransferRequestService } from './transfer-request.service';
import { TransferRequestController } from './transfer-request.controller';

@Module({
  controllers: [TransferController, TransferRequestController],
  providers: [TransferService, TransferRequestService],
  exports: [TransferService, TransferRequestService],
})
export class TransferModule {}
