import { createRouter, createWebHashHistory } from 'vue-router'

import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Home from '../views/Home.vue'

// 路由配置 - hash 模式，路径带 #/
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '云助手' },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { title: '注册' },
  },
  // 未匹配路由重定向到登录
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 简单路由守卫：未登录则跳登录页
router.beforeEach((to, from, next) => {
  const isLoggedIn = sessionStorage.getItem('yun_is_logged_in')
  if (to.name !== 'Login' && to.name !== 'Register' && !isLoggedIn) {
    next({ name: 'Login' })
  } else if ((to.name === 'Login' || to.name === 'Register') && isLoggedIn) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
