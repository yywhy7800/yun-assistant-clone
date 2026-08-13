# 云助手上线：会员体系（周/月卡）+ 管理后台 执行摘要

- 日期：2026-08-13
- 分支：main（提交 `143cca3`）
- 关联：计划 `C:\Users\Administrator\.claude\plans\enchanted-pondering-emerson.md`

## 任务目标

上线服务器前的功能完善：① 注册送 0 太阳；② 会员卡续期（周卡 38☀️/7天、月卡 128☀️/30天，不设天卡）；③ 绑定不送试用（需买卡）；④ 到期时间精确到分秒；⑤ 内置 admin 账号 + 管理后台（用户/脚本/卡密）。

## 执行步骤

1. **后端数据层**（`server/store.py`）：user 增加 `role` 字段；新增 `cards` 表；新增 `now_dt`/`extend_expiry`（到期精确到分秒，兼容旧日期格式）
2. **后端业务**（`server/app.py`）：注册送 0 + role；`ensure_admin` 内置 admin/admin123；`purchase` 端点替换按天 renew；绑定 expire 空（未开通）；toggle 启动校验到期；卡密真实兑换；新增 admin API（users/sun/scripts/stop/expire/cards）；`require_admin` 中间件
3. **前端 API 层**（`client.js`/`mock.js`）：`scriptAPI.purchase` + `adminAPI` + 适配
4. **前端首页**（`Home.vue`）：续期弹窗改周卡/月卡卡片购买（复用 recharge-plans 样式）；`formatExpire` 到期显示（空→"未开通"红色）；个人中心加管理员后台入口
5. **管理后台**（新建 `Admin.vue` + `router`）：三个 tab（用户管理/脚本管理/卡密管理），`/admin` 路由 + requiresAdmin 守卫
6. **绑定回显**（`AddAccountForm.vue`）：到期空显示"未开通"

## 关键决策

- **内置 admin 账号**（用户决策）：`admin/admin123`，role=admin，启动时 ensure 创建
- **绑定不送试用**（用户决策）：新绑定角色 expire 为空，启动脚本必须已购买周/月卡
- **到期计算**：从 `max(当前时间, 原到期)` 向后延长，兼容旧 `YYYY-MM-DD` 数据
- **卡密**：后台生成（面额/数量可配置），兑换校验未用/标记已用，记录兑换人
- **到期校验位置**：toggle 启动时校验（渠道不支持的游戏先报"暂未接入"）

## 结果总结（端到端验证全通过）

- ✅ 注册新用户 → sun_balance 0、role=user
- ✅ admin/admin123 登录 → role=admin；普通用户访问 admin API → 403
- ✅ 后台生成卡密（面额/数量）→ 兑换 → +对应太阳；重复兑换提示"已被使用"
- ✅ 绑定角色 → expire 空；买周卡 → 扣 38☀️、expire 含分秒；余额不足 → 正确报错
- ✅ 前端 `npm test` 15/15 + `npm run build` 成功
- ✅ 浏览器走查：注册显示 ☀️0；首页到期"未开通"；购买会员卡弹窗（周/月卡卡片）；非 admin 访问 #/admin 被拒回首页；admin 后台三 tab（用户列表/脚本列表含停止调到期/卡密生成与记录）全部正常

## 说明

- 管理员初始密码 `admin123`，上线前建议提醒用户修改
- 现有历史脚本到期为旧 `YYYY-MM-DD` 格式，`extend_expiry` 已兼容，买卡后自动升级为分秒格式
- 管理后台入口：个人中心菜单（仅 role=admin 显示）
