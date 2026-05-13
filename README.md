# 彬渭中心设备配件管理系统

为彬渭中心及下属各分厂提供设备/配件库存管理、Excel 导入导出、跨厂调动、操作日志的全流程系统。

## 模块

| 目录 | 说明 |
|------|------|
| `backend/` | NestJS 后端 + Prisma + MySQL |
| `admin-web/` | Vue3 + Element Plus PC 管理后台（彬渭中心使用） |
| `miniprogram/` | 微信原生小程序（各厂员工使用） |
| `docs/` | Excel 模板、接口文档 |

## 快速开始

### 1. 准备 MySQL

```bash
mysql -uroot -p -e "CREATE DATABASE shangmei DEFAULT CHARSET utf8mb4;"
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env   # 修改数据库连接
npm install
npx prisma migrate dev
npm run seed           # 初始化彬渭中心 + 演示账号
npm run start:dev
```

后端默认监听 `http://localhost:3000`，接口前缀 `/api`。

演示账号（seed 后）：

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin123` | 彬渭中心超级管理员 |
| `factory1` | `factory123` | 第一分厂管理员 |

### 3. 启动 PC 管理后台

```bash
cd admin-web
npm install
npm run dev
```

### 4. 微信小程序

用微信开发者工具打开 `miniprogram/` 目录，导入项目即可。
