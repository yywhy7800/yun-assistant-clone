/**
 * API 适配层（兼容历史导入）
 * 实际请求由 client.js 统一处理：USE_MOCK=true 时走 mockServer，否则走真实后端
 */
import { authAPI, scriptAPI, adminAPI } from './client'

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

export const purchaseScriptAPI = (id, plan) =>
  scriptAPI.purchase(id, plan).then((r) => ({ success: true, message: r.message, data: r.data }))

// ==================== 管理后台适配 ====================
export const getAdminUsersAPI = () => adminAPI.users().then((r) => r.data.users)
export const adjustUserSunAPI = (id, amount) =>
  adminAPI.userSun(id, amount).then((r) => ({ success: true, message: r.message, data: r.data }))
export const getAdminScriptsAPI = () => adminAPI.scripts().then((r) => r.data.scripts)
export const adminStopScriptAPI = (id) =>
  adminAPI.stopScript(id).then((r) => ({ success: true, message: r.message }))
export const adminSetExpireAPI = (id, expire) =>
  adminAPI.setScriptExpire(id, expire).then((r) => ({ success: true, message: r.message, data: r.data }))
export const generateCardsAPI = (amount, count) =>
  adminAPI.cardsGenerate(amount, count).then((r) => ({ success: true, message: r.message, data: r.data }))
export const getCardsAPI = () => adminAPI.cards().then((r) => r.data.cards)
export const getAdminMessagesAPI = () => adminAPI.messages().then((r) => r.data.messages)
export const adminReplyMessageAPI = (id, reply) =>
  adminAPI.replyMessage(id, reply).then((r) => ({ success: true, message: r.message }))
export const getNoticeAPI = () => adminAPI.getNotice().then((r) => r.data.content || '')
export const saveNoticeAPI = (content) =>
  adminAPI.saveNotice(content).then((r) => ({ success: true, message: r.message }))
