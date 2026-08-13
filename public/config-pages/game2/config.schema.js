// 一路狂飙 配置 Schema（对照 Web 面板功能：基础/完美通关/三倍芯片/抢红包世界）
window.CONFIG_SCHEMA = {
  "properties": {
    "basic": {
      "description": "基础设置",
      "properties": {
        "autoReconnect": {"type": "boolean", "description": "自动重连", "default": true},
        "reconnectInterval": {"type": "display", "description": "重连间隔", "value": "5~120 秒（指数退避）"},
        "loginMethod": {
          "type": "select", "description": "登录方式", "default": "auto",
          "options": [
            {"value": "auto", "label": "自动识别"},
            {"value": "mobile", "label": "手机密码"},
            {"value": "account", "label": "账号密码"}
          ]
        }
      }
    },
    "clear": {
      "description": "完美通关",
      "properties": {
        "perfectClear": {"type": "locked", "description": "完美通关", "lockedMessage": "暂不对外开放，如需要请联系上级"},
        "unfinishedLevel": {"type": "locked", "description": "未通关关卡", "lockedMessage": "暂不对外开放，如需要请联系上级"}
      }
    },
    "triple": {
      "description": "三倍芯片",
      "properties": {
        "autoTriple": {"type": "boolean", "description": "自动刷三倍", "default": false, "exclusiveWith": "redpocket_autoRedpocket"},
        "tripleLevel": {"type": "integer", "description": "三倍关卡", "default": 211, "min": 1, "dependsOn": "autoTriple"},
        "tripleThreshold": {
          "type": "select", "description": "领取阈值", "default": "q4", "dependsOn": "autoTriple",
          "options": [
            {"value": "q3", "label": "Q3 蓝"},
            {"value": "q4", "label": "Q4 紫"},
            {"value": "q5", "label": "Q5 金"}
          ]
        },
        "adLeft": {"type": "display", "description": "剩余3倍次数", "value": "查询中…"},
        "tripleStats": {"type": "display", "description": "本次已领", "value": "蓝 0 · 紫 0 · 金 0"}
      }
    },
    "redpocket": {
      "description": "抢红包（世界）",
      "properties": {
        "autoRedpocket": {"type": "boolean", "description": "自动抢红包", "default": false, "exclusiveWith": "triple_autoTriple"},
        "rpTarget": {"type": "integer", "description": "目标红包数", "default": 10, "min": 1, "max": 10, "dependsOn": "autoRedpocket"},
        "rpDiamond": {"type": "display", "description": "累计钻石", "value": "0"}
      }
    }
  }
}
