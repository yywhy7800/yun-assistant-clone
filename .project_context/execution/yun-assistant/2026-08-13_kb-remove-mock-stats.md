# 一路狂飙移除模拟统计 执行摘要

- 日期：2026-08-13
- 分支：feature/kb-session-stats（已合并到 main）
- 关联：设计文档 `.project_context/plan/yun-assistant/2026-08-12_kb-script-design.md`（4.5 节修订）
- 执行方式：子代理驱动开发

## 任务目标

按用户最终决定：**不做 mock 模拟统计**。统计展示位（剩余3倍次数/蓝紫金/钻石）保留，当前显示**占位 0**，**等真实后端脚本接入后显示真实统计**。

## 背景

此前实现了 mock 模拟运行统计（按运行时长推算假数据），用户明确否定："不要做模拟统计，到时候脚本配置上去真实统计就好"。本次移除模拟逻辑，保留展示架构。

## 关键实现

| 提交 | 内容 |
|------|------|
| `e99b8b6` | mockServer：`mockRuntimeStats` 改占位（running 基于脚本 status + 全 0）；移除 `computeRuntimeStats`、`LS_RUNTIME`、`mockToggle` 的 start_time 记录、`mockDeleteScript` 的 runtime 清理 |
| `8d8c8ce` / `9c20a1b` / `5b4c6f4` | 测试截图留档 |
| `3d5e545` | 设计文档 4.5 修订（移除模拟、保留展示位） |
| `56a89be` | Home.vue `getRuntimeStats` 兜底改占位 0、注释清理模拟语义残留 |

## 保留的展示架构（真实数据接入路径）

- schema：`adLeft`（剩余3倍次数）、`tripleStats`（蓝紫金）、`rpDiamond`（钻石）展示位保留，当前占位 0。
- `client.js`：`scriptAPI.runtimeStats(id)` 桥接（真实后端实现后返回真实统计）。
- `Home.vue`：`window.getRuntimeStats` 桥接 iframe。
- `config.js`：`setDisplayValue` 动态更新 display。
- `game2/config.html`：每 3 秒轮询刷新统计展示位。

**真实后端脚本接入后**：runtime-stats 接口返回真实运行统计，前端展示位自动显示真实数据，无需改前端。

## 验证结果

- ✅ 单元测试 15/15 通过
- ✅ `npm run build` 成功
- ✅ Chrome DevTools MCP 浏览器实测：配置面板统计区显示占位 0（蓝 0 紫 0 金 0、钻石 0），无论脚本状态如何均不产生模拟数据
- ✅ 自查确认 mockServer.js 无模拟残留（computeRuntimeStats/LS_RUNTIME/start_time/elapsed 全无）
- ✅ 最终全分支评审通过（可合并），清理 Home.vue 模拟语义残留

## 说明

- 统计当前为占位 0，真实数据依赖后端脚本运行时记录写入 runtime-stats 接口。
- 架构已就绪，接真实后端无需改前端展示层。
