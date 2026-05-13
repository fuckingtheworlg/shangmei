import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, isAbsolute } from 'path';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.setGlobalPrefix('api');

  // 静态文件目录：用户上传内容（头像等）
  // 优先用 UPLOAD_DIR 环境变量，否则用项目根的 uploads/
  const uploadDir = process.env.UPLOAD_DIR
    ? (isAbsolute(process.env.UPLOAD_DIR) ? process.env.UPLOAD_DIR : join(process.cwd(), process.env.UPLOAD_DIR))
    : join(process.cwd(), 'uploads');
  try {
    mkdirSync(join(uploadDir, 'avatars'), { recursive: true });
  } catch {}
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`Backend running at http://localhost:${port}/api`);
}
bootstrap();
