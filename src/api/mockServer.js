/**
 * Mock 后端（纯前端演示用）
 * 模拟真实后端接口，数据存 localStorage，返回结构与真实 API 一致（{ success, data, message }）。
 * 由 client.js 的 USE_MOCK 开关控制启用。
 */

const LS_SCRIPTS = 'mock_scripts'
const LS_USER = 'mock_user'
const LS_CONFIGS = 'mock_configs'
const LS_RUNTIME = 'mock_runtime' // { [id]: { running, start_time, stats } }

/** 初始脚本数据：覆盖两个游戏（gs 小花仙 / 一路狂飙） */
const DEFAULT_SCRIPTS = [
  { id: 1, gameType: 'gs', roleName: '旅行者', server: '天空岛', status: 'running', channel: 'official', account: 'yun001', number: 'NO.1001', expire: '2026-09-12' },
  { id: 2, gameType: 'gs', roleName: '刻晴', server: '天空岛', status: 'stopped', channel: 'bilibili', account: 'yun001', number: 'NO.1002', expire: '2026-08-30' },
  { id: 3, gameType: '一路狂飙', roleName: '狂飙车手', server: '国服', status: 'stopped', channel: 'android', account: 'kb001', number: 'NO.2001', expire: '2026-09-01' },
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
function getScripts() { return JSON.parse(JSON.stringify(read(LS_SCRIPTS, DEFAULT_SCRIPTS))) }
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

function mockDeleteScript(id) {
  write(LS_SCRIPTS, getScripts().filter((s) => s.id !== id))
  const rt = read(LS_RUNTIME, {})
  delete rt[id]
  write(LS_RUNTIME, rt)
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

function computeRuntimeStats(runtime) {
  const zero = { q3: 0, q4: 0, q5: 0, diamond: 0, grabbed: 0, ad_left: 3 }
  if (!runtime || typeof runtime !== 'object' || !runtime.running) {
    // 旧版 mock_runtime 可能残留数字（{ [id]: start_time }），对非对象做防御
    const frozen = runtime && typeof runtime === 'object' && runtime.stats ? runtime.stats : zero
    return { running: false, stats: frozen }
  }
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
  if (m && scriptId && action === 'runtime-stats' && method === 'GET') return mockRuntimeStats(scriptId)

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
