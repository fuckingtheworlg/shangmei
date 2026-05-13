# 部署脚本说明

## 一键部署（推荐）

在 Ubuntu 22.04/24.04 服务器上以 root 运行：

```bash
# 1. 把代码 clone 到 /opt/shangmei
cd /opt
git clone https://github.com/fuckingtheworlg/shangmei.git
cd shangmei

# 2. 一键安装（自动装 MySQL/Node 20/Nginx，建库，构建，注册 systemd）
chmod +x deploy/install.sh deploy/update.sh
sudo bash deploy/install.sh

# 可选：自定义参数（不传则使用默认/随机）
NGINX_SERVER_NAME="device.yourdomain.com" \
DB_PASSWORD="your_strong_pwd" \
sudo -E bash deploy/install.sh
```

完成后访问：

- PC 后台：`http://<服务器 IP 或域名>/`
- 接口：`http://<服务器 IP 或域名>/api`
- 演示账号：`admin / admin123`

## 文件说明

| 文件 | 作用 |
|------|------|
| `install.sh` | 一键安装：装系统依赖、建库、跑迁移、seed、构建、注册 systemd + Nginx |
| `update.sh` | 增量更新：拉代码、重新构建、重启服务 |
| `shangmei-api.service` | systemd 服务单元模板（占位符会被 install.sh 替换） |
| `nginx.conf` | Nginx 站点配置模板（占位符会被 install.sh 替换） |

## 常用运维命令

```bash
# 查看服务状态
systemctl status shangmei-api

# 查看后端日志
tail -f /var/log/shangmei-api.log
tail -f /var/log/shangmei-api.err.log

# 重启
systemctl restart shangmei-api

# 更新代码
sudo bash /opt/shangmei/deploy/update.sh

# 重置数据库（谨慎！会清空全部数据）
cd /opt/shangmei/backend
npx prisma migrate reset
```

## HTTPS（强烈建议）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d device.yourdomain.com
```

证书会自动续期。

## 自定义环境变量

部署后的 `.env` 在 `/opt/shangmei/backend/.env`。修改后：

```bash
systemctl restart shangmei-api
```

## 数据库备份

加入 crontab：

```cron
0 2 * * * /usr/bin/mysqldump -ushangmei -p'<密码>' shangmei | gzip > /opt/backup/shangmei-$(date +\%F).sql.gz
```
