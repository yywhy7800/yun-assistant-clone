<template>
  <!-- 登录页 - 紫色渐变全屏背景 -->
  <div class="login-page">
    <div class="login-container">
      <!-- 头部标题区 -->
      <div class="login-header">
        <h1>云助手</h1>
        <p>欢迎使用</p>
      </div>

      <!-- 登录表单卡片 -->
      <div class="login-form">
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
          placeholder="请输入密码"
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

        <div class="login-btn">
          <van-button
            type="primary"
            round
            block
            :loading="loading"
            loading-text="登录中..."
            @click="handleLogin"
          >
            登录
          </van-button>
        </div>
      </div>

      <!-- 底部链接 -->
      <div class="register-link">
        <span class="link-text" @click="goRegister">还没有账号？立即注册</span>
        <span class="divider">|</span>
        <span class="link-text" @click="handleForgot">忘记密码</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { loginAPI } from '../api/mock.js'

const router = useRouter()

const username = ref('')
const password = ref('')
const pwdVisible = ref(false)
const loading = ref(false)

// 登录处理
async function handleLogin() {
  // 前端非空校验
  if (!username.value.trim()) {
    showToast('请输入账号')
    return
  }
  if (!password.value.trim()) {
    showToast('请输入密码')
    return
  }

  loading.value = true
  try {
    const res = await loginAPI(username.value, password.value)
    if (res.success) {
      sessionStorage.setItem('yun_is_logged_in', 'true')
      sessionStorage.setItem('yun_username', username.value)
      showToast({
        message: '登录成功',
        icon: 'success',
        duration: 1000,
      })
      setTimeout(() => {
        router.replace({ name: 'Home' })
      }, 300)
    } else {
      showToast(res.message || '登录失败')
    }
  } catch (e) {
    // 透传后端真实错误（如"账号或密码错误"），网络异常时兜底
    showToast(e.message || '网络错误，请重试')
  } finally {
    loading.value = false
  }
}

// 跳转注册页
function goRegister() {
  router.push({ name: 'Register' })
}

// 忘记密码（简单 toast 提示）
function handleForgot() {
  showToast('请联系客服重置密码')
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

/* 头部标题 */
.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}

.login-header p {
  font-size: 14px;
  opacity: 0.8;
  margin: 0;
}

/* 表单卡片 */
.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 24px 0;
  overflow: hidden;
}

.login-btn {
  padding: 20px 16px 0;
}

.login-btn .van-button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  height: 44px;
  font-size: 16px;
}

/* 底部链接 */
.register-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #ccc;
}

.register-link .link-text {
  cursor: pointer;
  color: #eee;
  text-decoration: none;
}

.register-link .link-text:active {
  opacity: 0.7;
}

.register-link .divider {
  margin: 0 10px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
