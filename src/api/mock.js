/**
 * Mock API 模块 → 已切换为真实后端（保留文件名为兼容性，实现全部转发）
 */
import { authAPI, scriptAPI } from './client'

export const loginAPI = (username, password) =>
  authAPI.login(username, password).then((r) => {
    localStorage.setItem('yun_token', r.data.token)
    localStorage.setItem('yun_user', JSON.stringify(r.data.user))
    return { success: true, message: '登录成功' }
  })

export const registerAPI = (username, password, phone, inviteCode) =>
  authAPI.register(username, password, phone, inviteCode).then((r) => {
    localStorage.setItem('yun_token', r.data.token)
    localStorage.setItem('yun_user', JSON.stringify(r.data.user))
    return { success: true, message: '注册成功' }
  })

export const getScriptsAPI = () =>
  scriptAPI.list().then((r) => r.data.scripts)

export const toggleScriptAPI = (id) =>
  scriptAPI.toggle(id).then((r) => ({ success: true, newStatus: r.data.newStatus }))

export const deleteScriptAPI = (id) =>
  scriptAPI.remove(id).then(() => ({ success: true }))

export const renewScriptAPI = (id, days = 30) =>
  scriptAPI.renew(id, days).then((r) => ({ success: true, message: r.message, data: r.data }))
