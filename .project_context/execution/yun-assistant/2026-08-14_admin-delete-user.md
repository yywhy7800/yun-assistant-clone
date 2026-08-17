# 云助手管理后台删除账号功能 · 开发与部署执行摘要

- 日期：2026-08-14
- 模块：yun-assistant（云助手）
- 分支：main（提交 e280750 / 924a72f / b230a61 / 35eedcf）
- 关联：设计 `.project_context/plan/yun-assistant/2026-08-14_admin-delete-user-design.md`、计划 `...-plan.md`

## 任务目标

管理后台新增"删除账号"功能：一次操作删除指定用户及其名下全部脚本（含脚本配置、日志、设备指纹），便于清理不需要的账号。内置 `admin` 禁止删除。

## 执行步骤

1. **需求澄清**：与用户确认三点——内置 admin 只保护 `username=admin` 一个账号（其他管理员可删）；运行中脚本自动停止再删；留言/卡密记录保留。
2. **数据层**（`server/store.py`）：新增 `delete_scripts_by_user(user_id)`（返回被删脚本 id 列表）、`delete_user(uid)`，均带锁原子写。用独立临时目录验证（TDD：先写失败脚本再实现）。
3. **后端接口**（`server/app.py`）：新增 `DELETE /api/admin/users/<uid>`，流程 = require_admin → 校验非内置 admin → 逐个 `task_manager.stop` 停止运行脚本 → 按脚本 `device_key` 清理 devices.json → 删脚本+配置+日志文件 → 删用户。新增 `_remove_script_log(sid)` 辅助。
4. **前端 API 层**：`client.js` adminAPI 加 `removeUser`；`mock.js` 加 `deleteUserAPI`。
5. **管理后台 UI**（`src/views/Admin.vue`）：用户管理每行加红色删除按钮（`@click.stop` 防触发行调整弹窗）→ `showConfirmDialog` 二次确认（含脚本数量与不可恢复提示）→ 成功后刷新用户+脚本列表。
6. **本地验证**：curl 端到端（删普通用户级联清理 / 删内置 admin 拒绝 / 删不存在用户提示）；浏览器走查（确认弹窗、删除刷新、admin 拦截提示）；前端 `npm test` 15/15 + `npm run build`。
7. **用户自测**：起本地服务，用户自行注册测试号验证删除流程，通过后确认部署。
8. **部署上线**：重新构建 → 打包 `yun-assistant-deploy.tar.gz`（dist + server + core，排除 data/logs/.secret/pycache）→ paramiko SFTP 上传 → 解压 `~/yun-assistant/`（保留线上数据）→ `systemctl restart yun-assistant`。

## 关键决策

- **原子删除**（后端一次完成，非前端组合请求）：避免中途失败留半截数据。
- **级联清理范围**：用户 + 脚本 + 配置 + 日志文件 + 设备指纹；保留留言、卡密记录（经营历史）。
- **设备指纹清理**：用脚本对象 `device_key` 字段（形如 `{platform}:{account}`）匹配删除，避免重新拼接。
- **保护内置 admin**：后端 `username == 'admin'` 硬拦截，前端也展示错误提示。
- **UI 细节**：删除按钮 `@click.stop` 阻止冒泡到用户行的"调整小太阳"事件。

## 结果总结（全部验证通过）

- ✅ 后端 curl 端到端：删普通用户（脚本+配置+指纹+日志级联清理）、删内置 admin 拒绝、删不存在用户提示
- ✅ 前端测试 15/15、构建成功
- ✅ 浏览器走查：确认弹窗文案、删除成功刷新列表、admin 拦截提示 均正常
- ✅ 用户自测通过
- ✅ 部署成功：线上 `43.155.147.214:8000` 服务 active，新端点返回 401（存在）、前端产物更新为最新版；线上 admin 密码已改（符合预期）

## 补充（2026-08-14 晚 · 幂等复核部署）

用户提出"重新部署"后，本次做了复核确认，未改变线上数据：

- 重新打包 `dist + server`（排除 data/logs/.secret/pycache）上传，幂等覆盖 + 重启。
- 后端 `app.py`/`store.py` MD5 与本地**完全一致**，`DELETE /api/admin/users/<uid>` 接口在线。
- 前端 `index-CX2kqaB2.js` 含"删除账号"功能，`index.html` 引用正确；**清除了旧版本残留 `index-CGQNAf6A.js`**。
- 服务 `active`，外部访问 `http://43.155.147.214:8000` 返回 HTTP 200。
- 线上 `server/data/`、`logs/`、`.secret`、`venv` 均未触碰，数据无损。

## 说明

- 本地 `server/data/users.json` 在测试/走查期间临时重置过 admin 密码，均已恢复原始备份。
- 线上部署未触碰 `server/data/`、`server/logs/`、`server/.secret`（部署包排除），线上数据无损。
