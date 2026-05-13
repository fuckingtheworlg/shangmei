import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const center = await prisma.factory.upsert({
    where: { name: '彬渭中心' },
    update: { isCenter: true },
    create: { name: '彬渭中心', code: 'BWZX', isCenter: true },
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

  const devices = [
    { name: '注水泵', spec: 'ZB-200', unit: '台' },
    { name: '抽油机', spec: 'CYJ-10', unit: '台' },
    { name: '压缩机', spec: 'YSJ-100', unit: '台' },
  ];
  const deviceRows = [] as { id: number; name: string }[];
  for (const d of devices) {
    const row = await prisma.deviceModel.upsert({
      where: { name_spec: { name: d.name, spec: d.spec } },
      update: {},
      create: d,
    });
    deviceRows.push({ id: row.id, name: row.name });
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
          quantity: Math.floor(Math.random() * 20) + 5,
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
