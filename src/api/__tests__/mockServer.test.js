import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    expect(games.has('一路狂飙')).toBe(true)
  })

  it('绑定一路狂飙新脚本', () => {
    const res = handleMockRequest('/scripts', {
      method: 'POST',
      body: JSON.stringify({ gameType: '一路狂飙', channel: 'official', account: 'abc', password: '123' }),
    })
    expect(res.success).toBe(true)
    expect(res.data.script.gameType).toBe('一路狂飙')
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

  it('runtime-stats 未运行返回 0 统计', () => {
    const res = handleMockRequest('/scripts/1/runtime-stats')
    expect(res.success).toBe(true)
    expect(res.data.running).toBe(false)
    expect(res.data.ad_left).toBe(3)
  })

  it('toggle 运行后 runtime-stats 返回 running 统计结构', () => {
    handleMockRequest('/scripts/2/toggle', { method: 'POST' }) // 脚本2初始 stopped
    const res = handleMockRequest('/scripts/2/runtime-stats')
    expect(res.success).toBe(true)
    expect(res.data.running).toBe(true)
    expect(typeof res.data.ad_left).toBe('number')
    expect(res.data.ad_left).toBeLessThanOrEqual(3)
    expect(res.data.claimed_q3).toBeGreaterThanOrEqual(0)
    expect(res.data.claimed_q4).toBeGreaterThanOrEqual(0)
    expect(res.data.claimed_q5).toBeGreaterThanOrEqual(0)
    expect(res.data.rp_diamond).toBeGreaterThanOrEqual(0)
  })

  it('停止后冻结本次累计（保留运行期增量）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'))
      handleMockRequest('/scripts/2/toggle', { method: 'POST' }) // 启动，start_time = T0
      vi.setSystemTime(new Date('2026-08-12T00:01:20Z')) // 前进 80 秒
      handleMockRequest('/scripts/2/toggle', { method: 'POST' }) // 停止，冻结运行期增量
      const res = handleMockRequest('/scripts/2/runtime-stats')
      expect(res.data.running).toBe(false)
      expect(res.data.claimed_q3).toBe(10)   // floor(80/8)=10
      expect(res.data.claimed_q4).toBe(4)    // floor(80/20)=4
      expect(res.data.claimed_q5).toBe(2)    // floor(80/40)=2
      expect(res.data.rp_diamond).toBe(25)   // floor(80/15)*5=25
      expect(res.data.ad_left).toBe(3)       // floor(80/120)=0，3-0=3
    } finally {
      vi.useRealTimers()
    }
  })

  it('重新启动后统计重新累计（归零）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'))
      handleMockRequest('/scripts/2/toggle', { method: 'POST' }) // 启动
      vi.setSystemTime(new Date('2026-08-12T00:01:20Z')) // 前进 80 秒
      handleMockRequest('/scripts/2/toggle', { method: 'POST' }) // 停止冻结
      handleMockRequest('/scripts/2/toggle', { method: 'POST' }) // 重新启动（重置归零）
      const res = handleMockRequest('/scripts/2/runtime-stats')
      expect(res.data.running).toBe(true)
      expect(res.data.claimed_q3).toBe(0)
      expect(res.data.claimed_q4).toBe(0)
      expect(res.data.claimed_q5).toBe(0)
      expect(res.data.rp_diamond).toBe(0)
      expect(res.data.ad_left).toBe(3)
    } finally {
      vi.useRealTimers()
    }
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
