/**
 * 日志面板 Mock 数据模块
 * 为日志面板提供模拟日志数据
 */

// ==================== 日志 mock 数据 ====================

/** 日志内容模板池 */
const logTemplates = [
  '[种植] 收获; 土地{land}, 收获1次; 预计{next}后可收获; 获得: 经验*{exp},{item}',
  '[种植] 播种; 土地{land}, 种子{xz_mgz}, 1个; 预计{next}后成熟',
  '[浇水] 浇水完成; 土地{land}, 水分+30; 当前水分{water}%',
  '[使用道具] 使用「快速生长剂」x1; 土地{land}, 成熟时间缩短30分钟',
  '[背包整理] 自动整理完成; 合并种子{seed1}x{num1}, {seed2}x{num2}; 空位: {slot}格',
  '[种植] 铲除; 土地{land}, 枯萎作物已清除; 获得: 经验*2',
  '[任务] 每日种植任务完成; 进度 {progress}/10; 奖励待领取',
  '[系统] 脚本运行正常; 内存占用 {mem}MB; 已连续运行{runtime}',
  '[种植] 施肥; 土地{land}, 使用有机肥料x1; 增产+15%',
  '[使用道具] 使用「幸运药水」x1; 下次收获品质提升概率+20%',
  '[浇水] 自动浇水触发; 检测到{count}块土地缺水; 已全部浇灌',
  '[种植] 自动收获触发; {count}块土地成熟; 收获作物{items}',
  '[系统] 背包检测; 剩余空间不足20%; 自动出售普通作物x{num}',
  '[任务] 好友互助任务; 帮助{friend}浇水x3; 获得: 友情点*10',
  '[系统] 掉线重连成功; 重连耗时{reconnect}秒; 数据已同步',
  '[种植] 品质提升; 土地{land}触发品质加成; 获得稀有作物x1',
  '[使用道具] 使用「能量饮料」x1; 脚本速度提升20%; 持续30分钟',
]

/** 作物名称池 */
const cropItems = ['嫣粉石斛兰', '星光玫瑰', '翡翠百合', '紫罗兰', '金盏菊', '天堂鸟', '蓝色妖姬', '向日葵']

/** 种子名称池 */
const seedNames = ['玫瑰种子', '兰花种子', '百合种子', '菊花种子', '向日葵种子']

/**
 * 生成单条日志
 * @param {number} index - 日志序号，用于生成时间戳
 * @param {number} scriptId
 * @returns {{ time: string, text: string }}
 */
function generateLogEntry(index, scriptId) {
  const now = new Date()
  const offset = index * (2 + Math.random() * 5)
  const logTime = new Date(now.getTime() - offset * 60 * 1000)
  const time = `${String(logTime.getHours()).padStart(2, '0')}:${String(logTime.getMinutes()).padStart(2, '0')}:${String(logTime.getSeconds()).padStart(2, '0')}`

  const template = logTemplates[(index * 7 + scriptId * 13) % logTemplates.length]

  const landId = 1000 + ((scriptId * 100 + index * 37) % 500)
  const nextTime = Math.floor(10 + Math.random() * 40)
  const nextMin = Math.floor(nextTime / 60)
  const nextSec = nextTime % 60
  const nextStr = `${String(nextMin).padStart(2, '0')}:${String(nextSec).padStart(2, '0')}:00`

  let text = template
    .replace(/\{land\}/g, String(landId))
    .replace(/\{next\}/g, nextStr)
    .replace(/\{exp\}/g, String(Math.floor(15 + Math.random() * 35)))
    .replace(/\{item\}/g, () => cropItems[Math.floor(Math.random() * cropItems.length)] + '*' + Math.floor(1 + Math.random() * 4))
    .replace(/\{water\}/g, String(Math.floor(50 + Math.random() * 50)))
    .replace(/\{seed1\}/g, () => seedNames[Math.floor(Math.random() * seedNames.length)])
    .replace(/\{seed2\}/g, () => seedNames[Math.floor(Math.random() * seedNames.length)])
    .replace(/\{num1\}/g, String(Math.floor(1 + Math.random() * 10)))
    .replace(/\{num2\}/g, String(Math.floor(1 + Math.random() * 8)))
    .replace(/\{slot\}/g, String(Math.floor(5 + Math.random() * 30)))
    .replace(/\{progress\}/g, String(Math.floor(3 + Math.random() * 8)))
    .replace(/\{mem\}/g, String(Math.floor(120 + Math.random() * 80)))
    .replace(/\{runtime\}/g, () => {
      const h = Math.floor(Math.random() * 24)
      const m = Math.floor(Math.random() * 60)
      return `${h}小时${m}分钟`
    })
    .replace(/\{count\}/g, String(Math.floor(1 + Math.random() * 5)))
    .replace(/\{items\}/g, () => cropItems.slice(0, 2).map(c => c + '*' + Math.floor(1 + Math.random() * 3)).join(','))
    .replace(/\{num\}/g, String(Math.floor(1 + Math.random() * 15)))
    .replace(/\{friend\}/g, () => ['小明', '小红', '花仙子', '园丁小王'][Math.floor(Math.random() * 4)])
    .replace(/\{reconnect\}/g, String(Math.floor(1 + Math.random() * 10)))

  return { time, text }
}

/**
 * 获取脚本日志 mock 数据
 * @param {number} scriptId
 * @returns {Array<{ time: string, text: string }>}
 */
export function getLogsMock(scriptId) {
  const count = 15 + (scriptId % 5)
  const logs = []
  for (let i = count - 1; i >= 0; i--) {
    logs.push(generateLogEntry(i, scriptId))
  }
  return logs
}
