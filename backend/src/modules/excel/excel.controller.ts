import {
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ExcelService } from './excel.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserPayload } from '../../common/types/user-payload.type';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OptionalParseIntPipe } from '../../common/pipes/optional-parse-int.pipe';

@Controller('excel')
@UseGuards(RolesGuard)
export class ExcelController {
  constructor(private service: ExcelService) {}

  // ---- 模板 ----
  @Get('template/device')
  async deviceTpl(@Res() res: Response) {
    const buf = await this.service.deviceTemplate();
    sendXlsx(res, '设备库存模板.xlsx', buf);
  }

  @Get('template/part')
  async partTpl(@Res() res: Response) {
    const buf = await this.service.partTemplate();
    sendXlsx(res, '配件库存模板.xlsx', buf);
  }

  // ---- 导出 ----
  @Get('export/device')
  async expDevice(
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
  ) {
    const buf = await this.service.exportDeviceStock(user, factoryId);
    sendXlsx(res, '设备库存.xlsx', buf);
  }

  @Get('export/part')
  async expPart(
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
    @Query('factoryId', new OptionalParseIntPipe()) factoryId?: number,
  ) {
    const buf = await this.service.exportPartStock(user, factoryId);
    sendXlsx(res, '配件库存.xlsx', buf);
  }

  // ---- 导入（仅中心） ----
  @Post('import/device')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  importDevice(@CurrentUser() user: UserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.service.importDeviceStock(user, file.buffer);
  }

  @Post('import/part')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  importPart(@CurrentUser() user: UserPayload, @UploadedFile() file: Express.Multer.File) {
    return this.service.importPartStock(user, file.buffer);
  }
}

function sendXlsx(res: Response, filename: string, buf: Buffer) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(filename)}"`,
  );
  res.end(buf);
}
