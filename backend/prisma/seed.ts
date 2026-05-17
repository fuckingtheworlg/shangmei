import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const center = await prisma.factory.upsert({
    where: { name: '彬渭运营中心' },
    update: { isCenter: true },
    create: { name: '彬渭运营中心', code: 'BWZX', isCenter: true },
  });

  const factories = [
    { name: '第一分厂', code: 'F1' },
    { name: '第二分厂', code: 'F2' },
    { name: '第三分厂', code: 'F3' },
  ];
  const factoryRows = [] as { id: number; name: string }[];
  for (const f of factories) {
    const row = await prisma.factory.upsert({
      where: { name: f.name },
      update: {},
      create: { ...f, isCenter: false },
    });
    factoryRows.push({ id: row.id, name: row.name });
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      name: '中心管理员',
      role: UserRole.SUPER_ADMIN,
      factoryId: center.id,
    },
  });

  const factoryAdminHash = await bcrypt.hash('factory123', 10);
  await prisma.user.upsert({
    where: { username: 'factory1' },
    update: {},
    create: {
      username: 'factory1',
      passwordHash: factoryAdminHash,
      name: '一厂管理员',
      role: UserRole.FACTORY_ADMIN,
      factoryId: factoryRows[0].id,
    },
  });

  const userHash = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { username: 'worker1' },
    update: {},
    create: {
      username: 'worker1',
      passwordHash: userHash,
      name: '一厂员工',
      role: UserRole.FACTORY_USER,
      factoryId: factoryRows[0].id,
    },
  });

  // ---- 设备大分类 ----
  const categories = [
    { name: '皮带机', sortOrder: 1 },
    { name: '水泵', sortOrder: 2 },
    { name: '电机', sortOrder: 3 },
    { name: '压缩机', sortOrder: 4 },
    { name: '配电柜', sortOrder: 5 },
  ];
  const catRows: Record<string, number> = {};
  for (const c of categories) {
    const row = await prisma.deviceCategory.upsert({
      where: { name: c.name },
      update: { sortOrder: c.sortOrder },
      create: c,
    });
    catRows[c.name] = row.id;
  }

  const devices = [
    { name: '注水泵', spec: 'ZB-200', unit: '台', category: '水泵' },
    { name: '抽油机', spec: 'CYJ-10', unit: '台', category: '电机' },
    { name: '压缩机', spec: 'YSJ-100', unit: '台', category: '压缩机' },
  ];
  const deviceRows = [] as { id: number; name: string }[];
  for (const d of devices) {
    const row = await prisma.deviceModel.upsert({
      where: { name_spec: { name: d.name, spec: d.spec } },
      update: { categoryId: catRows[d.category] },
      create: {
        name: d.name,
        spec: d.spec,
        unit: d.unit,
        categoryId: catRows[d.category],
      },
    });
    deviceRows.push({ id: row.id, name: row.name });
  }

  // ---- 迁移：把现有 quantity（如果有）灌进 qtyInUse ----
  const allDeviceStocks = await prisma.factoryDeviceStock.findMany({
    where: { qtyInUse: 0, qtyStandby: 0, qtyIdle: 0, qtyStopped: 0 },
  });
  for (const s of allDeviceStocks) {
    if (s.quantity > 0) {
      await prisma.factoryDeviceStock.update({
        where: { id: s.id },
        data: { qtyInUse: s.quantity },
      });
    }
  }

  const parts = [
    { name: '轴承', spec: 'NSK-6205', unit: '个', deviceModelId: deviceRows[0].id },
    { name: '密封圈', spec: 'O-30', unit: '个', deviceModelId: deviceRows[0].id },
    { name: '电机', spec: 'YE3-7.5', unit: '台', deviceModelId: deviceRows[1].id },
  ];
  for (const p of parts) {
    await prisma.partModel.upsert({
      where: {
        name_spec_deviceModelId: {
          name: p.name,
          spec: p.spec,
          deviceModelId: p.deviceModelId,
        },
      },
      update: {},
      create: p,
    });
  }

  for (const factory of factoryRows) {
    for (const device of deviceRows) {
      const inUse = Math.floor(Math.random() * 15) + 3;
      const standby = Math.floor(Math.random() * 5);
      const idle = Math.floor(Math.random() * 3);
      const stopped = Math.floor(Math.random() * 2);
      await prisma.factoryDeviceStock.upsert({
        where: {
          factoryId_deviceModelId: {
            factoryId: factory.id,
            deviceModelId: device.id,
          },
        },
        update: {},
        create: {
          factoryId: factory.id,
          deviceModelId: device.id,
          qtyInUse: inUse,
          qtyStandby: standby,
          qtyIdle: idle,
          qtyStopped: stopped,
          quantity: inUse + standby + idle + stopped,
        },
      });
    }
  }

  console.log('Seed 完成。账号：admin/admin123  factory1/factory123  worker1/user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
