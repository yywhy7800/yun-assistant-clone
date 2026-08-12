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
