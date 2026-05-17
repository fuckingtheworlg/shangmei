# 部署文档

## 环境

| 组件 | 版本 |
|------|------|
| Node.js | 20.x LTS |
| MySQL | 8.x |
| Nginx | 1.20+ |

## 一、本地开发

### 1.1 数据库

```bash
mysql -uroot -p
> CREATE DATABASE shangmei DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
> CREATE USER 'shangmei'@'%' IDENTIFIED BY 'YOUR_PASSWORD';
> GRANT ALL ON shangmei.* TO 'shangmei'@'%';
```

### 1.2 后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，写入 DATABASE_URL 和 JWT_SECRET

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed              # 写入演示数据

npm run start:dev         # http://localhost:3000/api
```

演示账号：

| 账号 | 密码 | 角色 |
|------|------|------|
| `admin` | `admin123` | 超级管理员（彬渭运营中心） |
| `factory1` | `factory123` | 第一分厂管理员 |
| `worker1` | `user123` | 第一分厂员工 |

### 1.3 PC 管理后台

```bash
cd admin-web
npm install
npm run dev               # http://localhost:5173
```

Vite 已配置代理：`/api` → `http://localhost:3000`。

### 1.4 微信小程序

1. 用微信开发者工具导入 `miniprogram/` 目录
2. 修改 `miniprogram/project.config.json` 中的 `appid` 为你自己的小程序 AppID
3. 修改 `miniprogram/app.js` 中的 `apiBase`，指向你的后端地址（开发可保持 `http://localhost:3000/api`）
4. 在微信开发者工具的「详情 → 本地设置」勾选「不校验合法域名」

## 二、生产部署（单台 Linux 服务器）

### 2.1 安装基础环境

```bash
# Ubuntu 22.04 示例
sudo apt update
sudo apt install -y mysql-server nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2.2 准备数据库

参考 1.1，建库建用户。

### 2.3 后端

```bash
cd /opt/shangmei/backend
cp .env.example .env       # 修改生产数据库连接 + JWT_SECRET
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start dist/main.js --name shangmei-api
pm2 save
pm2 startup                # 输出的命令再 sudo 执行一次
```

### 2.4 PC 后台打包

```bash
cd /opt/shangmei/admin-web
npm ci
npm run build              # 输出到 dist/
```

### 2.5 Nginx 配置

`/etc/nginx/sites-available/shangmei`：

```nginx
server {
  listen 80;
  server_name your.domain.com;

  root /opt/shangmei/admin-web/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shangmei /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 2.6 小程序对接

1. 在微信公众平台 → 小程序 → 开发 → 开发管理 → 开发设置 → 服务器域名，把 `https://your.domain.com` 加入 `request 合法域名`
2. 修改 `miniprogram/app.js` 的 `apiBase` 为 `https://your.domain.com/api`
3. 微信开发者工具中点「上传」，提交审核

### 2.7 HTTPS（强烈建议）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

## 三、备份建议

每天定时备份 MySQL：

```bash
0 2 * * * /usr/bin/mysqldump -ushangmei -pYOUR_PASSWORD shangmei > /opt/backup/shangmei-$(date +\%F).sql
```

## 四、常见问题

- **后端启动报 `P1001 Can't reach database server`**：检查 `.env` 中 `DATABASE_URL` 是否正确，MySQL 是否监听 3306
- **小程序请求被拒绝**：检查是否「不校验合法域名」打开（开发期）或域名是否已加入合法域名（生产）
- **导入 Excel 报错**：先用「下载模板」按钮下载最新模板再编辑，注意保留表头行
