# 云助手「多脚本框架」实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将云助手升级为多脚本框架：新增脚本类型注册表与 mock 后端，改造添加账号流程为「先选脚本」，首页卡片标注游戏，每个脚本独立配置面板，并修复「确认创建」假逻辑与孤儿路由。

**Architecture:** 以「脚本类型注册表」(`src/config/scriptTypes.js`) 为核心数据源，游戏渠道、配置页路径全部由注册表驱动。新增 `src/api/mockServer.js` 模拟后端接口（数据存 localStorage），`client.js` 通过 `USE_MOCK` 开关在 mock 与真实 API 间切换。Home.vue 只做增量修改（卡片标注、配置面板按 gameType 加载路径），不重构。

**Tech Stack:** Vue 3.5 / Vite 5 / Vant 4.9 / vitest + jsdom（仅单元测试）

## Global Constraints

- 纯前端演示：`USE_MOCK = true`，不依赖真实后端；切换为 `false` 即走真实 API。
- UI 视觉风格不动：不引入新主题、不改配色布局。
- 不重构 Home.vue 组件拆分、不做 PWA / Vant 按需引入等性能优化。
- 新游戏（game2）的具体渠道与配置内容保持占位，用户日后填充。
- 中文注释风格，跟随现有代码（`src/api/client.js`、`src/components/AddAccountForm.vue`）。
- 提交信息用中文，Conventional Commits，body 末尾加 `[#AI]`。
- 所有 API 返回结构与真实后端一致：成功 `{ success: true, data, message? }`，失败 `{ success: false, message }`。

---

## Task 1: 测试基础设施 + 脚本类型注册表

**Files:**
- Create: `src/config/scriptTypes.js`
- Create: `src/config/__tests__/scriptTypes.test.js`
- Modify: `package.json`（加 test script + devDependencies）
- Create: `vitest.config.js`

**Interfaces:**
- Produces: `scriptTypes`（数组，每项 `{ id, name, emoji, color, channels: [{ name, color, channel, available, iconSvg }], configPath, statusPath }`）、`getScriptType(id)`（找不到回退第一个）

- [ ] **Step 1: 安装测试依赖**

Run:
```bash
cd /d/BaiduNetdiskDownload/yun-assistant-clone
npm install -D vitest jsdom
```

- [ ] **Step 2: 配置 vitest**

Create `vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'jsdom' },
})
```

- [ ] **Step 3: 修改 package.json 增加 test 脚本**

Edit `package.json` scripts:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run"
},
```

- [ ] **Step 4: 写失败测试**

Create `src/config/__tests__/scriptTypes.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { scriptTypes, getScriptType } from '../scriptTypes'

describe('scriptTypes 注册表', () => {
  it('至少包含两个脚本类型（多脚本框架）', () => {
    expect(scriptTypes.length).toBeGreaterThanOrEqual(2)
  })

  it('每个脚本类型有 id/name/channels/configPath', () => {
    for (const t of scriptTypes) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(Array.isArray(t.channels)).toBe(true)
      expect(t.channels.length).toBeGreaterThan(0)
      expect(t.configPath).toBeTruthy()
    }
  })

  it('gs 类型保留官服渠道（迁移自 AddAccountForm）', () => {
    const gs = getScriptType('gs')
    const official = gs.channels.find((c) => c.channel === 'official')
    expect(official.available).toBe(true)
  })

  it('getScriptType 对未知 id 回退到第一个', () => {
    expect(getScriptType('unknown').id).toBe(scriptTypes[0].id)
  })
})
```

- [ ] **Step 5: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，报 `Cannot find module '../scriptTypes'`

- [ ] **Step 6: 实现注册表**

Create `src/config/scriptTypes.js`:
```js
/**
 * 脚本类型注册表
 * 集中定义云助手支持的所有游戏脚本；新增脚本类型只需向数组加一项
 * channels 渠道结构沿用原 AddAccountForm 的渠道数据
 */
export const scriptTypes = [
  {
    id: 'gs',
    name: '小花仙',
    emoji: '🌸',
    color: '#667eea',
    channels: [
      { name: '官服', color: '#1989fa', channel: 'official', available: true, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">官</text></svg>' },
      { name: '应用宝', color: '#07c160', channel: 'yyb', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#07c160"/><text x="28" y="36" text-anchor="middle" font-size="24" fill="#fff">宝</text></svg>' },
      { name: 'OPPO', color: '#ff976a', channel: 'oppo', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#ff976a"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">OP</text></svg>' },
      { name: 'VIVO', color: '#7232dd', channel: 'vivo', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#7232dd"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">VI</text></svg>' },
      { name: '华为', color: '#07c160', channel: 'huawei', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#07c160"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">华</text></svg>' },
      { name: 'B服', color: '#ee0a24', channel: 'bilibili', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#ee0a24"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">B</text></svg>' },
      { name: '账号标识码', color: '#1989fa', channel: 'identifier', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><g fill="#fff"><rect x="15" y="15" width="11" height="11" rx="2"/><rect x="30" y="15" width="11" height="11" rx="2"/><rect x="15" y="30" width="11" height="11" rx="2"/><rect x="30" y="30" width="11" height="11" rx="2"/></g></svg>' },
    ],
    configPath: '/config-pages/config.html',
    statusPath: '/status-pages/status.html',
  },
  {
    id: 'game2',
    name: '新游戏',
    emoji: '🎮',
    color: '#07c160',
    channels: [
      { name: '官服', color: '#1989fa', channel: 'official', available: true, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">官</text></svg>' },
    ],
    configPath: '/config-pages/game2/config.html',
    statusPath: '',
  },
]

export const getScriptType = (id) =>
  scriptTypes.find((t) => t.id === id) || scriptTypes[0]
```

- [ ] **Step 7: 运行测试确认通过**

Run: `npm test`
Expected: PASS（4 个用例全绿）

- [ ] **Step 8: 提交**

```bash
git add package.json package-lock.json vitest.config.js src/config/scriptTypes.js src/config/__tests__/scriptTypes.test.js
git commit -m "feat: 新增脚本类型注册表与测试基础设施" -m "#AI"
```

---

## Task 2: Mock 数据层 + client 开关

**Files:**
- Create: `src/api/mockServer.js`
- Create: `src/api/__tests__/mockServer.test.js`
- Modify: `src/api/client.js`（USE_MOCK 开关、scriptAPI.create）
- Modify: `src/api/mock.js`（更新注释）

**Interfaces:**
- Consumes: `getScriptType`（Task 1，mock 创建脚本时回填游戏）
- Produces: `handleMockRequest(path, options) => { success, data?, message? }`（同步返回）；`scriptAPI.create(data)`（POST /scripts，支持 `{ copyOf: id }` 复制脚本）

- [ ] **Step 1: 写失败测试**

Create `src/api/__tests__/mockServer.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest'
import { handleMockRequest } from '../mockServer'

beforeEach(() => {
  localStorage.clear()
})

describe('mock 登录', () => {
  it('任意账号可登录并返回 token/user', () => {
    const res = handleMockRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: '123' }),
    })
    expect(res.success).toBe(true)
    expect(res.data.token).toBeTruthy()
    expect(res.data.user.username).toBe('test')
  })
})

describe('mock 脚本', () => {
  it('列表包含两个游戏的脚本', () => {
    const res = handleMockRequest('/scripts')
    const games = new Set(res.data.scripts.map((s) => s.gameType))
    expect(games.has('gs')).toBe(true)
    expect(games.has('game2')).toBe(true)
  })

  it('绑定 game2 新脚本', () => {
    const res = handleMockRequest('/scripts', {
      method: 'POST',
      body: JSON.stringify({ gameType: 'game2', channel: 'official', account: 'abc', password: '123' }),
    })
    expect(res.success).toBe(true)
    expect(res.data.script.gameType).toBe('game2')
  })

  it('copyOf 复制脚本（确认创建）', () => {
    const res = handleMockRequest('/scripts', {
      method: 'POST',
      body: JSON.stringify({ copyOf: 1 }),
    })
    expect(res.success).toBe(true)
    expect(res.data.script.roleName).toBe('旅行者')
  })

  it('toggle 切换状态', () => {
    const res = handleMockRequest('/scripts/1/toggle', { method: 'POST' })
    expect(res.data.newStatus).toBe('stopped') // 初始 running
  })

  it('配置读写（localStorage）', () => {
    handleMockRequest('/scripts/1/config', {
      method: 'PUT',
      body: JSON.stringify({ config: { a: 1 } }),
    })
    const res = handleMockRequest('/scripts/1/config')
    expect(res.data.config).toEqual({ a: 1 })
  })
})

describe('mock 其他接口', () => {
  it('兑换卡密返回 sun_balance', () => {
    const res = handleMockRequest('/cards/redeem', {
      method: 'POST',
      body: JSON.stringify({ code: 'CARD' }),
    })
    expect(res.success).toBe(true)
    expect(res.data.sun_balance).toBeGreaterThan(0)
  })

  it('未知接口返回失败', () => {
    const res = handleMockRequest('/unknown')
    expect(res.success).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，报 `Cannot find module '../mockServer'`

- [ ] **Step 3: 实现 mockServer**

Create `src/api/mockServer.js`:
```js
/**
 * Mock 后端（纯前端演示用）
 * 模拟真实后端接口，数据存 localStorage，返回结构与真实 API 一致（{ success, data, message }）。
 * 由 client.js 的 USE_MOCK 开关控制启用。
 */

const LS_SCRIPTS = 'mock_scripts'
const LS_USER = 'mock_user'
const LS_CONFIGS = 'mock_configs'

/** 初始脚本数据：覆盖两个游戏（gs 小花仙 / game2 新游戏） */
const DEFAULT_SCRIPTS = [
  { id: 1, gameType: 'gs', roleName: '旅行者', server: '天空岛', status: 'running', channel: 'official', account: 'yun001', number: 'NO.1001', expire: '2026-09-12' },
  { id: 2, gameType: 'gs', roleName: '刻晴', server: '天空岛', status: 'stopped', channel: 'bilibili', account: 'yun001', number: 'NO.1002', expire: '2026-08-30' },
  { id: 3, gameType: 'game2', roleName: '星之来客', server: '银河', status: 'stopped', channel: 'official', account: 'star001', number: 'NO.2001', expire: '2026-09-01' },
]

let mockNextId = 100
function genId() { return ++mockNextId }

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

const ok = (data, message) => ({ success: true, data, message })
const fail = (message) => ({ success: false, message })

function addDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function getScripts() { return read(LS_SCRIPTS, DEFAULT_SCRIPTS) }
function getSunBalance() { return read(LS_USER, { sun_balance: 0 }).sun_balance }

// ==================== auth ====================
function mockLogin(body) {
  const username = body.username || 'demo'
  const token = 'mock-token-' + Date.now()
  const user = { username, vip_level: 1, sun_balance: 100 }
  write(LS_USER, user)
  return ok({ token, user }, '登录成功')
}

function mockMe() {
  return ok({ user: read(LS_USER, { username: 'demo', vip_level: 0, sun_balance: 0 }) }, 'ok')
}

// ==================== scripts ====================
function mockListScripts() { return ok({ scripts: getScripts() }, 'ok') }

function mockCreateScript(body) {
  const list = getScripts()
  // 确认创建：复制已有脚本为新脚本
  if (body.copyOf) {
    const src = list.find((s) => s.id === Number(body.copyOf))
    if (!src) return fail('源脚本不存在')
    const copy = { ...src, id: genId(), number: 'NO.' + (1000 + list.length + 1), status: 'stopped' }
    list.push(copy)
    write(LS_SCRIPTS, list)
    return ok({ script: copy }, '创建成功')
  }
  // 绑定新账号
  const script = {
    id: genId(),
    gameType: body.gameType || 'gs',
    roleName: body.roleName || body.account || '新账号',
    server: '默认服务器',
    status: 'stopped',
    channel: body.channel || 'official',
    account: body.account || '',
    number: 'NO.' + (1000 + list.length + 1),
    expire: addDays(30),
  }
  list.push(script)
  write(LS_SCRIPTS, list)
  return ok({ script }, '绑定成功')
}

function mockToggle(id) {
  const list = getScripts()
  const s = list.find((x) => x.id === id)
  if (!s) return fail('脚本不存在')
  s.status = s.status === 'running' ? 'stopped' : 'running'
  write(LS_SCRIPTS, list)
  return ok({ newStatus: s.status }, '操作成功')
}

function mockDeleteScript(id) {
  write(LS_SCRIPTS, getScripts().filter((s) => s.id !== id))
  return ok(null, '删除成功')
}

function mockRenew(id, days) {
  const list = getScripts()
  const s = list.find((x) => x.id === id)
  if (!s) return fail('脚本不存在')
  const d = Number(days) || 1
  s.expire = addDays(d)
  write(LS_SCRIPTS, list)
  return ok({ sun_balance: getSunBalance() }, `已续期 ${d} 天`)
}

function mockGetConfig(id) {
  const cfg = read(LS_CONFIGS, {})
  return ok({ config: cfg[id] || {} }, 'ok')
}

function mockSaveConfig(id, config) {
  const cfg = read(LS_CONFIGS, {})
  cfg[id] = config
  write(LS_CONFIGS, cfg)
  return ok(null, '配置已保存')
}

function mockLogs(id) {
  const s = getScripts().find((x) => x.id === id)
  const name = s ? s.roleName : '脚本'
  return ok({ logs: [
    { text: `[${name}] 脚本已启动`, time: '10:00:01' },
    { text: `[${name}] 日常任务执行中…`, time: '10:05:32' },
    { text: `[${name}] 当前无异常`, time: '10:10:11' },
  ] }, 'ok')
}

// ==================== 其他接口 ====================
function mockAnnouncements() {
  return ok({ announcements: [
    { id: 1, title: '系统公告', content: '云助手已升级为多脚本框架，支持多个游戏脚本。' },
  ] }, 'ok')
}

function mockRedeem(body) {
  const code = (body.code || '').trim()
  if (!code) return fail('卡密不能为空')
  const user = read(LS_USER, { sun_balance: 0 })
  user.sun_balance += 50
  write(LS_USER, user)
  return ok({ sun_balance: user.sun_balance }, '兑换成功')
}

function mockCardsRecords() {
  return ok({ records: [{ code: 'CARD-001', created_at: '2026-08-12 10:00', amount: 50 }] }, 'ok')
}

function mockTransfer(body) {
  const user = read(LS_USER, { sun_balance: 0 })
  const amount = Number(body.amount) || 0
  const fee = Math.ceil(amount * 0.1)
  user.sun_balance -= amount + fee
  write(LS_USER, user)
  return ok({ sun_balance: user.sun_balance, fee }, '传递成功')
}

function mockBilling() {
  return ok({ records: [
    { tx_type_name: '兑换', created_at: '2026-08-12 10:00', amount: 50 },
    { tx_type_name: '传递', created_at: '2026-08-11 09:30', amount: -10 },
  ] }, 'ok')
}

function mockPromo(which) {
  if (which === 'config') return ok({ enabled: true }, 'ok')
  if (which === 'my') return ok({ invite_code: 'INVITE001', invited_count: 3, total_reward: 60 }, 'ok')
  return ok({ rewards: [{ id: 1, name: '新人礼包', amount: 10 }] }, 'ok')
}

function mockChangelogs() {
  return ok({ changelogs: [{ version: 'v2.0.130', date: '2026-08-12', notes: '支持多脚本框架' }] }, 'ok')
}

/** 统一入口：按 path 分发（path 不含 /api 前缀） */
export function handleMockRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const p = path.split('?')[0]
  const body = options.body ? JSON.parse(options.body) : {}
  const m = p.match(/^\/scripts\/(\d+)(?:\/(.*))?$/)
  const scriptId = m ? Number(m[1]) : null
  const action = m ? (m[2] || '') : ''

  // auth
  if (p === '/auth/login' || p === '/auth/register') return mockLogin(body)
  if (p === '/auth/me') return mockMe()
  if (p === '/auth/change-password') return ok(null, '修改成功')

  // scripts
  if (p === '/scripts' && method === 'GET') return mockListScripts()
  if (p === '/scripts' && method === 'POST') return mockCreateScript(body)
  if (m && scriptId && !action && method === 'DELETE') return mockDeleteScript(scriptId)
  if (m && scriptId && action === 'toggle' && method === 'POST') return mockToggle(scriptId)
  if (m && scriptId && action === 'renew' && method === 'POST') return mockRenew(scriptId, body.days)
  if (m && scriptId && action === 'config' && method === 'GET') return mockGetConfig(scriptId)
  if (m && scriptId && action === 'config' && method === 'PUT') return mockSaveConfig(scriptId, body.config)
  if (m && scriptId && action === 'logs' && method === 'GET') return mockLogs(scriptId)

  // 其他
  if (p === '/announcements') return mockAnnouncements()
  if (p === '/cards/redeem' && method === 'POST') return mockRedeem(body)
  if (p === '/cards/records') return mockCardsRecords()
  if (p === '/sun/transfer' && method === 'POST') return mockTransfer(body)
  if (p === '/billing/records') return mockBilling()
  if (p.startsWith('/promo/')) return mockPromo(p.split('/')[2])
  if (p === '/changelogs') return mockChangelogs()

  return fail('Mock: 未实现的接口 ' + p)
}
```

- [ ] **Step 4: 修改 client.js 加 USE_MOCK 开关**

Edit `src/api/client.js`：
1. 顶部 import 增加 `import { handleMockRequest } from './mockServer'`
2. `BASE` 后加 `const USE_MOCK = true`（注释：纯前端演示走 mock；接真实后端时改 false）
3. `request()` 函数开头加 mock 分支（在 fetch 逻辑之前）：

```js
async function request(path, options = {}) {
  // 纯前端演示：走本地 mock，返回结构与真实 API 一致
  if (USE_MOCK) {
    const body = handleMockRequest(path, options)
    if (body.success === false) throw new Error(body.message || '请求失败')
    return body
  }
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  // …（其余 fetch 逻辑不变）
```

4. `scriptAPI` 对象加 create 方法（放在 bind 之后）：

```js
create: (data) => request('/scripts', { method: 'POST', body: JSON.stringify(data) }),
```

- [ ] **Step 5: 更新 mock.js 注释（兼容历史导入）**

Edit `src/api/mock.js` 顶部注释为：
```js
/**
 * API 适配层（兼容历史导入）
 * 实际请求由 client.js 统一处理：USE_MOCK=true 时走 mockServer，否则走真实后端
 */
```
其余转发代码不动。

- [ ] **Step 6: 运行测试确认通过**

Run: `npm test`
Expected: PASS（mockServer 7 个用例 + scriptTypes 4 个用例全绿）

- [ ] **Step 7: 提交**

```bash
git add src/api/mockServer.js src/api/__tests__/mockServer.test.js src/api/client.js src/api/mock.js
git commit -m "feat: 新增 mock 后端与 client 开关，脚本可创建/复制" -m "#AI"
```

---

## Task 3: 添加账号流程改造（先选脚本）

**Files:**
- Modify: `src/components/AddAccountForm.vue`

**Interfaces:**
- Consumes: `scriptTypes`（Task 1）、`scriptAPI.bind`（Task 2 已支持 gameType 字段）
- Produces: `AddAccountForm` 视图状态机 `games → channels → password → success`；`@success` 事件带 `gameType`

- [ ] **Step 1: 改造 script 部分**

Edit `src/components/AddAccountForm.vue` 的 `<script setup>`：
1. 删除本地 `channels` 常量数组，改为：
```js
import { scriptTypes } from '../config/scriptTypes'
```
2. 状态机改为：
```js
// ==================== 状态机 ====================
const view = ref('games') // 'games' | 'channels' | 'password' | 'success'
const selectedType = ref(null)   // 选中的脚本类型（游戏）
const selectedChannel = ref(null) // 选中的渠道
```
3. 替换 `onSelectChannel` 前新增：
```js
function onSelectType(t) {
  selectedType.value = t
  view.value = 'channels'
}
```
4. 修改 `onSelectChannel`（渠道判断逻辑不变）：
```js
function onSelectChannel(ch) {
  // 后端仅实现密码渠道绑定协议，其余渠道标记未开放，不进入绑定流程
  if (!ch.available) {
    showToast('该渠道暂未开放')
    return
  }
  selectedChannel.value = ch
  passwordForm.account = ''
  passwordForm.password = ''
  view.value = 'password'
}
```
5. 修改 `onPasswordSubmit` 的 bind 调用加 `gameType`：
```js
const res = await scriptAPI.bind({
  gameType: selectedType.value?.id || 'gs',
  channel: selectedChannel.value?.channel || 'official',
  account: passwordForm.account.trim(),
  password: passwordForm.password,
})
```
6. `successData` 增加 `gameName` 字段并在 bind 成功后填充：
```js
const successData = reactive({ accountName: '', channel: '', roleName: '', server: '', expire: '', gameName: '' })
// bind 成功后：
successData.gameName = selectedType.value?.name || ''
```
7. `onFinish` 的 emit 增加 gameType：
```js
function onFinish() {
  emit('success', {
    accountName: successData.accountName,
    channel: selectedChannel.value?.channel || 'official',
    roleName: successData.roleName,
    server: successData.server,
    expire: successData.expire,
    gameType: selectedType.value?.id || 'gs',
  })
}
```

- [ ] **Step 2: 改造 template**

Edit `<template>`：
1. 在 `view === 'channels'` 分支**之前**新增 `games` 分支：
```html
<!-- ===== games 视图：选择脚本（游戏） ===== -->
<template v-if="view === 'games'">
  <div class="section-title">选择脚本</div>
  <div class="channel-grid">
    <div
      v-for="t in scriptTypes"
      :key="t.id"
      class="channel-item"
      @click="onSelectType(t)"
    >
      <div class="channel-icon" :style="{ background: t.color }">
        <span class="type-emoji">{{ t.emoji }}</span>
      </div>
      <div class="channel-name">{{ t.name }}</div>
    </div>
  </div>
</template>
```
2. `channels` 分支改为遍历 `selectedType.channels`，且顶部返回栏回 `games`：
```html
<template v-else-if="view === 'channels'">
  <div class="selected-channel" @click="view = 'games'">
    <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
    <span class="channel-name-text">{{ selectedType.emoji }} {{ selectedType.name }}</span>
    <span class="change-text">点击更换</span>
  </div>
  <div class="section-title">选择渠道</div>
  <div class="channel-grid">
    <div
      v-for="ch in selectedType.channels"
      :key="ch.name"
      class="channel-item"
      @click="onSelectChannel(ch)"
    >
      <div class="channel-icon" :style="{ background: ch.color }" v-html="ch.iconSvg" />
      <div class="channel-name">
        {{ ch.name }}
        <span v-if="!ch.available" class="channel-lock">未开放</span>
      </div>
    </div>
  </div>
</template>
```
3. `password` 分支顶部返回栏回 `channels`，标题显示游戏+渠道：
```html
<div class="selected-channel" @click="view = 'channels'">
  <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
  <div class="channel-icon" style="width: 28px; height: 28px; border-radius: 6px; margin-right: 8px;" :style="{ background: selectedChannel.color }" v-html="selectedChannel.iconSvg" />
  <span class="channel-name-text">{{ selectedType.name }} · {{ selectedChannel.name }}</span>
  <span class="change-text">点击更换</span>
</div>
```
4. `success` 分支的 info 增加游戏行（放在账号行之前）：
```html
<div class="info-row" v-if="successData.gameName">
  <span class="info-label">脚本：</span>
  <span class="info-value">{{ successData.gameName }}</span>
</div>
```

- [ ] **Step 3: style 增加 emoji 居中样式**

Edit `<style scoped>` 增加：
```css
.type-emoji {
  font-size: 28px;
  line-height: 56px;
}
```
并将 `.channel-icon` 改为 flex 居中（不影响 svg 显示）：
```css
.channel-icon {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

- [ ] **Step 4: 手动验证流程**

Run: `npm run dev`（浏览器打开 `http://localhost:5173`，登录任意账号后进入首页 → 添加脚本）
Expected: 先出现「选择脚本」（小花仙/新游戏两个入口）→ 选小花仙后出现渠道网格 → 选官服 → 输入账号密码 → 绑定成功。选新游戏后渠道网格只有「官服」。

- [ ] **Step 5: 提交**

```bash
git add src/components/AddAccountForm.vue
git commit -m "feat: 添加账号流程改为先选脚本再登录" -m "#AI"
```

---

## Task 4: 首页卡片标注游戏 + 配置面板按游戏加载

**Files:**
- Modify: `src/views/Home.vue`

**Interfaces:**
- Consumes: `getScriptType`（Task 1）、`script.gameType`（Task 2 mock 已带）
- Produces: 首页卡片显示游戏标签；`openConfigPanel` 按 `gameType` 加载对应 config 页面

- [ ] **Step 1: import 注册表**

Edit `src/views/Home.vue` script 顶部 import 增加：
```js
import { getScriptType } from '../config/scriptTypes'
```

- [ ] **Step 2: 新增游戏标签工具函数**

在「渠道/样式工具函数」区块（`getChannelColor` 附近）增加：
```js
/** 游戏标签文案（如 "🌸 小花仙"），未知 gameType 返回空 */
function gameLabel(gameType) {
  const t = getScriptType(gameType)
  return t ? `${t.emoji} ${t.name}` : ''
}
```

- [ ] **Step 3: 卡片头部加游戏标签**

在 template 脚本卡片的 `card-header` 内、`header-left` 里 `role-info` 之后加：
```html
<div class="card-header">
  <div class="header-left">
    <div class="channel-icon" :style="{ background: getChannelColor(script.channel) }">
      {{ getChannelEmoji(script.channel) }}
    </div>
    <div class="role-info">
      <div class="role-name">{{ script.roleName }}</div>
      <div class="server">{{ script.server }}</div>
    </div>
    <span class="game-tag">{{ gameLabel(script.gameType) }}</span>
  </div>
  <van-tag :type="script.status === 'running' ? 'success' : 'danger'" size="medium">
    {{ script.status === 'running' ? '运行中' : '已停止' }}
  </van-tag>
</div>
```

- [ ] **Step 4: 增加 game-tag 样式**

Edit `<style scoped>` 增加：
```css
.game-tag {
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 11px;
  line-height: 16px;
  color: #667eea;
  background: #eef0ff;
  border-radius: 4px;
  white-space: nowrap;
}
```

- [ ] **Step 5: openConfigPanel 按 gameType 加载路径**

替换 `openConfigPanel` 函数：
```js
/** 打开配置面板 — iframe 加载对应游戏的 config.html */
function openConfigPanel(script) {
  panelScript.value = script
  const type = getScriptType(script.gameType)
  const base = (type && type.configPath) || '/config-pages/config.html'
  configIframeSrc.value = base + '?v=2.0.130&_t=' + Date.now()
  configPanelVisible.value = true
}
```

- [ ] **Step 6: 手动验证**

Run: `npm run dev`
Expected: 首页脚本卡片显示游戏标签（小花仙脚本「🌸 小花仙」，新游戏脚本「🎮 新游戏」）；点击新游戏脚本的「配置」打开的是新游戏占位页（Task 5 完成后），小花仙脚本打开原配置页。

- [ ] **Step 7: 提交**

```bash
git add src/views/Home.vue
git commit -m "feat: 首页卡片标注游戏，配置面板按脚本类型加载" -m "#AI"
```

---

## Task 5: 新游戏占位配置页

**Files:**
- Create: `public/config-pages/game2/config.html`

**Interfaces:**
- Consumes: `type.configPath` 指向 `/config-pages/game2/config.html`（Task 4 已接线）
- Produces: iframe 内实现 `window.updateConfigFromParent(configJson)` 与 `window.saveConfig()`，兼容 Home.vue 的 iframe 通信协议

- [ ] **Step 1: 新建占位配置页**

Create `public/config-pages/game2/config.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>脚本配置</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: #f5f5f5;
    }
    .placeholder {
      padding: 80px 24px;
      text-align: center;
      color: #999;
    }
    .placeholder .icon { font-size: 56px; margin-bottom: 16px; }
    .placeholder h3 { color: #333; font-size: 17px; margin: 0 0 12px; }
    .placeholder p { font-size: 14px; line-height: 1.8; margin: 0; }
  </style>
</head>
<body>
  <div class="placeholder">
    <div class="icon">🎮</div>
    <h3>暂无配置项</h3>
    <p>该游戏的脚本配置项待补充，<br>开发者后续在 config.schema.js 中添加。</p>
  </div>
  <script>
    // 兼容父窗口通信协议：config.html 加载后父窗口会调用 updateConfigFromParent
    window.updateConfigFromParent = function (configJson) {
      // 占位页无表单，仅确认协议可用
    }
    // 父窗口保存配置时调用
    window.saveConfig = function () {
      try {
        window.parent.showToast && window.parent.showToast('该游戏暂无可保存的配置')
      } catch (e) {}
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: 手动验证**

Run: `npm run dev`
Expected: 首页 → 新游戏脚本卡片 → 「配置」→ 弹出新游戏占位页显示「暂无配置项」；小花仙脚本配置仍正常打开原配置表单。

- [ ] **Step 3: 提交**

```bash
git add public/config-pages/game2/config.html
git commit -m "feat: 新增新游戏占位配置页" -m "#AI"
```

---

## Task 6: 修复「确认创建」假逻辑 + 移除孤儿路由

**Files:**
- Modify: `src/views/Home.vue`（confirmCreate）
- Delete: `src/views/AddAccount.vue`
- Modify: `src/router/index.js`（移除 /add-account 路由）

**Interfaces:**
- Consumes: `scriptAPI.create({ copyOf })`（Task 2）
- Produces: 首页「添加脚本 → 确认创建」真正生成新脚本；删除无入口死页面

- [ ] **Step 1: 修复 confirmCreate**

替换 `src/views/Home.vue` 的 `confirmCreate` 函数：
```js
async function confirmCreate() {
  creating.value = true
  try {
    await scriptAPI.create({ copyOf: selectedRole.value.id })
    await refreshScripts()
    showSuccessToast('创建成功')
    addScriptVisible.value = false
  } catch (e) {
    showFailToast(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}
```

- [ ] **Step 2: 移除孤儿路由与页面**

Edit `src/router/index.js`：
1. 删除 `import AddAccount from '../views/AddAccount.vue'`
2. 删除 `{ path: '/add-account', name: 'AddAccount', component: AddAccount, meta: { title: '添加脚本' } },`

Delete file `src/views/AddAccount.vue`:
```bash
rm /d/BaiduNetdiskDownload/yun-assistant-clone/src/views/AddAccount.vue
```

- [ ] **Step 3: 手动验证**

Run: `npm run dev`
Expected:
1. 首页 → 添加脚本 → 选已有账号 → 选角色 → 确认创建 → 列表新增一条同角色的脚本（NO 编号递增，状态已停止）。
2. 手动访问 `http://localhost:5173/#/add-account` 应被重定向（不再有该页面）。
3. 其余功能正常。

- [ ] **Step 4: 提交**

```bash
git add src/views/Home.vue src/router/index.js src/views/AddAccount.vue
git commit -m "fix: 确认创建真正生成脚本，移除孤儿路由 add-account" -m "#AI"
```

---

## Task 7: 端到端验证 + 构建

**Files:** 无代码改动，仅验证

- [ ] **Step 1: 跑全部单元测试**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 2: 端到端手动走查**

Run: `npm run dev`，浏览器走通：
1. 注册/登录（任意账号）
2. 首页：脚本卡片带游戏标签（两个游戏混合展示）
3. 添加脚本：先选脚本 → 小花仙选官服绑定新账号成功 → 列表新增
4. 添加脚本：先选脚本 → 新游戏 → 官服 → 绑定 → 列表新增（🎮 标签）
5. 配置：小花仙脚本打开原配置页正常；新游戏脚本打开「暂无配置项」占位页
6. 启停 / 续期 / 删除脚本正常
7. 太阳兑换 / 阳光传递 / 太阳流水 / 推广中心 / 更新记录 正常展示 mock 数据
8. 脚本日志面板有 mock 日志

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功，无报错

- [ ] **Step 4: 最终提交（如有遗留改动）**

```bash
git status
git add -A
git commit -m "chore: 多脚本框架改造完成" -m "#AI"
```
