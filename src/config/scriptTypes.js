/**
 * 脚本类型注册表
 * 集中定义云助手支持的所有游戏脚本；新增脚本类型只需向数组加一项
 * channels 渠道结构沿用原 AddAccountForm 的渠道数据
 */
export const scriptTypes = [
  {
    id: 'gs',
    name: '小花仙',
    emoji: '🌸',
    color: '#667eea',
    channels: [
      { name: '官服', color: '#1989fa', channel: 'official', available: true, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">官</text></svg>' },
      { name: '应用宝', color: '#07c160', channel: 'yyb', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#07c160"/><text x="28" y="36" text-anchor="middle" font-size="24" fill="#fff">宝</text></svg>' },
      { name: 'OPPO', color: '#ff976a', channel: 'oppo', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#ff976a"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">OP</text></svg>' },
      { name: 'VIVO', color: '#7232dd', channel: 'vivo', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#7232dd"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">VI</text></svg>' },
      { name: '华为', color: '#07c160', channel: 'huawei', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#07c160"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">华</text></svg>' },
      { name: 'B服', color: '#ee0a24', channel: 'bilibili', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#ee0a24"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">B</text></svg>' },
      { name: '账号标识码', color: '#1989fa', channel: 'identifier', available: false, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><g fill="#fff"><rect x="15" y="15" width="11" height="11" rx="2"/><rect x="30" y="15" width="11" height="11" rx="2"/><rect x="15" y="30" width="11" height="11" rx="2"/><rect x="30" y="30" width="11" height="11" rx="2"/></g></svg>' },
    ],
    configPath: '/config-pages/config.html',
    statusPath: '/status-pages/status.html',
  },
  {
    id: 'game2',
    name: '新游戏',
    emoji: '🎮',
    color: '#07c160',
    channels: [
      { name: '官服', color: '#1989fa', channel: 'official', available: true, iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">官</text></svg>' },
    ],
    configPath: '/config-pages/game2/config.html',
    statusPath: '',
  },
]

export const getScriptType = (id) =>
  scriptTypes.find((t) => t.id === id) || scriptTypes[0]
