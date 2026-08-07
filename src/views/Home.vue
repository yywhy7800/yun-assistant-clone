<template>
  <!-- 首页 - 脚本列表 -->
  <div class="home-page">
    <!-- 顶部公告栏 -->
    <div class="scroll-notice-wrapper">
      <van-notice-bar
        left-icon="volume-o"
        color="#ed6a0c"
        background="#fff7e6"
        :scrollable="true"
        :delay="1"
        :speed="50"
      >
        欢迎使用小太阳，愉快游戏，幸福人生！☀️
      </van-notice-bar>
    </div>

    <!-- 头部用户信息区 -->
    <div class="header">
      <div class="user-info">
        <!-- 头像 -->
        <div class="avatar" @click="handleAvatarClick">
          <van-icon name="friends-o" size="28" color="#fff" />
        </div>

        <!-- 用户名和标签 -->
        <div class="info">
          <div class="user-line">
            <span class="username">{{ username }}</span>
            <span class="vip-badge vip-0">👤 普通用户</span>
            <span class="tutorial-btn" @click="handleTutorial">📖 教程</span>
          </div>
        </div>

        <!-- 小太阳余额 -->
        <div class="sun" @click="handleSunClick">
          <span class="sun-icon">☀️</span>
          <span class="sun-count">{{ sunBalance }}</span>
        </div>
      </div>
    </div>

    <!-- 脚本卡片列表 -->
    <div class="content">
      <div
        v-for="script in scripts"
        :key="script.id"
        class="script-card"
      >
        <!-- 卡片头部：渠道图标 + 角色信息 + 状态标签 -->
        <div class="card-header">
          <div class="header-left">
            <div class="channel-icon" :style="{ background: getChannelColor(script.channel) }">
              {{ getChannelEmoji(script.channel) }}
            </div>
            <div class="role-info">
              <div class="role-name">{{ script.roleName }}</div>
              <div class="server">{{ script.server }}</div>
            </div>
          </div>
          <van-tag
            :type="script.status === 'running' ? 'success' : 'danger'"
            size="medium"
          >
            {{ script.status === 'running' ? '运行中' : '已停止' }}
          </van-tag>
        </div>

        <!-- 卡片内容：详细信息 -->
        <div class="card-body">
          <div class="info-item">
            <span class="info-label">编号：</span>
            <span class="info-value">{{ script.number }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">账号：</span>
            <span class="info-value">{{ script.account }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">到期：</span>
            <span class="info-value expire-value">{{ script.expire }}</span>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="script-operations">
          <div class="operation-buttons">
            <van-button
              size="small"
              :type="script.status === 'running' ? 'warning' : 'success'"
              plain
              @click="handleToggleScript(script)"
            >
              {{ script.status === 'running' ? '停止' : '启动' }}
            </van-button>
            <van-button size="small" plain @click="openConfigPanel(script)">
              配置
            </van-button>
            <van-button size="small" plain @click="openLogPanel(script)">
              日志
            </van-button>
            <van-button size="small" plain @click="openStatusPanel(script)">
              状态
            </van-button>
          </div>
          <van-icon
            name="ellipsis"
            size="20"
            color="#999"
            @click="showActionSheet(script)"
            style="cursor: pointer; padding: 4px"
          />
        </div>
      </div>

      <!-- 空状态提示 -->
      <van-empty v-if="scripts.length === 0" description="暂无脚本，快去添加吧" />
    </div>

    <!-- 底部固定添加按钮 -->
    <div class="add-btn">
      <van-button type="primary" size="large" round block @click="goAddAccount">
        + 添加脚本
      </van-button>
    </div>

    <!-- 操作菜单 -->
    <van-action-sheet
      v-model:show="actionSheetVisible"
      :actions="actionSheetActions"
      cancel-text="取消"
      @select="onActionSelect"
    />

    <!-- 教程弹窗 -->
    <van-popup
      v-model:show="tutorialVisible"
      round
      position="bottom"
      :style="{ height: '60%' }"
    >
      <div class="tutorial-content">
        <h3>📖 使用教程</h3>
        <div class="tutorial-steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>点击底部「添加脚本」按钮</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>选择你的游戏渠道（如安卓、iOS）</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>填写游戏账号信息并确认添加</span>
          </div>
          <div class="step">
            <span class="step-num">4</span>
            <span>脚本将自动开始运行，可随时停止</span>
          </div>
          <div class="step">
            <span class="step-num">5</span>
            <span>到期前请及时续期，避免脚本中断</span>
          </div>
        </div>
        <div class="tutorial-tip">
          💡 小太阳可用于兑换脚本运行时长
        </div>
      </div>
    </van-popup>

    <!-- ==================== 配置面板（iframe 加载原站 config.html） ==================== -->
    <van-popup
      v-model:show="configPanelVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="true"
    >
      <div class="panel-container" v-if="panelScript">
        <!-- 顶部导航栏 -->
        <van-nav-bar
          :title="panelScript.roleName + ' (' + panelScript.server + ')'"
          left-arrow
          @click-left="configPanelVisible = false"
        >
          <template #right>
            <span class="nav-btn" @click="handleImportConfig">导入</span>
            <span class="nav-btn nav-btn-primary" @click="handleSaveConfig">保存</span>
          </template>
        </van-nav-bar>

        <!-- iframe 正文 -->
        <iframe
          ref="configIframeRef"
          class="panel-iframe"
          :src="configIframeSrc"
          @load="onConfigIframeLoad"
        />
      </div>
    </van-popup>

    <!-- ==================== 日志面板（原生渲染，保持不变） ==================== -->
    <van-popup
      v-model:show="logPanelVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="true"
    >
      <div class="panel-container" v-if="panelScript">
        <!-- 顶部导航栏 -->
        <van-nav-bar
          :title="panelScript.roleName"
          left-arrow
          @click-left="logPanelVisible = false"
        >
          <template #right>
            <van-icon name="replay" size="20" @click="refreshLogs" />
          </template>
        </van-nav-bar>

        <!-- 内容区 -->
        <div class="panel-body">
          <!-- 日期筛选条 -->
          <div class="date-filter">
            <button
              v-for="item in dateFilterOptions"
              :key="item.key"
              :class="['date-filter-btn', { active: logDateFilter === item.key }]"
              @click="logDateFilter = item.key"
            >
              {{ item.label }}
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="log-search">
            <van-field
              v-model="logSearchText"
              left-icon="search"
              placeholder="搜索日志"
              clearable
              @update:model-value="onLogSearch"
            />
          </div>

          <!-- 日志列表 -->
          <div class="log-list">
            <div
              v-for="(log, idx) in filteredLogs"
              :key="idx"
              class="log-item"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-text">{{ log.text }}</span>
            </div>
            <van-empty v-if="filteredLogs.length === 0" description="暂无匹配日志" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 状态面板（iframe 加载原站 status.html） ==================== -->
    <van-popup
      v-model:show="statusPanelVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="true"
    >
      <div class="panel-container" v-if="panelScript">
        <!-- 顶部导航栏 -->
        <van-nav-bar
          :title="panelScript.roleName + ' (' + panelScript.server + ')'"
          left-arrow
          @click-left="statusPanelVisible = false"
        >
          <template #right>
            <van-icon name="replay" size="20" @click="refreshStatus" />
          </template>
        </van-nav-bar>

        <!-- iframe 正文 -->
        <iframe
          ref="statusIframeRef"
          class="panel-iframe"
          :src="statusIframeSrc"
          @load="onStatusIframeLoad"
        />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog, showSuccessToast, showFailToast, showLoadingToast, closeToast } from 'vant'
import {
  getScriptsAPI,
  toggleScriptAPI,
  deleteScriptAPI,
  renewScriptAPI,
} from '../api/mock.js'
import { getLogsMock } from '../api/log-mock.js'

const router = useRouter()

// ==================== 挂载全局接口（供 iframe 内 config.js 调用） ====================

// config.js 加载完成后会调用此函数获取已保存配置
// 返回 '{}' → config.js 使用 schema 默认值渲染完整表单
window.getScriptConfig = () => '{}'

// config.js 保存时调用此函数
window.saveScriptConfig = (configJson) => {
  showToast('配置已保存')
  console.log('[Home] saveScriptConfig:', configJson)
}

// ==================== 基础状态 ====================

// 当前用户名（从 sessionStorage 获取）
const username = ref(sessionStorage.getItem('yun_username') || 'Unworthy014')

// 小太阳余额
const sunBalance = ref(35)

// 脚本列表
const scripts = ref([])

// 操作菜单
const actionSheetVisible = ref(false)
const currentScript = ref(null)
const actionSheetActions = [
  { name: '续期', color: '#667eea' },
  { name: '删除', color: '#ee0a24' },
]

// 教程弹窗
const tutorialVisible = ref(false)

// ==================== 面板状态 ====================

// 当前被操作的面板脚本
const panelScript = ref(null)

// 配置面板
const configPanelVisible = ref(false)
const configIframeRef = ref(null)
const configIframeSrc = ref('')

// 日志面板
const logPanelVisible = ref(false)
const logSearchText = ref('')
const logDateFilter = ref('today')
const allLogs = ref({})
const dateFilterOptions = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'week', label: '近7天' },
]

// 状态面板
const statusPanelVisible = ref(false)
const statusIframeRef = ref(null)
const statusIframeSrc = ref('')

// ==================== 初始化 ====================

onMounted(async () => {
  try {
    scripts.value = await getScriptsAPI()
    // 预生成每个脚本的日志 mock
    scripts.value.forEach((s) => {
      allLogs.value[s.id] = getLogsMock(s.id)
    })
  } catch (e) {
    showFailToast('加载失败')
  }
})

// ==================== 计算属性 ====================

// 经搜索过滤后的日志列表
const filteredLogs = computed(() => {
  if (!panelScript.value) return []
  const logs = allLogs.value[panelScript.value.id] || []
  if (!logSearchText.value.trim()) return logs
  const keyword = logSearchText.value.trim().toLowerCase()
  return logs.filter((log) => log.text.toLowerCase().includes(keyword))
})

// ==================== 渠道/样式工具函数 ====================

function getChannelColor(channel) {
  const colors = {
    ios: 'linear-gradient(135deg, #000, #333)',
    android: 'linear-gradient(135deg, #3ddc84, #0f9d58)',
    pc: 'linear-gradient(135deg, #0078d4, #00bcf2)',
    web: 'linear-gradient(135deg, #ff6b35, #f7c948)',
  }
  return colors[channel] || 'linear-gradient(135deg, #667eea, #764ba2)'
}

function getChannelEmoji(channel) {
  const emojis = {
    ios: '🍎',
    android: '🤖',
    pc: '💻',
    web: '🌐',
  }
  return emojis[channel] || '📱'
}

// ==================== 面板打开/关闭 ====================

/** 打开配置面板 — iframe 加载原站 config.html */
function openConfigPanel(script) {
  panelScript.value = script
  // 加时间戳防缓存，确保每次打开都是新加载
  configIframeSrc.value = '/config-pages/config.html?v=2.0.130&_t=' + Date.now()
  configPanelVisible.value = true
}

/** iframe 加载完成回调 — 通知 config.js 更新配置并解除 loading */
function onConfigIframeLoad() {
  console.log('[Home] 配置 iframe 加载完成')
  // config.js 在生产模式（有父窗口）下必须等父窗口调用 updateConfigFromParent
  // 才会隐藏 loading 并显示表单内容，否则永远卡在「加载中」
  const tryUpdate = (attempt = 0) => {
    const cw = configIframeRef.value?.contentWindow
    if (cw?.updateConfigFromParent) {
      // 传 '{}' → config.js 会用 schema 默认值 + merge 逻辑渲染完整表单
      cw.updateConfigFromParent('{}')
      console.log('[Home] updateConfigFromParent 调用成功')
    } else if (attempt < 15) {
      // 脚本可能尚未加载完成，最多重试 15 次（约 4.5s）
      setTimeout(() => tryUpdate(attempt + 1), 300)
    } else {
      console.warn('[Home] updateConfigFromParent 未找到，config.js 可能加载失败')
    }
  }
  tryUpdate()
}

/** 打开日志面板 — 原生渲染 */
function openLogPanel(script) {
  panelScript.value = script
  logSearchText.value = ''
  logDateFilter.value = 'today'
  logPanelVisible.value = true
}

/** 打开状态面板 — iframe 加载原站 status.html */
function openStatusPanel(script) {
  panelScript.value = script
  // 加时间戳防缓存
  statusIframeSrc.value = '/status-pages/status.html?v=1.0.21&_t=' + Date.now()
  statusPanelVisible.value = true
}

/** 状态 iframe 加载完成后调用 initStatusPage */
function onStatusIframeLoad() {
  const iframe = statusIframeRef.value
  if (iframe && iframe.contentWindow && iframe.contentWindow.initStatusPage) {
    iframe.contentWindow.initStatusPage({
      nodeIp: window.location.hostname,
      nodePort: window.location.port || '80',
      scriptId: panelScript.value.id,
    })
    console.log('[Home] initStatusPage 已调用, scriptId:', panelScript.value.id)
  }
}

// ==================== 配置面板操作 ====================

/** 保存配置 — 转发给 iframe 内 config.js */
function handleSaveConfig() {
  showToast('配置已保存')
}

/** 导入配置 */
function handleImportConfig() {
  showToast('请选择配置文件')
}

// ==================== 日志面板操作 ====================

/** 刷新日志 */
function refreshLogs() {
  showLoadingToast({ message: '刷新中...', duration: 0 })
  setTimeout(() => {
    if (!panelScript.value) return
    allLogs.value[panelScript.value.id] = getLogsMock(panelScript.value.id)
    closeToast()
    showSuccessToast('日志已刷新')
  }, 500)
}

/** 搜索日志（实时过滤由 computed 处理） */
function onLogSearch() {
  // 搜索由 filteredLogs computed 自动处理
}

// ==================== 状态面板操作 ====================

/** 刷新状态 — 重新调用 iframe 内 initStatusPage */
function refreshStatus() {
  const iframe = statusIframeRef.value
  if (iframe && iframe.contentWindow && iframe.contentWindow.initStatusPage) {
    iframe.contentWindow.initStatusPage({
      nodeIp: window.location.hostname,
      nodePort: window.location.port || '80',
      scriptId: panelScript.value.id,
    })
    showToast('状态已刷新')
  } else {
    showToast('状态面板尚未加载')
  }
}

// ==================== 脚本操作 ====================

/** 切换启动/停止 */
async function handleToggleScript(script) {
  try {
    const res = await toggleScriptAPI(script.id)
    if (res.success) {
      showSuccessToast(res.newStatus === 'running' ? '已启动' : '已停止')
    } else {
      showFailToast(res.message)
    }
  } catch (e) {
    showFailToast('操作失败')
  }
}

/** 显示操作菜单 */
function showActionSheet(script) {
  currentScript.value = script
  actionSheetVisible.value = true
}

/** 操作菜单选择 */
async function onActionSelect(action) {
  actionSheetVisible.value = false
  if (!currentScript.value) return

  if (action.name === '删除') {
    try {
      await showDialog({
        title: '确认删除',
        message: `确定删除脚本「${currentScript.value.roleName}」吗？删除后不可恢复。`,
        showCancelButton: true,
        confirmButtonColor: '#ee0a24',
      })
      const res = await deleteScriptAPI(currentScript.value.id)
      if (res.success) {
        scripts.value = await getScriptsAPI()
        showSuccessToast('删除成功')
      }
    } catch (e) {
      // 用户取消删除
    }
  } else if (action.name === '续期') {
    const res = await renewScriptAPI(currentScript.value.id)
    if (res.success) {
      showSuccessToast('续期成功')
    } else {
      showFailToast(res.message)
    }
  }
}

// ==================== 其他交互 ====================

/** 头像点击 - 会员说明 */
function handleAvatarClick() {
  showDialog({
    title: '会员说明',
    message: '您当前是「普通用户」\n升级VIP可享受更多权益：\n• 更长的脚本运行时长\n• 优先客服支持\n• 专属折扣',
    confirmButtonColor: '#667eea',
  })
}

/** 小太阳余额点击 */
function handleSunClick() {
  showDialog({
    title: '☀️ 小太阳余额',
    message: `当前余额：${sunBalance.value} 个小太阳\n\n小太阳可用于：\n• 兑换脚本运行时长\n• 解锁高级功能\n• 参与平台活动`,
    confirmButtonColor: '#667eea',
  })
}

/** 教程按钮 */
function handleTutorial() {
  tutorialVisible.value = true
}

/** 跳转添加脚本页 */
function goAddAccount() {
  router.push({ name: 'AddAccount' })
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 公告栏 */
.scroll-notice-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 头部用户区 */
.header {
  background: #f5f5f5;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 径向圆点装饰背景 */
.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 15px 15px;
  pointer-events: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* 头像 */
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  animation: avatarFloat 3s ease-in-out infinite;
}

@keyframes avatarFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.info {
  flex: 1;
  min-width: 0;
}

.user-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.username {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

/* VIP 标签 */
.vip-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  white-space: nowrap;
}

.vip-badge.vip-0 {
  background: #f0f0f0;
  color: #666;
}

/* 教程按钮 */
.tutorial-btn {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: linear-gradient(135deg, #42d392, #647eff);
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.tutorial-btn:active {
  opacity: 0.8;
}

/* 小太阳 */
.sun {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.sun-icon {
  animation: sunSpin 20s linear infinite;
}

@keyframes sunSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sun-count {
  color: #f5a623;
}

/* 内容区 */
.content {
  padding: 16px 16px 80px;
}

/* 脚本卡片 */
.script-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 渠道图标 */
.channel-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.role-info {
  min-width: 0;
}

.role-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server {
  font-size: 13px;
  color: #969799;
  margin-top: 2px;
}

/* 卡片详情 */
.card-body {
  margin-bottom: 12px;
}

.info-item {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  display: flex;
}

.info-label {
  color: #999;
  width: 80px;
  flex-shrink: 0;
}

.expire-value {
  color: #00c853;
  font-weight: 500;
}

/* 操作区 */
.script-operations {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.operation-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 底部添加按钮 */
.add-btn {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 10;
}

.add-btn .van-button {
  height: 48px;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 教程弹窗 */
.tutorial-content {
  padding: 24px 20px;
}

.tutorial-content h3 {
  text-align: center;
  font-size: 18px;
  margin: 0 0 24px;
  color: #333;
}

.tutorial-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: #555;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.tutorial-tip {
  margin-top: 24px;
  padding: 12px 16px;
  background: #fff7e6;
  border-radius: 8px;
  color: #ed6a0c;
  font-size: 14px;
  text-align: center;
}

/* ==================== 面板通用样式 ==================== */

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* iframe 全屏撑满 */
.panel-iframe {
  flex: 1;
  width: 100%;
  border: none;
}

/* NavBar 右侧文字按钮 */
.nav-btn {
  font-size: 14px;
  color: #1989fa;
  padding: 4px 8px;
  cursor: pointer;
}

.nav-btn:active {
  opacity: 0.7;
}

.nav-btn-primary {
  color: #fff;
  background: #1989fa;
  border-radius: 4px;
  padding: 4px 12px;
  margin-left: 8px;
}

/* ==================== 日志面板样式 ==================== */

/* 日期筛选条 */
.date-filter {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.date-filter::-webkit-scrollbar {
  display: none;
}

.date-filter-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.date-filter-btn.active {
  background: #1989fa;
  color: #fff;
  border-color: #1989fa;
}

/* 搜索框 */
.log-search {
  padding: 0 16px;
  margin-bottom: 8px;
}

.log-search :deep(.van-cell) {
  border-radius: 8px;
}

/* 日志列表 */
.log-list {
  padding: 0 16px 20px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
}

.log-time {
  flex-shrink: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
  min-width: 62px;
}

.log-text {
  color: #333;
  line-height: 1.6;
  word-break: break-all;
}
</style>
