<template>
  <!-- 注册页 -->
  <div class="register-page">
    <van-nav-bar
      title="注册"
      left-arrow
      @click-left="goBack"
      fixed
      placeholder
    />

    <div class="register-form">
      <van-field
        v-model="phone"
        label="手机号"
        placeholder="请输入手机号"
        type="tel"
        maxlength="11"
        left-icon="phone-o"
        :rules="[{ required: true, message: '请输入手机号' }]"
      />
      <van-field
        v-model="username"
        label="账号"
        placeholder="请输入账号"
        left-icon="user-o"
        :rules="[{ required: true, message: '请输入账号' }]"
      />
      <van-field
        v-model="password"
        :type="pwdVisible ? 'text' : 'password'"
        label="密码"
        placeholder="请输入密码（6-20位）"
        left-icon="lock"
        :rules="[{ required: true, message: '请输入密码' }]"
      >
        <template #right-icon>
          <van-icon
            :name="pwdVisible ? 'eye-o' : 'closed-eye'"
            @click="pwdVisible = !pwdVisible"
            style="cursor: pointer; color: #999"
          />
        </template>
      </van-field>
      <van-field
        v-model="confirmPwd"
        :type="cpwdVisible ? 'text' : 'password'"
        label="确认密码"
        placeholder="请再次输入密码"
        left-icon="lock"
        :rules="[{ required: true, message: '请确认密码' }]"
      >
        <template #right-icon>
          <van-icon
            :name="cpwdVisible ? 'eye-o' : 'closed-eye'"
            @click="cpwdVisible = !cpwdVisible"
            style="cursor: pointer; color: #999"
          />
        </template>
      </van-field>

      <div class="register-btn">
        <van-button
          type="primary"
          round
          block
          :loading="loading"
          loading-text="注册中..."
          @click="handleRegister"
        >
          注册
        </van-button>
      </div>

      <div class="login-link">
        已有账号？
        <span class="link" @click="goBack">去登录</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { registerAPI } from '../api/mock.js'

const router = useRouter()

const phone = ref('')
const username = ref('')
const password = ref('')
const confirmPwd = ref('')
const pwdVisible = ref(false)
const cpwdVisible = ref(false)
const loading = ref(false)

// 返回登录页
function goBack() {
  router.back()
}

// 注册处理
async function handleRegister() {
  if (!phone.value.trim()) {
    showToast('请输入手机号')
    return
  }
  if (phone.value.length < 11) {
    showToast('请输入正确的手机号')
    return
  }
  if (!username.value.trim()) {
    showToast('请输入账号')
    return
  }
  if (!password.value) {
    showToast('请输入密码')
    return
  }
  if (password.value.length < 6) {
    showToast('密码至少6位')
    return
  }
  if (password.value !== confirmPwd.value) {
    showToast('两次密码输入不一致')
    return
  }

  loading.value = true
  try {
    const res = await registerAPI(username.value, password.value)
    if (res.success) {
      showToast({
        message: '注册成功',
        icon: 'success',
        duration: 1500,
      })
      setTimeout(() => {
        router.replace({ name: 'Login' })
      }, 800)
    } else {
      showToast(res.message || '注册失败')
    }
  } catch (e) {
    showToast('网络错误，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.register-form {
  padding: 20px 16px;
}

.register-btn {
  padding: 20px 0;
}

.register-btn .van-button {
  height: 44px;
  font-size: 16px;
}

.login-link {
  text-align: center;
  font-size: 14px;
  color: #999;
}

.login-link .link {
  color: #667eea;
  cursor: pointer;
  font-weight: 500;
}

.login-link .link:active {
  opacity: 0.7;
}
</style>
