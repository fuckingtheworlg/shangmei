import { Module } from '@nestjs/common';
import { DeviceModelService } from './device-model.service';
import { DeviceModelController } from './device-model.controller';

@Module({
  controllers: [DeviceModelController],
  providers: [DeviceModelService],
  exports: [DeviceModelService],
})
export class DeviceModelModule {}
