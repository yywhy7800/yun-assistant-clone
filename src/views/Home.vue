<template>
  <!-- 首页 - 脚本列表 -->
  <div class="home-page">
    <!-- 顶部公告栏（后端公告，无公告时显示默认欢迎语） -->
    <div class="scroll-notice-wrapper">
      <van-notice-bar
        left-icon="volume-o"
        color="#ed6a0c"
        background="#fff7e6"
        :scrollable="true"
        :delay="1"
        :speed="50"
      >
        {{ noticeText }}
      </van-notice-bar>
    </div>

    <!-- 头部用户信息区 -->
    <div class="header">
      <div class="user-info">
        <!-- 头像 -->
        <div class="avatar" @click="openPersonalCenter">
          <van-icon name="friends-o" size="28" color="#fff" />
        </div>

        <!-- 用户名和标签 -->
        <div class="info">
          <div class="user-line">
            <span class="username" @click="openPersonalCenter">{{ username }}</span>
            <span class="vip-badge" :class="`vip-${vipLevel}`">{{ vipLevel > 0 ? `👑 VIP${vipLevel}` : '👤 普通用户' }}</span>
            <span class="tutorial-btn" @click="handleTutorial">📖 教程</span>
          </div>
        </div>

        <!-- 小太阳余额 -->
        <div class="sun" @click="handleSunClick">
          <span class="sun-icon">☀️</span>
          <span class="sun-count">{{ sunBalance }}</span>
        </div>
      </div>
    </div>

    <!-- 脚本卡片列表 -->
    <div class="content">
      <div
        v-for="script in scripts"
        :key="script.id"
        class="script-card"
      >
        <!-- 卡片头部：渠道图标 + 角色信息 + 状态标签 -->
        <div class="card-header">
          <div class="header-left">
            <div class="channel-icon" :style="{ background: getChannelColor(script.channel) }">
              {{ getChannelEmoji(script.channel) }}
            </div>
            <div class="role-info">
              <div class="role-name">{{ script.roleName }}</div>
              <div class="server">{{ script.server }}</div>
            </div>
          </div>
          <van-tag
            :type="script.status === 'running' ? 'success' : 'danger'"
            size="medium"
          >
            {{ script.status === 'running' ? '运行中' : '已停止' }}
          </van-tag>
        </div>

        <!-- 卡片内容：详细信息 -->
        <div class="card-body">
          <div class="info-item">
            <span class="info-label">角色：</span>
            <span class="info-value">{{ script.roleName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">账号：</span>
            <span class="info-value">{{ script.account }}</span>
            <span class="role-stats" v-if="scriptStats[script.id] && scriptStats[script.id].running">
              剩余{{ scriptStats[script.id].ad_left }}次 蓝{{ scriptStats[script.id].claimed_q3 }} 紫{{ scriptStats[script.id].claimed_q4 }} 金{{ scriptStats[script.id].claimed_q5 }} 💎{{ scriptStats[script.id].rp_diamond }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">到期：</span>
            <span class="info-value expire-value">{{ script.expire }}</span>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="script-operations">
          <div class="operation-buttons">
            <van-button
              size="small"
              :type="script.status === 'running' ? 'warning' : 'success'"
              plain
              @click="handleToggleScript(script)"
            >
              {{ script.status === 'running' ? '停止' : '启动' }}
            </van-button>
            <van-button size="small" plain @click="openConfigPanel(script)">
              配置
            </van-button>
            <van-button size="small" plain @click="openLogPanel(script)">
              日志
            </van-button>
            <van-button size="small" plain @click="openStatusPanel(script)">
              状态
            </van-button>
          </div>
          <van-icon
            name="ellipsis"
            size="20"
            color="#999"
            @click="showActionSheet(script)"
            style="cursor: pointer; padding: 4px"
          />
        </div>
      </div>

      <!-- 空状态提示 -->
      <van-empty v-if="scripts.length === 0" description="暂无脚本，快去添加吧" />
    </div>

    <!-- 底部固定添加按钮 -->
    <div class="add-btn">
      <van-button type="primary" size="large" round block @click="openAddScript">
        + 添加脚本
      </van-button>
    </div>

    <!-- 操作菜单 -->
    <van-action-sheet
      v-model:show="actionSheetVisible"
      :actions="actionSheetActions"
      cancel-text="取消"
      @select="onActionSelect"
    />

    <!-- 教程弹窗 -->
    <van-popup
      v-model:show="tutorialVisible"
      round
      position="bottom"
      :style="{ height: '60%' }"
    >
      <div class="tutorial-content">
        <h3>📖 使用教程</h3>
        <div class="tutorial-steps">
          <div class="step">
            <span class="step-num">1</span>
            <span>点击底部「添加脚本」按钮</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>选择你的游戏渠道（如安卓、iOS）</span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>填写游戏账号信息并确认添加</span>
          </div>
          <div class="step">
            <span class="step-num">4</span>
            <span>绑定和配置已完成，脚本引擎暂未开放</span>
          </div>
          <div class="step">
            <span class="step-num">5</span>
            <span>到期前请及时续期，避免脚本中断</span>
          </div>
        </div>
        <div class="tutorial-tip">
          💡 小太阳可用于兑换脚本运行时长
        </div>
      </div>
    </van-popup>

    <!-- ==================== 配置面板（iframe 加载原站 config.html） ==================== -->
    <van-popup
      v-model:show="configPanelVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="true"
    >
      <div class="panel-container" v-if="panelScript">
        <!-- 顶部导航栏 -->
        <van-nav-bar
          :title="panelScript.roleName + ' (' + panelScript.server + ')'"
          left-arrow
          @click-left="configPanelVisible = false"
        >
          <template #right>
            <span class="nav-btn" @click="handleImportConfig">导入</span>
            <span class="nav-btn nav-btn-primary" @click="handleSaveConfig">保存</span>
          </template>
        </van-nav-bar>

        <!-- iframe 正文 -->
        <iframe
          ref="configIframeRef"
          class="panel-iframe"
          :src="configIframeSrc"
          @load="onConfigIframeLoad"
        />
      </div>
    </van-popup>

    <!-- ==================== 日志面板（原生渲染，保持不变） ==================== -->
    <van-popup
      v-model:show="logPanelVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="true"
    >
      <div class="panel-container" v-if="panelScript">
        <!-- 顶部导航栏 -->
        <van-nav-bar
          :title="panelScript.roleName"
          left-arrow
          @click-left="logPanelVisible = false"
        >
          <template #right>
            <van-icon name="replay" size="20" @click="refreshLogs" />
          </template>
        </van-nav-bar>

        <!-- 内容区 -->
        <div class="panel-body">
          <!-- 日期筛选条 -->
          <div class="date-filter">
            <button
              v-for="item in dateFilterOptions"
              :key="item.key"
              :class="['date-filter-btn', { active: logDateFilter === item.key }]"
              @click="onLogDateChange(item.key)"
            >
              {{ item.label }}
            </button>
          </div>

          <!-- 搜索框 -->
          <div class="log-search">
            <van-field
              v-model="logSearchText"
              left-icon="search"
              placeholder="搜索日志"
              clearable
              @update:model-value="onLogSearch"
            />
          </div>

          <!-- 日志列表 -->
          <div class="log-list">
            <div
              v-for="(log, idx) in filteredLogs"
              :key="idx"
              class="log-item"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-text">{{ log.text }}</span>
            </div>
            <van-empty v-if="filteredLogs.length === 0" description="暂无匹配日志" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 状态面板（iframe 加载原站 status.html） ==================== -->
    <van-popup
      v-model:show="statusPanelVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="true"
    >
      <div class="panel-container" v-if="panelScript">
        <!-- 顶部导航栏 -->
        <van-nav-bar
          :title="panelScript.roleName + ' (' + panelScript.server + ')'"
          left-arrow
          @click-left="statusPanelVisible = false"
        >
          <template #right>
            <van-icon name="replay" size="20" @click="refreshStatus" />
          </template>
        </van-nav-bar>

        <!-- iframe 正文 -->
        <iframe
          ref="statusIframeRef"
          class="panel-iframe"
          :src="statusIframeSrc"
          @load="onStatusIframeLoad"
        />
      </div>
    </van-popup>

    <!-- ==================== 个人中心弹出层 ==================== -->
    <van-popup
      v-model:show="personalCenterVisible"
      position="bottom"
      :style="{ width: '100%', maxHeight: '92vh' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <van-nav-bar title="个人中心" left-arrow @click-left="personalCenterVisible = false" />
        <div class="panel-body">
          <van-cell-group>
            <van-cell icon="gift-card-o" is-link @click="openExchangeCode">
              <template #title>
                游戏兑换码 <span style="color: #e53935; font-size: 12px;">（游戏中的兑换码）</span>
              </template>
            </van-cell>
            <van-cell icon="user-circle-o" title="游戏账号管理" is-link @click="openAccountManage" />
            <van-cell icon="gold-coin-o" title="太阳充值" is-link @click="openSunRecharge" />
            <van-cell icon="send-gift-o" title="阳光传递" is-link @click="openSunTransfer" />
            <van-cell icon="records" title="太阳流水" is-link @click="openSunTransactions" />
            <van-cell icon="share-o" title="推广中心" is-link @click="openPromotionCenter" />
            <van-cell icon="notes-o" title="更新记录" is-link @click="openUpdateLog" />
            <van-cell icon="service-o" title="联系客服" is-link @click="openContactService" />
            <van-cell icon="lock" title="修改密码" is-link @click="openChangePassword" />
            <van-cell icon="warning-o" title="退出登录" @click="handleLogout" />
          </van-cell-group>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 游戏兑换码 popup ==================== -->
    <van-popup
      v-model:show="exchangeCodeVisible"
      position="bottom"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <van-nav-bar title="游戏兑换码" left-arrow @click-left="exchangeCodeVisible = false" />
        <div class="panel-body" style="padding: 16px;">
          <van-field v-model="exchangeCode" label="兑换码" placeholder="请输入兑换码" clearable />
          <div style="padding: 16px;">
            <van-button type="primary" size="large" round block @click="handleExchangeCode">兑换</van-button>
          </div>
          <div class="panel-tip">兑换卡密获取太阳</div>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 游戏账号管理 popup（多视图切换） ==================== -->
    <van-popup
      v-model:show="accountManageVisible"
      position="bottom"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <!-- accounts 视图 -->
        <template v-if="accountManageView === 'accounts'">
          <van-nav-bar title="游戏账号管理" left-arrow @click-left="accountManageVisible = false" />
          <div class="panel-body">
            <div
              v-for="acct in managedAccounts"
              :key="acct.id"
              class="account-card"
              @click="openRoles()"
            >
              <div class="account-card-top">
                <div class="account-card-header">
                  <span class="account-name">{{ acct.name }}</span>
                  <div class="account-tags">
                    <van-tag type="primary" size="small">{{ acct.channel }}</van-tag>
                    <van-tag :type="acct.status === 'running' ? 'success' : 'default'" plain size="small">{{ acct.status === 'running' ? '运行中' : '已停止' }}</van-tag>
                  </div>
                </div>
                <div class="account-card-info">
                  <div class="account-detail">账号名称: {{ acct.accountName }}</div>
                  <div class="account-time">服务器: {{ acct.server }} | 到期: {{ acct.expire }}</div>
                </div>
              </div>
              <div class="account-card-actions">
                <van-button type="danger" plain size="small" @click.stop="handleDeleteAccount(acct)">删除</van-button>
                <van-icon name="arrow" color="#999" />
              </div>
            </div>
            <van-empty v-if="managedAccounts.length === 0" description="暂无游戏账号" />
            <div style="padding: 16px;">
              <van-button type="primary" size="large" round block @click="accountManageView = 'addAccount'">+ 添加/同步账号</van-button>
            </div>
          </div>
        </template>

        <!-- addAccount 视图（真实绑定，无假提交表单） -->
        <template v-else-if="accountManageView === 'addAccount'">
          <van-nav-bar title="添加/同步账号" left-arrow @click-left="accountManageView = 'accounts'" />
          <div class="panel-body">
            <AddAccountForm v-if="accountManageView === 'addAccount'" @success="onAddAccountSuccess" />
          </div>
        </template>

        <!-- roles 视图（后端 bind 不返回角色，role_name 为空待获取，仅占位说明） -->
        <template v-else-if="accountManageView === 'roles'">
          <van-nav-bar title="角色管理" left-arrow @click-left="accountManageView = 'accounts'" />
          <div class="panel-body">
            <van-empty description="绑定后自动获取角色信息，当前暂无" />
          </div>
        </template>
      </div>
    </van-popup>

    <!-- ==================== 太阳充值 popup（改为卡密兑换，复用小太阳弹窗） ==================== -->
    <van-popup
      v-model:show="sunRechargeVisible"
      position="bottom"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <van-nav-bar title="太阳充值" left-arrow @click-left="sunRechargeVisible = false" />
        <div class="panel-body" style="padding: 16px;">
          <div class="sun-balance-display">
            <span>当前太阳：</span>
            <span class="sun-balance-value">☀️ {{ sunBalance }}</span>
          </div>
          <van-field
            v-model="sunRedeemCode"
            label="卡密"
            placeholder="请输入卡密兑换小太阳"
            clearable
            :disabled="redeeming"
          />
          <div style="margin-top: 16px;">
            <van-button type="primary" block :loading="redeeming" @click="handleSunRechargeRedeem">
              兑换
            </van-button>
          </div>
          <div class="panel-tip">使用卡密兑换太阳，兑换后立即到账，可用于脚本续期</div>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 太阳流水 popup ==================== -->
    <van-popup
      v-model:show="sunTransactionsVisible"
      position="bottom"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <van-nav-bar title="太阳流水" left-arrow @click-left="sunTransactionsVisible = false" />
        <div class="panel-body">
          <van-cell
            v-for="(item, idx) in sunTransactions"
            :key="idx"
            :title="item.type"
            :label="item.time"
          >
            <template #value>
              <span :style="{ color: item.amount > 0 ? '#00c853' : '#ee0a24' }">
                {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
              </span>
            </template>
          </van-cell>
          <van-empty v-if="sunTransactions.length === 0" description="暂无流水记录" />
        </div>
      </div>
    </van-popup>

    <!-- ==================== 推广中心 popup ==================== -->
    <van-popup
      v-model:show="promotionCenterVisible"
      position="bottom"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <van-nav-bar title="推广中心" left-arrow @click-left="promotionCenterVisible = false" />
        <div class="panel-body" style="padding: 16px;">
          <van-tag v-if="promoEnabled" type="success">推广进行中</van-tag>
          <van-tag v-else type="danger">推广暂停</van-tag>
          <div class="promo-link-box">
            <div class="promo-label">推广码</div>
            <div class="promo-link">{{ myInviteCode || '未生成' }}</div>
            <van-button size="small" type="primary" :disabled="!myInviteCode" @click="handleCopyInviteCode">复制</van-button>
          </div>
          <div class="promo-tip">注册时填写您的推广码，好友每累计兑换 30 ☀️，您获得 1 ☀️ 奖励（可多次获得）</div>
          <div class="promo-stats">
            <div class="promo-stat-item">
              <div class="promo-stat-num">{{ promotionStats.userCount }}</div>
              <div class="promo-stat-label">推广人数</div>
            </div>
            <div class="promo-stat-item">
              <div class="promo-stat-num">{{ promotionStats.totalReward }}</div>
              <div class="promo-stat-label">累计奖励</div>
            </div>
          </div>
          <div class="promo-section">
            <h4>奖励记录</h4>
            <van-cell
              v-for="(reward, idx) in promotionRewards"
              :key="idx"
              :title="reward.desc"
              :label="reward.time"
              :value="'+' + reward.amount + ' ☀️'"
            />
            <van-empty v-if="promotionRewards.length === 0" description="暂无奖励记录" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- ==================== 更新记录 popup ==================== -->
    <van-popup
      v-model:show="updateLogVisible"
      position="bottom"
      :style="{ width: '100%', height: '100%' }"
      :close-on-popstate="false"
      :round="false"
    >
      <div class="panel-container">
        <van-nav-bar title="更新记录" left-arrow @click-left="updateLogVisible = false" />
        <div class="panel-body" style="padding: 16px;">
          <div v-for="(log, idx) in updateLogs" :key="idx" class="update-log-item">
            <div class="update-log-version">{{ log.version }}</div>
            <div class="update-log-time">更新时间: {{ log.time }}</div>
            <div class="update-log-content">{{ log.content }}</div>
          </div>
          <van-empty v-if="updateLogs.length === 0" description="暂无更新记录" />
        </div>
      </div>
    </van-popup>

    <!-- ==================== 阳光传递 dialog ==================== -->
    <van-dialog
      v-model:show="sunTransferVisible"
      title="☀️ 阳光传递"
      show-cancel-button
      confirm-button-text="确认传递"
      @confirm="handleSunTransferConfirm"
    >
      <div style="padding: 12px 16px;">
        <div style="margin-bottom: 8px;">
          我的账号：<strong>{{ username }}</strong>
        </div>
        <van-field v-model="sunTransferForm.targetUsername" label="对方账号" placeholder="请输入对方账号（3-32 位字母、数字或下划线）" />
        <van-field label="赠送数量">
          <template #input>
            <van-stepper v-model="sunTransferForm.amount" :min="1" :max="10000" integer />
          </template>
        </van-field>
        <div v-if="sunTransferForm.amount > 0" class="transfer-fee-detail">
          <div>赠送数量：{{ sunTransferForm.amount }} 太阳</div>
          <div>手续费（10%）：{{ calcFee(sunTransferForm.amount) }} 太阳</div>
          <div style="font-weight: bold; color: #e53935;">
            实际扣除：{{ sunTransferForm.amount + calcFee(sunTransferForm.amount) }} 太阳
          </div>
        </div>
      </div>
    </van-dialog>

    <!-- ==================== 联系客服 dialog ==================== -->
    <van-dialog
      v-model:show="contactServiceVisible"
      title="联系客服"
      :show-confirm-button="false"
      closeable
      :style="{ width: '90%' }"
    >
      <div style="padding: 8px 0;">
        <van-cell title="客服名称" value="官方客服" />
        <van-cell title="QQ号" value="1234567890" />
        <div style="padding: 12px 16px; text-align: center;">
          <van-button size="small" type="primary" @click="handleSendMessage">发消息</van-button>
        </div>
      </div>
    </van-dialog>

    <!-- ==================== 修改密码 dialog ==================== -->
    <van-dialog
      v-model:show="changePasswordVisible"
      title="修改密码"
      show-cancel-button
      @confirm="handleChangePasswordConfirm"
    >
      <div style="padding: 12px 16px;">
        <van-field v-model="passwordForm.oldPassword" type="password" label="旧密码" placeholder="请输入旧密码" />
        <van-field v-model="passwordForm.newPassword" type="password" label="新密码" placeholder="请输入新密码" />
      </div>
    </van-dialog>

    <!-- ==================== 小太阳余额 + 卡密兑换 dialog ==================== -->
    <van-dialog
      v-model:show="sunRedeemVisible"
      title="☀️ 小太阳余额"
      show-cancel-button
      confirm-button-text="兑换"
      :before-close="handleSunRedeemBeforeClose"
    >
      <div style="padding: 12px 16px;">
        <div class="sun-redeem-balance">
          当前余额：<span class="sun-redeem-value">☀️ {{ sunBalance }}</span>
        </div>
        <van-field
          v-model="sunRedeemCode"
          label="卡密"
          placeholder="请输入卡密兑换小太阳"
          clearable
          :disabled="redeeming"
        />
        <div class="sun-redeem-tip">小太阳可用于兑换脚本运行时长、解锁高级功能、参与平台活动</div>
      </div>
    </van-dialog>

    <!-- ==================== 续期 dialog（按天续费，1 天 1 太阳） ==================== -->
    <van-dialog
      v-model:show="renewVisible"
      title="续期脚本"
      show-cancel-button
      confirm-button-text="确认续期"
      @confirm="handleRenewConfirm"
    >
      <div style="padding: 12px 16px;">
        <van-field
          v-model="renewDays"
          type="number"
          label="续期天数"
          placeholder="请输入续期天数"
        />
        <div class="renew-cost-tip">
          1 天消耗 1 ☀️，本次消耗 {{ renewCost }} ☀️（当前余额 {{ sunBalance }} ☀️）
        </div>
      </div>
    </van-dialog>

    <!-- ==================== 添加脚本 popup（三步流程：账号列表 → 选择角色 → 确认创建） ==================== -->
    <van-popup
      v-model:show="addScriptVisible"
      position="bottom"
      :style="{ height: '85%' }"
      round
      :close-on-click-overlay="false"
    >
      <div class="panel-container">
        <van-nav-bar
          :title="addScriptView === 'addAccount' ? '添加游戏账号' : '添加脚本'"
          :left-arrow="addScriptView === 'addAccount'"
          @click-left="addScriptView === 'addAccount' ? (addScriptView = 'accounts') : (addScriptVisible = false)"
        >
          <template v-if="addScriptView !== 'addAccount'" #right>
            <van-icon name="cross" size="18" @click="addScriptVisible = false" />
          </template>
        </van-nav-bar>
        <div class="panel-body">
          <!-- 步骤条（非 addAccount 视图显示） -->
          <van-steps v-if="addScriptView !== 'addAccount'" :active="addScriptStep" active-icon="success" active-color="#07c160" class="steps-bar">
            <van-step>选择账号</van-step>
            <van-step>选择角色</van-step>
            <van-step>确认创建</van-step>
          </van-steps>

          <!-- step0 账号列表 -->
          <template v-if="addScriptView === 'accounts'">
            <van-cell-group v-if="accountOptions.length">
              <van-cell
                v-for="acc in accountOptions"
                :key="acc.accountName"
                :title="acc.accountName"
                :label="`${acc.roleCount} 个角色 · ${acc.channels}`"
                is-link
                @click="selectAccount(acc)"
              />
            </van-cell-group>
            <van-empty v-else description="暂无已添加账号" />
            <div class="add-new" @click="addScriptView = 'addAccount'">
              <van-icon name="plus" />
              <span>添加/同步账号</span>
            </div>
          </template>

          <!-- step1 角色列表 -->
          <template v-else-if="addScriptView === 'roles'">
            <van-cell-group v-if="roleOptions.length">
              <van-cell
                v-for="r in roleOptions"
                :key="r.id"
                :title="r.roleName"
                :label="`服务器: ${r.server}`"
                is-link
                @click="selectRole(r)"
              >
                <template #value>
                  <van-tag :type="r.status === 'running' ? 'success' : 'default'" size="small">
                    {{ r.status === 'running' ? '运行中' : '已停止' }}
                  </van-tag>
                </template>
              </van-cell>
            </van-cell-group>
            <van-empty v-else description="该账号下暂无角色" />
          </template>

          <!-- step2 确认创建 -->
          <template v-else-if="addScriptView === 'confirm'">
            <div class="confirm-card">
              <div class="confirm-title">确认创建脚本</div>
              <div class="confirm-row"><span class="c-label">账号</span><span>{{ selectedAccount.accountName }}</span></div>
              <div class="confirm-row"><span class="c-label">角色</span><span>{{ selectedRole.roleName }}</span></div>
              <div class="confirm-row"><span class="c-label">服务器</span><span>{{ selectedRole.server }}</span></div>
              <div class="confirm-row"><span class="c-label">渠道</span><span>{{ channelLabel(selectedRole.channel) }}</span></div>
            </div>
            <div class="form-submit">
              <van-button type="primary" round block :loading="creating" loading-text="创建中..." @click="confirmCreate">
                确认创建
              </van-button>
            </div>
          </template>

          <!-- addAccount 视图：绑定新账号 -->
          <AddAccountForm v-else-if="addScriptView === 'addAccount'" @success="onBindSuccess" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog, showSuccessToast, showFailToast, showLoadingToast, closeToast } from 'vant'
import {
  getScriptsAPI,
  toggleScriptAPI,
  deleteScriptAPI,
  renewScriptAPI,
} from '../api/mock.js'
import AddAccountForm from '../components/AddAccountForm.vue'
import { authAPI, billingAPI, cardAPI, contentAPI, promoAPI, scriptAPI, sunAPI } from '../api/client'
import { getScriptType } from '../config/scriptTypes'

const router = useRouter()

// ==================== 挂载全局接口（供 iframe 内 config.js 调用） ====================

// config.js 加载完成后会调用此函数获取已保存配置（真实后端 script_configs）
// 返回 '{}' → config.js 使用 schema 默认值渲染完整表单
window.getScriptConfig = async (scriptId) => {
  const id = panelScript.value?.id ?? scriptId
  if (!id) return '{}'
  try {
    const res = await scriptAPI.getConfig(id)
    return JSON.stringify(res.data.config)
  } catch (e) {
    console.warn('[Home] getScriptConfig 失败:', e.message)
    return '{}'
  }
}

// config.js 保存时调用此函数（写入后端 script_configs）
window.saveScriptConfig = async (configJson) => {
  try {
    const id = panelScript.value?.id
    if (!id) {
      showFailToast('脚本信息缺失，无法保存')
      return
    }
    await scriptAPI.saveConfig(id, JSON.parse(configJson))
    showSuccessToast('配置已保存')
  } catch (e) {
    showFailToast(e.message || '保存失败')
  }
}

// 配置 iframe 获取运行统计（当前占位 0，真实数据待后端脚本接入后由 runtime-stats 接口返回）
window.getRuntimeStats = async () => {
  const id = panelScript.value?.id
  if (!id) return { running: false, ad_left: 0, claimed_q3: 0, claimed_q4: 0, claimed_q5: 0, rp_diamond: 0, rp_grabbed: 0 }
  try {
    const res = await scriptAPI.runtimeStats(id)
    return res.data
  } catch (e) {
    console.warn('[Home] getRuntimeStats 失败:', e.message)
    return { running: false, ad_left: 0, claimed_q3: 0, claimed_q4: 0, claimed_q5: 0, rp_diamond: 0, rp_grabbed: 0 }
  }
}

// ==================== 基础状态 ====================

// 当前用户名（从 sessionStorage 获取；缺失/损坏时不硬编码占位名，等 me 同步后展示真实用户名）
const username = ref(sessionStorage.getItem('yun_username') || '')

// 公告栏文案（后端拉取，无公告时默认欢迎语）
const noticeText = ref('欢迎使用小太阳，愉快游戏，幸福人生！☀️')
const announcements = ref([])

// VIP 等级（从登录返回的用户信息读取）
const vipLevel = ref(0)
try {
  const stored = JSON.parse(localStorage.getItem('yun_user') || '{}')
  vipLevel.value = stored.vip_level || 0
} catch (e) {
  vipLevel.value = 0
}

// 小太阳余额（优先取登录时后端返回的 sun_balance；缓存缺失/损坏时兜底 0，与后端新用户余额一致，不伪造数字）
function getStoredSunBalance() {
  try {
    const user = JSON.parse(localStorage.getItem('yun_user') || '{}')
    return typeof user.sun_balance === 'number' ? user.sun_balance : 0
  } catch {
    return 0
  }
}
const sunBalance = ref(getStoredSunBalance())

// 小太阳余额弹窗（卡密兑换）
const sunRedeemVisible = ref(false)
const sunRedeemCode = ref('')
const redeeming = ref(false)

// 续期弹窗（按天续费，1 天 1 太阳）
const renewVisible = ref(false)
const renewDays = ref(1)
const renewCost = computed(() => {
  const days = Number(renewDays.value)
  return days >= 1 && days <= 365 ? days : 0
})

// 脚本列表
const scripts = ref([])

/** 刷新真实脚本列表 */
async function refreshScripts() {
  scripts.value = await getScriptsAPI()
}

// 操作菜单
const actionSheetVisible = ref(false)
const currentScript = ref(null)
const actionSheetActions = [
  { name: '续期', color: '#667eea' },
  { name: '删除', color: '#ee0a24' },
]

// ==================== 个人中心相关状态 ====================

// 个人中心主面板
const personalCenterVisible = ref(false)

// 游戏兑换码
const exchangeCodeVisible = ref(false)
const exchangeCode = ref('')

// 游戏账号管理
const accountManageVisible = ref(false)
const accountManageView = ref('accounts')

// 账号管理列表：由真实脚本列表（scripts）映射，不依赖任何 mock
const managedAccounts = computed(() =>
  scripts.value.map((s) => ({
    id: s.id,
    name: s.roleName,
    accountName: s.account,
    channel: channelLabel(s.channel),
    server: s.server,
    expire: s.expire,
    status: s.status,
  }))
)

/** 渠道编码 → 展示名 */
function channelLabel(channel) {
  const labels = { official: '官服', bilibili: 'B服', android: '安卓', ios: 'iOS' }
  return labels[channel] || channel
}

// 太阳充值（卡密兑换）
const sunRechargeVisible = ref(false)

// 阳光传递
const sunTransferVisible = ref(false)
const sunTransferForm = reactive({ targetUsername: '', amount: 1 })

/** 手续费唯一出口：10% 向上取整，与后端 calc_fee 口径一致 */
const calcFee = (n) => Math.ceil(n * 0.1)

// 太阳流水（真实后端数据）
const sunTransactionsVisible = ref(false)
const sunTransactions = ref([])
const sunTxLoading = ref(false)

/** 打开太阳流水 → 拉取真实流水 */
async function openSunTransactions() {
  personalCenterVisible.value = false
  sunTransactionsVisible.value = true
  sunTxLoading.value = true
  try {
    const res = await billingAPI.records(1, 50)
    sunTransactions.value = res.data.records.map((t) => ({
      type: t.tx_type_name,
      time: t.created_at,
      amount: t.amount,
    }))
  } catch (e) {
    showFailToast(e.message || '流水加载失败')
  } finally {
    sunTxLoading.value = false
  }
}

// 推广中心（真实后端数据）
const promotionCenterVisible = ref(false)
const promotionStats = reactive({ userCount: 0, totalReward: 0 })
const promotionRewards = ref([])
const myInviteCode = ref('')
const promoEnabled = ref(false)

// 更新记录（真实后端数据）
const updateLogVisible = ref(false)
const updateLogs = ref([])

// 联系客服
const contactServiceVisible = ref(false)

// 修改密码
const changePasswordVisible = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '' })

// 教程弹窗
const tutorialVisible = ref(false)

// ==================== 添加脚本 popup 状态 ====================
const addScriptVisible = ref(false)

// ==================== 面板状态 ====================

// 当前被操作的面板脚本
const panelScript = ref(null)

// 配置面板
const configPanelVisible = ref(false)
const configIframeRef = ref(null)
const configIframeSrc = ref('')

// 日志面板
const logPanelVisible = ref(false)
const logSearchText = ref('')
const logDateFilter = ref('today')
const allLogs = ref({})
const dateFilterOptions = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'week', label: '近7天' },
]

// 状态面板
const statusPanelVisible = ref(false)
const statusIframeRef = ref(null)
const statusIframeSrc = ref('')

// ==================== 初始化 ====================

// ==================== 首页运行统计（3 秒轮询，卡片展示芯片/钻石） ====================
const scriptStats = reactive({})

/** 轮询所有脚本的 runtime-stats，供首页卡片展示 */
async function refreshRuntimeStats() {
  const list = scripts.value
  if (!list.length) return
  for (const s of list) {
    try {
      const res = await scriptAPI.runtimeStats(s.id)
      scriptStats[s.id] = res.data
    } catch (e) {
      // 静默失败，保留上次统计
    }
  }
}

let statsTimer = null
function startStatsPolling() {
  clearInterval(statsTimer)
  statsTimer = setInterval(refreshRuntimeStats, 3000)
  refreshRuntimeStats()
}

onMounted(async () => {
  try {
    await refreshScripts()
  } catch (e) {
    // 令牌过期时 client.js 已清理登录态并跳转登录，此处静默避免提示与实际原因不符
    if (e.status !== 401) showFailToast('加载失败')
  }
  startStatsPolling() // 首页脚本运行统计轮询
  // 拉取公告（失败静默，保留默认欢迎语）
  try {
    const res = await contentAPI.announcements()
    announcements.value = res.data.announcements || []
    if (announcements.value.length > 0) {
      noticeText.value = announcements.value[0].content || announcements.value[0].title
    }
  } catch (e) {
    // 公告加载失败使用默认文案
  }
  // 同步最新用户名/余额/等级/推广码（后端可能被其他途径变更，如管理端/其他设备）
  try {
    const res = await authAPI.me()
    const user = res.data.user
    // 用户名以 me 返回为准（注册后 sessionStorage 无 yun_username、缓存损坏等场景）
    if (user.username) {
      username.value = user.username
      sessionStorage.setItem('yun_username', user.username)
    }
    sunBalance.value = user.sun_balance
    vipLevel.value = user.vip_level
    myInviteCode.value = res.data.invite_code || ''
    // 缓存写回单独容错：缓存损坏不应误报同步失败
    try {
      const stored = JSON.parse(localStorage.getItem('yun_user') || '{}')
      stored.sun_balance = user.sun_balance
      stored.vip_level = user.vip_level
      localStorage.setItem('yun_user', JSON.stringify(stored))
    } catch (e) {}
  } catch (e) {
    // 401 时 client.js 已清登录态并跳登录页，静默不提示；其余失败保留缓存展示但非阻塞提示，不伪造数据
    if (e.status !== 401) {
      showToast('余额/身份同步失败，显示的可能不是最新数据')
    }
  }
})

// ==================== 计算属性 ====================

// 经搜索过滤后的日志列表（数据为后端真实日志，本地过滤与后端 search 双保险）
const filteredLogs = computed(() => {
  if (!panelScript.value) return []
  const logs = allLogs.value[panelScript.value.id] || []
  if (!logSearchText.value.trim()) return logs
  const keyword = logSearchText.value.trim().toLowerCase()
  return logs.filter((log) => log.text.toLowerCase().includes(keyword))
})

// ==================== 渠道/样式工具函数 ====================

function getChannelColor(channel) {
  const colors = {
    ios: 'linear-gradient(135deg, #000, #333)',
    android: 'linear-gradient(135deg, #3ddc84, #0f9d58)',
    pc: 'linear-gradient(135deg, #0078d4, #00bcf2)',
    web: 'linear-gradient(135deg, #ff6b35, #f7c948)',
    official: 'linear-gradient(135deg, #1989fa, #0570e0)',
    bilibili: 'linear-gradient(135deg, #fb7299, #ee0a6c)',
  }
  return colors[channel] || 'linear-gradient(135deg, #667eea, #764ba2)'
}

function getChannelEmoji(channel) {
  const emojis = {
    ios: '🍎',
    android: '🤖',
    pc: '💻',
    web: '🌐',
    official: '🎮',
    bilibili: '🅱️',
  }
  return emojis[channel] || '📱'
}

// ==================== 面板打开/关闭 ====================

/** 打开配置面板 — iframe 加载对应游戏的 config.html */
function openConfigPanel(script) {
  panelScript.value = script
  const type = getScriptType(script.gameType)
  const base = (type && type.configPath) || '/config-pages/config.html'
  // 加时间戳防缓存，确保每次打开都是新加载
  configIframeSrc.value = base + '?v=2.0.140&_t=' + Date.now()
  configPanelVisible.value = true
}

/** iframe 加载完成回调 — 从后端读配置 → 通知 config.js 更新配置并解除 loading */
function onConfigIframeLoad() {
  console.log('[Home] 配置 iframe 加载完成')
  // config.js 在生产模式（有父窗口）下必须等父窗口调用 updateConfigFromParent
  // 才会隐藏 loading 并显示表单内容，否则永远卡在「加载中」
  const tryUpdate = async (attempt = 0) => {
    const cw = configIframeRef.value?.contentWindow
    if (cw?.updateConfigFromParent) {
      // 从后端读取真实配置 → config.js 用 schema 默认值 + merge 逻辑渲染完整表单
      cw.updateConfigFromParent(await window.getScriptConfig())
      console.log('[Home] updateConfigFromParent 调用成功')
    } else if (attempt < 15) {
      // 脚本可能尚未加载完成，最多重试 15 次（约 4.5s）
      setTimeout(() => tryUpdate(attempt + 1), 300)
    } else {
      console.warn('[Home] updateConfigFromParent 未找到，config.js 可能加载失败')
    }
  }
  tryUpdate()
}

/** 打开日志面板 — 原生渲染，打开时拉取今日真实日志 */
function openLogPanel(script) {
  panelScript.value = script
  logSearchText.value = ''
  logDateFilter.value = 'today'
  logPanelVisible.value = true
  clearTimeout(logSearchTimer)
  fetchLogs()
}

// 日志自动刷新：面板打开时每 3 秒静默轮询，实时展示脚本运行日志；关闭面板即停止
let logRefreshTimer = null
watch(logPanelVisible, (visible) => {
  if (visible) {
    clearInterval(logRefreshTimer)
    logRefreshTimer = setInterval(() => {
      if (panelScript.value && !document.hidden) fetchLogs(true)
    }, 3000)
  } else {
    clearInterval(logRefreshTimer)
    logRefreshTimer = null
  }
})
onBeforeUnmount(() => {
  if (logRefreshTimer) clearInterval(logRefreshTimer)
  if (statsTimer) clearInterval(statsTimer)
})

/** 打开状态面板 — iframe 加载原站 status.html */
function openStatusPanel(script) {
  panelScript.value = script
  // 加时间戳防缓存
  statusIframeSrc.value = '/status-pages/status.html?v=1.0.21&_t=' + Date.now()
  statusPanelVisible.value = true
}

/** 状态 iframe 加载完成后调用 initStatusPage */
function onStatusIframeLoad() {
  const iframe = statusIframeRef.value
  if (iframe && iframe.contentWindow && iframe.contentWindow.initStatusPage) {
    iframe.contentWindow.initStatusPage({
      scriptId: panelScript.value.id,
    })
    console.log('[Home] initStatusPage 已调用, scriptId:', panelScript.value.id)
  }
}

// ==================== 配置面板操作 ====================

/** 保存配置 — 触发 iframe 内 config.js 的 saveConfig → window.parent.saveScriptConfig → 后端 */
function handleSaveConfig() {
  const cw = configIframeRef.value?.contentWindow
  if (cw && typeof cw.saveConfig === 'function') {
    cw.saveConfig()
  } else {
    showToast('配置面板尚未加载完成')
  }
}

/** 导入配置 */
function handleImportConfig() {
  showToast('请选择配置文件')
}

// ==================== 日志面板操作 ====================

let logReqSeq = 0 // 请求序号：仅接受最新一次请求的响应，防止慢响应覆盖新数据

/** 从后端拉取当前面板脚本的日志（date + search 作为查询参数传后端） */
async function fetchLogs(silent = false) {
  if (!panelScript.value) return 'stale'
  const seq = ++logReqSeq
  const id = panelScript.value.id
  const date = logDateFilter.value
  const search = logSearchText.value.trim()
  try {
    const res = await scriptAPI.logs(id, { date, search })
    if (seq !== logReqSeq) return 'stale' // 已有更新的请求，丢弃过期响应
    allLogs.value[id] = (res.data && res.data.logs) || []
    return true
  } catch (e) {
    if (seq !== logReqSeq) return 'stale'
    if (!silent) showFailToast(e.message || '日志加载失败') // 自动轮询静默失败，避免刷屏
    return false
  }
}

/** 刷新日志 */
async function refreshLogs() {
  showLoadingToast({ message: '刷新中...', duration: 0 })
  const result = await fetchLogs()
  closeToast()
  if (result === true) showSuccessToast('日志已刷新')
}

/** 日期筛选变化 → 传 date 参数重新拉取 */
function onLogDateChange(key) {
  logDateFilter.value = key
  fetchLogs()
}

/** 搜索输入：本地 computed 即时过滤，300ms 防抖后带 search 参数拉取（避免每次按键打 API） */
let logSearchTimer = null
function onLogSearch() {
  clearTimeout(logSearchTimer)
  logSearchTimer = setTimeout(() => {
    fetchLogs()
  }, 300)
}

// ==================== 状态面板操作 ====================

/** 刷新状态 — 重新调用 iframe 内 initStatusPage */
function refreshStatus() {
  const iframe = statusIframeRef.value
  if (iframe && iframe.contentWindow && iframe.contentWindow.initStatusPage) {
    iframe.contentWindow.initStatusPage({
      scriptId: panelScript.value.id,
    })
    showToast('状态已刷新')
  } else {
    showToast('状态面板尚未加载')
  }
}

// ==================== 脚本操作 ====================

/** 切换启动/停止 */
async function handleToggleScript(script) {
  try {
    const res = await toggleScriptAPI(script.id)
    if (res.success) {
      // 同步本地状态（后端已真实切换）
      const target = scripts.value.find((s) => s.id === script.id)
      if (target) target.status = res.newStatus
      showSuccessToast(res.newStatus === 'running' ? '已启动' : '已停止')
    } else {
      showFailToast(res.message)
    }
  } catch (e) {
    showFailToast(e.message || '操作失败')
  }
}

/** 显示操作菜单 */
function showActionSheet(script) {
  currentScript.value = script
  actionSheetVisible.value = true
}

/** 操作菜单选择 */
async function onActionSelect(action) {
  actionSheetVisible.value = false
  if (!currentScript.value) return

  if (action.name === '删除') {
    try {
      await showDialog({
        title: '确认删除',
        message: `确定删除脚本「${currentScript.value.roleName}」吗？删除后不可恢复。`,
        showCancelButton: true,
        confirmButtonColor: '#ee0a24',
      })
      const res = await deleteScriptAPI(currentScript.value.id)
      if (res.success) {
        await refreshScripts()
        showSuccessToast('删除成功')
      }
    } catch (e) {
      // 用户取消删除
    }
  } else if (action.name === '续期') {
    openRenewDialog()
  }
}

/** 打开续期弹窗（按天续费，1 天 1 太阳） */
function openRenewDialog() {
  renewDays.value = 1
  renewVisible.value = true
}

/** 续期确认 */
async function handleRenewConfirm() {
  const days = Number(renewDays.value)
  if (!days || days < 1 || days > 365) {
    showToast('请输入有效天数（1-365）')
    return
  }
  if (days > sunBalance.value) {
    showFailToast(`太阳余额不足，需要 ${days} ☀️`)
    return
  }
  try {
    const res = await renewScriptAPI(currentScript.value.id, days)
    // 刷新余额（后端返回扣减后余额）与脚本列表（到期时间更新）
    if (res.data && res.data.sun_balance !== undefined) {
      sunBalance.value = res.data.sun_balance
      const stored = JSON.parse(localStorage.getItem('yun_user') || '{}')
      stored.sun_balance = res.data.sun_balance
      localStorage.setItem('yun_user', JSON.stringify(stored))
    }
    await refreshScripts()
    showSuccessToast(`续期成功 ${days} 天（消耗 ${days} ☀️）`)
  } catch (e) {
    showFailToast(e.message || '续期失败')
  }
}

// ==================== 其他交互 ====================

// ==================== 个人中心相关函数 ====================

/** 打开个人中心 */
function openPersonalCenter() {
  personalCenterVisible.value = true
}

/** 打开游戏兑换码 */
function openExchangeCode() {
  personalCenterVisible.value = false
  exchangeCodeVisible.value = true
}

/** 兑换码提交（真实卡密兑换，面额由卡密决定） */
async function handleExchangeCode() {
  const code = exchangeCode.value.trim()
  if (!code) {
    showToast('请输入兑换码')
    return
  }
  try {
    const res = await cardAPI.redeem(code)
    // 刷新余额
    if (res.data && res.data.sun_balance !== undefined) {
      sunBalance.value = res.data.sun_balance
      const stored = JSON.parse(localStorage.getItem('yun_user') || '{}')
      stored.sun_balance = res.data.sun_balance
      localStorage.setItem('yun_user', JSON.stringify(stored))
    }
    showSuccessToast(res.message || '兑换成功')
    exchangeCode.value = ''
    exchangeCodeVisible.value = false
  } catch (e) {
    showFailToast(e.message || '兑换失败')
  }
}

/** 打开游戏账号管理 */
function openAccountManage() {
  personalCenterVisible.value = false
  accountManageView.value = 'accounts'
  accountManageVisible.value = true
}

/** 进入角色管理（后端 bind 不返回角色，占位视图） */
function openRoles() {
  accountManageView.value = 'roles'
}

/** 删除账号（即删除真实脚本，删除后不可恢复） */
async function handleDeleteAccount(acct) {
  try {
    await showDialog({
      title: '确认删除',
      message: `确定删除账号「${acct.name}」吗？删除后不可恢复。`,
      showCancelButton: true,
      confirmButtonColor: '#ee0a24',
    })
  } catch (e) {
    return // 用户取消删除
  }
  try {
    const res = await deleteScriptAPI(acct.id)
    if (res.success) {
      await refreshScripts()
      showSuccessToast('删除成功')
    }
  } catch (e) {
    showFailToast(e.message || '删除失败')
  }
}

/** 打开太阳充值 → 卡密兑换（充值 = 兑换卡密） */
function openSunRecharge() {
  personalCenterVisible.value = false
  sunRedeemCode.value = ''
  sunRechargeVisible.value = true
}

/** 充值弹窗兑换确认（真实卡密兑换） */
async function handleSunRechargeRedeem() {
  const code = sunRedeemCode.value.trim()
  if (!code) {
    showToast('请输入卡密')
    return
  }
  redeeming.value = true
  try {
    const res = await cardAPI.redeem(code)
    sunBalance.value = res.data.sun_balance
    const stored = JSON.parse(localStorage.getItem('yun_user') || '{}')
    stored.sun_balance = res.data.sun_balance
    localStorage.setItem('yun_user', JSON.stringify(stored))
    showSuccessToast(res.message || '兑换成功')
    sunRedeemCode.value = ''
    sunRechargeVisible.value = false
  } catch (e) {
    showFailToast(e.message || '兑换失败')
  } finally {
    redeeming.value = false
  }
}

/** 打开阳光传递 */
function openSunTransfer() {
  personalCenterVisible.value = false
  sunTransferForm.targetUsername = ''
  sunTransferForm.amount = 1
  sunTransferVisible.value = true
}

/** 阳光传递确认（真实后端转账，对方为用户名的精确查询，按注册规则校验） */
async function handleSunTransferConfirm() {
  const target = sunTransferForm.targetUsername.trim()
  if (!target) {
    showToast('请输入对方账号')
    return
  }
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(target)) {
    showToast('请输入对方账号（3-32 位字母、数字或下划线）')
    return
  }
  const amount = Number(sunTransferForm.amount)
  if (!amount || amount < 1) {
    showToast('请输入有效数量')
    return
  }
  try {
    const res = await sunAPI.transfer(target, amount)
    // 刷新余额（后端返回扣减后余额）
    if (res.data && res.data.sun_balance !== undefined) {
      sunBalance.value = res.data.sun_balance
      // 缓存写回独立容错：缓存损坏只影响缓存，不影响成功提示与弹窗关闭
      try {
        const stored = JSON.parse(localStorage.getItem('yun_user') || '{}')
        stored.sun_balance = res.data.sun_balance
        localStorage.setItem('yun_user', JSON.stringify(stored))
      } catch (e) {}
    }
    // 展示后端返回的结果（后端 message 已含金额与手续费口径；兜底时用 calcFee 补充）
    const fee = res.data && res.data.fee !== undefined ? res.data.fee : calcFee(amount)
    showSuccessToast(res.message || `传递成功 ${amount} ☀️（手续费 ${fee}）`)
    sunTransferVisible.value = false
  } catch (e) {
    showFailToast(e.message || '传递失败')
  }
}

/** 打开推广中心 → 拉取真实推广数据 */
async function openPromotionCenter() {
  personalCenterVisible.value = false
  promotionCenterVisible.value = true
  try {
    const [cfg, mine, rwds] = await Promise.all([promoAPI.config(), promoAPI.my(), promoAPI.rewards()])
    promoEnabled.value = cfg.data.enabled
    myInviteCode.value = mine.data.invite_code
    promotionStats.userCount = mine.data.invited_count
    promotionStats.totalReward = mine.data.total_reward
    promotionRewards.value = rwds.data.rewards.map((r) => ({
      desc: `好友 ${r.friend} 累计兑换达标（第${r.tier}档）`,
      time: r.created_at,
      amount: r.amount,
    }))
  } catch (e) {
    showFailToast(e.message || '推广数据加载失败')
  }
}

/** 复制推广码 */
function handleCopyInviteCode() {
  navigator.clipboard?.writeText(myInviteCode.value).then(() => {
    showSuccessToast('推广码已复制')
  }).catch(() => {
    showToast('复制失败，请手动复制')
  })
}

/** 打开更新记录 → 拉取后端版本记录 */
async function openUpdateLog() {
  personalCenterVisible.value = false
  updateLogVisible.value = true
  try {
    const res = await contentAPI.changelogs()
    updateLogs.value = res.data.changelogs.map((c) => ({
      version: c.version,
      time: c.created_at,
      content: c.content,
    }))
  } catch (e) {
    showFailToast(e.message || '更新记录加载失败')
  }
}

/** 打开联系客服 */
function openContactService() {
  personalCenterVisible.value = false
  contactServiceVisible.value = true
}

/** 发送消息 */
function handleSendMessage() {
  showToast('消息功能开发中，请通过QQ联系客服')
}

/** 打开修改密码 */
function openChangePassword() {
  personalCenterVisible.value = false
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  changePasswordVisible.value = true
}

/** 修改密码确认（调真实后端） */
async function handleChangePasswordConfirm() {
  if (!passwordForm.oldPassword.trim() || !passwordForm.newPassword.trim()) {
    showToast('请填写完整信息')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    showToast('新密码至少6位')
    return
  }
  try {
    const res = await authAPI.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
    showSuccessToast(res.message || '修改密码成功')
    changePasswordVisible.value = false
  } catch (e) {
    showFailToast(e.message || '修改失败')
  }
}

/** 退出登录 */
function handleLogout() {
  showDialog({
    title: '提示',
    message: '确定要退出登录吗？',
    showCancelButton: true,
    confirmButtonColor: '#ee0a24',
  }).then(() => {
    sessionStorage.clear()
    localStorage.removeItem('yun_token')
    localStorage.removeItem('yun_user')
    router.push('/login')
  }).catch(() => {})
}

/** 小太阳余额点击 → 弹出余额 + 卡密兑换 */
function handleSunClick() {
  sunRedeemCode.value = ''
  sunRedeemVisible.value = true
}

/** 兑换确认（before-close：校验卡密 → 调后端 → 成功才关闭弹窗） */
async function handleSunRedeemBeforeClose(action) {
  if (action !== 'confirm') return true
  const code = sunRedeemCode.value.trim()
  if (!code) {
    showToast('请输入卡密')
    return false
  }
  redeeming.value = true
  try {
    const res = await cardAPI.redeem(code)
    sunBalance.value = res.data.sun_balance
    // 同步写回 localStorage，刷新页面后余额不丢失
    try {
      const user = JSON.parse(localStorage.getItem('yun_user') || '{}')
      user.sun_balance = res.data.sun_balance
      localStorage.setItem('yun_user', JSON.stringify(user))
    } catch {}
    showSuccessToast(res.message || '兑换成功')
    return true
  } catch (e) {
    showFailToast(e.message || '兑换失败')
    return false
  } finally {
    redeeming.value = false
  }
}

/** 教程按钮 */
function handleTutorial() {
  tutorialVisible.value = true
}

// ==================== 添加脚本 popup 逻辑 ====================

// 添加脚本三步流程（原站复刻：账号列表 → 角色 → 确认创建）
const addScriptStep = ref(0)
const addScriptView = ref('accounts')   // accounts | roles | confirm | addAccount
const selectedAccount = ref(null)       // { accountName, roleCount, channels }
const selectedRole = ref(null)          // 脚本对象
const creating = ref(false)

// 账号列表：scripts 按 account 去重
const accountOptions = computed(() => {
  const map = new Map()
  for (const s of scripts.value) {
    const k = s.account || s.roleName
    if (!map.has(k)) map.set(k, { accountName: k, roles: [] })
    map.get(k).roles.push(s)
  }
  return [...map.values()].map((g) => ({
    accountName: g.accountName,
    roleCount: g.roles.length,
    channels: [...new Set(g.roles.map((r) => channelLabel(r.channel)))].join('/'),
  }))
})

// 角色列表：选中账号下的脚本
const roleOptions = computed(() =>
  selectedAccount.value
    ? scripts.value.filter((s) => (s.account || s.roleName) === selectedAccount.value.accountName)
    : []
)

/** 打开添加脚本 popup 并重置状态 */
function openAddScript() {
  addScriptStep.value = 0
  addScriptView.value = 'accounts'
  selectedAccount.value = null
  selectedRole.value = null
  addScriptVisible.value = true
}

function selectAccount(acc) {
  selectedAccount.value = acc
  selectedRole.value = null
  addScriptStep.value = 1
  addScriptView.value = 'roles'
}

function selectRole(role) {
  selectedRole.value = role
  addScriptStep.value = 2
  addScriptView.value = 'confirm'
}

async function confirmCreate() {
  creating.value = true
  try {
    await scriptAPI.create({ copyOf: selectedRole.value.id })
    await refreshScripts()
    showSuccessToast('创建成功')
    addScriptVisible.value = false
  } catch (e) {
    showFailToast(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

/** 绑定新账号成功 → 回账号列表并刷新 */
async function onBindSuccess() {
  try { await refreshScripts() } catch (e) {}
  showSuccessToast('绑定成功')
  addScriptView.value = 'accounts'
  addScriptStep.value = 0
  selectedAccount.value = null
  selectedRole.value = null
}

/** 添加账号成功（账号管理面板场景）→ 刷新脚本列表并返回账号列表视图 */
async function onAddAccountSuccess() {
  try {
    await refreshScripts()
  } catch (e) {
    // 列表刷新失败不阻塞成功提示
  }
  showSuccessToast('绑定成功')
  if (accountManageVisible.value) {
    // 账号管理弹窗内绑定：返回账号列表视图（展示真实脚本）
    accountManageView.value = 'accounts'
  } else {
    // 首页添加脚本弹窗绑定：关闭弹窗，回到脚本列表
    addScriptVisible.value = false
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 公告栏 */
.scroll-notice-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 头部用户区 */
.header {
  background: #f5f5f5;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 径向圆点装饰背景 */
.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
  background-size: 15px 15px;
  pointer-events: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

/* 头像 */
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  animation: avatarFloat 3s ease-in-out infinite;
}

@keyframes avatarFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.info {
  flex: 1;
  min-width: 0;
}

.user-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.username {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

/* VIP 标签 */
.vip-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  white-space: nowrap;
}

.vip-badge.vip-0 {
  background: #f0f0f0;
  color: #666;
}

/* 教程按钮 */
.tutorial-btn {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  background: linear-gradient(135deg, #42d392, #647eff);
  color: #fff;
  cursor: pointer;
  white-space: nowrap;
}

.tutorial-btn:active {
  opacity: 0.8;
}

/* 小太阳 */
.sun {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.sun-icon {
  animation: sunSpin 20s linear infinite;
}

@keyframes sunSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sun-count {
  color: #f5a623;
}

/* 内容区 */
.content {
  padding: 16px 16px 80px;
}

/* 脚本卡片 */
.script-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 渠道图标 */
.channel-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.role-info {
  min-width: 0;
}

.role-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server {
  font-size: 13px;
  color: #969799;
  margin-top: 2px;
}

/* 账号后方的运行统计（芯片/钻石，放大加粗） */
.role-stats {
  display: inline-block;
  margin-left: 8px;
  font-size: 16px;
  line-height: 20px;
  font-weight: 700;
  color: #d4893c;
  background: #fff4e0;
  border-radius: 4px;
  padding: 1px 8px;
  white-space: nowrap;
  vertical-align: middle;
}


/* 卡片详情 */
.card-body {
  margin-bottom: 12px;
}

.info-item {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  display: flex;
}

.info-label {
  color: #999;
  width: 80px;
  flex-shrink: 0;
}

.expire-value {
  color: #00c853;
  font-weight: 500;
}

/* 操作区 */
.script-operations {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.operation-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 底部添加按钮 */
.add-btn {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 10;
}

.add-btn .van-button {
  height: 48px;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* 教程弹窗 */
.tutorial-content {
  padding: 24px 20px;
}

.tutorial-content h3 {
  text-align: center;
  font-size: 18px;
  margin: 0 0 24px;
  color: #333;
}

.tutorial-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: #555;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.tutorial-tip {
  margin-top: 24px;
  padding: 12px 16px;
  background: #fff7e6;
  border-radius: 8px;
  color: #ed6a0c;
  font-size: 14px;
  text-align: center;
}

/* ==================== 面板通用样式 ==================== */

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* iframe 全屏撑满 */
.panel-iframe {
  flex: 1;
  width: 100%;
  border: none;
}

/* NavBar 右侧文字按钮 */
.nav-btn {
  font-size: 14px;
  color: #1989fa;
  padding: 4px 8px;
  cursor: pointer;
}

.nav-btn:active {
  opacity: 0.7;
}

.nav-btn-primary {
  color: #fff;
  background: #1989fa;
  border-radius: 4px;
  padding: 4px 12px;
  margin-left: 8px;
}

/* ==================== 日志面板样式 ==================== */

/* 日期筛选条 */
.date-filter {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.date-filter::-webkit-scrollbar {
  display: none;
}

.date-filter-btn {
  flex-shrink: 0;
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.date-filter-btn.active {
  background: #1989fa;
  color: #fff;
  border-color: #1989fa;
}

/* 搜索框 */
.log-search {
  padding: 0 16px;
  margin-bottom: 8px;
}

.log-search :deep(.van-cell) {
  border-radius: 8px;
}

/* 日志列表 */
.log-list {
  padding: 0 16px 20px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
}

.log-time {
  flex-shrink: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
  min-width: 62px;
}

.log-text {
  color: #333;
  line-height: 1.6;
  word-break: break-all;
}

/* ==================== 个人中心 & 子面板通用样式 ==================== */

/* 面板提示文字 */
.panel-tip {
  padding: 12px 16px;
  background: #fff7e6;
  border-radius: 8px;
  color: #ed6a0c;
  font-size: 13px;
  text-align: center;
  margin-top: 8px;
}

/* ==================== 游戏账号管理卡片 ==================== */

.account-card {
  display: flex;
  align-items: center;
  background: #fff;
  margin: 8px 16px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  min-height: 0;
}

.account-card:active {
  background: #f7f8fa;
}

.account-card-top {
  flex: 1;
  min-width: 0;
}

.account-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.account-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.account-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

.account-card-info {
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

.account-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}

/* ==================== 太阳充值 ==================== */

.sun-balance-display {
  text-align: center;
  padding: 24px 0;
  font-size: 16px;
  color: #666;
}

.sun-balance-value {
  font-size: 28px;
  font-weight: 700;
  color: #f5a623;
  margin-left: 8px;
}

.recharge-plans {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.recharge-plan-card {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.recharge-plan-card:active {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.plan-amount {
  font-size: 18px;
  font-weight: 700;
  color: #f5a623;
}

.plan-price {
  font-size: 14px;
  color: #e53935;
  margin-top: 4px;
}

/* ==================== 小太阳余额 + 卡密兑换 ==================== */

.sun-redeem-balance {
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.sun-redeem-value {
  color: #f5a623;
  font-weight: 700;
  font-size: 16px;
}

.sun-redeem-tip {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 8px;
  color: #ed6a0c;
  font-size: 12px;
  text-align: center;
}

/* ==================== 阳光传递费用明细 ==================== */

.transfer-fee-detail {
  margin-top: 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}

/* ==================== 推广中心 ==================== */

.promo-link-box {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.promo-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.promo-link {
  font-size: 12px;
  color: #1989fa;
  padding: 8px 12px;
  background: #f7f8fa;
  border-radius: 6px;
  margin-bottom: 10px;
  word-break: break-all;
}

.promo-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.promo-stat-item {
  flex: 1;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  color: #fff;
}

.promo-stat-num {
  font-size: 24px;
  font-weight: 700;
}

.promo-stat-label {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}

.promo-section {
  margin-bottom: 16px;
}

.promo-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
  padding-left: 8px;
  border-left: 3px solid #667eea;
}

.promo-section p {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin: 0;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

/* ==================== 更新记录 ==================== */

.update-log-item {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.update-log-version {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.update-log-time {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}

.update-log-content {
  font-size: 13px;
  color: #666;
  line-height: 1.8;
  white-space: pre-line;
}

/* ==================== 添加脚本三步流程样式 ==================== */

.steps-bar { padding: 12px 0 4px; background: #fff; }
.add-new { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 16px; color: #1989fa; font-size: 14px; cursor: pointer; }
.confirm-card { margin: 16px; padding: 16px; background: #fff; border-radius: 10px; }
.confirm-title { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 12px; }
.confirm-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #333; border-bottom: 1px dashed #f0f0f0; }
.confirm-row:last-child { border-bottom: none; }
.confirm-row .c-label { color: #999; }
.form-submit { padding: 20px 16px; }
.form-submit .van-button { height: 48px; font-size: 16px; }
</style>
