# 一路狂飙查询剩余次数与动态统计 执行摘要

- 日期：2026-08-12
- 分支：feature/kb-runtime-stats（已合并到 main）
- 关联：设计/计划文档 `.project_context/plan/yun-assistant/2026-08-12_kb-script-design.md` / `2026-08-12_kb-script-plan.md`
- 执行方式：子代理驱动开发

## 任务目标

补齐一路狂飙脚本的两项功能：
1. **查询剩余3倍次数**：三倍芯片组自动查询展示（打开配置面板自动查询，无按钮）。
2. **动态统计**：脚本运行（toggle running）后 mock 模拟累积蓝紫金/钻石统计，配置面板每 3 秒轮询刷新。

## 关键实现（5 个提交）

| 提交 | 内容 |
|------|------|
| `57ed62e` | mockServer：`LS_RUNTIME` 记录 start_time、`mockToggle` 运行记录/停止清除、`mockRuntimeStats` 按运行时长模拟（ad_left 每120秒-1、q3每8秒、q4每20秒、q5每40秒、钻石每15秒+5）、runtime-stats 接口 |
| `91a3825` | client.js 加 `scriptAPI.runtimeStats`；Home.vue 暴露 `window.getRuntimeStats` 桥接 iframe |
| `a9ceb2c` | config.js display 支持 `setDisplayValue` 动态更新；schema 加 `adLeft`；config.html 每 3 秒轮询刷新统计 |
| `06308de` | 补 running 分支单测；mockDeleteScript 清理 runtime 记录 |
| `435a592` | 动态统计测试截图 |

## 关键设计

- **查询驱动、无定时器**：mockRuntimeStats 按运行时长（elapsed）重算统计，不维护后台定时器，简单可靠。
- **display 动态更新**：config.js display 渲染带 `data-display-value`，`window.setDisplayValue(fieldId, text)` 按 id 更新，轮询驱动刷新。
- **iframe 桥接**：config.html 通过 `window.parent.getRuntimeStats()` 获取 Home 面板当前脚本的运行统计。

## 验证结果

- ✅ 单元测试 15/15 通过（含 running 分支结构测试）
- ✅ `npm run build` 成功
- ✅ Chrome DevTools MCP 浏览器实测：
  - 打开配置面板，「剩余3倍次数」自动查询显示 3 次
  - 脚本启动后，蓝紫金统计从 0 动态累积（实测蓝5紫2金1）、钻石到 10
  - 小花仙配置面板不受影响
- ✅ 最终全分支评审通过（可合并），补 running 测试 + 清理删除逻辑

## 说明

- 统计为 mock 模拟值（纯前端框架无真实脚本引擎），接真实后端后由运行期状态回填。
- 剩余次数/蓝紫金/钻石轮询间隔 3 秒。
