# 多脚本框架改造执行摘要

- 日期：2026-08-12
- 分支：feature/multi-script-framework（已合并到 main）
- 关联：设计文档 `.project_context/plan/yun-assistant/2026-08-12_multi-script-framework-design.md`、实现计划 `.project_context/plan/yun-assistant/2026-08-12_multi-script-framework-plan.md`

## 任务目标

将「云助手」从单游戏脚本升级为**多脚本框架**：支持多个游戏脚本并存，添加账号流程改为「先选脚本再登录」，每个脚本拥有独立渠道与配置面板。纯前端 + mock 数据，第二个游戏内容先占位。

## 执行步骤

1. **探索与需求澄清**：通读项目（Home.vue 2303 行等），确认核心需求为多脚本框架；UI 视觉不动、纯前端改造。
2. **设计文档**：确定「脚本类型注册表 + Mock 层 + 配置目录化」方案，写入 `.project_context/plan/` 并提交。
3. **实现计划**：writing-plans 拆分为 7 个任务（TDD），逐一执行。

## 关键实现

| 提交 | 内容 |
|------|------|
| `1d546cb` | `src/config/scriptTypes.js` 脚本类型注册表（gs 小花仙 + game2 新游戏）+ vitest/jsdom 测试基础设施 |
| `5558e39` | `src/api/mockServer.js` 模拟后端（登录/脚本 CRUD/配置/日志等），client.js 加 `USE_MOCK` 开关与 `scriptAPI.create` |
| `01c9ca4` | AddAccountForm 视图状态机改为 `games → channels → password → success`，渠道改从注册表读取 |
| `b67877e` | 首页脚本卡片加游戏标签；`openConfigPanel` 按 `gameType` 加载对应配置页 |
| `8cd0e70` | 新游戏占位配置页 `public/config-pages/game2/config.html` |
| `f26c850` | 修复「确认创建」假逻辑（真正调创建接口）；移除孤儿路由 `/add-account` 与 `AddAccount.vue` |
| `890f8a9` | 浏览器功能测试截图留档 |

## 关键决策

- **脚本类型注册表**为唯一数据源：新增游戏只需向 `scriptTypes` 数组加一项（含渠道、配置路径）。
- **Mock 层返回结构与真实 API 一致**（`{ success, data, message }`），`USE_MOCK` 一键切换真实后端，前端零改动。
- 新游戏配置面板采用**空配置占位页**，兼容父窗口 iframe 协议（`updateConfigFromParent` / `saveConfig`）。
- 环境补充：安装 Node.js LTS v24（winget）、Chrome DevTools MCP（用户级）用于浏览器自动化测试。

## 验证结果

- ✅ 单元测试 12/12 通过（注册表 4 + mockServer 8）
- ✅ `npm run build` 构建成功
- ✅ Chrome DevTools MCP 浏览器端到端走查全通过：
  - 登录（mock 任意账号）→ 首页 3 个原始脚本 + 新增脚本均正确标注游戏
  - 添加脚本「先选脚本」→ 新游戏仅官服渠道 → 绑定成功 → 列表新增
  - 新游戏配置面板显示占位页；小花仙配置面板显示完整 20 组配置项
  - 「确认创建」真正生成新脚本（NO.1005）
  - 日志面板 mock 日志正常

## 后续可做（用户后填）

- 在 `scriptTypes` 注册表补充 game2 的具体渠道与名称
- 填充 `public/config-pages/game2/config.schema.js` 实现新游戏真实配置项
