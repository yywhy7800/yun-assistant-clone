// 一路狂飙 配置 Schema（对照 Web 面板功能：基础/通关/三倍芯片/抢红包）
window.CONFIG_SCHEMA = {
  "properties": {
    "basic": {
      "description": "基础设置",
      "properties": {
        "autoReconnect": {"type": "boolean", "description": "自动重连", "default": true},
        "reconnectInterval": {"type": "integer", "description": "重连间隔(分)", "default": 10, "min": 1, "dependsOn": "autoReconnect"},
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
      "description": "通关设置",
      "properties": {
        "autoClear": {"type": "locked", "description": "自动通关", "lockedMessage": "此功能暂不对外开放，如需使用请联系上级"}
      }
    },
    "triple": {
      "description": "三倍芯片",
      "properties": {
        "autoTriple": {"type": "boolean", "description": "自动刷三倍", "default": false},
        "tripleLevel": {"type": "integer", "description": "三倍关卡", "default": 211, "min": 1, "dependsOn": "autoTriple"},
        "tripleThreshold": {
          "type": "select", "description": "领取阈值", "default": "q4", "dependsOn": "autoTriple",
          "options": [
            {"value": "q3", "label": "Q3 蓝"},
            {"value": "q4", "label": "Q4 紫"},
            {"value": "q5", "label": "Q5 金"}
          ]
        }
      }
    },
    "redpocket": {
      "description": "抢红包",
      "properties": {
        "autoRedpocket": {"type": "boolean", "description": "自动抢红包", "default": false},
        "rpTarget": {"type": "integer", "description": "目标红包数", "default": 10, "min": 1, "max": 10, "dependsOn": "autoRedpocket"}
      }
    }
  }
}
