import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { FactoryModule } from './modules/factory/factory.module';
import { UserModule } from './modules/user/user.module';
import { DeviceModelModule } from './modules/device-model/device-model.module';
import { PartModelModule } from './modules/part-model/part-model.module';
import { StockModule } from './modules/stock/stock.module';
import { ChangeLogModule } from './modules/change-log/change-log.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { MessageModule } from './modules/message/message.module';
import { ExcelModule } from './modules/excel/excel.module';
import { UploadModule } from './modules/upload/upload.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    FactoryModule,
    UserModule,
    DeviceModelModule,
    PartModelModule,
    StockModule,
    ChangeLogModule,
    TransferModule,
    MessageModule,
    ExcelModule,
    UploadModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
