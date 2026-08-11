import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// ==================== Mock 数据生成（模块级常量，每次请求返回相同数据） ====================

const FLOWER_NAMES = [
  '嫣粉石斛兰', '金丝海棠', '星光玫瑰', '翡翠百合', '紫罗兰',
  '金盏菊', '天堂鸟', '蓝色妖姬', '向日葵', '樱花', '茉莉',
]

const now = Date.now()

/** 生成 64 个地块详情，按任务要求分布 */
function generateLandDetails() {
  const details = []
  // 分布：8 空地(state 0)、14 待浇水(state 1)、15 待成熟(state 2)、11 可收获(state 3)、16 锁定(state -1)
  const distribution = [
    ...Array(8).fill(0),   // 空地
    ...Array(14).fill(1),  // 待浇水
    ...Array(15).fill(2),  // 待成熟
    ...Array(11).fill(3),  // 可收获
    ...Array(16).fill(-1), // 锁定
  ]

  // 打乱顺序（用固定种子保证每次相同）
  let seed = 137
  const seededRandom = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let i = distribution.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1))
    ;[distribution[i], distribution[j]] = [distribution[j], distribution[i]]
  }

  // 重置种子，用于品质随机
  seed = 137

  for (let i = 0; i < 64; i++) {
    const landId = 1001 + i
    const state = distribution[i]
    const quality = state > 0 ? Math.floor(seededRandom() * 4) + 1 : 0  // 1~4（凡/普/珍/华），偶尔 5（仙）
    const detail = {
      landId,
      state,
      flowerQuality: state === 3 ? Math.floor(seededRandom() * 2) + 4 : quality, // 可收获 → 华/仙
    }

    if (state > 0) {
      detail.flowerName = FLOWER_NAMES[Math.floor(seededRandom() * FLOWER_NAMES.length)]
      detail.lvl = Math.floor(seededRandom() * 20) + 1
      detail.harvestCnt = Math.floor(seededRandom() * 5)
      detail.frequencys = 5
      detail.remainHarvest = detail.frequencys - detail.harvestCnt
      detail.plantTime = now - Math.floor(seededRandom() * 2 * 3600 * 1000) // 1-2 小时内
    }

    // 浇水/待成熟状态加 nextTime
    if (state === 1 || state === 2) {
      detail.nextTime = now + Math.floor(seededRandom() * 20 * 60 * 1000) + 60 * 1000 // 1-20 分钟后
    }

    details.push(detail)
  }

  return details
}

const LAND_DETAILS = generateLandDetails()
const LAND_TOTAL = 64
const LAND_WATERING = LAND_DETAILS.filter(d => d.state === 1).length
const LAND_WAIT_HARVEST = LAND_DETAILS.filter(d => d.state === 2).length
const LAND_HARVEST_READY = LAND_DETAILS.filter(d => d.state === 3).length

/** 花卉库存 mock */
const FLOWER_STOCK = {
  total: 56,
  list: [
    { flowerName: '嫣粉石斛兰', quality: 3, stock: 12 },
    { flowerName: '金丝海棠', quality: 4, stock: 8 },
    { flowerName: '星光玫瑰', quality: 2, stock: 10 },
    { flowerName: '翡翠百合', quality: 3, stock: 7 },
    { flowerName: '紫罗兰', quality: 1, stock: 9 },
    { flowerName: '天堂鸟', quality: 5, stock: 4 },
    { flowerName: '蓝色妖姬', quality: 2, stock: 6 },
  ],
}

/** 居民订单 mock */
const FLOWER_ORDER_MOCK = {
  orders: [
    {
      flowers: [
        { flowerName: '嫣粉石斛兰', count: 3 },
        { flowerName: '金丝海棠', count: 2 },
      ],
      npcName: '花婆婆',
      cdTime: now + 12 * 60 * 1000,
    },
    {
      flowers: [
        { flowerName: '星光玫瑰', count: 5 },
        { flowerName: '紫罗兰', count: 2 },
      ],
      npcName: '园丁老张',
      isVideo: 1,
      cdTime: now + 25 * 60 * 1000,
    },
    {
      flowers: [
        { flowerName: '翡翠百合', count: 4 },
      ],
      npcName: '小镇商人',
      cdTime: now - 2 * 60 * 1000, // 已刷新
    },
    {
      flowers: [
        { flowerName: '天堂鸟', count: 2 },
        { flowerName: '蓝色妖姬', count: 1 },
        { flowerName: '向日葵', count: 3 },
      ],
      npcName: '皇家特使',
      cdTime: now + 45 * 60 * 1000,
    },
  ],
  orderSatin: {
    flowers: [
      { flowerName: '樱花', count: 8 },
      { flowerName: '茉莉', count: 5 },
    ],
    cdTime: now + 8 * 60 * 1000,
  },
  orderDecorate: {
    flowers: [
      { flowerName: '金盏菊', count: 6 },
      { flowerName: '天堂鸟', count: 3 },
    ],
    cdTime: now + 30 * 60 * 1000,
  },
}

/** 顾客订单 mock */
const CUSTOMER_ORDER_MOCK = {
  createCount: 5,
  nextGenTime: now + 15 * 60 * 1000,
  orders: [
    { artName: '春日花篮', num: 2 },
    { artName: '玫瑰香薰', num: 1 },
    { artName: '永生花盒', num: 3 },
  ],
}

/** 莳花纪闻 mock */
const SHIHUA_NEWS_MOCK = {
  active: true,
  score: 1250,
  ems: now + 2 * 24 * 3600 * 1000, // 2天后结束
  orders: [
    { flowerId: 1, flowerName: '嫣粉石斛兰', ready: true, stock: 5, required: 5 },
    { flowerId: 2, flowerName: '金丝海棠', ready: false, stock: 2, required: 3, validTime: now + 8 * 60 * 1000 },
    { flowerId: 3, flowerName: '星光玫瑰', ready: false, stock: 1, required: 4, validTime: now + 30 * 60 * 1000 },
  ],
}

/** 珍珠雇佣 mock */
const PEARL_HIRE_MOCK = {
  pearl: { laborEndTime: now + 35 * 60 * 1000 },
  protectEnabled: true,
  protectSymbolNum: 3,
  todayHired: 2,
  hireBookLimit: 5,
  hireBookYuanBaoLimit: 100,
  hireBookUsedYuanBao: 40,
  isVip: true,
  places: [
    { placeId: 1, laborUid: 0, laborEndTime: null },
    { placeId: 2, laborUid: 12345, laborEndTime: now + 20 * 60 * 1000 },
    { placeId: 3, laborUid: 0, laborEndTime: null },
    { placeId: 4, laborUid: 67890, laborEndTime: now + 50 * 60 * 1000 },
  ],
}

/** 公会竞赛任务 mock */
const FML_RACE_MOCK = {
  batch: {
    batchId: new Date('2026-08-07').getTime(),
    endTime: now + 3 * 24 * 3600 * 1000,
  },
  usrRcd: {
    score: 320,
    fTaskNum: 3,
    taskLimit: 5,
    takingTask: {
      taskId: 101,
      taskName: '收获嫣粉石斛兰',
      isUpgrade: 0,
      finishCnt: 4,
      targetCnt: 10,
      score: 30,
      expireTime: now + 40 * 60 * 1000,
    },
  },
  raceNextAppearTime: now + 2 * 60 * 1000,
  taskList: [
    { gridId: 1, taskName: '浇水10次', taskKey: 'water', score: 15, canTake: true, inCd: false },
    { gridId: 2, taskName: '收获花卉5朵', taskKey: 'harvest', score: 20, canTake: false, inCd: false, blockReason: '已被他人接取', takenUserName: '花仙子' },
    { gridId: 3, taskName: '出售花艺品', taskKey: 'sellArt', score: 25, canTake: false, inCd: true, appearTime: now + 10 * 60 * 1000 },
    { gridId: 4, taskName: '升级建筑', taskKey: 'selfUpgrade', score: 40, canTake: false, inCd: false, blockReason: '我的进行中任务' },
    { gridId: 5, taskName: '帮助好友升级', taskKey: 'otherUpgrade', score: 35, canTake: false, inCd: false, blockReason: '已被他人接取', takenUserName: '园丁小王', upgradeUserName: '花婆婆' },
    { gridId: 6, taskName: '收获天堂鸟', taskKey: 'harvestSpecial', score: 50, canTake: true, inCd: false },
  ],
}

/** 构建完整 mock 响应 */
function buildMockResponse(scriptId) {
  return {
    code: 200,
    land: {
      total: LAND_TOTAL,
      watering: LAND_WATERING,
      waitHarvest: LAND_WAIT_HARVEST,
      harvestReady: LAND_HARVEST_READY,
      details: LAND_DETAILS,
    },
    items: {
      yuanbao: 32650,
      gold: 1280000,
      water: 234,
      speedUp: 12,
      hireBook: 5,
      buaFangBi: 8800,
    },
    statistics: {
      gld: 128000,
      exp: 45600,
      dmd: 320,
      speedUpCard: 8,
      satin: 45,
      flowerShopCoin: 230,
      wood: 180,
      flowerHarvestNum: 42,
      flowerArtSellNum: 15,
      orderFlowerFinishNum: 8,
      orderSatinFinishNum: 3,
      orderDecorateFinishNum: 2,
      orderCustomerFinishNum: 5,
      orderPalaceFinishNum: 1,
    },
    flowerStock: FLOWER_STOCK,
    flowerOrder: FLOWER_ORDER_MOCK,
    customerOrder: CUSTOMER_ORDER_MOCK,
    shihuaNews: SHIHUA_NEWS_MOCK,
    pearlHire: PEARL_HIRE_MOCK,
    fmlRace: FML_RACE_MOCK,
    scriptId: scriptId,
  }
}

// ==================== Mock 中间件插件 ====================
const mockServerPlugin = {
  name: 'mock-game-state',
  configureServer(server) {
    // mock /game/state/:scriptId 接口
    server.middlewares.use('/game/state', (req, res) => {
      // 设置 CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      // 从 path 中提取 scriptId
      const parts = req.url.split('/').filter(Boolean)
      const scriptId = parts[parts.length - 1] || '0'
      const data = buildMockResponse(scriptId)
      res.end(JSON.stringify(data))
    })

    // 注意：/api 前缀已由 server.proxy 转发到真实后端（http://localhost:8000），
    // 此 mock 分支与 proxy 冲突（插件中间件先注册会先拦截 /api），故移除。
    // /game/state 仍是 mock（Task 14 才接真实游戏状态）；/game 其他路径走 proxy。
  },
}

// Vite 配置文件 - 云助手
export default defineConfig({
  plugins: [vue(), mockServerPlugin],
  server: {
    host: '0.0.0.0',
    port: 8899,
    open: false,
    proxy: {
      '/api': 'http://localhost:8000',
      '/game': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
