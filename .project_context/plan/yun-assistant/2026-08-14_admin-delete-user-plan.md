# 管理后台删除账号功能 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理后台新增"删除账号"功能，一次操作删除指定用户及其名下全部脚本（含配置、日志、设备指纹）。

**Architecture:** 后端新增原子接口 `DELETE /api/admin/users/<uid>`，内部完成「校验 → 停脚本 → 清指纹 → 删脚本/配置/日志 → 删用户」；前端用户管理 tab 加删除按钮 + 二次确认弹窗。数据层 `store.py` 新增两个原子写方法。

**Tech Stack:** 后端 Flask（`server/`，JSON 文件存储 + 线程锁）；前端 Vue3 + Vant + vite + vitest。

## Global Constraints

- 内置 `admin` 账号（`username == 'admin'`）禁止删除，后端硬拦截。
- 删除不可逆（硬删，无回收站），前端必须二次确认。
- 删除范围：用户 + 名下脚本 + 脚本配置（configs.json）+ 脚本日志（logs/{sid}.log）+ 设备指纹（devices.json）。
- 保留：留言记录、卡密兑换记录。
- 运行中脚本自动停止后再删（协作式停止标记，不等待线程退出）。
- 不新增任何 Python / JS 依赖。
- commit message 用中文，遵守 Conventional Commits，body 末尾加 `[#AI]`。
- 验证环境：后端 `cd server && python app.py` 起在 8000；前端 `npm test` / `npm run build`。

---

### Task 1: 后端数据层 —— store.py 新增删除方法

**Files:**
- Modify: `server/store.py`（在 `delete_script` 之后、`configs` 区块之前插入）
- Test（临时，验证后删除）: `server/verify_delete.py`

**Interfaces:**
- Consumes: 现有 `get_users()` / `get_scripts()` / `_write_json(name, data)` / `_lock`
- Produces:
  - `store.delete_scripts_by_user(user_id: int) -> list[int]` —— 删除指定用户名下全部脚本，返回被删脚本的 id 列表
  - `store.delete_user(uid: int) -> None` —— 从 users.json 删除指定用户

- [ ] **Step 1: 写失败验证脚本 `server/verify_delete.py`**

用独立临时目录测试（覆盖 `store.DATA_DIR`），不碰真实 `server/data/`：

```python
# -*- coding: utf-8 -*-
"""临时验证：delete_scripts_by_user / delete_user（用完即删，不碰真实数据）"""
import os
import tempfile

import store

store.DATA_DIR = tempfile.mkdtemp(prefix="yun-test-")

store._write_json("users.json", [
    {"id": 1, "username": "admin", "role": "admin"},
    {"id": 2, "username": "test", "role": "user"},
])
store._write_json("scripts.json", [
    {"id": 10, "user_id": 2, "device_key": "android:acc1"},
    {"id": 11, "user_id": 2, "device_key": "ios:acc2"},
    {"id": 12, "user_id": 1, "device_key": "android:adminacc"},
])

# 验证 delete_scripts_by_user：只删 user_id=2 的脚本，返回 [10, 11]
deleted = store.delete_scripts_by_user(2)
assert deleted == [10, 11], f"expected [10, 11], got {deleted}"
remaining = [s["id"] for s in store.get_scripts()]
assert remaining == [12], f"expected [12], got {remaining}"

# 验证 delete_user：只删 id=2 的用户
store.delete_user(2)
names = [u["username"] for u in store.get_users()]
assert names == ["admin"], f"expected ['admin'], got {names}"

print("VERIFY_OK")
```

- [ ] **Step 2: 运行，确认失败**

Run: `cd server && python verify_delete.py`
Expected: FAIL with `AttributeError: module 'store' has no attribute 'delete_scripts_by_user'`

- [ ] **Step 3: 在 `server/store.py` 中 `delete_script` 函数之后插入两个方法**

```python
def delete_scripts_by_user(user_id):
    """删除某用户名下全部脚本，返回被删脚本 id 列表（带锁，原子写）"""
    with _lock:
        scripts = get_scripts()
        deleted_ids = [s["id"] for s in scripts if s.get("user_id") == user_id]
        scripts = [s for s in scripts if s.get("user_id") != user_id]
        _write_json("scripts.json", scripts)
    return deleted_ids


def delete_user(uid):
    """从 users.json 删除指定用户（带锁，原子写）"""
    with _lock:
        users = get_users()
        users = [u for u in users if u.get("id") != uid]
        _write_json("users.json", users)
```

- [ ] **Step 4: 运行验证脚本，确认通过**

Run: `cd server && python verify_delete.py`
Expected: `VERIFY_OK`

- [ ] **Step 5: 删除临时脚本并提交**

```bash
rm server/verify_delete.py
git add server/store.py
git commit -m "feat: store 新增 delete_scripts_by_user / delete_user

管理后台删除账号功能的数据层方法，带锁原子写

[#AI]"
```

---

### Task 2: 后端接口 —— app.py 新增 admin 删除端点

**Files:**
- Modify: `server/app.py`（`admin_scripts` 之后、`admin_script_stop` 之前插入）

**Interfaces:**
- Consumes: `require_admin()`、`store.find_user`、`store.get_scripts`、`store.get_devices` / `store.save_devices`、`store.delete_scripts_by_user` / `store.delete_config` / `store.delete_user`、`task_manager.stop(sid)`
- Produces:
  - `_remove_script_log(sid: int) -> None` —— 删除 `logs/{sid}.log`，不存在则忽略
  - HTTP `DELETE /api/admin/users/<uid>` —— 成功返回 `ok({"deleted_scripts": n}, "用户「xx」已删除，共删除 n 个脚本")`；内置 admin → `fail("内置 admin 账号不允许删除")`；用户不存在 → `fail("用户不存在")`

- [ ] **Step 1: 在 `app.py` 的 helpers 区域（`platform_of` 之后）新增日志清理辅助函数**

```python
def _remove_script_log(sid):
    """删除脚本日志文件 logs/{sid}.log（不存在则忽略）"""
    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
    log_path = os.path.join(log_dir, f"{sid}.log")
    if os.path.exists(log_path):
        try:
            os.remove(log_path)
        except OSError:
            pass
```

- [ ] **Step 2: 在 `app.py` 中 `admin_scripts` 函数之后新增删除端点**

```python
@api.route("/admin/users/<int:uid>", methods=["DELETE"])
def admin_delete_user(uid):
    admin, err = require_admin()
    if err:
        return err
    target = store.find_user(uid=uid)
    if not target:
        return fail("用户不存在")
    if target.get("username") == "admin":
        return fail("内置 admin 账号不允许删除")
    # 收集该用户名下脚本（删除前先记录，供清指纹/日志用）
    scripts = [s for s in store.get_scripts() if s.get("user_id") == uid]
    # 逐个停止运行中脚本（协作式停止标记，未运行的忽略）
    for s in scripts:
        task_manager.stop(s["id"])
    # 清理设备指纹（脚本对象存有 device_key，形如 "{platform}:{account}"）
    devices = store.get_devices()
    changed = False
    for s in scripts:
        key = s.get("device_key")
        if key and key in devices:
            del devices[key]
            changed = True
    if changed:
        store.save_devices(devices)
    # 删除脚本 + 配置 + 日志文件
    deleted_ids = store.delete_scripts_by_user(uid)
    for sid in deleted_ids:
        store.delete_config(sid)
        _remove_script_log(sid)
    # 删除用户
    store.delete_user(uid)
    return ok({"deleted_scripts": len(deleted_ids)},
              f"用户「{target['username']}」已删除，共删除 {len(deleted_ids)} 个脚本")
```

- [ ] **Step 3: 后台启动服务**

Run: `cd server && python app.py`（用后台任务跑；首次启动会自动 `ensure_admin` 创建 admin/admin123）
Expected: 输出监听 `0.0.0.0:8000`

- [ ] **Step 4: 端到端 curl 验证各场景**

登录 admin 拿 token：

```bash
curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```
Expected: `{"success":true,"data":{"token":"...", ...}}`，记下 token 为 `$TOKEN`。

场景一：删除内置 admin —— 应被拒：

```bash
curl -s -X DELETE http://localhost:8000/api/admin/users/1 -H "Authorization: Bearer $TOKEN"
```
Expected: `{"success":false,"message":"内置 admin 账号不允许删除"}`

场景二：删除不存在的用户：

```bash
curl -s -X DELETE http://localhost:8000/api/admin/users/99999 -H "Authorization: Bearer $TOKEN"
```
Expected: `{"success":false,"message":"用户不存在"}`

场景三：注册测试用户并绑定脚本，然后删除并验证数据清理（用一个非"一路狂飙"的 gameType，绕过真实游戏账号验证）：

```bash
# 注册测试用户
curl -s -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" \
  -d '{"username":"del_test_$$","password":"test123","phone":null,"invite_code":null}'
# 用测试用户登录，绑定一个脚本（gameType 非一路狂飙，不触发账号验证）
curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"del_test_$$","password":"test123"}'
# 用测试用户 token 绑定脚本
curl -s -X POST http://localhost:8000/api/scripts -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameType":"x","channel":"official","account":"del_acc_$$","password":"123456"}'
# 用 admin token 查该用户 uid，然后删除
curl -s -X DELETE "http://localhost:8000/api/admin/users/<uid>" -H "Authorization: Bearer $TOKEN"
```
Expected: 删除返回 `"success":true`，且 `server/data/users.json`、`scripts.json`、`configs.json`、`devices.json` 中对应的用户/脚本/配置/指纹都已清除，`server/logs/<sid>.log` 不存在。

（`$$` 为 shell 随机后缀，避免与真实数据冲突；验证完可顺手清掉 `server/data/` 中的残留测试数据）

- [ ] **Step 5: 停掉后台服务并提交**

```bash
# 停掉 Step 3 的后台 python 进程
git add server/app.py
git commit -m "feat: 管理后台新增删除账号接口 DELETE /admin/users/<uid>

自动停止运行中脚本，级联清理脚本/配置/日志/设备指纹，保护内置 admin

[#AI]"
```

---

### Task 3: 前端 API 层 —— client.js + mock.js

**Files:**
- Modify: `src/api/client.js`（`adminAPI` 对象内）
- Modify: `src/api/mock.js`（admin 适配区）

**Interfaces:**
- Consumes: 现有 `request(path, options)`
- Produces:
  - `adminAPI.removeUser(id)` -> `request(\`/admin/users/${id}\`, { method: 'DELETE' })`
  - `deleteUserAPI(id)` -> Promise<{success, message, data}>（`mock.js` 导出，Admin.vue 使用）

- [ ] **Step 1: 在 `client.js` 的 `adminAPI` 对象末尾（`saveNotice` 后）加一行**

```js
  removeUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 2: 在 `mock.js` 的 admin 适配区末尾（`saveNoticeAPI` 后）加导出**

```js
export const deleteUserAPI = (id) =>
  adminAPI.removeUser(id).then((r) => ({ success: true, message: r.message, data: r.data }))
```

- [ ] **Step 3: 前端回归测试 + 构建**

Run: `npm test`
Expected: 15/15 通过（现有 mockServer / scriptTypes 用例不受影响）

Run: `npm run build`
Expected: 构建成功，`dist/` 更新

- [ ] **Step 4: 提交**

```bash
git add src/api/client.js src/api/mock.js dist/
git commit -m "feat: 前端 API 层新增 deleteUserAPI（admin 删除账号）[#AI]"
```

---

### Task 4: 前端 UI —— Admin.vue 用户管理加删除按钮

**Files:**
- Modify: `src/views/Admin.vue`

**Interfaces:**
- Consumes: `deleteUserAPI`（来自 mock.js）、`showConfirmDialog`（已 import）、`showSuccessToast` / `showFailToast`（已 import）、`u.id` / `u.username` / `u.script_count`（admin_users 已返回）
- Produces: 用户管理 tab 每个用户行右侧出现红色「删除」按钮；删除成功后刷新用户列表与脚本列表

- [ ] **Step 1: 用户管理 tab 的 `van-cell` 加 `#extra` 删除按钮**

在现有 `#value` 模板之后（`</template>` 之前）插入：

```html
              <template #extra>
                <van-button size="mini" type="danger" plain @click="deleteUser(u)">删除</van-button>
              </template>
```

- [ ] **Step 2: script 区加 `deleteUser` 函数**

在 `adjustSun` 函数之后插入：

```js
function deleteUser(u) {
  showConfirmDialog({
    title: '删除账号',
    message: `确定删除用户「${u.username}」吗？将同时删除其名下 ${u.script_count} 个脚本，不可恢复！`,
  })
    .then(async () => {
      try {
        const res = await deleteUserAPI(u.id)
        showSuccessToast(res.message || '已删除')
        await loadUsers()
        await loadScripts()
      } catch (e) { showFailToast(e.message || '删除失败') }
    })
    .catch(() => {})
}
```

- [ ] **Step 3: 引入 `deleteUserAPI`**

把 `import { ... } from '../api/mock'` 列表中追加 `deleteUserAPI`：

```js
  getAdminMessagesAPI, adminReplyMessageAPI,
  getNoticeAPI, saveNoticeAPI,
  deleteUserAPI,
} from '../api/mock'
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: 提交**

```bash
git add src/views/Admin.vue
git commit -m "feat: 管理后台用户管理新增删除账号按钮与二次确认[#AI]"
```

---

### Task 5: 本地端到端走查 + 部署（需用户确认后执行）

**Files:**
- 无代码改动；走查 + 打包上传服务器

**Interfaces:**
- Consumes: 本地构建产物 `dist/`、后端 `server/`

- [ ] **Step 1: 本地完整走查**

- 起前端 dev server + 后端，admin 登录 → 用户管理 → 点击某测试用户「删除」→ 确认弹窗文案正确 → 确认 → toast 成功 → 用户列表与脚本列表均刷新，脚本管理里该用户的脚本消失。

- [ ] **Step 2: 打包部署（需用户确认线上部署后执行）**

- 按既有流程：打包 `yun-assistant-deploy.tar.gz`（dist + server + core）→ SFTP 上传 → 解压到 `~/yun-assistant/` → `sudo systemctl restart yun-assistant` → 线上访问 `http://43.155.147.214:8000` 回归一遍删除流程。

---

## Self-Review 记录

- **规格覆盖**：R1 删除入口 → Task 4；R2 二次确认 → Task 4 Step 2；R3 级联删除 → Task 2；R4 自动停脚本 → Task 2；R5 保护内置 admin → Task 2；R6 刷新联动 → Task 4 Step 2。全覆盖。
- **占位符扫描**：无 TBD/TODO，所有步骤含完整代码与命令。
- **类型一致性**：`delete_scripts_by_user` 返回 list[int]（Task 1）与 Task 2 的 `deleted_ids` 使用一致；`adminAPI.removeUser`（Task 3）与 `deleteUserAPI`（Task 4）调用一致；设备指纹用脚本 `device_key` 字段，与 create_script 写入的字段一致。
