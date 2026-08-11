<template>
  <!-- AddAccountForm - 原站完全复刻：选择添加方式 → 绑定流程 → 成功 -->
  <div class="add-account-form">
    <!-- ===== channels 视图：选择添加方式 ===== -->
    <template v-if="view === 'channels'">
      <div class="section-title">选择添加方式</div>
      <div class="channel-grid">
        <div
          v-for="ch in channels"
          :key="ch.name"
          class="channel-item"
          @click="onSelectChannel(ch)"
        >
          <div
            class="channel-icon"
            :style="{ background: ch.color }"
            v-html="ch.iconSvg"
          />
          <div class="channel-name">{{ ch.name }}</div>
        </div>
        <!-- 账号标识码 -->
        <div class="channel-item" @click="view = 'code'">
          <div class="channel-icon" style="background: #1989fa; display: flex; align-items: center; justify-content: center;">
            <van-icon name="qr" size="32" color="#fff" />
          </div>
          <div class="channel-name">账号标识码</div>
        </div>
      </div>
    </template>

    <!-- ===== password 视图 ===== -->
    <template v-else-if="view === 'password'">
      <div class="selected-channel" @click="view = 'channels'">
        <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
        <div class="channel-icon" style="width: 28px; height: 28px; border-radius: 6px; margin-right: 8px;" :style="{ background: selectedChannel.color }" v-html="selectedChannel.iconSvg" />
        <span class="channel-name-text">{{ selectedChannel.name }}</span>
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
        <div>• 密码仅用于验证，不会保存</div>
      </div>
      <div class="form-submit">
        <van-button type="primary" block :loading="submitting" loading-text="验证中..." @click="onPasswordSubmit">
          验证并绑定
        </van-button>
      </div>
    </template>

    <!-- ===== code 视图 ===== -->
    <template v-else-if="view === 'code'">
      <div class="back-bar" @click="view = 'channels'">
        <van-icon name="arrow-left" size="20" />
        <span>返回选择方式</span>
      </div>
      <van-cell-group>
        <van-field
          v-model="codeForm.identifier"
          label="标识码"
          placeholder="请输入16位账号标识码"
          maxlength="16"
          :formatter="(val) => val.toUpperCase()"
        />
      </van-cell-group>
      <div class="tips">
        <div>💡 提示：</div>
        <div>• 标识码由管理员创建账号后提供</div>
        <div>• 标识码为16位大写字母</div>
        <div>• 每个标识码只能使用一次</div>
      </div>
      <div class="form-submit">
        <van-button type="primary" block :loading="submitting" loading-text="绑定中..." @click="onCodeSubmit">
          绑定账号
        </van-button>
      </div>
    </template>

    <!-- ===== sms 视图 ===== -->
    <template v-else-if="view === 'sms'">
      <div class="selected-channel" @click="view = 'channels'">
        <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
        <div class="channel-icon" style="width: 28px; height: 28px; border-radius: 6px; margin-right: 8px;" :style="{ background: selectedChannel.color }" v-html="selectedChannel.iconSvg" />
        <span class="channel-name-text">{{ selectedChannel.name }}</span>
        <span class="change-text">点击更换</span>
      </div>
      <van-cell-group>
        <van-field v-model="smsForm.phone" label="手机号" type="tel" maxlength="11" placeholder="请输入手机号" />
        <van-field v-model="smsForm.code" label="验证码" maxlength="6" placeholder="请输入验证码">
          <template #button>
            <van-button
              size="small"
              type="primary"
              :disabled="smsCountdown > 0"
              @click="onSendSmsCode"
            >
              {{ smsCountdown > 0 ? `${smsCountdown}秒后重试` : '发送验证码' }}
            </van-button>
          </template>
        </van-field>
      </van-cell-group>
      <div class="tips">
        <div>💡 提示：</div>
        <div>• 请输入您的手机号</div>
        <div>• 验证码将发送到您的手机</div>
        <div>• 验证码5分钟内有效</div>
      </div>
      <div class="form-submit">
        <van-button type="primary" block :loading="submitting" loading-text="验证中..." @click="onSmsSubmit">
          验证并绑定
        </van-button>
      </div>
    </template>

    <!-- ===== qr 视图 ===== -->
    <template v-else-if="view === 'qr'">
      <div class="selected-channel" @click="view = 'channels'">
        <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
        <div class="channel-icon" style="width: 28px; height: 28px; border-radius: 6px; margin-right: 8px;" :style="{ background: selectedChannel.color }" v-html="selectedChannel.iconSvg" />
        <span class="channel-name-text">{{ selectedChannel.name }}</span>
        <span class="change-text">点击更换</span>
      </div>
      <div class="qrcode-container">
        <!-- 内联 SVG 二维码占位图 -->
        <div class="qrcode-svg" v-html="qrSvg" />
        <div class="qrcode-status">请使用游戏客户端扫码登录</div>
        <div class="qrcode-countdown">{{ qrCountdown > 0 ? `${Math.floor(qrCountdown / 60)}:${String(qrCountdown % 60).padStart(2, '0')} 后过期` : '二维码已过期' }}</div>
        <van-button size="small" plain type="primary" style="margin-top: 12px;" @click="onMockQrScan">
          模拟扫码成功
        </van-button>
      </div>
    </template>

    <!-- ===== captcha 验证弹窗（sms 发送验证码时触发） ===== -->
    <div v-if="captchaVisible" class="captcha-overlay" @click.self="() => {}">
      <div class="captcha-modal">
        <div class="captcha-modal-header">
          <span>请完成滑块验证</span>
          <van-button size="mini" @click="captchaVisible = false">取消</van-button>
        </div>
        <iframe
          class="captcha-iframe"
          :srcdoc="captchaHtml"
          @load="onCaptchaIframeLoad"
        />
        <div v-if="captchaVerifying" class="captcha-verifying">正在验证，请稍候...</div>
      </div>
    </div>

    <!-- ===== subAccounts 视图（选择小号） ===== -->
    <template v-else-if="view === 'subAccounts'">
      <div class="selected-channel" @click="view = 'channels'">
        <van-icon name="arrow-left" size="20" style="margin-right: 8px;" />
        <div class="channel-icon" style="width: 28px; height: 28px; border-radius: 6px; margin-right: 8px;" :style="{ background: selectedChannel.color }" v-html="selectedChannel.iconSvg" />
        <span class="channel-name-text">{{ selectedChannel.name }}</span>
        <span class="change-text">点击更换</span>
      </div>
      <div class="subaccounts-title">检测到该账号下存在多个小号，请选择要绑定的账号</div>
      <van-radio-group v-model="selectedSubAccount">
        <van-cell-group>
          <van-cell
            v-for="sa in subAccounts"
            :key="sa.id"
            :title="sa.name"
            :label="`服务器: ${sa.server}`"
            clickable
            @click="selectedSubAccount = sa.id"
          >
            <template #right-icon>
              <van-radio :name="sa.id" />
            </template>
          </van-cell>
        </van-cell-group>
      </van-radio-group>
      <div class="form-submit">
        <van-button type="primary" block :loading="submitting" loading-text="绑定中..." @click="onSubAccountSubmit">
          绑定小号
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
            <div class="info-row">
              <span class="info-label">账号：</span>
              <span class="info-value">{{ successData.accountName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">渠道：</span>
              <span class="info-value">{{ successData.channel }}</span>
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
import { ref, reactive, onBeforeUnmount, watch } from 'vue'
import { showToast } from 'vant'

const emit = defineEmits(['success', 'cancel'])

// ==================== 渠道 mock 数据 ====================
// 每个渠道带 bindType 字段：官服→password, B服→password, 应用宝→qr, OPPO→sms, VIVO→sms, 华为→sms
const channels = [
  { name: '官服', color: '#1989fa', bindType: 'password', iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#1989fa"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">官</text></svg>' },
  { name: '应用宝', color: '#07c160', bindType: 'qr', iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#07c160"/><text x="28" y="36" text-anchor="middle" font-size="24" fill="#fff">宝</text></svg>' },
  { name: 'OPPO', color: '#ff976a', bindType: 'sms', iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#ff976a"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">OP</text></svg>' },
  { name: 'VIVO', color: '#7232dd', bindType: 'sms', iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#7232dd"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">VI</text></svg>' },
  { name: '华为', color: '#07c160', bindType: 'sms', iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#07c160"/><text x="28" y="36" text-anchor="middle" font-size="22" fill="#fff">华</text></svg>' },
  { name: 'B服', color: '#ee0a24', bindType: 'password', iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#ee0a24"/><text x="28" y="36" text-anchor="middle" font-size="28" fill="#fff">B</text></svg>' },
]

// ==================== 状态机 ====================
const view = ref('channels') // 'channels' | 'password' | 'code' | 'sms' | 'qr' | 'subAccounts' | 'success'
const selectedChannel = ref(null)

// 表单数据
const passwordForm = reactive({ account: '', password: '' })
const codeForm = reactive({ identifier: '' })
const smsForm = reactive({ phone: '', code: '' })
const smsCountdown = ref(0)
let smsTimer = null

// captcha
const captchaVisible = ref(false)
const captchaVerifying = ref(false)

// qr
const qrCountdown = ref(300)
let qrTimer = null

// subAccounts
const subAccounts = ref([
  { id: 'sub1', name: '小号1', server: '官方一区' },
  { id: 'sub2', name: '小号2', server: '官方二区' },
  { id: 'sub3', name: '小号3', server: 'B服一区' },
])
const selectedSubAccount = ref('')

// success
const successData = reactive({ accountName: '', channel: '' })

const submitting = ref(false)

// ==================== 二维码 SVG ====================
const qrSvg = computedQrSvg()

function computedQrSvg() {
  // 生成一个简单的网格方块二维码占位图
  const size = 200
  const moduleCount = 21
  const modSize = Math.floor(size / moduleCount)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
  svg += `<rect width="${size}" height="${size}" fill="#fff" rx="8"/>`
  // 伪随机填充方块模拟二维码
  const seed = [1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0]
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      // 角落定位图案
      const isFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col > moduleCount - 8) ||
        (row > moduleCount - 8 && col < 7)
      if (isFinder) {
        const inner = row >= 1 && row <= 5 && col >= 1 && col <= 5
        if (!inner) {
          svg += `<rect x="${col * modSize}" y="${row * modSize}" width="${modSize}" height="${modSize}" fill="#000"/>`
        }
      } else {
        const idx = (row * seed[col % seed.length] + col * seed[row % seed.length]) % 4
        if (idx === 0) {
          svg += `<rect x="${col * modSize}" y="${row * modSize}" width="${modSize}" height="${modSize}" fill="#000"/>`
        }
      }
    }
  }
  svg += '</svg>'
  return svg
}

// ==================== captcha iframe HTML ====================
const captchaHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #f5f5f5;
  }
  .slider-container {
    width: 260px;
  }
  .slider-bar {
    position: relative;
    height: 40px;
    background: #e8e8e8;
    border-radius: 20px;
    overflow: hidden;
  }
  .slider-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #1989fa, #07c160);
    border-radius: 20px;
    transition: width 0.1s;
  }
  .slider-btn {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 36px;
    height: 36px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: left 0.1s;
    user-select: none;
    touch-action: none;
  }
  .slider-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #999;
    font-size: 13px;
    pointer-events: none;
  }
  .pass-btn {
    margin-top: 16px;
    text-align: center;
  }
  .pass-btn button {
    padding: 8px 24px;
    border: none;
    border-radius: 4px;
    background: #1989fa;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
  }
</style>
</head>
<body>
  <div class="slider-container">
    <div class="slider-bar" id="sliderBar">
      <div class="slider-fill" id="sliderFill"></div>
      <div class="slider-text" id="sliderText">请按住滑块拖动</div>
      <div class="slider-btn" id="sliderBtn">→</div>
    </div>
    <div class="pass-btn">
      <button onclick="postSuccess()">直接通过验证</button>
    </div>
  </div>
  <script>
    const btn = document.getElementById('sliderBtn')
    const fill = document.getElementById('sliderFill')
    const text = document.getElementById('sliderText')
    const bar = document.getElementById('sliderBar')
    let dragging = false, startX = 0, startLeft = 0
    const maxLeft = bar.offsetWidth - btn.offsetWidth - 4

    btn.addEventListener('mousedown', (e) => { dragging = true; startX = e.clientX; startLeft = btn.offsetLeft; e.preventDefault() })
    btn.addEventListener('touchstart', (e) => { dragging = true; startX = e.touches[0].clientX; startLeft = btn.offsetLeft })
    document.addEventListener('mousemove', (e) => { if (!dragging) return; moveSlider(e.clientX - startX + startLeft) })
    document.addEventListener('touchmove', (e) => { if (!dragging) return; moveSlider(e.touches[0].clientX - startX + startLeft) })
    document.addEventListener('mouseup', () => { if (dragging) endDrag() })
    document.addEventListener('touchend', () => { if (dragging) endDrag() })

    function moveSlider(left) {
      left = Math.max(2, Math.min(left, maxLeft))
      btn.style.left = left + 'px'
      fill.style.width = ((left + btn.offsetWidth / 2) / bar.offsetWidth * 100) + '%'
      if (left >= maxLeft - 2) { text.textContent = '验证通过'; setTimeout(postSuccess, 300); dragging = false }
    }
    function endDrag() {
      if (!dragging) return
      dragging = false
      if (parseInt(btn.style.left) < maxLeft - 10) { btn.style.left = '2px'; fill.style.width = '0%'; text.textContent = '请按住滑块拖动' }
    }
    function postSuccess() {
      window.parent.postMessage({ type: 'captcha', success: true }, '*')
    }
  <\/script>
</body>
</html>`

// ==================== 生命周期 ====================
onBeforeUnmount(() => {
  clearInterval(smsTimer)
  clearInterval(qrTimer)
})

// ==================== 视图切换 ====================
function onSelectChannel(ch) {
  selectedChannel.value = ch
  // 重置表单
  passwordForm.account = ''
  passwordForm.password = ''
  smsForm.phone = ''
  smsForm.code = ''
  codeForm.identifier = ''
  selectedSubAccount.value = ''
  view.value = ch.bindType
}

// ==================== password 视图逻辑 ====================
function onPasswordSubmit() {
  if (!passwordForm.account.trim()) {
    showToast('请输入游戏账号')
    return
  }
  if (!passwordForm.password.trim()) {
    showToast('请输入游戏密码')
    return
  }
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    if (selectedChannel.value?.name === 'OPPO') {
      view.value = 'subAccounts'
    } else {
      successData.accountName = passwordForm.account
      successData.channel = selectedChannel.value?.name || ''
      view.value = 'success'
    }
  }, 800)
}

// ==================== code 视图逻辑 ====================
function onCodeSubmit() {
  if (codeForm.identifier.length !== 16) {
    showToast('请输入16位标识码')
    return
  }
  if (!/^[A-Z0-9]{16}$/.test(codeForm.identifier)) {
    showToast('标识码格式不正确')
    return
  }
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    successData.accountName = codeForm.identifier
    successData.channel = '标识码绑定'
    view.value = 'success'
  }, 800)
}

// ==================== sms 视图逻辑 ====================
function onSendSmsCode() {
  if (!smsForm.phone.trim()) {
    showToast('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(smsForm.phone)) {
    showToast('手机号格式错误')
    return
  }
  // 弹出 captcha 验证
  captchaVisible.value = true
  captchaVerifying.value = false
}

function onCaptchaIframeLoad() {
  // iframe 加载完成，监听 postMessage
  window.addEventListener('message', handleCaptchaMessage)
}

function handleCaptchaMessage(e) {
  if (e.data?.type === 'captcha' && e.data?.success) {
    window.removeEventListener('message', handleCaptchaMessage)
    captchaVerifying.value = true
    setTimeout(() => {
      captchaVisible.value = false
      captchaVerifying.value = false
      showToast('验证通过，验证码已发送')
      startSmsCountdown()
    }, 600)
  }
}

function startSmsCountdown() {
  smsCountdown.value = 60
  clearInterval(smsTimer)
  smsTimer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) {
      clearInterval(smsTimer)
    }
  }, 1000)
}

function onSmsSubmit() {
  if (!smsForm.phone.trim()) {
    showToast('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(smsForm.phone)) {
    showToast('手机号格式错误')
    return
  }
  if (!smsForm.code.trim()) {
    showToast('请输入验证码')
    return
  }
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    if (selectedChannel.value?.name === 'OPPO') {
      view.value = 'subAccounts'
    } else {
      successData.accountName = smsForm.phone
      successData.channel = selectedChannel.value?.name || ''
      view.value = 'success'
    }
  }, 800)
}

// ==================== qr 视图逻辑 ====================
function onMockQrScan() {
  clearInterval(qrTimer)
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    successData.accountName = '扫码用户'
    successData.channel = selectedChannel.value?.name || ''
    view.value = 'success'
  }, 500)
}

// qr 视图进入时启动倒计时（watch view）——简化为视图打开即启动
// qr 视图进入时启动倒计时
watch(view, (val) => {
  if (val === 'qr') {
    qrCountdown.value = 300
    clearInterval(qrTimer)
    qrTimer = setInterval(() => {
      qrCountdown.value--
      if (qrCountdown.value <= 0) {
        clearInterval(qrTimer)
      }
    }, 1000)
  } else {
    clearInterval(qrTimer)
  }
})

// ==================== subAccounts 视图逻辑 ====================
function onSubAccountSubmit() {
  if (!selectedSubAccount.value) {
    showToast('请选择要绑定的小号')
    return
  }
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    const sa = subAccounts.value.find((s) => s.id === selectedSubAccount.value)
    successData.accountName = sa ? sa.name : ''
    successData.channel = selectedChannel.value?.name || ''
    view.value = 'success'
  }, 600)
}

// ==================== success 视图逻辑 ====================
function onFinish() {
  emit('success', {
    accountName: successData.accountName,
    channel: successData.channel,
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
}

.channel-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
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

/* ----- back-bar ----- */
.back-bar {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  color: #666;
  cursor: pointer;
  gap: 8px;
  font-size: 14px;
}

.back-bar:active {
  opacity: 0.7;
}

/* ----- qrcode-container ----- */
.qrcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;
}

.qrcode-svg :deep(svg) {
  display: block;
}

.qrcode-status {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}

.qrcode-countdown {
  margin-top: 8px;
  font-size: 13px;
  color: #999;
}

/* ----- captcha overlay ----- */
.captcha-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-modal {
  width: 300px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.captcha-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: #333;
}

.captcha-iframe {
  width: 100%;
  height: 160px;
  border: none;
  border-radius: 8px;
  background: #f5f5f5;
}

.captcha-verifying {
  text-align: center;
  margin-top: 12px;
  font-size: 13px;
  color: #999;
}

/* ----- subaccounts ----- */
.subaccounts-title {
  padding: 16px;
  font-size: 14px;
  color: #666;
  text-align: center;
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
