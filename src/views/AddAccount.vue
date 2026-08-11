<template>
  <!-- 添加/同步账号页 -->
  <div class="add-account-page">
    <van-nav-bar
      title="添加/同步账号"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />
    <AddAccountForm @success="handleSuccess" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import AddAccountForm from '../components/AddAccountForm.vue'

const router = useRouter()

function handleSuccess() {
  showSuccessToast('绑定成功')
  setTimeout(() => {
    router.replace('/')
  }, 500)
}
</script>

<style scoped>
.add-account-page {
  min-height: 100vh;
  background: #fff;
}
</style>
