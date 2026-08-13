# 云助手部署上线 + 免费域名 执行摘要

- 日期：2026-08-13
- 模块：yun-assistant（云助手）

## 任务目标

将云助手部署到腾讯云服务器，并配置免费域名访问。

## 执行步骤

### 1. 服务器部署

- **服务器**：腾讯云 `43.155.147.214`（Ubuntu，3.6G 内存 / 45G 磁盘）
- **登录**：用户名 `ubuntu`，SSH 密码认证
- **部署包**：`yun-assistant-deploy.tar.gz`（dist 前端产物 + server 后端 + core 自包含脚本核心）
- **上传**：SFTP 上传到 `/home/ubuntu/yun-assistant-deploy.tar.gz` → 解压到 `/home/ubuntu/yun-assistant/`
- **环境**：`python3 -m venv venv` + `pip install flask websockets`（flask 3.1.3 / websockets 17.0.1）
- **服务托管**：systemd 服务 `yun-assistant.service`（开机自启 enabled + 崩溃自动重启 Restart=always）
- **端口**：`0.0.0.0:8000`，需腾讯云安全组放行 TCP 8000

### 2. 免费域名

- **平台**：DNSHE（`de5.net` 后缀免费二级域名）
- **域名**：`ylkb668.de5.net`
- **解析**：A 记录指向 `43.155.147.214`（用户手动在 DNSHE 后台配置）
- **验证**：`nslookup` 解析正确，`http://ylkb668.de5.net:8000/` 返回 HTTP 200

## 关键决策

- **自包含部署**：脚本核心（clear_core.py/triple_core.py）复制到 `server/core/`，后端优先加载该目录，避免依赖外部路径
- **venv 隔离**：用虚拟环境装依赖，避免污染系统 Python（Ubuntu 24.04 PEP 668 限制）
- **systemd 托管**：替代 nohup，获得开机自启 + 崩溃自动重启能力

## 结果总结

- ✅ 服务器部署成功，服务由 systemd 托管，开机自启
- ✅ 公网访问 `http://43.155.147.214:8000` 正常（HTTP 200）
- ✅ 免费域名 `http://ylkb668.de5.net:8000` 解析并访问正常
- ✅ 管理员账号 admin（初始密码 admin123，需修改）

## 访问信息

| 项 | 值 |
|---|---|
| 服务器 IP | 43.155.147.214 |
| 域名 | ylkb668.de5.net |
| 端口 | 8000 |
| 管理员 | admin / admin123 |

## 后续可做

- 修改 admin 初始密码
- （可选）域名托管 Cloudflare 获得 HTTPS + CDN
- （可选）80 端口反向代理去掉 :8000 端口号
