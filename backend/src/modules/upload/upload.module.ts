import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, isAbsolute, extname } from 'path';
import { mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { UploadController } from './upload.controller';

function resolveUploadDir() {
  const raw = process.env.UPLOAD_DIR;
  if (!raw) return join(process.cwd(), 'uploads');
  return isAbsolute(raw) ? raw : join(process.cwd(), raw);
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(resolveUploadDir(), 'avatars');
          try { mkdirSync(dir, { recursive: true }); } catch {}
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const name = randomBytes(8).toString('hex') + extname(file.originalname || '.png').toLowerCase();
          cb(null, name);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
