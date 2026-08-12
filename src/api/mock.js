/**
 * API 适配层（兼容历史导入）
 * 实际请求由 client.js 统一处理：USE_MOCK=true 时走 mockServer，否则走真实后端
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
