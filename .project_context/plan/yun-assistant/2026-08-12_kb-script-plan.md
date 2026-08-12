# 一路狂飙（kb）脚本内容 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 填充「一路狂飙」脚本内容：注册表（名称/渠道）、配置项 schema、配置面板通用渲染、mock 数据、测试更新。

**Architecture:** 复用多脚本框架已有结构。`scriptTypes.js` 中 `game2` 项改为一路狂飙（id/name 均用「一路狂飙」，渠道 iOS/安卓）；新建 `game2/config.schema.js` 定义 4 组配置项；`game2/config.html` 由占位页改为加载通用渲染器 `config.js`（复用上级目录的 config.css/config.js，不加载花朵数据）；mock 数据与测试同步。

**Tech Stack:** Vue 3 / Vite / Vant / vitest

## Global Constraints

- 脚本 id 与 name 均用「一路狂飙」。
- 配置 schema 仅用 `boolean / integer / select` 类型，不涉及花朵/花灵/花瓶字段。
- `game2/config.html` 复用上级 `config.css`、`config.js`，DOM 必须含 `loadingOverlay`、`configContent`、`toast` 三个 id。
- 复用 config.js 后父窗口协议（`updateConfigFromParent` / `saveConfig`）与小花仙一致。
- 中文注释风格，提交信息中文 + `[#AI]`。
- 不动小花仙脚本配置与真实脚本逻辑（前端框架层）。

---

## Task 1: 一路狂飙脚本类型注册表

**Files:**
- Modify: `src/config/scriptTypes.js`
- Test: `src/config/__tests__/scriptTypes.test.js`

**Interfaces:**
- Consumes: 无（修改既有 `game2` 项）
- Produces: `scriptTypes` 中 id/name 为「一路狂飙」、渠道 iOS/安卓 的脚本类型；`getScriptType('一路狂飙')` 可用

- [ ] **Step 1: 写失败测试**

在 `src/config/__tests__/scriptTypes.test.js` 末尾追加：
```js
it('一路狂飙类型有 iOS/安卓渠道', () => {
  const kb = getScriptType('一路狂飙')
  const channels = kb.channels.map((c) => c.channel)
  expect(channels).toContain('ios')
  expect(channels).toContain('android')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，`getScriptType('一路狂飙')` 回退到第一个（gs），`channels` 不含 ios/android

- [ ] **Step 3: 替换 scriptTypes.js 的 game2 项**

将 `src/config/scriptTypes.js` 中 `{ id: 'game2', ... }` 整个对象替换为：
```js
{
  id: '一路狂飙',
  name: '一路狂飙',
  emoji: '🏎️',
  color: '#ff4d4f',
  channels: [
    { name: 'iOS', color: '#1a1a1a', channel: 'ios', available: true, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1a1a1a"/><text x="28" y="36" text-anchor="middle" font-size="16" fill="#fff">iOS</text></svg>' },
    { name: '安卓', color: '#3ddc84', channel: 'android', available: true, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#3ddc84"/><text x="28" y="36" text-anchor="middle" font-size="20" fill="#fff">安</text></svg>' },
  ],
  configPath: '/config-pages/game2/config.html',
  statusPath: '',
},
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS（scriptTypes 5 个用例）

- [ ] **Step 5: 提交**

```bash
git add src/config/scriptTypes.js src/config/__tests__/scriptTypes.test.js
git commit -m "feat: 一路狂飙脚本类型注册（iOS/安卓渠道）" -m "#AI"
```

---

## Task 2: 一路狂飙配置 schema

**Files:**
- Create: `public/config-pages/game2/config.schema.js`

**Interfaces:**
- Produces: `window.CONFIG_SCHEMA`（基础/通关/三倍/抢红包 4 组），供 Task 3 的 config.html 加载渲染

- [ ] **Step 1: 新建配置 schema**

Create `public/config-pages/game2/config.schema.js`:
```js
// 一路狂飙 配置 Schema（对照 Web 面板功能：通关/三倍芯片/抢红包/基础设置）
window.CONFIG_SCHEMA = {
  "properties": {
    "basic": {
      "description": "基础设置",
      "properties": {
        "autoReconnect": {"type": "boolean", "description": "自动重连", "default": true},
        "reconnectInterval": {"type": "integer", "description": "重连间隔(分)", "default": 10, "min": 1, "dependsOn": "autoReconnect"},
        "loginMethod": {
          "type": "select", "description": "登录方式", "default": "auto",
          "options": [
            {"value": "auto", "label": "自动识别"},
            {"value": "mobile", "label": "手机密码"},
            {"value": "account", "label": "账号密码"}
          ]
        }
      }
    },
    "clear": {
      "description": "通关设置",
      "properties": {
        "autoClear": {"type": "boolean", "description": "自动通关", "default": true},
        "clearLevel": {"type": "integer", "description": "通关关卡", "default": 260, "min": 1, "dependsOn": "autoClear"},
        "clearTime": {"type": "integer", "description": "通关时间(秒)", "default": 300, "min": 1, "dependsOn": "autoClear"},
        "skillSelects": {"type": "integer", "description": "技能次数", "default": 20, "min": 1, "max": 30, "dependsOn": "autoClear"}
      }
    },
    "triple": {
      "description": "三倍芯片",
      "properties": {
        "autoTriple": {"type": "boolean", "description": "自动刷三倍", "default": false},
        "tripleLevel": {"type": "integer", "description": "三倍关卡", "default": 211, "min": 1, "dependsOn": "autoTriple"},
        "tripleThreshold": {
          "type": "select", "description": "领取阈值", "default": "q4", "dependsOn": "autoTriple",
          "options": [
            {"value": "q3", "label": "Q3 蓝"},
            {"value": "q4", "label": "Q4 紫"},
            {"value": "q5", "label": "Q5 金"}
          ]
        }
      }
    },
    "redpocket": {
      "description": "抢红包",
      "properties": {
        "autoRedpocket": {"type": "boolean", "description": "自动抢红包", "default": false},
        "rpTarget": {"type": "integer", "description": "目标红包数", "default": 10, "min": 1, "max": 10, "dependsOn": "autoRedpocket"}
      }
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add public/config-pages/game2/config.schema.js
git commit -m "feat: 一路狂飙配置 schema（基础/通关/三倍/抢红包）" -m "#AI"
```

---

## Task 3: 配置面板改为通用渲染器

**Files:**
- Replace: `public/config-pages/game2/config.html`

**Interfaces:**
- Consumes: `config.schema.js`（Task 2，同目录）、上级 `../config.css`、`../config.js`；DOM 提供 `loadingOverlay`/`configContent`/`toast`
- Produces: iframe 页面，加载后 `updateConfigFromParent` / `saveConfig` 可用（由 config.js 提供）

- [ ] **Step 1: 替换 config.html**

Create `public/config-pages/game2/config.html`（覆盖占位页）:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>脚本配置</title>
  <style>
    /* 关键 CSS：确保页面加载时立即生效 */
    html {
      overflow-y: scroll;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-y: none;
    }
    body {
      margin: 0;
      padding: 0;
      overscroll-behavior-y: none;
      position: relative;
    }
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      pointer-events: auto;
    }
    .loading-overlay.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .config-content {
      display: none;
    }
  </style>
  <script>
    // 从 URL 中获取版本号参数（由父组件传入）
    const urlParams = new URLSearchParams(window.location.search);
    const version = urlParams.get('v') || '1.0.0';

    // 加载配置 Schema（本目录）→ CSS（上级目录）→ config.js（上级目录，通用渲染器）
    // 一路狂飙仅用 boolean/integer/select，无需加载花朵数据库
    const schemaScript = document.createElement('script');
    schemaScript.src = `config.schema.js?v=${version}`;
    schemaScript.onload = function() {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `../config.css?v=${version}`;
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = `../config.js?v=${version}`;
      document.body.appendChild(script);
    };
    document.head.appendChild(schemaScript);
  </script>
</head>
<body>
  <!-- Loading Overlay（config.js 通过 id 控制显隐） -->
  <div class="loading-overlay" id="loadingOverlay">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">加载中...</div>
    </div>
  </div>

  <!-- Configuration Content（config.js 动态渲染表单） -->
  <div class="config-content" id="configContent" style="display: none;"></div>

  <!-- 提示消息 -->
  <div class="toast" id="toast"></div>
</body>
</html>
```

- [ ] **Step 2: 提交**

```bash
git add public/config-pages/game2/config.html
git commit -m "feat: 一路狂飙配置面板接入通用渲染器" -m "#AI"
```

---

## Task 4: mock 数据与测试更新

**Files:**
- Modify: `src/api/mockServer.js`（DEFAULT_SCRIPTS）
- Test: `src/api/__tests__/mockServer.test.js`

**Interfaces:**
- Produces: mock 脚本 `gameType: '一路狂飙'`，与 Task 1 注册表 id 一致

- [ ] **Step 1: 写失败测试**

在 `src/api/__tests__/mockServer.test.js` 的「列表包含两个游戏」用例中，把 `games.has('game2')` 改为：
```js
expect(games.has('一路狂飙')).toBe(true)
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，mock 数据仍是 `gameType: 'game2'`

- [ ] **Step 3: 修改 mock 数据**

在 `src/api/mockServer.js` 的 `DEFAULT_SCRIPTS` 中，将 game2 脚本改为：
```js
{ id: 3, gameType: '一路狂飙', roleName: '狂飙车手', server: '国服', status: 'stopped', channel: 'android', account: 'kb001', number: 'NO.2001', expire: '2026-09-01' },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS（全部 13 个用例：scriptTypes 5 + mockServer 8）

- [ ] **Step 5: 提交**

```bash
git add src/api/mockServer.js src/api/__tests__/mockServer.test.js
git commit -m "feat: mock 数据更新为一路狂飙脚本" -m "#AI"
```

---

## Task 5: 端到端验证

**Files:** 无代码改动，仅验证

- [ ] **Step 1: 跑全部单测 + 构建**

Run:
```bash
npm test
npm run build
```
Expected: 全部 PASS + build 成功

- [ ] **Step 2: 浏览器走查（Chrome DevTools MCP）**

启动 `npm run dev`，用 Chrome DevTools MCP 走查：
1. 首页出现「🏎️ 一路狂飙」脚本卡片（原 game2 卡片名更新）
2. 添加脚本 → 选「一路狂飙」→ 渠道 iOS/安卓 可选
3. 一路狂飙脚本「配置」→ 面板渲染真实表单：基础设置/通关设置/三倍芯片/抢红包 4 组
4. 小花仙脚本配置面板不受影响（仍 20 组）
5. 表单可交互（开关联动、select 可选）

- [ ] **Step 3: 最终提交（如有遗留）**

```bash
git status
git add -A
git commit -m "chore: 一路狂飙脚本内容完成" -m "#AI"
```
