<template>
  <!-- 首页 - 脚本列表 -->
  <div class="home-page">
    <!-- 顶部公告栏 -->
    <div class="scroll-notice-wrapper">
      <van-notice-bar
        left-icon="volume-o"
        color="#ed6a0c"
        background="#fff7e6"
        :scrollable="true"
        :delay="1"
        :speed="50"
      >
        欢迎使用小太阳，愉快游戏，幸福人生！☀️
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
            <span class="vip-badge vip-0">👤 普通用户</span>
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
            <span class="info-label">编号：</span>
            <span class="info-value">{{ script.number }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">账号：</span>
            <span class="info-value">{{ script.account }}</span>
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
      <van-button type="primary" size="large" round block @click="addScriptVisible = true">
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
            <span>脚本将自动开始运行，可随时停止</span>
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
              @click="logDateFilter = item.key"
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
              v-for="acct in mockAccounts"
              :key="acct.id"
              class="account-card"
              @click="openRoles(acct)"
            >
              <div class="account-card-top">
                <div class="account-card-header">
                  <span class="account-name">{{ acct.name }}</span>
                  <div class="account-tags">
                    <van-tag type="primary" size="small">{{ acct.channel }}</van-tag>
                    <van-tag plain size="small">{{ acct.genType }}</van-tag>
                  </div>
                </div>
                <div class="account-card-info">
                  <div class="account-detail">账号名称: {{ acct.accountName }}</div>
                  <div class="account-time">更新时间: {{ acct.updateTime }}</div>
                </div>
              </div>
              <div class="account-card-actions">
                <van-button type="danger" plain size="small" @click.stop="handleDeleteAccount(acct)">删除</van-button>
                <van-icon name="arrow" color="#999" />
              </div>
            </div>
            <van-empty v-if="mockAccounts.length === 0" description="暂无游戏账号" />
            <div style="padding: 16px;">
              <van-button type="primary" size="large" round block @click="accountManageView = 'addAccount'">+ 添加/同步账号</van-button>
            </div>
          </div>
        </template>

        <!-- addAccount 视图 -->
        <template v-else-if="accountManageView === 'addAccount'">
          <van-nav-bar title="添加/同步账号" left-arrow @click-left="accountManageView = 'accounts'" />
          <div class="panel-body" style="padding: 16px;">
            <van-field v-model="addAccountForm.name" label="账号名称" placeholder="请输入账号名称" />
            <van-field v-model="addAccountForm.channel" label="渠道选择" placeholder="请输入渠道" />
            <van-field v-model="addAccountForm.genType" label="生成方式" placeholder="请输入生成方式" />
            <div style="padding: 16px;">
              <van-button type="primary" size="large" round block @click="handleAddAccount">提交</van-button>
            </div>
          </div>
        </template>

        <!-- roles 视图 -->
        <template v-else-if="accountManageView === 'roles'">
          <van-nav-bar title="角色管理" left-arrow @click-left="accountManageView = 'accounts'" />
          <div class="panel-body">
            <van-cell
              v-for="role in mockRoles"
              :key="role.id"
              :title="role.name"
              :label="`角色ID: ${role.id} | 服务器: ${role.server}`"
            />
            <van-empty v-if="mockRoles.length === 0" description="暂无角色" />
          </div>
        </template>
      </div>
    </van-popup>

    <!-- ==================== 太阳充值 popup ==================== -->
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
          <div class="recharge-plans">
            <div
              v-for="plan in sunRechargePlans"
              :key="plan.id"
              class="recharge-plan-card"
              @click="handleRecharge(plan)"
            >
              <div class="plan-amount">☀️ {{ plan.amount }}</div>
              <div class="plan-price">¥{{ plan.price }}</div>
            </div>
          </div>
          <div class="panel-tip">充值后太阳将立即到账，可用于兑换脚本运行时长</div>
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
          <div class="promo-link-box">
            <div class="promo-label">推广链接</div>
            <div class="promo-link">https://yun.example.com/ref/{{ username }}</div>
            <van-button size="small" type="primary" @click="handleCopyPromoLink">复制</van-button>
          </div>
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
            <h4>奖励规则</h4>
            <p>每成功邀请1位新用户，奖励 5 ☀️；被邀请用户充值，推广人可获得充值金额 10% 的太阳奖励。</p>
          </div>
          <div class="promo-section">
            <h4>推广用户列表</h4>
            <van-cell
              v-for="user in promotionUsers"
              :key="user.id"
              :title="user.name"
              :label="'注册时间: ' + user.registerTime"
            />
            <van-empty v-if="promotionUsers.length === 0" description="暂无推广用户" />
          </div>
          <div class="promo-section">
            <h4>奖励记录</h4>
            <van-cell
              v-for="(reward, idx) in promotionRewards"
              :key="idx"
              :title="reward.desc"
              :label="reward.time"
              value="+5 ☀️"
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
          我的ID：<strong>{{ username }}</strong>
        </div>
        <van-field v-model="sunTransferForm.targetId" label="对方ID" type="digit" placeholder="请输入对方的ID" />
        <van-field label="赠送数量">
          <template #input>
            <van-stepper v-model="sunTransferForm.amount" :min="1" :max="99999" integer />
          </template>
        </van-field>
        <div v-if="sunTransferForm.amount > 0" class="transfer-fee-detail">
          <div>赠送数量：{{ sunTransferForm.amount }} 太阳</div>
          <div>手续费（10%）：{{ Math.ceil(sunTransferForm.amount * 0.1) }} 太阳</div>
          <div style="font-weight: bold; color: #e53935;">
            实际扣除：{{ sunTransferForm.amount + Math.ceil(sunTransferForm.amount * 0.1) }} 太阳
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

    <!-- ==================== 添加脚本 popup（原站 AddScriptDialog 复刻） ==================== -->
    <van-popup
      v-model:show="addScriptVisible"
      position="bottom"
      :style="{ height: '85%' }"
      round
      :close-on-click-overlay="false"
    >
      <div class="panel-container">
        <!-- NavBar -->
        <van-nav-bar
          :title="addScriptView === 'addAccount' ? '添加游戏账号' : '添加脚本'"
          :left-arrow="addScriptView === 'addAccount'"
          @click-left="onAddScriptBack"
        >
          <template v-if="addScriptView !== 'addAccount'" #right>
            <van-icon name="cross" size="18" @click="addScriptVisible = false" />
          </template>
        </van-nav-bar>

        <!-- 步骤条（仅非 addAccount 视图） -->
        <div v-if="addScriptView !== 'addAccount'" class="add-script-steps">
          <van-steps :active="addScriptStep" active-icon="success" active-color="#07c160">
            <van-step>选择账号</van-step>
            <van-step>选择角色</van-step>
            <van-step>确认创建</van-step>
          </van-steps>
        </div>

        <!-- step0：选择账号 -->
        <div v-if="addScriptView === 'step0'" class="panel-body">
          <van-radio-group v-model="selectedAccountId">
            <van-cell-group>
              <van-cell
                v-for="acc in mockAccounts"
                :key="acc.id"
                :title="acc.accountName"
                :label="`更新时间: ${acc.updateTime}`"
                clickable
                @click="onSelectAccount(acc)"
              >
                <template #right-icon>
                  <van-radio :name="acc.id" />
                </template>
              </van-cell>
            </van-cell-group>
          </van-radio-group>
          <van-empty v-if="mockAccounts.length === 0" description="暂无游戏账号" />
          <div class="add-new-row" @click="addScriptView = 'addAccount'">
            <van-icon name="plus" size="16" color="#1989fa" />
            <span>添加/同步账号</span>
          </div>
        </div>

        <!-- step1：选择角色 -->
        <div v-if="addScriptView === 'step1'" class="panel-body">
          <div v-if="rolesLoading" style="text-align: center; padding: 40px;">
            <van-loading size="24" vertical>加载角色列表中...</van-loading>
          </div>
          <template v-else>
            <van-empty v-if="scriptRoles.length === 0" description="该账号下暂无角色" />
            <van-radio-group v-else v-model="selectedRoleId">
              <van-cell-group>
                <van-cell
                  v-for="r in scriptRoles"
                  :key="r.id"
                  :title="r.roleName"
                  :label="`服务器: ${r.serverName}`"
                  clickable
                  @click="onSelectRole(r)"
                >
                  <template #right-icon>
                    <van-radio :name="r.id" />
                  </template>
                </van-cell>
              </van-cell-group>
            </van-radio-group>
          </template>
        </div>

        <!-- step2：确认创建 -->
        <div v-if="addScriptView === 'step2'" class="panel-body">
          <div class="confirm-card">
            <div class="confirm-section">
              <div class="confirm-label">所选账号</div>
              <div class="confirm-value">{{ selectedAccount?.accountName }}</div>
              <div class="confirm-sub">更新时间：{{ selectedAccount?.updateTime }}</div>
            </div>
            <div class="confirm-section">
              <div class="confirm-label">所选角色</div>
              <div class="confirm-value">{{ selectedRole?.roleName }}</div>
              <div class="confirm-sub">服务器：{{ selectedRole?.serverName }}</div>
            </div>
          </div>
          <div class="form-submit">
            <van-button type="primary" round block :loading="creating" loading-text="创建中..." @click="onCreateScript">
              确认创建
            </van-button>
          </div>
        </div>

        <!-- addAccount 视图 -->
        <div v-if="addScriptView === 'addAccount'" class="panel-body">
          <AddAccountForm @success="onAddAccountSuccess" @cancel="addScriptView = 'step0'" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog, showSuccessToast, showFailToast, showLoadingToast, closeToast } from 'vant'
import {
  getScriptsAPI,
  toggleScriptAPI,
  deleteScriptAPI,
  renewScriptAPI,
} from '../api/mock.js'
import { getLogsMock } from '../api/log-mock.js'
import AddAccountForm from '../components/AddAccountForm.vue'
import { authAPI, cardAPI, scriptAPI } from '../api/client'

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

// ==================== 基础状态 ====================

// 当前用户名（从 sessionStorage 获取）
const username = ref(sessionStorage.getItem('yun_username') || 'Unworthy014')

// 小太阳余额（优先取登录时后端返回的 sun_balance，缺省 35）
function getStoredSunBalance() {
  try {
    const user = JSON.parse(localStorage.getItem('yun_user') || '{}')
    return typeof user.sun_balance === 'number' ? user.sun_balance : 35
  } catch {
    return 35
  }
}
const sunBalance = ref(getStoredSunBalance())

// 小太阳余额弹窗（卡密兑换）
const sunRedeemVisible = ref(false)
const sunRedeemCode = ref('')
const redeeming = ref(false)

// 脚本列表
const scripts = ref([])

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
const addAccountForm = reactive({ name: '', channel: '', genType: '' })
const mockAccounts = ref([
  {
    id: 1,
    name: '我的游戏账号',
    accountName: 'mygame001',
    channel: '官服',
    genType: '手动',
    updateTime: '2026-06-15 14:30',
  },
  {
    id: 2,
    name: '小号账号',
    accountName: 'mygame002',
    channel: 'B服',
    genType: '自动',
    updateTime: '2026-07-20 09:12',
  },
  {
    id: 3,
    name: '测试账号',
    accountName: 'testgame003',
    channel: '官服',
    genType: '手动',
    updateTime: '2026-08-01 18:45',
  },
])
const mockRoles = ref([
  { id: 'role_001', name: '主角战士', server: '官方一区' },
  { id: 'role_002', name: '法师小明', server: '官方二区' },
  { id: 'role_003', name: '辅助小红', server: 'B服一区' },
])

// 太阳充值
const sunRechargeVisible = ref(false)
const sunRechargePlans = ref([
  { id: 1, amount: 10, price: 1 },
  { id: 2, amount: 50, price: 5 },
  { id: 3, amount: 100, price: 10 },
  { id: 4, amount: 500, price: 45 },
  { id: 5, amount: 1000, price: 80 },
])

// 阳光传递
const sunTransferVisible = ref(false)
const sunTransferForm = reactive({ targetId: '', amount: 1 })

// 太阳流水
const sunTransactionsVisible = ref(false)
const sunTransactions = ref([
  { type: '脚本续期', time: '2026-08-10 15:30', amount: -5 },
  { type: '太阳充值', time: '2026-08-09 10:00', amount: 50 },
  { type: '阳光传递（收入）', time: '2026-08-08 12:00', amount: 20 },
  { type: '兑换脚本时长', time: '2026-08-07 09:00', amount: -10 },
  { type: '推广奖励', time: '2026-08-06 14:00', amount: 5 },
])

// 推广中心
const promotionCenterVisible = ref(false)
const promotionStats = reactive({ userCount: 3, totalReward: 15 })
const promotionUsers = ref([
  { id: 1, name: '用户A', registerTime: '2026-07-01' },
  { id: 2, name: '用户B', registerTime: '2026-07-15' },
  { id: 3, name: '用户C', registerTime: '2026-08-05' },
])
const promotionRewards = ref([
  { desc: '用户A 注册奖励', time: '2026-07-01' },
  { desc: '用户B 注册奖励', time: '2026-07-15' },
  { desc: '用户C 注册奖励', time: '2026-08-05' },
])

// 更新记录
const updateLogVisible = ref(false)
const updateLogs = ref([
  { version: 'v2.0.130', time: '2026-08-01 10:00', content: '1. 优化脚本运行稳定性\n2. 修复已知问题\n3. 新增兑换码功能' },
  { version: 'v2.0.120', time: '2026-07-15 14:00', content: '1. 新增推广中心\n2. UI 界面优化\n3. 性能提升' },
  { version: 'v2.0.110', time: '2026-07-01 09:00', content: '1. 新增太阳充值功能\n2. 新增阳光传递\n3. 修复若干 bug' },
])

// 联系客服
const contactServiceVisible = ref(false)

// 修改密码
const changePasswordVisible = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '' })

// 教程弹窗
const tutorialVisible = ref(false)

// ==================== 添加脚本 popup 状态 ====================
const addScriptVisible = ref(false)
const addScriptStep = ref(0) // 0/1/2
const addScriptView = ref('step0') // 'step0'|'step1'|'step2'|'addAccount'
const selectedAccountId = ref(null)
const selectedRoleId = ref(null)
const selectedAccount = ref(null)
const selectedRole = ref(null)
const scriptRoles = ref([])
const rolesLoading = ref(false)
const creating = ref(false)

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

onMounted(async () => {
  try {
    scripts.value = await getScriptsAPI()
    // 预生成每个脚本的日志 mock
    scripts.value.forEach((s) => {
      allLogs.value[s.id] = getLogsMock(s.id)
    })
  } catch (e) {
    showFailToast('加载失败')
  }
})

// ==================== 计算属性 ====================

// 经搜索过滤后的日志列表
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
  }
  return colors[channel] || 'linear-gradient(135deg, #667eea, #764ba2)'
}

function getChannelEmoji(channel) {
  const emojis = {
    ios: '🍎',
    android: '🤖',
    pc: '💻',
    web: '🌐',
  }
  return emojis[channel] || '📱'
}

// ==================== 面板打开/关闭 ====================

/** 打开配置面板 — iframe 加载原站 config.html */
function openConfigPanel(script) {
  panelScript.value = script
  // 加时间戳防缓存，确保每次打开都是新加载
  configIframeSrc.value = '/config-pages/config.html?v=2.0.130&_t=' + Date.now()
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

/** 打开日志面板 — 原生渲染 */
function openLogPanel(script) {
  panelScript.value = script
  logSearchText.value = ''
  logDateFilter.value = 'today'
  logPanelVisible.value = true
}

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
      nodeIp: window.location.hostname,
      nodePort: window.location.port || '80',
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

/** 刷新日志 */
function refreshLogs() {
  showLoadingToast({ message: '刷新中...', duration: 0 })
  setTimeout(() => {
    if (!panelScript.value) return
    allLogs.value[panelScript.value.id] = getLogsMock(panelScript.value.id)
    closeToast()
    showSuccessToast('日志已刷新')
  }, 500)
}

/** 搜索日志（实时过滤由 computed 处理） */
function onLogSearch() {
  // 搜索由 filteredLogs computed 自动处理
}

// ==================== 状态面板操作 ====================

/** 刷新状态 — 重新调用 iframe 内 initStatusPage */
function refreshStatus() {
  const iframe = statusIframeRef.value
  if (iframe && iframe.contentWindow && iframe.contentWindow.initStatusPage) {
    iframe.contentWindow.initStatusPage({
      nodeIp: window.location.hostname,
      nodePort: window.location.port || '80',
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
      showSuccessToast(res.newStatus === 'running' ? '已启动' : '已停止')
    } else {
      showFailToast(res.message)
    }
  } catch (e) {
    showFailToast('操作失败')
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
        scripts.value = await getScriptsAPI()
        showSuccessToast('删除成功')
      }
    } catch (e) {
      // 用户取消删除
    }
  } else if (action.name === '续期') {
    const res = await renewScriptAPI(currentScript.value.id)
    if (res.success) {
      showSuccessToast('续期成功')
    } else {
      showFailToast(res.message)
    }
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

/** 兑换码提交 */
function handleExchangeCode() {
  if (!exchangeCode.value.trim()) {
    showToast('请输入兑换码')
    return
  }
  showSuccessToast('兑换成功！获得 10 ☀️')
  sunBalance.value += 10
  exchangeCode.value = ''
  exchangeCodeVisible.value = false
}

/** 打开游戏账号管理 */
function openAccountManage() {
  personalCenterVisible.value = false
  accountManageView.value = 'accounts'
  accountManageVisible.value = true
}

/** 进入角色管理 */
function openRoles(acct) {
  accountManageView.value = 'roles'
}

/** 删除账号 */
function handleDeleteAccount(acct) {
  showDialog({
    title: '确认删除',
    message: `确定删除账号「${acct.name}」吗？`,
    showCancelButton: true,
    confirmButtonColor: '#ee0a24',
  }).then(() => {
    mockAccounts.value = mockAccounts.value.filter((a) => a.id !== acct.id)
    showSuccessToast('删除成功')
  }).catch(() => {})
}

/** 添加账号 */
function handleAddAccount() {
  if (!addAccountForm.name.trim()) {
    showToast('请填写账号名称')
    return
  }
  showSuccessToast('添加成功')
  mockAccounts.value.push({
    id: Date.now(),
    name: addAccountForm.name,
    accountName: addAccountForm.name,
    channel: addAccountForm.channel || '官服',
    genType: addAccountForm.genType || '手动',
    updateTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  })
  addAccountForm.name = ''
  addAccountForm.channel = ''
  addAccountForm.genType = ''
  accountManageView.value = 'accounts'
}

/** 打开太阳充值 */
function openSunRecharge() {
  personalCenterVisible.value = false
  sunRechargeVisible.value = true
}

/** 充值选择 */
function handleRecharge(plan) {
  showDialog({
    title: '确认充值',
    message: `确认充值 ${plan.amount} ☀️，需支付 ¥${plan.price}？`,
    showCancelButton: true,
    confirmButtonColor: '#667eea',
  }).then(() => {
    sunBalance.value += plan.amount
    showSuccessToast(`充值成功！获得 ${plan.amount} ☀️`)
    sunRechargeVisible.value = false
  }).catch(() => {})
}

/** 打开阳光传递 */
function openSunTransfer() {
  personalCenterVisible.value = false
  sunTransferForm.targetId = ''
  sunTransferForm.amount = 1
  sunTransferVisible.value = true
}

/** 阳光传递确认 */
function handleSunTransferConfirm() {
  if (!sunTransferForm.targetId.trim()) {
    showToast('请输入对方ID')
    return
  }
  const fee = Math.ceil(sunTransferForm.amount * 0.1)
  const total = sunTransferForm.amount + fee
  if (total > sunBalance.value) {
    showFailToast('太阳余额不足')
    return
  }
  sunBalance.value -= total
  showSuccessToast('传递成功')
  sunTransferVisible.value = false
}

/** 打开太阳流水 */
function openSunTransactions() {
  personalCenterVisible.value = false
  sunTransactionsVisible.value = true
}

/** 打开推广中心 */
function openPromotionCenter() {
  personalCenterVisible.value = false
  promotionCenterVisible.value = true
}

/** 复制推广链接 */
function handleCopyPromoLink() {
  const link = `https://yun.example.com/ref/${username.value}`
  navigator.clipboard?.writeText(link).then(() => {
    showSuccessToast('链接已复制')
  }).catch(() => {
    showToast('复制失败，请手动复制')
  })
}

/** 打开更新记录 */
function openUpdateLog() {
  personalCenterVisible.value = false
  updateLogVisible.value = true
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

// 打开 popup 时重置状态
watch(addScriptVisible, (val) => {
  if (val) {
    addScriptStep.value = 0
    addScriptView.value = 'step0'
    selectedAccountId.value = null
    selectedRoleId.value = null
    selectedAccount.value = null
    selectedRole.value = null
    scriptRoles.value = []
    rolesLoading.value = false
    creating.value = false
  }
})

/** 选择账号：点击 cell → 选中 + 300ms 后自动进入 step1 */
function onSelectAccount(acc) {
  selectedAccountId.value = acc.id
  selectedAccount.value = acc
  setTimeout(() => {
    addScriptStep.value = 1
    addScriptView.value = 'step1'
    // 加载角色列表
    loadRoles()
  }, 300)
}

/** 加载角色列表（mock） */
function loadRoles() {
  rolesLoading.value = true
  scriptRoles.value = []
  setTimeout(() => {
    // 从 mockRoles 取 2~3 条
    const source = mockRoles.value
    const count = Math.min(source.length, 2 + (selectedAccount.value?.id % 2 || 0))
    scriptRoles.value = source.slice(0, count).map((r) => ({
      id: r.id,
      roleName: r.name,
      serverName: r.server,
    }))
    rolesLoading.value = false
  }, 600)
}

/** 选择角色：点击 cell → 选中 + 300ms 后自动进入 step2 */
function onSelectRole(r) {
  selectedRoleId.value = r.id
  selectedRole.value = r
  setTimeout(() => {
    addScriptStep.value = 2
    addScriptView.value = 'step2'
  }, 300)
}

/** 确认创建脚本 */
function onCreateScript() {
  creating.value = true
  setTimeout(() => {
    creating.value = false
    showSuccessToast('创建成功')
    addScriptVisible.value = false
    // 刷新脚本列表
    getScriptsAPI().then((data) => {
      scripts.value = data
    })
  }, 800)
}

/** addAccount 视图返回 */
function onAddScriptBack() {
  addScriptView.value = 'step0'
}

/** 添加账号成功回调 */
function onAddAccountSuccess(data) {
  showSuccessToast('添加成功')
  addScriptView.value = 'step0'
  // 把新账号 mock 加入 mockAccounts
  mockAccounts.value.push({
    id: Date.now(),
    name: data.accountName,
    accountName: data.accountName,
    channel: data.channel || '官服',
    genType: '手动',
    updateTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  })
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

/* ==================== 添加脚本 popup 样式 ==================== */

.add-script-steps {
  padding: 12px 16px;
  background: #fff;
}

.add-new-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #1989fa;
  font-size: 14px;
  cursor: pointer;
}

.add-new-row:active {
  opacity: 0.7;
}

.confirm-card {
  background: #fff;
  border-radius: 12px;
  margin: 16px;
  padding: 20px 16px;
}

.confirm-section {
  margin-bottom: 16px;
}

.confirm-section:last-child {
  margin-bottom: 0;
}

.confirm-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
}

.confirm-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.confirm-sub {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-submit {
  padding: 20px 16px;
}

.form-submit .van-button {
  height: 48px;
  font-size: 16px;
}
</style>
