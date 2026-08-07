<template>
  <router-view />
</template>

<script setup>
// 根组件，只负责渲染路由视图
</script>

<style>
/* 全局基础样式 */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: #f5f5f5;
  color: #333;
}

/* 安全区底部适配 */
.safe-area-bottom {
  padding-bottom: var(--safe-area-inset-bottom);
}

/* Vant 组件微调 - 圆角输入框 */
.van-field {
  border-radius: 8px;
}

/* 全局按钮主色覆盖 */
:root {
  --van-button-primary-background: #667eea;
  --van-button-primary-border-color: #667eea;
}
</style>
