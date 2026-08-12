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

## Task 2: config.js 新增 locked 与 display 字段类型

**Files:**
- Modify: `public/config-pages/config.js`

**Interfaces:**
- Produces: `createFieldElement` 支持 `locked`（占位行 + 点击 showToast）与 `display`（只读展示行）类型；`readFormData` 因渲染无 fieldId 控件自动跳过该字段（`if (!element) return`）

- [ ] **Step 1: 新增 locked 类型渲染分支**

在 `public/config-pages/config.js` 的 `string` 分支（`} else if (propSchema.type === 'string') {`）结束之后、`memberList` 分支之前，插入以下分支：
```js
  } else if (propSchema.type === 'locked') {
    // 锁定功能：占位展示，点击提示（暂不对外开放）
    const lockedMsg = propSchema.lockedMessage || '此功能暂不对外开放，如需使用请联系上级';
    field.innerHTML = `
      <div class="locked-feature" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f7f8fa;border:1px dashed #e0e0e0;border-radius:8px;cursor:pointer;user-select:none;">
        <span style="font-size:14px;color:#333;">${label}</span>
        <span style="font-size:12px;color:#999;border:1px solid #d9d9d9;border-radius:3px;padding:1px 5px;">暂不开放</span>
      </div>
    `;
    field.querySelector('.locked-feature').addEventListener('click', () => showToast(lockedMsg));
  } else if (propSchema.type === 'display') {
    // 只读展示项（统计/固定值），不交互、不参与保存
    const displayValue = propSchema.value !== undefined ? propSchema.value : '';
    field.innerHTML = `
      <div class="stat-display" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f7f8fa;border-radius:8px;">
        <span style="font-size:14px;color:#333;">${label}</span>
        <span style="font-size:14px;color:#969799;">${displayValue}</span>
      </div>
    `;
  }
```

- [ ] **Step 2: 提交**

```bash
git add public/config-pages/config.js
git commit -m "feat: config 渲染器新增 locked/display 类型" -m "#AI"
```

---

## Task 3: 一路狂飙配置 schema

**Files:**
- Create: `public/config-pages/game2/config.schema.js`

**Interfaces:**
- Consumes: `locked` / `display` 类型（Task 2）
- Produces: `window.CONFIG_SCHEMA`（基础/完美通关[两分支锁定]/三倍[含统计]/抢红包世界[含统计] 4 组），供 Task 4 的 config.html 加载渲染

- [ ] **Step 1: 新建配置 schema**

Create `public/config-pages/game2/config.schema.js`:
```js
// 一路狂飙 配置 Schema（对照 Web 面板功能：基础/完美通关/三倍芯片/抢红包世界）
window.CONFIG_SCHEMA = {
  "properties": {
    "basic": {
      "description": "基础设置",
      "properties": {
        "autoReconnect": {"type": "boolean", "description": "自动重连", "default": true},
        "reconnectInterval": {"type": "display", "description": "重连间隔", "value": "5~120 秒（指数退避）"},
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
      "description": "完美通关",
      "properties": {
        "perfectClear": {"type": "locked", "description": "完美通关", "lockedMessage": "暂不对外开放，如需要请联系上级"},
        "unfinishedLevel": {"type": "locked", "description": "未通关关卡", "lockedMessage": "暂不对外开放，如需要请联系上级"}
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
        },
        "tripleStats": {"type": "display", "description": "本次已领", "value": "蓝 0 · 紫 0 · 金 0"}
      }
    },
    "redpocket": {
      "description": "抢红包（世界）",
      "properties": {
        "autoRedpocket": {"type": "boolean", "description": "自动抢红包", "default": false},
        "rpTarget": {"type": "integer", "description": "目标红包数", "default": 10, "min": 1, "max": 10, "dependsOn": "autoRedpocket"},
        "rpDiamond": {"type": "display", "description": "累计钻石", "value": "0"}
      }
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add public/config-pages/game2/config.schema.js
git commit -m "feat: 一路狂飙配置 schema（基础/通关锁定/三倍/抢红包）" -m "#AI"
```

---

## Task 4: 配置面板改为通用渲染器

**Files:**
- Replace: `public/config-pages/game2/config.html`

**Interfaces:**
- Consumes: `config.schema.js`（Task 3，同目录）、上级 `../config.css`、`../config.js`（含 locked 类型，Task 2）；DOM 提供 `loadingOverlay`/`configContent`/`toast`
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

## Task 5: mock 数据与测试更新

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

## Task 6: 端到端验证

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
3. 一路狂飙脚本「配置」→ 面板渲染：基础设置/通关设置(锁定占位)/三倍芯片/抢红包 4 组
4. **通关设置**显示「自动通关 + 暂不开放」，**点击提示「此功能暂不对外开放，如需使用请联系上级」**
5. 小花仙脚本配置面板不受影响（仍 20 组）
6. 表单可交互（开关联动、select 可选）

- [ ] **Step 3: 最终提交（如有遗留）**

```bash
git status
git add -A
git commit -m "chore: 一路狂飙脚本内容完成" -m "#AI"
```

---

# 二轮：查询剩余次数与动态统计

## Task 7: mock 运行模拟与 runtime-stats 接口

**Files:**
- Modify: `src/api/mockServer.js`
- Test: `src/api/__tests__/mockServer.test.js`

**Interfaces:**
- Produces: `GET /scripts/:id/runtime-stats` 返回 `{ running, ad_left, claimed_q3, claimed_q4, claimed_q5, rp_diamond, rp_grabbed }`；`mockToggle` 在 running 时记录 `mock_runtime[id]=start_time`

- [ ] **Step 1: 写失败测试**

在 `src/api/__tests__/mockServer.test.js` 的 mock 脚本 describe 内追加：
```js
it('runtime-stats 未运行返回 0 统计', () => {
  const res = handleMockRequest('/scripts/1/runtime-stats')
  expect(res.success).toBe(true)
  expect(res.data.running).toBe(false)
  expect(res.data.ad_left).toBe(3)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL（`/scripts/1/runtime-stats` 未实现，返回 fail）

- [ ] **Step 3: 实现运行模拟**

在 `src/api/mockServer.js`：
1. 顶部加常量：`const LS_RUNTIME = 'mock_runtime' // { [id]: { running, start_time, stats } }`
2. 修改 `mockToggle`，**启动时重置本次统计、停止时冻结累计**（对齐 Web 面板「本次累计」语义）：
```js
function mockToggle(id) {
  const list = getScripts()
  const s = list.find((x) => x.id === id)
  if (!s) return fail('脚本不存在')
  s.status = s.status === 'running' ? 'stopped' : 'running'
  write(LS_SCRIPTS, list)
  const rt = read(LS_RUNTIME, {})
  if (s.status === 'running') {
    // 启动：重置本次统计为 0，记录启动时间（本次累计从 0 开始）
    rt[id] = { running: true, start_time: Date.now(), stats: { q3: 0, q4: 0, q5: 0, diamond: 0, grabbed: 0, ad_left: 3 } }
  } else {
    // 停止：冻结本次累计（合并运行期增量，保留本次结果）
    const cur = rt[id]
    const frozen = cur && cur.running ? computeRuntimeStats(cur) : { stats: { q3: 0, q4: 0, q5: 0, diamond: 0, grabbed: 0, ad_left: 3 } }
    rt[id] = { running: false, start_time: null, stats: frozen.stats }
  }
  write(LS_RUNTIME, rt)
  return ok({ newStatus: s.status }, '操作成功')
}
```
3. 新增统计计算与接口（**本次累计：已累计 stats + 运行期增量**，查询驱动无定时器）：
```js
function computeRuntimeStats(runtime) {
  const zero = { q3: 0, q4: 0, q5: 0, diamond: 0, grabbed: 0, ad_left: 3 }
  if (!runtime || !runtime.running) return { running: false, stats: runtime ? runtime.stats : zero }
  const elapsed = Math.floor((Date.now() - runtime.start_time) / 1000)
  const s = runtime.stats
  return {
    running: true,
    stats: {
      q3: s.q3 + Math.floor(elapsed / 8),
      q4: s.q4 + Math.floor(elapsed / 20),
      q5: s.q5 + Math.floor(elapsed / 40),
      diamond: s.diamond + Math.floor(elapsed / 15) * 5,
      grabbed: s.grabbed + Math.floor(elapsed / 15),
      ad_left: Math.max(0, s.ad_left - Math.floor(elapsed / 120)),
    },
  }
}

function mockRuntimeStats(id) {
  const rt = read(LS_RUNTIME, {})
  const r = computeRuntimeStats(rt[id])
  const st = r.stats
  return ok({
    running: r.running,
    ad_left: st.ad_left,
    claimed_q3: st.q3,
    claimed_q4: st.q4,
    claimed_q5: st.q5,
    rp_diamond: st.diamond,
    rp_grabbed: st.grabbed,
  }, 'ok')
}
```
4. `handleMockRequest` 的 scripts 分发中加：
```js
if (m && scriptId && action === 'runtime-stats' && method === 'GET') return mockRuntimeStats(scriptId)
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS（mockServer 9 用例）

- [ ] **Step 5: 提交**

```bash
git add src/api/mockServer.js src/api/__tests__/mockServer.test.js
git commit -m "feat: mock 运行模拟与 runtime-stats 统计接口" -m "#AI"
```

## Task 8: runtimeStats API 与 iframe 桥接

**Files:**
- Modify: `src/api/client.js`
- Modify: `src/views/Home.vue`

**Interfaces:**
- Consumes: `GET /scripts/:id/runtime-stats`（Task 7）
- Produces: `scriptAPI.runtimeStats(id)`；`window.getRuntimeStats()`（Home 暴露给配置 iframe）

- [ ] **Step 1: client.js 加 runtimeStats**

在 `src/api/client.js` 的 `scriptAPI` 中 `logs` 之前加：
```js
runtimeStats: (id) => request(`/scripts/${id}/runtime-stats`),
```

- [ ] **Step 2: Home.vue 暴露桥接**

在 `src/views/Home.vue` 的 `window.saveScriptConfig` 定义之后加：
```js
// 配置 iframe 获取运行统计（mock 模拟运行累积，实时刷新）
window.getRuntimeStats = async () => {
  const id = panelScript.value?.id
  if (!id) return { running: false, ad_left: 3, claimed_q3: 0, claimed_q4: 0, claimed_q5: 0, rp_diamond: 0, rp_grabbed: 0 }
  try {
    const res = await scriptAPI.runtimeStats(id)
    return res.data
  } catch (e) {
    console.warn('[Home] getRuntimeStats 失败:', e.message)
    return { running: false, ad_left: 3, claimed_q3: 0, claimed_q4: 0, claimed_q5: 0, rp_diamond: 0, rp_grabbed: 0 }
  }
}
```

- [ ] **Step 3: 验证 + 提交**

Run: `npm test` 全过；`npm run build` 成功。
```bash
git add src/api/client.js src/views/Home.vue
git commit -m "feat: runtimeStats API 与配置面板 iframe 桥接" -m "#AI"
```

## Task 9: display 动态更新 + schema + 面板轮询

**Files:**
- Modify: `public/config-pages/config.js`（display 支持动态更新）
- Modify: `public/config-pages/game2/config.schema.js`（加 adLeft）
- Modify: `public/config-pages/game2/config.html`（轮询）

**Interfaces:**
- Consumes: `window.getRuntimeStats()`（Task 8）、`window.setDisplayValue(fieldId, text)`（本任务）
- Produces: 三倍芯片组显示「剩余3倍次数」自动查询；蓝紫金/钻石统计定时刷新

- [ ] **Step 1: config.js display 支持动态更新**

修改 `public/config-pages/config.js` 的 display 分支，value span 加 `data-display-value="${fieldId}"`：
```js
  } else if (propSchema.type === 'display') {
    // 只读展示项（统计/固定值），支持运行时动态更新
    const displayValue = propSchema.value != null ? propSchema.value : '';
    field.innerHTML = `
      <div class="stat-display" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f7f8fa;border-radius:8px;">
        <span style="font-size:14px;color:#333;">${label}</span>
        <span data-display-value="${fieldId}" style="font-size:14px;color:#969799;">${displayValue}</span>
      </div>
    `;
  }
```
在文件末尾（`window.updateConfigFromParent` 附近）加全局更新函数：
```js
// 父窗口/脚本运行时更新 display 值（fieldId 形如 triple_tripleStats）
window.setDisplayValue = function (fieldId, text) {
  const el = document.querySelector(`[data-display-value="${fieldId}"]`)
  if (el) el.textContent = text
}
```

- [ ] **Step 2: schema 加剩余次数**

在 `public/config-pages/game2/config.schema.js` 的 `triple` 组中、`tripleStats` 之前加：
```js
"adLeft": {"type": "display", "description": "剩余3倍次数", "value": "查询中…"},
```

- [ ] **Step 3: config.html 轮询**

在 `public/config-pages/game2/config.html` 的加载链中，`config.js` 的 `<script>` 标签添加 `onload`，在其后启动统计轮询：
```html
      const script = document.createElement('script');
      script.src = `../config.js?v=${version}`;
      script.onload = function() {
        // 统计轮询：每 3 秒从父窗口拉取运行统计，更新 display
        try {
          if (window.parent && window.parent.getRuntimeStats) {
            window.setInterval(function () {
              window.parent.getRuntimeStats().then(function (stats) {
                if (!stats) return;
                if (window.setDisplayValue) {
                  window.setDisplayValue('triple_adLeft', stats.ad_left !== undefined ? stats.ad_left + ' 次' : '查询中…');
                  window.setDisplayValue('triple_tripleStats', '蓝 ' + (stats.claimed_q3 || 0) + ' · 紫 ' + (stats.claimed_q4 || 0) + ' · 金 ' + (stats.claimed_q5 || 0));
                  window.setDisplayValue('redpocket_rpDiamond', stats.rp_diamond !== undefined ? String(stats.rp_diamond) : '0');
                }
              });
            }, 3000);
          }
        } catch (e) {}
      };
      document.body.appendChild(script);
```

- [ ] **Step 4: 验证 + 提交**

Run: `npm test` 全过；`npm run build` 成功。
```bash
git add public/config-pages/config.js public/config-pages/game2/config.schema.js public/config-pages/game2/config.html
git commit -m "feat: 配置面板查询剩余次数与动态统计轮询" -m "#AI"
```

## Task 10: 端到端验证

- [ ] **Step 1: 单测 + 构建**

Run: `npm test`、`npm run build`，全过。

- [ ] **Step 2: 浏览器走查**

启动 dev，用 Chrome DevTools MCP：
1. 打开一路狂飙配置面板，三倍芯片组显示「剩余3倍次数」（自动查询）。
2. 首页把一路狂飙脚本 toggle 为「运行」，回到配置面板，等 10+ 秒观察蓝紫金/钻石统计增长、剩余次数变化。
3. 小花仙配置面板不受影响。
