<template>
  <!-- AddAccountForm - 多脚本框架：选择脚本 → 选择渠道 → 绑定流程 → 成功 -->
  <div class="add-account-form">
    <!-- ===== games 视图：选择脚本（游戏） ===== -->
    <template v-if="view === 'games'">
      <div class="section-title">选择脚本</div>
      <div class="channel-grid">
        <div
          v-for="t in scriptTypes"
          :key="t.id"
          class="channel-item"
          @click="onSelectType(t)"
        >
          <div class="channel-icon" :style="{ background: t.color }">
            <span class="type-emoji">{{ t.emoji }}</span>
          </div>
          <div class="channel-name">{{ t.name }}</div>
        </div>
      </div>
    </template>

    <!-- ===== channels 视图：选择所选游戏的渠道 ===== -->
    <template v-else-if="view === 'channels'">
      <div class="selected-channel" @click="view = 'games'">
        <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
        <span class="channel-name-text">{{ selectedType.emoji }} {{ selectedType.name }}</span>
        <span class="change-text">点击更换</span>
      </div>
      <div class="section-title">选择渠道</div>
      <div class="channel-grid">
        <div
          v-for="ch in selectedType.channels"
          :key="ch.name"
          class="channel-item"
          @click="onSelectChannel(ch)"
        >
          <div
            class="channel-icon"
            :style="{ background: ch.color }"
            v-html="ch.iconSvg"
          />
          <div class="channel-name">
            {{ ch.name }}
            <span v-if="!ch.available" class="channel-lock">未开放</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== password 视图 ===== -->
    <template v-else-if="view === 'password'">
      <div class="selected-channel" @click="view = 'channels'">
        <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
        <div class="channel-icon" style="width: 28px; height: 28px; border-radius: 6px; margin-right: 8px;" :style="{ background: selectedChannel.color }" v-html="selectedChannel.iconSvg" />
        <span class="channel-name-text">{{ selectedType.name }} · {{ selectedChannel.name }}</span>
        <span class="change-text">点击更换</span>
      </div>
      <van-cell-group>
        <van-field v-model="passwordForm.account" label="账号" placeholder="请输入游戏账号" />
        <van-field v-model="passwordForm.password" type="password" label="密码" placeholder="请输入游戏密码" />
      </van-cell-group>
      <div class="tips">
        <div>💡 提示：</div>
        <div>• 请输入游戏账号和密码</div>
        <div>• 系统将验证账号有效性</div>
        <div>• 密码加密存储，仅用于脚本运行验证</div>
      </div>
      <div class="form-submit">
        <van-button type="primary" block :loading="submitting" loading-text="验证中..." @click="onPasswordSubmit">
          验证并绑定
        </van-button>
      </div>
    </template>

    <!-- ===== success 视图 ===== -->
    <template v-else-if="view === 'success'">
      <div class="success-section">
        <div class="success-box">
          <van-icon name="success" size="64" color="#07c160" />
          <div class="success-title">绑定成功</div>
          <div class="account-info">
            <div class="info-row" v-if="successData.gameName">
              <span class="info-label">脚本：</span>
              <span class="info-value">{{ successData.gameName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">账号：</span>
              <span class="info-value">{{ successData.accountName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">渠道：</span>
              <span class="info-value">{{ successData.channel }}</span>
            </div>
            <div class="info-row" v-if="successData.roleName">
              <span class="info-label">角色：</span>
              <span class="info-value">{{ successData.roleName }}</span>
            </div>
            <div class="info-row" v-if="successData.server">
              <span class="info-label">服务器：</span>
              <span class="info-value">{{ successData.server }}</span>
            </div>
            <div class="info-row" v-if="successData.expire">
              <span class="info-label">到期：</span>
              <span class="info-value">{{ successData.expire }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">状态：</span>
              <van-tag type="success">已绑定</van-tag>
            </div>
          </div>
        </div>
        <div class="form-submit">
          <van-button type="primary" round block @click="onFinish">
            完成
          </van-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { showToast, showFailToast } from 'vant'
import { scriptAPI } from '../api/client'
import { scriptTypes } from '../config/scriptTypes'

const emit = defineEmits(['success'])

// ==================== 状态机 ====================
const view = ref('games') // 'games' | 'channels' | 'password' | 'success'
const selectedType = ref(null)    // 选中的脚本类型（游戏）
const selectedChannel = ref(null) // 选中的渠道

// 表单数据
const passwordForm = reactive({ account: '', password: '' })

// success（真实绑定成功后用 API 返回的脚本信息填充）
const successData = reactive({ accountName: '', channel: '', roleName: '', server: '', expire: '', gameName: '' })

const submitting = ref(false)

// ==================== 视图切换 ====================
function onSelectType(t) {
  selectedType.value = t
  view.value = 'channels'
}

function onSelectChannel(ch) {
  // 后端仅实现密码渠道绑定协议，其余渠道标记未开放，不进入绑定流程
  if (!ch.available) {
    showToast('该渠道暂未开放')
    return
  }
  selectedChannel.value = ch
  // 重置表单
  passwordForm.account = ''
  passwordForm.password = ''
  view.value = 'password'
}

// ==================== password 视图逻辑（真实绑定） ====================
async function onPasswordSubmit() {
  if (!passwordForm.account.trim()) {
    showToast('请输入游戏账号')
    return
  }
  if (!passwordForm.password.trim()) {
    showToast('请输入游戏密码')
    return
  }
  submitting.value = true
  try {
    const res = await scriptAPI.bind({
      gameType: selectedType.value?.id || 'gs',
      channel: selectedChannel.value?.channel || 'official',
      account: passwordForm.account.trim(),
      password: passwordForm.password,
    })
    // 用后端返回的脚本信息填充成功视图
    const script = res.data?.script
    successData.accountName = passwordForm.account.trim()
    successData.channel = selectedChannel.value?.name || ''
    successData.gameName = selectedType.value?.name || ''
    successData.roleName = script?.roleName || ''
    successData.server = script?.server || ''
    successData.expire = script?.expire || ''
    view.value = 'success'
  } catch (e) {
    // 展示后端真实错误信息（如游戏账号验证失败），停留当前视图
    showFailToast(e.message || '绑定失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

// ==================== success 视图逻辑 ====================
function onFinish() {
  emit('success', {
    accountName: successData.accountName,
    channel: selectedChannel.value?.channel || 'official',
    roleName: successData.roleName,
    server: successData.server,
    expire: successData.expire,
    gameType: selectedType.value?.id || 'gs',
  })
}
</script>

<style scoped>
.add-account-form {
  min-height: 100%;
  background: #fff;
}

/* ----- section-title ----- */
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  padding: 16px 16px 12px;
}

/* ----- channel-grid ----- */
.channel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
}

.channel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.channel-item:active {
  background: #f7f8fa;
}

.channel-icon {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

/* 游戏图标 emoji 居中 */
.type-emoji {
  font-size: 28px;
  line-height: 56px;
}

.channel-name {
  margin-top: 8px;
  font-size: 13px;
  color: #333;
}

/* ----- selected-channel bar ----- */
.selected-channel {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.selected-channel:active {
  opacity: 0.7;
}

.channel-name-text {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.change-text {
  font-size: 13px;
  color: #1989fa;
}

/* ----- tips ----- */
.tips {
  margin: 12px 16px;
  padding: 12px 16px;
  background: #fff7e6;
  border-radius: 8px;
  color: #ed6a0c;
  font-size: 13px;
  line-height: 1.8;
}

/* ----- form-submit ----- */
.form-submit {
  padding: 20px 16px;
}

.form-submit .van-button {
  height: 48px;
  font-size: 16px;
}

/* ----- channel-lock（未开放渠道标记） ----- */
.channel-lock {
  display: inline-block;
  margin-left: 4px;
  padding: 0 4px;
  font-size: 10px;
  line-height: 14px;
  color: #999;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  transform: translateY(-1px);
}

/* ----- success ----- */
.success-section {
  padding-top: 80px;
}

.success-box {
  text-align: center;
  padding: 40px 20px;
  background: #fff;
  border-radius: 12px;
  margin: 0 16px;
}

.success-title {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 16px 0 24px;
}

.account-info {
  text-align: left;
  padding: 0 20px;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666;
  line-height: 2.4;
}

.info-label {
  color: #999;
  width: 60px;
  flex-shrink: 0;
}
</style>
