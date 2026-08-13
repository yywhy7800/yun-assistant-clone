# 云助手部署说明

## 架构

- **单端口部署**：Flask 后端（`server/app.py`）同时托管前端静态产物（`dist/`）和 `/api` 接口，监听 `0.0.0.0:8000`。
- 用户访问 `http://<服务器IP>:8000` 即打开云助手，无需 Nginx（可选）。

## 服务器要求

- Python 3.8+
- 依赖：`flask`、`websockets`（`pip install flask websockets`）
- 能访问游戏服务器（`wss://game.ylkbiao.com` 等，国内网络直连）

## 部署步骤

1. **上传代码**到服务器，排除开发产物：
   ```
   yun-assistant-clone/
   ├── dist/               # 前端构建产物（必须）
   ├── server/             # 后端（app.py/store.py/auth.py/devices.py/tasks.py/requirements.txt）
   └── src/ 等              # 仅开发需要，可不上传
   ```
   排除：`node_modules/`、`.git/`、`server/data/`、`server/logs/`、`server/.secret`

2. **安装后端依赖**：
   ```bash
   cd yun-assistant-clone
   pip install -r server/requirements.txt
   ```

3. **构建前端**（若本地已有最新 `dist/` 可跳过；服务器上重新构建需 Node 18+）：
   ```bash
   npm install && npm run build
   ```

4. **启动后端**：
   ```bash
   cd server
   python app.py
   ```
   首次启动自动创建管理员账号 `admin / admin123`（请上线后尽快修改）。

5. **开放防火墙端口** 8000，然后访问 `http://<服务器IP>:8000`。

## 目录说明

| 目录 | 内容 | 是否需备份 |
|---|---|---|
| `server/data/` | 用户 / 脚本 / 配置 / 卡密（JSON） | ✅ 必须 |
| `server/logs/` | 每个脚本的运行日志 | ✅ 建议 |
| `server/.secret` | 密码加密密钥 | ✅ 必须（丢失无法解密脚本密码） |

## 注意事项

- **数据备份**：定期备份 `server/data/` 和 `server/.secret`。
- **管理员**：`admin/admin123`，通过个人中心或管理后台改密。
- **游戏服务器网络**：服务器需能直连游戏服务器；若被风控（错误码 101016），可换网络/错峰。
- **多账号设备指纹**：每个账号独立指纹，存 `server/data/devices.json`；如需用真实真机指纹可手动替换。
- **生产加固**（可选）：改用 Gunicorn/waitress 部署 Flask，配置 HTTPS。
