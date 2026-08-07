<template>
  <!-- 添加脚本页 - 三步流程 -->
  <div class="add-account-page">
    <van-nav-bar
      title="添加脚本"
      left-arrow
      @click-left="goBack"
      fixed
      placeholder
    />

    <!-- ===== 第一步：渠道选择 ===== -->
    <div v-if="step === 1" class="add-account-form">
      <div class="section-title">选择渠道</div>
      <div class="channel-grid">
        <div
          v-for="channel in channels"
          :key="channel.key"
          class="channel-item"
          :class="{ active: selectedChannel?.key === channel.key }"
          @click="selectChannel(channel)"
        >
          <div class="channel-icon-box">
            {{ channel.emoji }}
          </div>
          <div class="channel-name">{{ channel.name }}</div>
        </div>
      </div>
    </div>

    <!-- ===== 第二步：输入信息 ===== -->
    <div v-if="step === 2" class="add-account-form">
      <!-- 已选渠道 -->
      <div class="selected-channel">
        <div class="selected-info">
          <span class="selected-emoji">{{ selectedChannel.emoji }}</span>
          <span class="selected-name">{{ selectedChannel.name }}</span>
        </div>
        <span class="change-link" @click="step = 1">换一个</span>
      </div>

      <!-- 输入区 -->
      <div class="input-section">
        <van-field
          v-model="gameAccount"
          label="游戏账号"
          placeholder="请输入游戏账号"
          :rules="[{ required: true, message: '请输入游戏账号' }]"
        />
        <van-field
          v-model="remark"
          label="备注"
          placeholder="选填（如角色名、服务器等）"
        />

        <!-- 提示框 -->
        <div class="tips">
          💡 请填写正确的游戏账号，添加后将自动开始运行脚本。请确保账号信息无误，否则脚本可能无法正常运行。
        </div>
      </div>

      <!-- 确认添加按钮 -->
      <div class="submit-btn">
        <van-button
          type="primary"
          round
          block
          :loading="loading"
          loading-text="添加中..."
          @click="handleAdd"
        >
          确认添加
        </van-button>
      </div>
    </div>

    <!-- ===== 第三步：添加成功 ===== -->
    <div v-if="step === 3" class="add-account-form">
      <div class="success-section">
        <div class="success-box">
          <div class="success-icon">✓</div>
          <div class="success-title">添加成功</div>
          <div class="success-info">
            <div class="success-item">
              <span class="s-label">渠道：</span>
              <span>{{ selectedChannel.emoji }} {{ selectedChannel.name }}</span>
            </div>
            <div class="success-item">
              <span class="s-label">账号：</span>
              <span>{{ gameAccount }}</span>
            </div>
            <div class="success-item">
              <span class="s-label">状态：</span>
              <van-tag type="success" size="small">运行中</van-tag>
            </div>
          </div>
        </div>

        <div class="success-btn">
          <van-button type="primary" round block @click="goHome">
            返回首页
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import { addScriptAPI } from '../api/mock.js'

const router = useRouter()

// 渠道列表
const channels = [
  { key: 'android', name: '安卓', emoji: '🤖' },
  { key: 'ios', name: 'iOS', emoji: '🍎' },
  { key: 'pc', name: '电脑', emoji: '💻' },
  { key: 'web', name: '网页', emoji: '🌐' },
  { key: 'sun', name: '小太阳', emoji: '☀️' },
  { key: 'basin', name: '聚宝盆', emoji: '🪙' },
  { key: 'rich', name: '大富豪', emoji: '💰' },
  { key: 'other', name: '其他', emoji: '📦' },
]

// 当前步骤：1=选渠道, 2=填信息, 3=成功
const step = ref(1)

const selectedChannel = ref(null)
const gameAccount = ref('')
const remark = ref('')
const loading = ref(false)

// 选择渠道
function selectChannel(channel) {
  selectedChannel.value = channel
  // 选中后自动进入下一步
  setTimeout(() => {
    step.value = 2
  }, 200)
}

// 确认添加
async function handleAdd() {
  if (!gameAccount.value.trim()) {
    showToast('请输入游戏账号')
    return
  }

  loading.value = true
  try {
    const res = await addScriptAPI({
      channel: selectedChannel.value.key,
      channelName: selectedChannel.value.name,
      account: gameAccount.value,
      remark: remark.value,
    })

    if (res.success) {
      step.value = 3
    } else {
      showFailToast(res.message || '添加失败')
    }
  } catch (e) {
    showFailToast('网络错误，请重试')
  } finally {
    loading.value = false
  }
}

// 返回首页
function goHome() {
  router.replace({ name: 'Home' })
}

// 返回
function goBack() {
  if (step.value === 2) {
    step.value = 1
  } else {
    router.back()
  }
}
</script>

<style scoped>
.add-account-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.add-account-form {
  padding: 16px;
}

/* 分区标题 */
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 16px;
}

/* 渠道选择网格 */
.channel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.channel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.channel-item:active {
  transform: scale(0.95);
}

.channel-item.active {
  border-color: #667eea;
  background: #f0f2ff;
}

.channel-icon-box {
  font-size: 48px;
  line-height: 1;
}

.channel-name {
  font-size: 12px;
  color: #666;
}

/* 已选渠道 */
.selected-channel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #333;
}

.selected-emoji {
  font-size: 28px;
}

.change-link {
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
}

.change-link:active {
  opacity: 0.7;
}

/* 输入区 */
.input-section {
  margin-top: 0;
}

/* 橙色提示框 */
.tips {
  margin: 12px 16px;
  padding: 12px 16px;
  background: #fff7e6;
  border-radius: 8px;
  color: #ed6a0c;
  font-size: 13px;
  line-height: 1.6;
}

/* 提交按钮 */
.submit-btn {
  padding: 20px 16px;
}

.submit-btn .van-button {
  height: 48px;
  font-size: 16px;
}

/* 成功页面 */
.success-section {
  padding-top: 40px;
}

.success-box {
  background: #fff;
  border-radius: 16px;
  padding: 32px 20px;
  text-align: center;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #42d392, #0f9d58);
  color: #fff;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-weight: 700;
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 20px;
}

.success-info {
  text-align: left;
}

.success-item {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666;
  line-height: 2.2;
}

.s-label {
  color: #999;
  width: 60px;
  flex-shrink: 0;
}

.success-btn {
  margin-top: 32px;
  padding: 0 16px;
}

.success-btn .van-button {
  height: 48px;
  font-size: 16px;
}
</style>
