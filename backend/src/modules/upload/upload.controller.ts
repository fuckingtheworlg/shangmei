import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('未收到文件');
    if (!/^image\//.test(file.mimetype || '')) {
      throw new BadRequestException('仅支持图片');
    }
    return { url: `/uploads/avatars/${file.filename}` };
  }
}
