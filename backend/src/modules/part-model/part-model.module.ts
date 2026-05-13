import { Module } from '@nestjs/common';
import { PartModelService } from './part-model.service';
import { PartModelController } from './part-model.controller';

@Module({
  controllers: [PartModelController],
  providers: [PartModelService],
  exports: [PartModelService],
})
export class PartModelModule {}
