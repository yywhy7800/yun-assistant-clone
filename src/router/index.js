import { createRouter, createWebHashHistory } from 'vue-router'

import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Home from '../views/Home.vue'
import Admin from '../views/Admin.vue'

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
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { title: '管理后台', requiresAdmin: true },
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

// 路由守卫：未登录跳登录页；管理后台需管理员角色
router.beforeEach((to, from, next) => {
  const isLoggedIn = sessionStorage.getItem('yun_is_logged_in')
  if (to.name !== 'Login' && to.name !== 'Register' && !isLoggedIn) {
    next({ name: 'Login' })
  } else if ((to.name === 'Login' || to.name === 'Register') && isLoggedIn) {
    next({ name: 'Home' })
  } else if (to.meta.requiresAdmin) {
    // 管理后台：从 localStorage 读角色，非 admin 拒绝
    let user = {}
    try { user = JSON.parse(localStorage.getItem('yun_user') || '{}') } catch (e) {}
    if (user.role !== 'admin') {
      next({ name: 'Home' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
