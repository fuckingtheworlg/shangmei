import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * 用于可选整型 query 参数：
 *   - undefined / null / '' → 返回 undefined（不报错）
 *   - 合法整数字符串 → 返回 number
 *   - 其它 → 400
 *
 * 替代 `new ParseIntPipe({ optional: true })`，避免不同版本 NestJS 行为差异
 */
@Injectable()
export class OptionalParseIntPipe implements PipeTransform<unknown, number | undefined> {
  transform(value: unknown): number | undefined {
    // 1. 空值：undefined / null / 空字符串
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    // 2. 全局 ValidationPipe transform:true 会把 undefined cast 成 NaN，需要兜底
    if (typeof value === 'number' && Number.isNaN(value)) return undefined;

    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new BadRequestException(`参数必须为整数: ${value}`);
    }
    return n;
  }
}
