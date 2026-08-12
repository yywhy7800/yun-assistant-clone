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
    expect(games.has('一路狂飙')).toBe(true)
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
