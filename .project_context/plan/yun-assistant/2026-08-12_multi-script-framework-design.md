# 云助手「多脚本框架」改造设计

- 日期：2026-08-12
- 作者：Claude Code（AI 辅助）
- 状态：已获用户批准，待实现
- 关联仓库：`yywhy7800/yun-assistant-clone`（fork 自 `418040413/yun-assistant-clone`）

## 一、背景与目标

当前「云助手」前端只支持**一个游戏**（云·原神小花仙）的脚本，脚本配置、渠道全部硬编码为小花仙专属。

**目标**：将项目升级为**多脚本框架**，支持多个游戏脚本并存；**添加账号时先选脚本（游戏），再登录账号**；每个脚本拥有独立的渠道与配置面板。第二个游戏的具体内容（渠道、配置项）**先占位，用户日后自行填充**。

**约束**：
- 纯前端改造，用 mock 数据驱动，不依赖真实后端；保留真实 API 代码以便日后切换。
- UI 视觉风格不动。
- 不重构 Home.vue、不做性能优化。

## 二、需求详情

| # | 需求 | 说明 |
|---|------|------|
| R1 | 脚本类型注册表 | 集中定义所有游戏脚本：id、名称、图标、渠道列表、配置面板路径 |
| R2 | 添加账号流程 | 改为「选脚本 → 选渠道 → 登录 → 成功」四步 |
| R3 | 首页混合展示 | 脚本卡片混排，卡片标注所属游戏 |
| R4 | 独立配置面板 | 每个脚本指向自己的配置页；新游戏先做**空配置占位** |
| R5 | Mock 数据层 | 纯前端可完整跑通：登录、脚本 CRUD、配置读写、其余接口基础 mock |
| R6 | 修功能 bug | 「确认创建」假逻辑；移除孤儿路由 `/add-account` |

## 三、架构设计

### 3.1 脚本类型注册表（新增 `src/config/scriptTypes.js`）

```js
export const scriptTypes = [
  {
    id: 'gs',
    name: '小花仙',
    emoji: '🌸',
    channels: [
      { name: '官服', color: '#1989fa', channel: 'official', available: true, iconSvg: '...' },
      // …其余渠道保持「未开放」标记，结构同现有 AddAccountForm 渠道数据
    ],
    configPath: '/config-pages/config.html',      // 现有配置页
    statusPath: '/status-pages/status.html',
  },
  {
    id: 'game2',
    name: '新游戏（待填）',
    emoji: '🎮',
    channels: [ { name: '官服', channel: 'official', available: true, iconSvg: '...' } ],
    configPath: '/config-pages/game2/config.html', // 空配置占位页
    statusPath: '',
  },
]

export const getScriptType = (id) => scriptTypes.find(t => t.id === id) || scriptTypes[0]
```

- 现有 `AddAccountForm.vue` 中的渠道数据**迁移到注册表**，组件改为按 `gameType` 读取。
- 新增脚本类型只需往数组加一项。

### 3.2 数据模型

- 脚本对象（script）新增 `gameType` 字段，标识所属游戏。
- mock 数据中每个脚本带 `gameType`。

### 3.3 Mock 数据层（新增 `src/api/mockServer.js`）

- 导出 `handleMockRequest(path, options)`，模拟后端接口：
  - 登录/注册/me：任意账号可登录，token 存 localStorage
  - 脚本：列表、绑定、启停、续期、删除、创建
  - 配置：按 scriptId 读写，存 localStorage
  - 其余（公告/卡密/阳光/账单/推广）：返回基础 mock 数据
- `client.js` 增加 `USE_MOCK` 开关（默认开）；开启时 `request()` 改调 `handleMockRequest`，关闭时走真实 `/api` fetch。
- 现有 `mock.js` 的薄转发逻辑并入新 mock 层，避免误导。

### 3.4 添加账号流程（改造 `AddAccountForm.vue`）

- 视图状态机：`games → channels → password → success`
- `games`：列出所有 scriptTypes，点击进入该游戏的渠道选择
- `channels`：渲染所选游戏的渠道网格（未开放渠道仍标「未开放」）
- `password` / `success`：逻辑不变；绑定成功后 script 带 `gameType`
- 顶部加返回，允许回退重选游戏

### 3.5 首页（改造 `Home.vue`）

- 脚本卡片头部增加游戏标注：`emoji + 游戏名` 小标签
- 列表仍为单一混合列表，不做过滤
- 刷新脚本列表从 mock 拉取

### 3.6 配置面板多脚本化（改造 `Home.vue` + 新增占位页）

- `openConfigPanel` 按 `script.gameType` 取注册表的 `configPath` 加载 iframe
- 小花仙：沿用现有 `public/config-pages/`（不动）
- 新游戏：新增 `public/config-pages/game2/config.html`（复制 config 框架，schema 用空占位）+ 最小 `config.schema.js`（一个占位说明项或空分组），日后用户填 schema 即可自动渲染
- 配置读写走 mock 的 config 接口

### 3.7 顺手修复

1. **「确认创建」假逻辑**（Home.vue）：`confirmCreate` 当前 `setTimeout(800)` 后直接刷新，不调任何 API。改为调用 mock 的创建脚本接口，真正把新脚本写入列表。
2. **移除孤儿路由 `/add-account`**：`AddAccount.vue`（独立页面）注册路由但无入口，其功能与 Home 内「添加脚本」弹层的 `addAccount` 视图（内嵌 `AddAccountForm`）完全重复。**移除 `/add-account` 路由与 `AddAccount.vue` 页面**，统一使用 Home 内的添加弹层；`AddAccountForm` 组件保留（Home 内嵌使用）。

## 四、数据流

```
添加账号：Home 添加入口 → AddAccountForm(games → channels → password)
         → scriptAPI.bind(gameType, channel, account, password)
         → mockServer 返回新脚本 → success 视图 → 返回首页刷新列表

配置面板：卡片「配置」→ openConfigPanel 按 gameType 加载 configPath iframe
         → iframe 内 config.js 调 window.getScriptConfig / saveScriptConfig
         → mock 读写 localStorage
```

## 五、文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/config/scriptTypes.js` | 新增 | 脚本类型注册表 |
| `src/api/mockServer.js` | 新增 | mock 后端接口 |
| `src/api/client.js` | 修改 | 加 USE_MOCK 开关，request 路由到 mock |
| `src/components/AddAccountForm.vue` | 修改 | 加 games 视图，渠道改从注册表读取 |
| `src/views/Home.vue` | 修改 | 卡片标注游戏；openConfigPanel 按 gameType；confirmCreate 接 mock；接入 /add-account 入口 |
| `public/config-pages/game2/` | 新增 | 空配置占位页（config.html + 最小 schema） |
| `src/views/AddAccount.vue` | 删除 | 功能与 Home 内添加弹层重复，移除死页面 |
| `src/router/index.js` | 修改 | 移除 `/add-account` 路由 |
| `src/api/mock.js` | 修改 | 并入 mockServer，移除误导注释 |

## 六、错误处理

- mock 层接口统一返回 `{ success, data|message }`，与真实 API 结构一致，前端无需改动。
- 配置面板 iframe 加载失败 / 未找到 `updateConfigFromParent` 时，沿用现有兜底重试逻辑。
- 添加脚本绑定失败沿用现有 `showFailToast`。

## 七、验证方式

1. `npm run dev` 启动，无后端依赖，纯 mock 可完整走通：
   - 登录 → 首页看到混合脚本列表（卡片带游戏标注）
   - 添加脚本 → 先选游戏 → 选渠道 → 输入账号密码 → 绑定成功 → 列表新增
   - 打开新游戏脚本的配置 → 显示空配置占位；小花仙配置正常
   - 启停 / 续期 / 删除脚本正常
2. `npm run build` 构建通过。

## 八、范围边界（明确不做）

- ❌ 不改 UI 视觉风格、配色、布局
- ❌ 不重构 Home.vue 拆分组件
- ❌ 不做 PWA、Vant 按需引入等性能优化
- ❌ 不填新游戏的具体渠道与配置内容（用户后填）
- ❌ 不改登录/注册/个人中心等既有功能逻辑（除上述 bug）
