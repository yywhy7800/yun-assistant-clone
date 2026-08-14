# 云助手「管理后台删除账号」功能设计

- 日期：2026-08-14
- 作者：Claude Code（AI 辅助）
- 状态：已获用户批准，待实现
- 关联仓库：`yywhy7800/yun-assistant-clone`

## 一、背景与目标

管理后台目前只能"调整用户小太阳"、停止脚本、调到期等，**无法删除账号**。随着用户增多，需要清理不用的账号（连同其名下所有脚本一起删），减轻管理负担。

**目标**：管理后台用户管理里新增"删除账号"入口，一次操作删除指定用户及其名下全部脚本（含脚本配置、日志、设备指纹）。

**约束**：
- 删除不可逆，必须二次确认。
- 内置 `admin` 账号禁止删除；其他管理员账号可删。
- 运行中的脚本自动停止后再删。
- 留言记录、卡密兑换记录保留（作为经营历史）。
- 不改变既有功能逻辑，不动 UI 视觉风格。

## 二、需求详情

| # | 需求 | 说明 |
|---|------|------|
| R1 | 删除入口 | 管理后台「用户管理」tab，每个用户行右侧加红色「删除」按钮 |
| R2 | 二次确认 | 弹窗提示：`确定删除用户「用户名」吗？将同时删除其名下 N 个脚本，不可恢复！` |
| R3 | 级联删除 | 删除用户时一并删除其名下所有脚本 + 脚本配置（configs.json）+ 日志文件（logs/{sid}.log）+ 设备指纹（devices.json） |
| R4 | 自动停脚本 | 删除前自动 stop 该用户名下所有运行中的脚本 |
| R5 | 保护内置 admin | `username == 'admin'` 的账号后端硬拦截，提示不允许删除 |
| R6 | 刷新联动 | 删除成功后前端同时刷新用户列表与脚本列表 |

## 三、架构设计

### 3.1 数据层（`server/store.py` 新增）

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

### 3.2 后端接口（`server/app.py` 新增）

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
    # 1) 收集该用户名下脚本（删除前先记录，供清指纹/日志用）
    scripts = [s for s in store.get_scripts() if s.get("user_id") == uid]
    # 2) 逐个停止运行中脚本（协作式停止标记，未运行的忽略）
    for s in scripts:
        task_manager.stop(s["id"])
    # 3) 清理设备指纹（脚本对象存有 device_key，形如 "{platform}:{account}"）
    devices = store.get_devices()
    changed = False
    for s in scripts:
        key = s.get("device_key")
        if key and key in devices:
            del devices[key]
            changed = True
    if changed:
        store.save_devices(devices)
    # 4) 删除脚本 + 配置 + 日志文件
    deleted_ids = store.delete_scripts_by_user(uid)
    for sid in deleted_ids:
        store.delete_config(sid)
        _remove_script_log(sid)
    # 5) 删除用户
    store.delete_user(uid)
    return ok({"deleted_scripts": len(deleted_ids)},
              f"用户「{target['username']}」已删除，共删除 {len(deleted_ids)} 个脚本")
```

辅助函数 `_remove_script_log(sid)`：删除 `server/logs/{sid}.log`（存在则删，不存在忽略）。

### 3.3 前端 API 层

- `src/api/client.js`：`adminAPI` 新增
  ```js
  removeUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  ```
- `src/api/mock.js`：新增适配
  ```js
  export const deleteUserAPI = (id) =>
    adminAPI.removeUser(id).then((r) => ({ success: true, message: r.message, data: r.data }))
  ```

### 3.4 管理后台 UI（`src/views/Admin.vue`）

- 用户管理 tab 用户 cell 的 `#extra` 加红色「删除」按钮：
  ```html
  <van-button size="mini" type="danger" plain @click="deleteUser(u)">删除</van-button>
  ```
- 新增 `deleteUser(u)`：`showConfirmDialog` 确认后调 `deleteUserAPI(u.id)`，成功 toast + 刷新 `loadUsers()` 与 `loadScripts()`。
- 确认文案带脚本数量：`将同时删除其名下 ${u.script_count} 个脚本，不可恢复！`

## 四、数据流

```
管理员点击「删除」→ showConfirmDialog 二次确认
  → DELETE /api/admin/users/<uid>
  → 后端：require_admin → 校验非内置 admin → 停脚本 → 清指纹 → 删脚本/配置/日志 → 删用户
  → 前端 toast 成功 → 刷新用户列表 + 脚本列表
```

## 五、文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/store.py` | 修改 | 新增 `delete_scripts_by_user` / `delete_user` |
| `server/app.py` | 修改 | 新增 `admin_delete_user` 端点 + `_remove_script_log` 辅助 |
| `src/api/client.js` | 修改 | `adminAPI` 加 `removeUser` |
| `src/api/mock.js` | 修改 | 加 `deleteUserAPI` |
| `src/views/Admin.vue` | 修改 | 用户管理加删除按钮 + 确认弹窗 + 刷新联动 |

## 六、错误处理

- 内置 admin：后端返回「内置 admin 账号不允许删除」，前端 toast 展示。
- 目标用户不存在（并发下已删）：返回「用户不存在」。
- 删除不可逆：前端确认框明确文案提示。
- 运行中脚本 stop 失败/未运行：忽略（协作式停止，不影响删除流程）。

## 七、验证方式

1. 后端本地起服务（`cd server && python app.py`），curl 覆盖：
   - 删普通用户（带脚本）→ users/scripts/configs/devices/日志 均被清理
   - 删有运行中脚本的用户 → 脚本先停止再删除
   - 删内置 admin → 返回拒绝
   - 删不存在用户 → 返回「用户不存在」
2. 前端 `npm test` 回归不破坏既有 15 个用例；`npm run build` 通过。
3. 浏览器走查：admin 登录 → 用户管理删除一个测试用户 → 确认弹窗 → 列表刷新。

## 八、范围边界（明确不做）

- ❌ 不做软删除 / 回收站（直接硬删）
- ❌ 不清留言记录、卡密兑换记录
- ❌ 不改用户侧既有删除脚本逻辑
- ❌ 不动 UI 视觉风格、布局
- ❌ 不做批量删除、搜索筛选等额外功能
