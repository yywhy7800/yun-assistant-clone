<template>
  <div class="admin-page">
    <van-nav-bar title="管理后台" left-arrow @click-left="goBack" />

    <van-tabs v-model:active="activeTab" color="#667eea">
      <!-- ==================== 用户管理 ==================== -->
      <van-tab title="用户管理">
        <div class="admin-body">
          <van-cell-group inset>
            <van-cell
              v-for="u in users"
              :key="u.id"
              :title="u.username"
              :label="`VIP${u.vip_level} · ${u.role} · 注册 ${u.created_at}`"
              is-link
              @click="openUserSun(u)"
            >
              <template #value>
                <span class="sun-badge">☀️ {{ u.sun_balance }}</span>
                <span class="script-badge">{{ u.script_count }} 脚本</span>
              </template>
            </van-cell>
          </van-cell-group>
          <van-empty v-if="!users.length" description="暂无用户" />
        </div>
      </van-tab>

      <!-- ==================== 脚本管理 ==================== -->
      <van-tab title="脚本管理">
        <div class="admin-body">
          <van-cell-group inset>
            <van-cell
              v-for="s in scripts"
              :key="s.id"
              :title="`${s.roleName}（${s.username}）`"
              :label="`${s.account} · ${s.server} · 到期 ${formatExpire(s.expire)}`"
            >
              <template #value>
                <van-tag :type="s.status === 'running' ? 'success' : 'default'">
                  {{ s.status === 'running' ? '运行中' : '已停止' }}
                </van-tag>
              </template>
              <template #extra>
                <van-button size="mini" type="danger" plain @click="stopScript(s)">停止</van-button>
                <van-button size="mini" plain @click="openExpire(s)">调到期</van-button>
              </template>
            </van-cell>
          </van-cell-group>
          <van-empty v-if="!scripts.length" description="暂无脚本" />
        </div>
      </van-tab>

      <!-- ==================== 卡密管理 ==================== -->
      <van-tab title="卡密管理">
        <div class="admin-body">
          <div class="card-gen">
            <van-field v-model="cardAmount" type="number" label="面额(☀️)" placeholder="每张卡密多少太阳" />
            <van-field v-model="cardCount" type="number" label="数量" placeholder="生成几张" />
            <van-button type="primary" block style="margin-top: 8px" @click="generateCards">
              生成卡密
            </van-button>
          </div>

          <div class="gen-result" v-if="genResult.length">
            <div class="gen-title">已生成 {{ genResult.length }} 张（面额 {{ cardAmount }}☀️）：</div>
            <div class="gen-codes">{{ genResult.join('　') }}</div>
          </div>

          <van-cell-group inset>
            <van-cell
              v-for="(c, i) in cards"
              :key="i"
              :title="c.code"
              :label="`面额 ${c.amount}☀️ · 生成 ${c.created_at}`"
            >
              <template #value>
                <van-tag :type="c.used ? 'default' : 'success'">
                  {{ c.used ? `已用(${c.used_by})` : '未使用' }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 调整小太阳 dialog -->
    <van-dialog
      v-model:show="sunDialogVisible"
      title="调整小太阳"
      show-cancel-button
      confirm-button-text="确认调整"
      @confirm="adjustSun"
    >
      <div class="dialog-tip">
        用户：{{ currentUser?.username }}（当前 ☀️ {{ currentUser?.sun_balance }}）
      </div>
      <div style="padding: 0 16px 12px;">
        <van-field v-model="sunAmount" type="number" label="调整值" placeholder="正数加、负数减" />
      </div>
    </van-dialog>

    <!-- 调整到期 dialog -->
    <van-dialog
      v-model:show="expireDialogVisible"
      title="调整到期"
      show-cancel-button
      confirm-button-text="确认"
      @confirm="adjustExpire"
    >
      <div class="dialog-tip">脚本：{{ currentScript?.roleName }}</div>
      <div style="padding: 0 16px 12px;">
        <van-field v-model="expireValue" label="到期时间" placeholder="YYYY-MM-DD HH:MM:SS" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import {
  getAdminUsersAPI, adjustUserSunAPI,
  getAdminScriptsAPI, adminStopScriptAPI, adminSetExpireAPI,
  generateCardsAPI, getCardsAPI,
} from '../api/mock'

const router = useRouter()
const activeTab = ref(0)

const users = ref([])
const scripts = ref([])
const cards = ref([])

// 用户管理
const sunDialogVisible = ref(false)
const currentUser = ref(null)
const sunAmount = ref(0)

// 脚本管理
const expireDialogVisible = ref(false)
const currentScript = ref(null)
const expireValue = ref('')

// 卡密管理
const cardAmount = ref(100)
const cardCount = ref(5)
const genResult = ref([])

async function loadUsers() {
  try { users.value = await getAdminUsersAPI() } catch (e) { showFailToast(e.message || '加载失败') }
}
async function loadScripts() {
  try { scripts.value = await getAdminScriptsAPI() } catch (e) { showFailToast(e.message || '加载失败') }
}
async function loadCards() {
  try { cards.value = await getCardsAPI() } catch (e) { showFailToast(e.message || '加载失败') }
}

function openUserSun(u) {
  currentUser.value = u
  sunAmount.value = 0
  sunDialogVisible.value = true
}
async function adjustSun() {
  const amount = Number(sunAmount.value)
  if (!amount) { showFailToast('请输入调整值'); return }
  try {
    const res = await adjustUserSunAPI(currentUser.value.id, amount)
    showSuccessToast(res.message || '已调整')
    await loadUsers()
  } catch (e) { showFailToast(e.message || '调整失败') }
}

function stopScript(s) {
  showConfirmDialog({ title: '停止脚本', message: `确定停止「${s.roleName}」吗？` })
    .then(async () => {
      try { await adminStopScriptAPI(s.id); showSuccessToast('已停止'); await loadScripts() }
      catch (e) { showFailToast(e.message || '操作失败') }
    })
    .catch(() => {})
}
function openExpire(s) {
  currentScript.value = s
  expireValue.value = s.expire || ''
  expireDialogVisible.value = true
}
async function adjustExpire() {
  if (!expireValue.value.trim()) { showFailToast('请输入到期时间'); return }
  try {
    await adminSetExpireAPI(currentScript.value.id, expireValue.value.trim())
    showSuccessToast('到期已更新')
    await loadScripts()
  } catch (e) { showFailToast(e.message || '更新失败') }
}

async function generateCards() {
  const amount = Number(cardAmount.value)
  const count = Number(cardCount.value)
  if (!amount || amount <= 0) { showFailToast('请输入有效面额'); return }
  if (!count || count <= 0) { showFailToast('请输入有效数量'); return }
  try {
    const data = await generateCardsAPI(amount, count)
    genResult.value = data.codes || []
    showSuccessToast(data.message || '生成成功')
    await loadCards()
  } catch (e) { showFailToast(e.message || '生成失败') }
}

function formatExpire(expire) { return expire ? expire : '未开通' }
function goBack() { router.push({ name: 'Home' }) }

onMounted(() => { loadUsers(); loadScripts(); loadCards() })
</script>

<style scoped>
.admin-page { min-height: 100vh; background: #f7f8fa; }
.admin-body { padding: 12px 0; }
.sun-badge { color: #f5a623; font-weight: 600; margin-right: 8px; }
.script-badge { color: #667eea; font-size: 12px; }
.card-gen { background: #fff; padding: 12px; margin: 12px 12px 8px; border-radius: 10px; }
.gen-result { background: #fff; padding: 12px; margin: 8px 12px; border-radius: 10px; }
.gen-title { font-size: 13px; color: #666; margin-bottom: 6px; }
.gen-codes { font-size: 12px; color: #333; word-break: break-all; line-height: 1.8; }
.dialog-tip { font-size: 13px; color: #666; padding: 12px 16px 4px; }
</style>
