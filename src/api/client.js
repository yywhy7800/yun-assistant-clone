/**
 * 真实后端 API 客户端（替代 mock）
 */
const BASE = '/api'

function getToken() {
  return localStorage.getItem('yun_token') || ''
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let resp
  try {
    resp = await fetch(BASE + path, { ...options, headers })
  } catch (e) {
    // 网络不可达（TypeError: Failed to fetch 等），转成友好文案
    throw new Error('网络连接失败，请稍后重试')
  }
  const body = await resp.json().catch(() => ({ success: false, message: '服务器异常' }))
  if (!resp.ok || body.success === false) {
    if (resp.status === 401) {
      // 清空全部登录态（localStorage token + sessionStorage 登录标记），
      // 否则路由守卫会把用户强制踢回首页造成 401 死循环
      localStorage.removeItem('yun_token')
      localStorage.removeItem('yun_user')
      sessionStorage.removeItem('yun_is_logged_in')
      sessionStorage.removeItem('yun_username')
      window.location.hash = '#/login'
    }
    throw new Error(body.detail || body.message || '请求失败')
  }
  return body
}

export const authAPI = {
  register: (username, password, phone, inviteCode) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, phone: phone || null, invite_code: inviteCode || null }) }),
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
  changePassword: (oldPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),
}

export const scriptAPI = {
  list: () => request('/scripts'),
  bind: (data) => request('/scripts', { method: 'POST', body: JSON.stringify(data) }),
  toggle: (id) => request(`/scripts/${id}/toggle`, { method: 'POST' }),
  remove: (id) => request(`/scripts/${id}`, { method: 'DELETE' }),
  renew: (id, days) => request(`/scripts/${id}/renew`, { method: 'POST', body: JSON.stringify({ days }) }),
  getConfig: (id) => request(`/scripts/${id}/config`),
  saveConfig: (id, config) => request(`/scripts/${id}/config`, { method: 'PUT', body: JSON.stringify({ config }) }),
  // 日志: date=today|yesterday|week, search 为关键词（后端转义通配符按字面匹配）
  logs: (id, params = {}) => {
    const qs = []
    if (params.date) qs.push('date=' + encodeURIComponent(params.date))
    if (params.search) qs.push('search=' + encodeURIComponent(params.search))
    return request(`/scripts/${id}/logs${qs.length ? '?' + qs.join('&') : ''}`)
  },
}

export const cardAPI = {
  redeem: (code) => request('/cards/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
  records: () => request('/cards/records'),
}

export const sunAPI = {
  transfer: (targetUsername, amount) => request('/sun/transfer', { method: 'POST', body: JSON.stringify({ target_username: targetUsername, amount }) }),
}

export const billingAPI = {
  records: (page = 1, size = 20) => request(`/billing/records?page=${page}&size=${size}`),
}

export const contentAPI = {
  announcements: () => request('/announcements'),
  changelogs: () => request('/changelogs'),
}

export const promoAPI = {
  config: () => request('/promo/config'),
  my: () => request('/promo/my'),
  rewards: () => request('/promo/rewards'),
}
