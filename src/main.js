import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 全量引入 Vant 组件库及其样式
import Vant from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)
app.use(router)
app.use(Vant)
app.mount('#app')
