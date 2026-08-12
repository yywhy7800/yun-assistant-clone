# 一路狂飙（kb）脚本内容设计

- 日期：2026-08-12
- 作者：Claude Code（AI 辅助）
- 状态：已获用户批准，待实现
- 关联：多脚本框架设计 `.project_context/plan/yun-assistant/2026-08-12_multi-script-framework-design.md`

## 一、背景与目标

多脚本框架已就绪，新游戏 `game2` 目前是占位（名称"新游戏"、空配置）。本次**填充一路狂飙（kb）的脚本内容**：名称、渠道、配置项、mock 数据。功能对照用户已有的一路狂飙 Web 面板脚本（`tools/web_panel/`：通关/三倍芯片/抢红包/登录配置）。

## 二、需求

| # | 需求 | 说明 |
|---|------|------|
| R1 | 脚本类型 | 名称「一路狂飙」、emoji 🏎️、id 用「一路狂飙」、渠道 iOS/安卓 |
| R2 | 配置项 | 基础设置 / 三倍芯片 / 抢红包可配置；**通关设置锁定占位**（面板体现该功能，点击提示"此功能暂不对外开放，如需使用请联系上级"） |
| R3 | 配置面板 | game2/config.html 由占位改为加载通用渲染器 config.js 渲染真实表单 |
| R4 | Mock 数据 | 一路狂飙示例脚本，gameType 用 `kb` |
| R5 | 测试 | 相关断言从 `game2` 同步为 `kb` |

## 三、方案

### 3.1 脚本类型注册表（`src/config/scriptTypes.js`）

将 `game2` 项替换为：

```js
{
  id: '一路狂飙',
  name: '一路狂飙',
  emoji: '🏎️',
  color: '#ff4d4f',
  channels: [
    { name: 'iOS', color: '#1a1a1a', channel: 'ios', available: true, iconSvg: '<svg ...苹果图标...>' },
    { name: '安卓', color: '#3ddc84', channel: 'android', available: true, iconSvg: '<svg ...安卓机器人...>' },
  ],
  configPath: '/config-pages/game2/config.html',
  statusPath: '',
},
```

iOS/安卓渠道 **available: true**（对应 web 面板 platform 选择）。

### 3.2 配置项 schema（新建 `public/config-pages/game2/config.schema.js`）

```js
// 一路狂飙 配置 Schema（对照 Web 面板功能）
window.CONFIG_SCHEMA = {
  "properties": {
    "basic": {
      "description": "基础设置",
      "properties": {
        "autoReconnect": {"type": "boolean", "description": "自动重连", "default": true},
        "reconnectInterval": {"type": "integer", "description": "重连间隔(分)", "default": 10, "min": 1, "dependsOn": "autoReconnect"},
        "loginMethod": {
          "type": "select", "description": "登录方式", "default": "auto",
          "options": [
            {"value": "auto", "label": "自动识别"},
            {"value": "mobile", "label": "手机密码"},
            {"value": "account", "label": "账号密码"}
          ]
        }
      }
    },
    "clear": {
      "description": "通关设置",
      "properties": {
        "autoClear": {"type": "locked", "description": "自动通关", "lockedMessage": "此功能暂不对外开放，如需使用请联系上级"}
      }
    },
    "triple": {
      "description": "三倍芯片",
      "properties": {
        "autoTriple": {"type": "boolean", "description": "自动刷三倍", "default": false},
        "tripleLevel": {"type": "integer", "description": "三倍关卡", "default": 211, "min": 1, "dependsOn": "autoTriple"},
        "tripleThreshold": {
          "type": "select", "description": "领取阈值", "default": "q4", "dependsOn": "autoTriple",
          "options": [
            {"value": "q3", "label": "Q3 蓝"},
            {"value": "q4", "label": "Q4 紫"},
            {"value": "q5", "label": "Q5 金"}
          ]
        }
      }
    },
    "redpocket": {
      "description": "抢红包",
      "properties": {
        "autoRedpocket": {"type": "boolean", "description": "自动抢红包", "default": false},
        "rpTarget": {"type": "integer", "description": "目标红包数", "default": 10, "min": 1, "max": 10, "dependsOn": "autoRedpocket"}
      }
    }
  }
}
```

- 仅用 `boolean / integer / select / locked` 类型，**不涉及花朵/花灵/花瓶数据**；`locked` 类型由 config.js 新增渲染分支支持（见 3.3）。
- `select` 选项结构（`value/label` 数组）与小花仙 `plantMode` 一致。

### 3.3 配置面板（替换 `public/config-pages/game2/config.html`）

从静态占位页改为加载通用渲染器：

- 复制小花仙 `config.html` 的 DOM 结构：`loadingOverlay`、`configContent`、`toast`。
- 加载链改为：**config.schema.js（本目录）→ config.css（上级目录）→ config.js（上级目录）**，**不加载** flowers/vases/flowerArt/flowerElves 数据。
- 与 Home.vue 的 iframe 协议兼容（`updateConfigFromParent` / `saveConfig` 由 config.js 提供，与小花仙一致）。
- **config.js 新增 `locked` 字段类型**（渲染分支）：渲染"功能名 + 暂不开放"占位行，点击调用 `showToast` 显示 `lockedMessage`；渲染时不生成带 fieldId 的控件，`readFormData` 收集时因 `if (!element) return` 自动跳过该字段。小花仙 schema 不使用该类型，无副作用。

### 3.4 Mock 数据（`src/api/mockServer.js`）

`DEFAULT_SCRIPTS` 中 game2 脚本改为：

```js
{ id: 3, gameType: '一路狂飙', roleName: '狂飙车手', server: '国服', status: 'stopped', channel: 'android', account: 'kb001', number: 'NO.2001', expire: '2026-09-01' },
```

### 3.5 测试更新

- `src/config/__tests__/scriptTypes.test.js`：不受 id 影响（断言基于结构），无需改。
- `src/api/__tests__/mockServer.test.js`：`games.has('game2')` → `games.has('一路狂飙')`。

## 四、文件改动清单

| 文件 | 操作 |
|------|------|
| `src/config/scriptTypes.js` | 修改：game2 → 一路狂飙（名称/emoji/颜色/渠道） |
| `public/config-pages/config.js` | 修改：新增 `locked` 字段类型渲染分支 |
| `public/config-pages/game2/config.schema.js` | 新建：一路狂飙配置 schema |
| `public/config-pages/game2/config.html` | 替换：占位页 → 通用渲染器加载页 |
| `src/api/mockServer.js` | 修改：DEFAULT_SCRIPTS 一路狂飙示例 |
| `src/api/__tests__/mockServer.test.js` | 修改：game2 → 一路狂飙 |

## 五、验证方式

1. `npm test` 全过。
2. `npm run build` 成功。
3. Chrome DevTools MCP 浏览器走查：
   - 首页出现「🏎️ 一路狂飙」脚本卡片
   - 添加脚本 → 选「一路狂飙」→ 渠道 iOS/安卓可选
   - 一路狂飙脚本「配置」面板显示真实表单（基础/通关/三倍/抢红包 4 组）
   - 小花仙配置面板不受影响

## 六、范围边界

- ❌ 不实现一路狂飙真实脚本逻辑（那是后端/逆向工程范畴，本仓库仅前端框架）
- ❌ 不填深渊寻宝（web 面板也占位）
- ❌ 不动小花仙脚本配置
