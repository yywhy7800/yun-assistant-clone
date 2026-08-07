/**
 * Mock API 模块
 * 使用 Promise 模拟后端接口延迟，不依赖真实后端
 */

// 模拟网络延迟（300-800ms）
function delay(ms = 300 + Math.random() * 500) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ==================== 脚本列表 mock 数据 ====================
const mockScripts = [
  {
    id: 1,
    channel: 'ios',
    channelName: 'iOS',
    roleName: 's1217.糖不甜',
    server: '正式1217服',
    number: '141861',
    account: 'wxb6d2ac',
    expire: '1天1小时14分钟',
    status: 'running', // running | stopped
  },
  {
    id: 2,
    channel: 'android',
    channelName: '安卓',
    roleName: 's1065.霸总的小野猫',
    server: '正式1065服',
    number: '95351',
    account: 'Unworthy014',
    expire: '1天42分钟',
    status: 'running',
  },
  {
    id: 3,
    channel: 'ios',
    channelName: 'iOS',
    roleName: 's3667.小猫馍馍小号',
    server: '正式3667服',
    number: '95347',
    account: 'Unworthy215',
    expire: '23小时9分钟15秒',
    status: 'running',
  },
]

// 内存中的脚本数据副本（支持运行时修改）
let scripts = JSON.parse(JSON.stringify(mockScripts))
let nextId = 4

/**
 * 登录接口
 * @param {string} username - 账号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function loginAPI(username, password) {
  await delay()
  // 任意账号密码都成功，但空值校验由前端处理
  if (!username || !password) {
    return { success: false, message: '请输入账号和密码' }
  }
  return { success: true, message: '登录成功' }
}

/**
 * 注册接口
 * @param {string} username - 账号
 * @param {string} password - 密码
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function registerAPI(username, password) {
  await delay()
  if (!username || !password) {
    return { success: false, message: '请填写完整信息' }
  }
  return { success: true, message: '注册成功' }
}

/**
 * 获取脚本列表
 * @returns {Promise<Array>}
 */
export async function getScriptsAPI() {
  await delay()
  return JSON.parse(JSON.stringify(scripts))
}

/**
 * 切换脚本运行状态
 * @param {number} id - 脚本 ID
 * @returns {Promise<{success: boolean, newStatus: string}>}
 */
export async function toggleScriptAPI(id) {
  await delay()
  const script = scripts.find((s) => s.id === id)
  if (script) {
    script.status = script.status === 'running' ? 'stopped' : 'running'
    return { success: true, newStatus: script.status }
  }
  return { success: false, message: '脚本不存在' }
}

/**
 * 删除脚本
 * @param {number} id - 脚本 ID
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function deleteScriptAPI(id) {
  await delay()
  const idx = scripts.findIndex((s) => s.id === id)
  if (idx !== -1) {
    scripts.splice(idx, 1)
    return { success: true, message: '删除成功' }
  }
  return { success: false, message: '脚本不存在' }
}

/**
 * 续期脚本（简单实现，加 1 天）
 * @param {number} id - 脚本 ID
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function renewScriptAPI(id) {
  await delay()
  const script = scripts.find((s) => s.id === id)
  if (script) {
    return { success: true, message: '续期成功，已增加1天' }
  }
  return { success: false, message: '脚本不存在' }
}

/**
 * 添加脚本
 * @param {object} data - { channel, channelName, account, remark }
 * @returns {Promise<{success: boolean, message?: string, data?: object}>}
 */
export async function addScriptAPI(data) {
  await delay()
  const newScript = {
    id: nextId++,
    channel: data.channel,
    channelName: data.channelName,
    roleName: data.account,
    server: '新服',
    number: '000' + (nextId - 1),
    account: data.account,
    expire: '30天',
    status: 'running',
  }
  scripts.unshift(newScript)
  return { success: true, message: '添加成功', data: newScript }
}
