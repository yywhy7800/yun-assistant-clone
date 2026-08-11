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
  const resp = await fetch(BASE + path, { ...options, headers })
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
  register: (username, password, phone) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, phone: phone || null }) }),
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
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
}

export const cardAPI = {
  redeem: (code) => request('/cards/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
  records: () => request('/cards/records'),
}
