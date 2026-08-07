// 配置 Schema 定义
window.CONFIG_SCHEMA = {
  "properties": {
    "basic": {
      "description": "基础设置",
      "properties": {
        "enableReconnect": {"type": "boolean", "description": "自动重连", "default": true},
        "reconnectInterval": {"type": "integer", "description": "重连间隔(分)", "default": 10, "min": 10, "dependsOn": "enableReconnect"},
        "enableOfflineTime": {"type": "boolean", "description": "离线时间", "default": false, "help": "设定每日离线时间段，脚本在该时间段内停止运行（不跨天）"},
        "offlineTimeRange": {"type": "timeRangeList", "description": "离线时段", "default": [], "dependsOn": "enableOfflineTime", "help": "添加多个离线时间段，每段至少20分钟，时间范围00:00-23:59（不跨天）"}
      }
    },
    "sign": {
      "description": "福利设置",
      "properties": {
        "dailySign": {"type": "boolean", "description": "每日签到", "default": true},
        "autoPatch": {"type": "boolean", "description": "自动补签", "default": false},
        "shareVideoDouble": {"type": "boolean", "description": "视频双倍", "default": true},
        "signType": {"type": "boolean", "description": "防骗指南", "default": true},
        "draw": {"type": "boolean", "description": "福利宝箱", "default": true}
      }
    },
    "event": {
      "description": "事件设置",
      "properties": {
        "autoComplete": {"type": "boolean", "description": "随机事件", "default": true, "help": "自动完成随机事件"}
      }
    },
    "task": {
      "description": "任务设置",
      "properties": {
        "dailyTask": {"type": "boolean", "description": "每日任务", "default": true},
        "weeklyTask": {"type": "boolean", "description": "每周任务", "default": true},
        "mainTask": {"type": "boolean", "description": "主线任务", "default": true},
        "unlock": {"type": "boolean", "description": "解锁剧情", "default": false},
        "roadGrow": {"type": "boolean", "description": "成长之路", "default": true},
        "taskAch": {"type": "boolean", "description": "花坊悬赏", "default": false}
      }
    },
    "mail": {
      "description": "邮件设置",
      "properties": {
        "autoReceive": {"type": "boolean", "description": "收取邮件", "default": true}
      }
    },
    "cultivate": {
      "description": "培育设置",
      "properties": {
        "autoCultivate": {"type": "boolean", "description": "培育花朵", "default": false},
        "autoShare": {"type": "boolean", "description": "自动分享", "default": true, "dependsOn": "autoCultivate"},
        "autoHarvest": {"type": "boolean", "description": "自动收获", "default": true, "dependsOn": "autoCultivate"},
        "autoSpeedup": {"type": "boolean", "description": "视频加速", "default": false},
        "autoUpgrade": {"type": "boolean", "description": "花卉升级", "default": false},
        "targetLevel": {"type": "integer", "description": "目标等级", "default": 10, "dependsOn": "autoUpgrade", "help": "花卉升级的目标等级"}
      }
    },
    "land": {
      "description": "种植设置",
      "properties": {
        "autoHarvest": {"type": "boolean", "description": "自动收获", "default": true, "help": "自动收获成熟的花卉"},
        "harvestDelay": {"type": "integer", "description": "延迟收获(秒)", "default": 0, "min": 0, "dependsOn": "autoHarvest", "help": "花卉成熟后延迟多少秒再收获，0表示立即收获"},
        "unlockLand": {"type": "boolean", "description": "解锁土地", "default": false, "help": "自动解锁新的土地"},
        "autoPlant": {"type": "boolean", "description": "自动种植", "default": true, "help": "普通种植策略,优先级别最低；先满足活动/特需；剩余地块执行,如果水滴不够/保留,那么将不会种植,会空地"},
        "groupWatering": {"type": "boolean", "description": "分组浇水", "default": false, "dependsOn": "autoPlant", "help": "分组浇水，为了保持美观，4个1组，满4个水滴浇一组，否则等待水滴达到4个"},
        "enableSpecialDemand": {"type": "boolean", "description": "特需定制", "default": false, "help": "库存少的优先种植"},
        "demandLandCount": {"type": "string", "description": "需求占地", "enum": ["4", "8", "16", "32", "64"], "default": "4", "dependsOn": "enableSpecialDemand", "help": "从地块1开始；如设置4；那么1-4地块在检测到特需未满足时会锁定执行特需"},
        "demandList": {"type": "demandEditor", "description": "需求设置", "default": [], "dependsOn": "enableSpecialDemand", "help": "添加特需花卉及其需求数量"},
        "plantLevel": {"type": "range", "description": "种植等级", "min": 1, "max": 20, "default": [1, 20], "dependsOn": "autoPlant", "help": "拖动滑块选择等级区间"},
        "plantQuality": {"type": "multiselect", "description": "种植品质", "options": ["凡", "普", "珍", "华", "仙"], "default": [1, 2, 3, 4, 5], "dependsOn": "autoPlant", "help": "可多选品质；库存少的优先种植"},
        "singleFlowerLandCount": {"type": "string", "description": "单花占地数量", "enum": ["1", "2", "4", "8", "16", "32", "64"], "default": "4", "dependsOn": "autoPlant", "help": "指一种花卉占几块地，可实现土地规整"},
        "plantMode": {
          "type": "select",
          "description": "种植模式",
          "default": "strict",
          "options": [
            {"value": "strict", "label": "严格模式"},
            {"value": "fill",   "label": "补全模式"}
          ],
          "dependsOn": "autoPlant",
          "help": "严格模式：严格按照单花占地数量种植，地块不足时等待满足条件再种，美观但效率较低；补全模式：优先严格模式，有空地时自动补全，效率高但美观性稍差；注意：单花占地数量 < 8 时补全模式不生效"
        },
        "reserveWater": {"type": "integer", "description": "保留水滴数量", "default": 0, "min": 0, "max": 2000000000, "dependsOn": "autoPlant"},
        "videoSpeedup": {"type": "boolean", "description": "视频加速", "default": true, "dependsOn": "autoPlant"},
        "videoSpeedupThreshold": {"type": "integer", "description": "加速阈值(%)", "default": 100, "min": 0, "max": 100, "dependsOn": "videoSpeedup", "help": "触发加速所需的最低地块占比（百分比）。实际地块数×(阈值÷100)=触发数（最低1块）。例如填50，共32块地需≥16块种植才触发；填100则需全部地块种满才触发；填0则永远不触发"},
        "itemSpeedup": {"type": "boolean", "description": "道具加速", "default": false, "dependsOn": "autoPlant", "help": "使用加速卡加速花卉收获"},
        "itemSpeedupLimit": {"type": "integer", "description": "道具加速保留数量", "default": 0, "min": 0, "max": 2000000000, "dependsOn": "itemSpeedup"},
        "itemSpeedupMinSeconds": {"type": "integer", "description": "剩余超过N秒才加速", "default": 0, "min": 0, "max": 86400, "dependsOn": "itemSpeedup", "help": "距收获剩余时间超过此秒数的地块才使用道具加速，0表示不限制"},
        "enableBlacklist": {"type": "boolean", "description": "种植黑名单", "default": false, "dependsOn": "autoPlant", "help": "黑名单的花朵永远不种植"},
        "blacklist": {"type": "flowerMultiselect", "description": "黑名单列表", "default": [], "dependsOn": "enableBlacklist", "help": "选择不种植的花卉"}
      }
    },
    "elves": {
      "description": "花灵设置",
      "properties": {
        "autoPlantElves": {"type": "boolean", "description": "种植花灵", "default": false, "help": "开启后从第1块地起划出花灵区（独占，不被特需/普通种植/活动/竞赛占用）；主花区固定占前4块（永不浇水占位），副花区占剩余块数（正常种/浇/收循环）；达到每日上限时花灵区释放给普通种植；水滴低于保留水滴时暂停种植；可开启视频/道具加速仅对副花区加速；更换花灵品种后主花区旧种植将自动被浇水收获，待清空后种新配方"},
        "plantElvesId": {"type": "elvesSingleselect", "description": "指定花灵", "default": 0, "dependsOn": "autoPlantElves", "help": "选择要种植的花灵品种，不选则降级为普通种植"},
        "elvesLandCount": {"type": "string", "description": "花灵占地数量", "enum": ["8", "16", "24", "32"], "default": "8", "dependsOn": "autoPlantElves", "help": "从第1块地开始,划出多少块地专供花灵种植,剩余地块由特需/普通种植/活动/竞赛等使用"},
        "reserveWater": {"type": "integer", "description": "保留水滴", "default": 0, "min": 0, "max": 2000000000, "dependsOn": "autoPlantElves", "help": "花灵种植时保留的最低水滴数量，低于此值时暂停花灵种植"},
        "elvesVideoSpeedup": {"type": "boolean", "description": "视频加速", "default": false, "dependsOn": "autoPlantElves", "help": "花灵每日上限未达到时，对副花区地块使用视频加速成熟"},
        "elvesItemSpeedup": {"type": "boolean", "description": "道具加速", "default": false, "dependsOn": "autoPlantElves", "help": "花灵每日上限未达到时，对副花区地块使用加速卡加速成熟"},
        "elvesItemSpeedupLimit": {"type": "integer", "description": "加速卡保留数量", "default": 0, "min": 0, "max": 2000000000, "dependsOn": "elvesItemSpeedup"},
        "autoRequestAid": {"type": "boolean", "description": "申请协助", "default": false},
        "autoHelpFriend": {"type": "boolean", "description": "好友协助", "default": false, "help": "自动协助好友的花灵申请"},
        "helpFriendLimit": {"type": "integer", "description": "协助次数", "default": 99999, "dependsOn": "autoHelpFriend", "help": "每日协助好友的最大次数，默认99999（不限制）"},
        "autoRecvAidRwd": {"type": "boolean", "description": "领取加成", "default": true, "dependsOn": "autoRequestAid"},
        "recvAidRwdThreshold": {"type": "integer", "description": "领取加成阈值", "default": 1, "dependsOn": "autoRecvAidRwd", "help": "好友协助人数达到或超过该值时才领取加成"},
        "autoDispatch": {"type": "boolean", "description": "自动派遣", "help": "自动派遣花灵到场所，默认优先派遣双倍加成花灵，无双倍则派遣库存最多的单倍花灵", "default": false},
        "dispatchSlotCount": {"type": "integer", "description": "派遣栏位数量", "default": 5, "min": 1, "max": 5, "dependsOn": "autoDispatch", "help": "每轮最多派遣几个派遣栏位，1~5"},
        "dispatchElvesNum": {"type": "integer", "description": "花灵派遣数量", "default": 1, "min": 1, "max": 12, "dependsOn": "autoDispatch", "help": "每个派遣栏位派遣的花灵个数，1~12"},
        "dispatchDoubleOnly": {"type": "boolean", "description": "仅派遣双倍", "default": false, "dependsOn": "autoDispatch", "help": "开启后仅在有双倍加成花灵时才派遣，没有则跳过"},
        "autoRecvDispatchRwd": {"type": "boolean", "description": "领取收益", "default": true, "help": "独立开关，与自动派遣互不影响；开启后自动领取已到期的派遣收益"}
      }
    },
    "water": {
      "description": "水滴设置",
      "properties": {
        "waterwheelRecv": {"type": "boolean", "description": "水车水滴", "default": true, "help": "自动领取水车水滴"},
        "freeWaterRecv": {"type": "boolean", "description": "定时水滴", "default": true, "help": "自动领取定时免费水滴"},
        "waterRecvLimit": {"type": "boolean", "description": "水滴阈值", "default": false, "help": "开启后，水滴低于阈值才领取"},
        "waterRecvThreshold": {"type": "integer", "description": "水滴阈值", "default": 1, "dependsOn": "waterRecvLimit", "help": "水滴数量低于该值时才领取"},
        "waterRecvFallback": {"type": "boolean", "description": "兜底领取", "default": false, "dependsOn": "waterRecvLimit", "help": "如果 23:00 之后水滴还未领取完，则自动领取所有剩余水滴"}
      }
    },
    "order": {
      "description": "订单设置",
      "properties": {
        "orderFlower": {"type": "boolean", "description": "居民订单", "default": true, "subgroup": "居民订单"},
        "dailyFlowerOrderLimit": {"type": "integer", "description": "订单上限", "default": 1200, "min": 0, "max": 99999, "dependsOn": "orderFlower", "subgroup": "居民订单"},
        "orderSatin": {"type": "boolean", "description": "绸缎订单", "default": true, "subgroup": "居民订单"},
        "dailySatinOrderLimit": {"type": "integer", "description": "订单上限", "default": 120, "min": 0, "max": 99999, "dependsOn": "orderSatin", "subgroup": "居民订单"},
        "orderDecorate": {"type": "boolean", "description": "建材订单", "default": true, "subgroup": "居民订单"},
        "dailyDecorateOrderLimit": {"type": "integer", "description": "订单上限", "default": 120, "min": 0, "max": 99999, "dependsOn": "orderDecorate", "subgroup": "居民订单"},
        "orderQuality": {"type": "multiselect", "description": "订单品质", "options": ["凡", "普", "珍", "华", "仙"], "default": [1, 2, 3, 4, 5], "orDependsOn": ["orderFlower", "orderSatin", "orderDecorate"], "subgroup": "居民订单"},
        "orderCustomer": {"type": "boolean", "description": "顾客订单", "default": true, "subgroup": "顾客订单"},
        "dailyCustomerOrderLimit": {"type": "integer", "description": "订单上限", "default": 120, "min": 0, "max": 99999, "dependsOn": "orderCustomer", "subgroup": "顾客订单"},
        "orderRejectCustomer": {"type": "boolean", "description": "拒接订单", "default": true, "dependsOn": "orderCustomer", "help": "花朵库存不足时，若所需花卉未培育完成、或因等级/品质/黑名单限制不会去种植，则自动拒绝该订单", "subgroup": "顾客订单"},
        "orderRejectIfCanPlant": {"type": "boolean", "description": "可种也拒绝", "default": false, "dependsOn": "orderRejectCustomer", "help": "开启后，即使所需花卉可以种植，库存不足时也会拒绝该订单", "subgroup": "顾客订单"},
        "orderPalace": {"type": "boolean", "description": "宫廷订单", "default": true, "subgroup": "宫廷特供"},
        "orderPalaceQuality": {"type": "multiselect", "description": "宫廷特供品质", "options": ["凡", "普", "珍", "华", "仙"], "default": [1, 2, 3, 4, 5], "dependsOn": "orderPalace", "subgroup": "宫廷特供"},
        "orderPalaceUseItem": {"type": "boolean", "description": "道具加速", "default": false, "dependsOn": "orderPalace", "subgroup": "宫廷特供", "help": "宫廷特供库存不足时使用道具加速鲜花收获"},
        "orderTeam": {"type": "boolean", "description": "自动完成", "default": true, "subgroup": "团队订单"},
        "orderTeamLoop": {"type": "boolean", "description": "再来一单", "default": false, "dependsOn": "orderTeam", "subgroup": "团队订单", "warn": true, "help": "开启后团队订单完成时自动再来一单，每次消耗60元宝，请谨慎设置"},
        "orderTeamOnlyCultivated": {"type": "boolean", "description": "仅已培育", "default": false, "dependsOn": "orderTeam", "subgroup": "团队订单"},
        "orderTeamQuality": {"type": "multiselect", "description": "品质限定", "options": ["凡", "普", "珍", "华", "仙"], "default": [1, 2, 3, 4, 5], "dependsOn": "orderTeam", "subgroup": "团队订单"}
      }
    },
    "pearl": {
      "description": "珍珠设置",
      "properties": {
        "autoDraw": {"type": "boolean", "description": "开启珍珠", "default": false},
        "autoRecv": {"type": "boolean", "description": "收获珍珠", "default": true},
        "freePearl": {"type": "boolean", "description": "免费珍珠", "default": true, "help": "领取免费的珍珠"},
        "autoHire": {"type": "boolean", "description": "雇佣劳工", "default": true},
        "hireFriendFirst": {"type": "boolean", "description": "好友优先", "default": false, "dependsOn": "autoHire", "help": "开启后优先雇佣好友，关闭则优先世界推荐"},
        "hireLevelFilter": {"type": "boolean", "description": "等级限制", "default": false, "dependsOn": "autoHire", "help": "开启后只雇佣等级在指定区间内的劳工"},
        "hireLevelMin": {"type": "integer", "description": "等级下限", "default": 0, "min": 0, "max": 99999, "dependsOn": "hireLevelFilter", "help": "只雇佣等级 ≥ 此值的劳工，0表示不限制"},
        "hireLevelMax": {"type": "integer", "description": "等级上限", "default": 0, "min": 0, "max": 99999, "dependsOn": "hireLevelFilter", "help": "只雇佣等级 ≤ 此值的劳工，0表示不限制"},
        "hireBookLimit": {"type": "integer", "description": "雇佣券上限", "default": 1, "min": 0, "max": 99999, "dependsOn": "autoHire", "help": "每日最多消耗的雇佣书数量"},
        "enableDefense": {"type": "boolean", "description": "开启防身", "default": false},
        "buyHireBook": {"type": "boolean", "description": "买雇佣书", "default": false},
        "buyHireBookYuanBaoLimit": {"type": "integer", "description": "元宝上限", "default": 0, "min": 0, "max": 99999, "dependsOn": "buyHireBook", "help": "每日购买雇佣书消耗元宝的上限，设为0则不购买；按需购买,库存数量>=4也不购买;优先购买大包用满预算（非VIP：25/80元宝；VIP还可额外购买160元宝大包）", "warn": true}
      }
    },
    "friend": {
      "description": "好友设置",
      "properties": {
        "autoSteal": {"type": "boolean", "description": "自动偷花", "default": false},
        "stealElves": {"type": "boolean", "description": "偷取花灵", "default": false, "dependsOn": "autoSteal", "help": "开启后可能偷到好友地块产出的花灵"},
        "stealSubFlower": {"type": "boolean", "description": "偷取副花", "default": null, "dependsOn": "autoSteal", "help": "关闭后，若好友地块中某花朵是花灵书册的副花品种、且该好友同时种了对应主花，则判定为花灵副花并跳过不偷；默认开启"},
        "stealMode": {
          "type": "select",
          "description": "偷花模式",
          "default": "quality",
          "options": [
            {"value": "quality", "label": "指定品质"},
            {"value": "flower",  "label": "指定花朵"},
            {"value": "exclude", "label": "排除花朵"}
          ],
          "dependsOn": "autoSteal"
        },
        "stealQualities": {
          "type": "multiselect",
          "description": "指定品质",
          "options": ["凡", "普", "珍", "华", "仙"],
          "default": [1, 2, 3, 4, 5],
          "dependsOn": "autoSteal",
          "showWhen": {"stealMode": "quality"},
          "help": "只偷指定品质的花卉"
        },
        "stealFlowers": {
          "type": "flowerMultiselect",
          "description": "指定花朵",
          "default": [],
          "dependsOn": "autoSteal",
          "showWhen": {"stealMode": "flower"},
          "help": "只偷指定花卉"
        },
        "excludeFlowers": {
          "type": "flowerMultiselect",
          "description": "排除花朵",
          "default": [],
          "dependsOn": "autoSteal",
          "showWhen": {"stealMode": "exclude"},
          "help": "排除指定花卉，其余均可偷"
        },
        "stealFriendStrategy": {
          "type": "select",
          "description": "好友策略",
          "default": "0",
          "options": [
            {"value": "0", "label": "不指定好友"},
            {"value": "1", "label": "指定好友优先"},
            {"value": "2", "label": "仅指定好友"}
          ],
          "dependsOn": "autoSteal"
        },
        "stealPreferFriends": {"type": "memberList", "description": "指定好友", "default": [], "dependsOn": "autoSteal", "showWhen": {"stealFriendStrategy": ["1", "2"]}, "help": "指定好友优先时优先偷指定好友，仅指定好友时只偷指定好友"},
        "maxStealPerFrd": {"type": "integer", "description": "单友偷取上限", "default": 10, "min": 0, "max": 99999, "dependsOn": "autoSteal", "help": "每个好友最多偷取花卉次数"},
        "buyStealCnt": {"type": "boolean", "description": "购买偷取次数", "default": false, "dependsOn": "autoSteal", "help": "用完基础次数后自动购买额外次数"},
        "buyStealCntNum": {"type": "integer", "description": "购买次数", "default": 0, "min": 0, "max": 99999, "dependsOn": "buyStealCnt"}
      }
    },
    "shopCultivate": {
      "description": "商城设置",
      "properties": {
        "freeDiamond": {"type": "boolean", "description": "视频礼包", "default": true},
        "buy": {"type": "boolean", "description": "材料商店", "default": false},
        "freeRefresh": {"type": "boolean", "description": "免费刷新", "default": true, "dependsOn": "buy"},
        "dailyCostLimit": {"type": "integer", "description": "每日花费上限", "default": 0, "min": 0, "max": 2000000000, "dependsOn": "buy", "help": "每日累计花费金币的上限，超出预算的商品跳过；0表示不限制"}
      }
    },
    "fml": {
      "description": "公会设置",
      "properties": {
        "autoBuild": {"type": "boolean", "description": "公会建设", "default": true, "help": "自动进行公会建设"},
        "videoBuild": {"type": "boolean", "description": "视频建设", "default": true, "dependsOn": "autoBuild", "help": "每日1次"},
        "goldBuild": {"type": "boolean", "description": "金币建设", "default": true, "dependsOn": "autoBuild", "help": "每次10000金币；"},
        "diamondBuild": {"type": "boolean", "description": "元宝建设", "default": false, "dependsOn": "autoBuild", "help": "每次10元宝；如果开启了元宝建设并且开启了金币建设,那么优先元宝建设,如果元宝不足再使用金币建设!", "warn": true},
        "collectEnergy": {"type": "boolean", "description": "能量森林", "default": false, "help": "自动领取公会能量森林的能量"},
        "autoFlowerShare": {"type": "boolean", "description": "鲜花分享", "default": false, "help": "自动分享/摘取公会鲜花"},
        "autoShare": {"type": "boolean", "description": "自动分享", "default": false, "dependsOn": "autoFlowerShare", "help": "自动分享鲜花到公会"},
        "shareMode": {
          "type": "select", 
          "description": "分享模式", 
          "default": "quality",
          "options": [
            {"value": "quality", "label": "指定品质"},
            {"value": "flower", "label": "指定花朵"}
          ],
          "dependsOn": "autoShare"
        },
        "shareQualities": {
          "type": "multiselect",
          "description": "品质限定", 
          "options": ["凡", "普", "珍", "华", "仙"],
          "default": [1, 2, 3, 4, 5],
          "dependsOn": "autoShare",
          "showWhen": {"shareMode": "quality"},
          "help": "选择要分享的花卉品质"
        },
        "shareFlowers": {
          "type": "flowerMultiselect",
          "description": "花卉选择", 
          "default": [],
          "dependsOn": "autoShare",
          "showWhen": {"shareMode": "flower"},
          "help": "选择要分享的具体花卉"
        },
        "autoTake": {"type": "boolean", "description": "自动摘花", "default": false, "dependsOn": "autoFlowerShare", "help": "自动领取公会成员分享的花卉"},
        "takeMode": {
          "type": "select", 
          "description": "摘花模式", 
          "default": "quality",
          "options": [
            {"value": "quality", "label": "指定品质"},
            {"value": "flower", "label": "指定花朵"}
          ],
          "dependsOn": "autoTake",
          "help": "选择领取花卉的策略"
        },
        "takeQualities": {
          "type": "multiselect",
          "description": "品质限定", 
          "options": ["凡", "普", "珍", "华", "仙"],
          "default": [1, 2, 3, 4, 5],
          "dependsOn": "autoTake",
          "showWhen": {"takeMode": "quality"},
          "help": "选择要领取的花卉品质"
        },
        "takeFlowers": {
          "type": "flowerMultiselect",
          "description": "花卉选择", 
          "default": [],
          "dependsOn": "autoTake",
          "showWhen": {"takeMode": "flower"},
          "help": "选择要领取的具体花卉"
        },
        "autoLand": {"type": "boolean", "description": "鲜花种植", "default": false, "help": "自动收获/种植公会种植地"},
        "autoHarvest": {"type": "boolean", "description": "自动收获", "default": false, "dependsOn": "autoLand", "help": "自动收获公会种植地的花卉"},
        "autoPlant": {"type": "boolean", "description": "自动种植", "default": false, "dependsOn": "autoLand", "help": "自动在公会种植地种植花卉；每20分钟更换一次花卉"},
        "plantMode": {
          "type": "select", 
          "description": "种植策略", 
          "default": "quality",
          "options": [
            {"value": "quality", "label": "指定品质"},
            {"value": "flower", "label": "指定花朵"}
          ],
          "dependsOn": "autoPlant",
          "help": "选择种植花卉的策略"
        },
        "plantQualities": {
          "type": "multiselect",
          "description": "品质限定",
          "options": ["凡", "普", "珍", "华", "仙"],
          "default": [1, 2, 3, 4, 5],
          "dependsOn": "autoPlant",
          "showWhen": {"plantMode": "quality"},
          "help": "选择要种植的花卉品质"
        },
        "plantFlowers": {
          "type": "flowerMultiselect",
          "description": "指定花朵", 
          "default": [],
          "dependsOn": "autoPlant",
          "showWhen": {"plantMode": "flower"},
          "help": "选择要种植的具体花卉"
        },
        "plantPriority": {
          "type": "select",
          "description": "优先模式",
          "default": "minStock",
          "options": [
            {"value": "minStock", "label": "库存少优先"},
            {"value": "minLevel", "label": "等级低优先"}
          ],
          "dependsOn": "autoPlant",
          "help": "库存少优先：优先种植背包库存最少的花卉；等级低优先：优先种植培育等级最低的花卉"
        },
        "maxLevelLimit": {
          "type": "integer",
          "description": "最高等级限制",
          "default": 0,
          "min": 0,
          "max": 99999,
          "dependsOn": "autoPlant",
          "help": "只种植等级不超过此值的花卉，0表示不限制"
        },
        "raceEnabled": {"type": "boolean", "description": "公会竞赛", "default": false, "help": "自动执行公会竞赛功能（接取任务、领取竞赛宝箱等）"},
        "raceBox": {"type": "boolean", "description": "开启宝箱", "default": false, "dependsOn": "raceEnabled", "help": "自动领取竞赛宝箱"},
        "raceTake": {"type": "boolean", "description": "接取任务", "default": true, "dependsOn": "raceEnabled", "help": "开启后按接取规则筛选并接取任务"},
        "raceTakeDelay": {"type": "integer", "description": "延迟接取(秒)", "default": 0, "min": 0, "dependsOn": "raceTake", "help": "任务刷新后延迟多少秒再接取，0表示立即接取"},
        "raceTakeFilter": {
          "type": "filterRuleList",
          "description": "接取规则",
          "dependsOn": "raceTake",
          "mode": "take",
          "help": "配置每种任务类型是否接取及分数区间，分数为任务当前分(实际分数,不是基础分)",
          "default": [
            {"key": "normal",       "label": "普通任务",     "enabled": true,  "minScore": 0, "maxScore": 999},
            {"key": "sysUpgrade",   "label": "系统升级任务", "enabled": true,  "minScore": 0, "maxScore": 999},
            {"key": "selfUpgrade",  "label": "自己升级任务", "enabled": true,  "minScore": 0, "maxScore": 999},
            {"key": "otherUpgrade", "label": "他人升级任务", "enabled": false, "minScore": 0, "maxScore": 999, "memberMode": "all", "members": []}
          ]
        },
        "raceCancel": {"type": "boolean", "description": "取消任务", "default": false, "dependsOn": "raceEnabled", "help": "自动取消当前持有的满足取消规则的任务；开启后，符合取消规则的任务在触发种植时也会跳过（避免种了又被取消）"},
        "raceCancelFilter": {
          "type": "filterRuleList",
          "description": "取消规则",
          "dependsOn": "raceCancel",
          "mode": "cancel",
          "help": "分数为任务当前分(实际分数,不是基础分)，落在区间内则取消，0~0 表示不取消",
          "default": [
            {"key": "normal",   "label": "普通任务", "canCancel": false, "minScore": 0, "maxScore": 0},
            {"key": "upgraded", "label": "升级任务", "canCancel": false, "minScore": 0, "maxScore": 0}
          ]
        },
        "raceUpgrade": {"type": "boolean", "description": "升级任务", "default": false, "dependsOn": "raceEnabled", "help": "接取任务后花费元宝自动升级", "warn": true},
        "raceUpgradeMinScore": {"type": "intRange", "description": "分数", "pairRole": "start", "pairWith": "raceUpgradeMaxScore", "default": 0, "min": 0, "dependsOn": "raceUpgrade", "help": "分数为任务当前分(实际分数,不是基础分)，只升级落在区间内的任务，两个值均为0表示不升级"},
        "raceUpgradeMaxScore": {"type": "intRange", "description": "升级分数上限", "pairRole": "end", "default": 999, "min": 0, "dependsOn": "raceUpgrade"},
        "racePriorityEnabled": {"type": "boolean", "description": "自定优先级", "default": false, "dependsOn": "raceTake", "help": "关闭时从可用任务中随机接取一个；开启后按下方列表顺序优先接取，若所有已启用类型均无可用任务则本轮跳过接取"},
        "racePriorityList": {
          "type": "sortableList",
          "description": "任务优先级",
          "dependsOn": "racePriorityEnabled",
          "help": "拖动排序，越靠前优先级越高；右侧开关关闭=禁用该类型。若所有已启用类型均无可用任务，本轮跳过接取",
          "default": [
            {"type": 3044, "label": "培育鲜花", "enabled": false},
            {"type": 3035, "label": "升级鲜花", "enabled": false},
            {"type": 3023, "label": "雇佣劳工", "enabled": false},
            {"type": 3024, "label": "好友偷花", "enabled": false},
            {"type": 3052, "label": "动物互动", "enabled": false},
            {"type": 3017, "label": "材料购买", "enabled": false},
            {"type": 3016, "label": "顾客订单", "enabled": false},
            {"type": 3006, "label": "居民订单", "enabled": false},
            {"type": 3018, "label": "宫廷订单", "enabled": false},
            {"type": 3034, "label": "制作花艺", "enabled": false},
            {"type": 3030, "label": "上架花艺", "enabled": false},
            {"type": 3036, "label": "收获鲜花", "enabled": false},
            {"type": 2004, "label": "VIP购买",  "enabled": false}
          ]
        },
        "raceFinish": {"type": "boolean", "description": "完成任务", "default": true, "dependsOn": "raceEnabled", "help": "自动种植鲜花完成收花任务"},
        "raceVideoBoost": {"type": "boolean", "description": "视频加速", "default": false, "dependsOn": "raceFinish", "help": "公会竞赛收花任务中，种植鲜花时使用视频加速成熟"},
        "raceItemBoost": {"type": "boolean", "description": "道具加速", "default": false, "dependsOn": "raceFinish", "help": "公会竞赛收花任务中，种植鲜花时使用道具加速成熟"},
        "raceDelete": {"type": "boolean", "description": "删除任务", "default": false, "dependsOn": "raceEnabled", "help": "会长/副会长：自动删除符合删除规则的未接任务"},
        "raceDeleteFilter": {
          "type": "filterRuleList",
          "description": "删除规则",
          "dependsOn": "raceDelete",
          "mode": "delete",
          "help": "分数为任务当前分(实际分数,不是基础分)，落在区间内则删除，0~0 表示不删除",
          "default": [
            {"key": "normal",       "label": "普通任务",     "canDelete": false, "minScore": 0, "maxScore": 0},
            {"key": "sysUpgrade",   "label": "系统升级任务", "canDelete": false, "minScore": 0, "maxScore": 0},
            {"key": "selfUpgrade",  "label": "自己升级任务", "canDelete": false, "minScore": 0, "maxScore": 0},
            {"key": "otherUpgrade", "label": "他人升级任务", "canDelete": false, "minScore": 0, "maxScore": 0, "memberMode": "all", "members": []}
          ]
        },
        "autoRecvRedEnvelope": {"type": "boolean", "description": "公会红包", "default": false, "help": "自动领取公会红包"}
      }
    },
    "flowerArt": {
      "description": "花艺设置",
      "properties": {
        "autoCollectReward": {"type": "boolean", "description": "图鉴奖励", "default": true, "help": "自动领取已制作但未领取的花艺品图鉴奖励"},
        "autoShareRwd": {"type": "boolean", "description": "花艺分享", "default": false, "help": "自动分享首次制作的花艺品，领取分享奖励"},
        "autoFirstMake": {"type": "boolean", "description": "首次制作", "default": false, "help": "自动制作从未制作过的花艺品（花瓶已解锁且背包有材料），每次制作1个并立即领取首次分享奖励"},
        "autoSell": {"type": "boolean", "description": "自动上架", "default": true, "subgroup": "上架设置", "help": "自动上架背包中已有库存的花艺品到花架，如果未指定花艺/花瓶，则自动上架库存最多的花艺,每次上架12个,不足则不上架"},
        "clearStock": {"type": "boolean", "description": "清除库存", "default": false, "dependsOn": "autoSell", "subgroup": "上架设置", "help": "开启后库存不足12个也会上架，用于清空剩余散件"},
        "autoMake": {"type": "boolean", "description": "自动制作", "default": false, "dependsOn": "autoSell", "subgroup": "上架设置", "help": "当花架为空且背包库存也为0时，自动制作花艺品，必须指定花艺或花瓶，否则不制作,每次制作12个,不足则不制作"},
        "autoMakeFilter": {"type": "boolean", "description": "指定花艺", "default": false, "dependsOn": "autoSell", "subgroup": "上架设置", "help": "优先级高于指定花瓶，自动上架和自动制作均依赖此列表，不开启则不限制上架"},
        "autoMakeList": {"type": "flowerArtMultiselect", "description": "花艺列表", "default": [], "dependsOn": "autoMakeFilter", "subgroup": "上架设置", "help": "指定自动制作的花艺品配方，搜索并选择具体配方"},
        "sellVasesFilter": {"type": "boolean", "description": "指定花瓶", "default": false, "dependsOn": "autoSell", "subgroup": "上架设置", "help": "优先级低于指定花艺，自动上架和自动制作均依赖此列表，不开启则不限制上架"},
        "sellVases": {"type": "vaseMultiselect", "description": "花瓶列表", "default": [], "dependsOn": "sellVasesFilter", "subgroup": "上架设置", "help": "只会上架指定花瓶的花艺品，不选则不限制"}
      }
    },
    "pet": {
      "description": "宠物设置",
      "properties": {
        "autoRecall": {
          "type": "boolean",
          "description": "自动召回",
          "default": false,
          "help": "自动召回外出的宠物"
        },
        "autoBuyFood": {
          "type": "boolean",
          "description": "购买猫粮",
          "default": false,
          "help": "猫粮不足时自动购买"
        },
        "autoFeed": {
          "type": "boolean",
          "description": "自动喂猫",
          "default": false,
          "help": "当宠物饱食度低于阈值时自动喂食"
        },
        "satietyThreshold": {
          "type": "integer",
          "description": "饱食度阈值",
          "default": 50,
          "dependsOn": "autoFeed",
          "help": "饱食度低于此值时触发喂食"
        },
        "autoStroke": {
          "type": "boolean",
          "description": "自动撸猫",
          "default": false,
          "help": "CD结束后自动抚摸宠物"
        },
        "autoGame2048": {
          "type": "boolean",
          "description": "丰仓鱼干",
          "default": false,
          "help": "自动玩丰仓鱼干小游戏获取喵币，三个游戏本周喵币累计满5000则全部跳过"
        },
        "autoGamePop": {
          "type": "boolean",
          "description": "奇妙泡泡",
          "default": false,
          "help": "自动玩奇妙泡泡小游戏获取喵币，三个游戏本周喵币累计满5000则全部跳过"
        },
        "autoGameElim": {
          "type": "boolean",
          "description": "花香满园",
          "default": false,
          "help": "自动玩花香满园小游戏获取喵币，三个游戏本周喵币累计满5000则全部跳过"
        }
      }
    },
    "flowerMarket": {
      "description": "花贸市场",
      "properties": {
        "unlockCostItem": {"type": "boolean", "description": "解锁货架", "default": false, "help": "开启后允许消耗道具解锁9号货架"},
        "autoShelf": {"type": "boolean", "description": "花卉上架", "default": false, "help": "自动将鲜花上架到空货架"},
        "shelfStrategy": {
          "type": "select",
          "description": "上架策略",
          "default": "most",
          "options": [
            {"value": "most", "label": "库存最多"},
            {"value": "specified", "label": "指定花朵"},
            {"value": "demand", "label": "指定需求"}
          ],
          "dependsOn": "autoShelf"
        },
        "shelfFlowers": {
          "type": "flowerMultiselect",
          "description": "指定花朵",
          "default": [],
          "dependsOn": "autoShelf",
          "showWhen": {"shelfStrategy": "specified"},
          "help": "策略为指定花朵时生效"
        },
        "shelfDemandList": {
          "type": "demandEditor",
          "description": "需求设置",
          "default": [],
          "dependsOn": "autoShelf",
          "showWhen": {"shelfStrategy": "demand"},
          "countLabel": "上架次数",
          "countMax": 99,
          "countDefault": 10,
          "help": "指定每种花卉每日上架次数，每次上架数量由上架数量决定"
        },
        "shelfPrice": {
          "type": "select",
          "description": "上架价格",
          "default": "2",
          "options": [
            {"value": "0", "label": "最低"},
            {"value": "1", "label": "中等"},
            {"value": "2", "label": "最高"}
          ],
          "dependsOn": "autoShelf"
        },
        "shelfLoopCount": {"type": "integer", "description": "上架次数", "default": 99, "min": 0, "max": 99, "dependsOn": "autoShelf", "help": "每日最多上架次数，超出后停止上架"},
        "shelfLoopCountOnDemand": {"type": "boolean", "description": "按需购买", "default": false, "dependsOn": "autoShelf", "warn": true, "help": "开启后，当免费上架次数不足以达到上架次数目标时，自动购买额外上架次数补足差额；有空架位时才购买，每次按空架位数按需购买"},
        "shelfCount": {"type": "integer", "description": "上架数量", "default": 25, "dependsOn": "autoShelf", "help": "每次上架的鲜花数量"},
        "shelfPassword": {"type": "string", "description": "上架密码", "default": "", "dependsOn": "autoShelf", "pattern": "^\\d{4}$", "maxLength": 4, "help": "4位数字密码，留空不设密码"},
        "autoBuy": {"type": "boolean", "description": "好友摊位", "default": false, "help": "自动购买好友摊位上的鲜花"},
        "friendStrategy": {
          "type": "select",
          "description": "好友策略",
          "default": "0",
          "options": [
            {"value": "0", "label": "不指定好友"},
            {"value": "1", "label": "指定好友优先"},
            {"value": "2", "label": "仅指定好友"}
          ],
          "dependsOn": "autoBuy"
        },
        "preferFriends": {"type": "memberList", "description": "指定好友", "default": [], "dependsOn": "autoBuy", "showWhen": {"friendStrategy": ["1", "2"]}, "help": "按添加顺序优先扫货，填昵称（如 s1234.花艺师）"},
        "buyStrategy": {
          "type": "select",
          "description": "扫货策略",
          "default": "all",
          "options": [
            {"value": "all", "label": "全部"},
            {"value": "flower", "label": "指定花朵"},
            {"value": "quality", "label": "指定品质"}
          ],
          "dependsOn": "autoBuy"
        },
        "buyFlowers": {
          "type": "flowerMultiselect",
          "description": "指定花朵",
          "default": [],
          "dependsOn": "autoBuy",
          "showWhen": {"buyStrategy": "flower"},
          "help": "策略为指定花朵时生效"
        },
        "buyQualities": {
          "type": "multiselect",
          "description": "指定品质",
          "options": ["凡", "普", "珍", "华", "仙"],
          "default": [1, 2, 3, 4, 5],
          "dependsOn": "autoBuy",
          "showWhen": {"buyStrategy": "quality"},
          "help": "策略为指定品质时生效"
        },
        "minShelfTime": {"type": "integer", "description": "最小上架时长(分)", "default": 0, "dependsOn": "autoBuy", "help": "只购买上架超过指定分钟的花，0表示不限制"}
      }
    },
    "flowerPass": {
      "description": "花之密令",
      "properties": {
        "recvOneKey": {"type": "boolean", "description": "等级奖励", "default": false, "help": "自动领取花之密令等级奖励"},
        "taskDone": {"type": "boolean", "description": "任务奖励", "default": false, "help": "自动领取花之密令每日任务和挑战任务奖励"}
      }
    },
    "flowerElvesPass": {
      "description": "花灵密令",
      "properties": {
        "taskDone": {"type": "boolean", "description": "任务奖励", "default": false, "help": "自动领取花灵密令每日任务和挑战任务奖励"},
        "recvOneKey": {"type": "boolean", "description": "等级奖励", "default": false, "help": "自动领取花灵密令等级奖励"}
      }
    },
    "act": {
      "description": "活动设置",
      "properties": {
        "actElim_autoPlay": {"type": "boolean", "description": "花漾物语", "default": false, "help": "自动进行花漾物语消消乐关卡"},
        "actElim_recvStamina": {"type": "boolean", "description": "体力领取", "default": false, "dependsOn": "actElim_autoPlay", "help": "自动领取花漾物语体力奖励"},
        "actElim_recvBox": {"type": "boolean", "description": "开启宝箱", "default": true, "dependsOn": "actElim_autoPlay", "help": "自动开启花漾物语活动宝箱"},
        "actElim_gameSpeed": {
          "type": "select",
          "description": "游戏倍速",
          "default": 1,
          "options": [
            {"label": "1倍速", "value": 1},
            {"label": "5倍速", "value": 2},
            {"label": "10倍速", "value": 3},
            {"label": "25倍速", "value": 4},
            {"label": "100倍速", "value": 5}
          ],
          "dependsOn": "actElim_autoPlay",
          "help": "消消乐倍速上限（实际倍速按当前积分自动降级：1倍=1体力/次，5倍=5体力/次需≥20000分，10倍=10体力/次需≥100000分）"
        },
        "shihuaNews_autoComplete": {"type": "boolean", "description": "莳花纪闻", "default": false, "help": "自动领取已完成的莳花纪闻订单奖励"},
//        "shihuaNews_yuanbaoRefresh": {"type": "boolean", "description": "元宝刷新", "default": false, "dependsOn": "shihuaNews_autoComplete", "help": "订单冷却中时消耗元宝立即刷新，满冷却最多消耗5元宝（每5分钟1元宝）", "warn": true},
        "shihuaNews_targetScore": {"type": "integer", "description": "目标积分", "default": 0, "min": 0, "max": 2000000000, "dependsOn": "shihuaNews_autoComplete", "help": "达到目标积分后停止执"},
        "actYzCall_autoCall": {"type": "boolean", "description": "为紫打Call", "default": false, "help": "自动用荧光棒打Call，每日首次进入自动领取3个荧光棒，V币自动兑换紫米小铺奖励"},
        "actHomestead_autoHelp": {"type": "boolean", "description": "助力家业", "default": false, "help": "自动使用助力卡助力好友家业。每日首次进入赠送3张助力卡"},
        "actSevenDay_autoRecv": {"type": "boolean", "description": "云梦花屿", "default": false, "help": "自动领取云梦花屿-七日福利每日奖励，当天完成后自动领取"},
        "anniv26Star_autoRecv": {"type": "boolean", "description": "灿若繁星", "default": false, "help": "自动消耗道具点亮星辰，进度达到68/198/520自动领取进度宝箱"},
        "actHoney_autoRecv": {"type": "boolean", "description": "百花成蜜", "default": false, "help": "每次收获花朵有概率获得花蜜，积累到500/1000/1500后自动领取对应蜜罐奖励"},
        "actHoney_shop": {"type": "boolean", "description": "商店兑换", "default": false, "dependsOn": "actHoney_autoRecv", "help": "活动结束前2小时，自动将剩余花蜜兑换商店道具，按下方配置数量购买"},
        "actHoney_shopItem1": {"type": "integer", "description": "加速卡购买数", "default": 0, "dependsOn": "actHoney_shop", "help": "兑换加速卡的数量上限，单价40花蜜，0=不兑换"},
        "actHoney_shopItem2": {"type": "integer", "description": "水滴购买数", "default": 0, "dependsOn": "actHoney_shop", "help": "兑换水滴的数量上限，单价40花蜜，0=不兑换"},
        "actHoney_shopItem3": {"type": "integer", "description": "花坊币购买数", "default": 0, "dependsOn": "actHoney_shop", "help": "兑换花坊币的数量上限，单价50花蜜，0=不兑换"},
        "actHoney_shopItem4": {"type": "integer", "description": "金币购买数", "default": 0, "dependsOn": "actHoney_shop", "help": "兑换金币(x1000)的数量上限，单价10花蜜，0=不兑换"},
        "actCyclicVase_autoRecv": {"type": "boolean", "description": "碎玉成瓶", "default": false, "help": "每卖出一个花艺获得1个瓷韵碎片，花瓶修复完成后自动领取奖励"},
        "actCyclicVase_shop": {"type": "boolean", "description": "商店兑换", "default": false, "dependsOn": "actCyclicVase_autoRecv", "help": "活动结束前2小时，自动将剩余碎片兑换商店道具，按下方配置数量购买"},
        "actCyclicVase_shopItem1": {"type": "integer", "description": "加速卡购买数", "default": 0, "dependsOn": "actCyclicVase_shop", "help": "兑换加速卡(×4)的数量上限，单价50碎片，0=不兑换"},
        "actCyclicVase_shopItem2": {"type": "integer", "description": "水滴购买数", "default": 0, "dependsOn": "actCyclicVase_shop", "help": "兑换水滴(×4)的数量上限，单价50碎片，0=不兑换"},
        "actCyclicVase_shopItem3": {"type": "integer", "description": "花坊币购买数", "default": 0, "dependsOn": "actCyclicVase_shop", "help": "兑换花坊币(×4)的数量上限，单价50碎片，0=不兑换"},
        "actCyclicVase_shopItem4": {"type": "integer", "description": "金币购买数", "default": 0, "dependsOn": "actCyclicVase_shop", "help": "兑换金币(×1000)的数量上限，单价25碎片，0=不兑换"},
        "actCyclicNote_autoRecv": {"type": "boolean", "description": "花笺集芳", "default": false, "help": "完成任务自动领取集芳笺，累计到达60/120/265自动领取进度奖励"},
        "actCyclicNote_forceRun": {"type": "boolean", "description": "启用模块", "default": false, "dependsOn": "actCyclicNote_autoRecv", "help": "强制启动花笺集芳模块执行任务，开启后无视任务相关模块配置"},
        // "actCyclicNote_unlockSlot": {"type": "boolean", "description": "解锁槽位", "default": false, "dependsOn": "actCyclicNote_autoRecv", "help": "自动解锁全部任务槽位(第2个槽30元宝，第3个槽50元宝)"},
        "actCyclicNote_shop": {"type": "boolean", "description": "花笺商店", "default": false, "dependsOn": "actCyclicNote_autoRecv", "help": "活动结束后兑换期，自动将集芳笺兑换商店道具，按下方配置数量购买"},
        "actCyclicNote_shopItem1": {"type": "integer", "description": "加速卡购买数", "default": 0, "dependsOn": "actCyclicNote_shop", "help": "花笺商店-加速卡的购买数量上限，0=不兑换"},
        "actCyclicNote_shopItem2": {"type": "integer", "description": "水滴购买数", "default": 0, "dependsOn": "actCyclicNote_shop", "help": "花笺商店-水滴的购买数量上限，0=不兑换"},
        "actCyclicNote_shopItem3": {"type": "integer", "description": "花坊币购买数", "default": 0, "dependsOn": "actCyclicNote_shop", "help": "花笺商店-花坊币的购买数量上限，0=不兑换"},
        "actCyclicNote_shopItem4": {"type": "integer", "description": "金币购买数", "default": 0, "dependsOn": "actCyclicNote_shop", "help": "花笺商店-金币(x2000)的购买数量上限，0=不兑换"},
        "actCyclicNote_shopItem5": {"type": "integer", "description": "商品5购买数", "default": 0, "dependsOn": "actCyclicNote_shop", "help": "花笺商店商品5的购买数量上限，0=不兑换"},
        "actGame2048_autoPlay": {"type": "boolean", "description": "鱼乐无穷", "default": false, "help": "自动进行鱼乐无穷2048小游戏，消耗体力获取积分"},
        "actGame2048_recvStamina": {"type": "boolean", "description": "体力领取", "default": false, "dependsOn": "actGame2048_autoPlay", "help": "自动领取鱼乐无穷体力奖励"},
        "actGame2048_autoRestart": {"type": "boolean", "description": "无路重开", "default": false, "dependsOn": "actGame2048_autoPlay", "help": "无路可走时自动重新开始游戏"},
        "actGame2048_autoSettle": {"type": "boolean", "description": "临期结算", "default": false, "dependsOn": "actGame2048_autoPlay", "help": "活动结束前2小时自动结算本局未结算的得分，结算期间停止游玩"},
        "actGame2048_gameSpeed": {
          "type": "select",
          "description": "游戏倍速",
          "default": 1,
          "options": [
            {"label": "1倍速", "value": 1},
            {"label": "4倍速", "value": 2},
            {"label": "8倍速", "value": 3},
            {"label": "16倍速", "value": 4}
          ],
          "dependsOn": "actGame2048_autoPlay",
          "help": "倍速越高每次消耗体力越多，随机出现的小鱼干等级也越高（1倍=1体力/次，4倍=4体力/次，8倍=8体力/次，16倍=16体力/次）"
        },
        "actDessert_autoPlay": {"type": "boolean", "description": "香卉甜糕", "default": false, "help": "自动进行香卉甜糕合并小游戏，消耗体力获取积分"},
        "actDessert_recvStamina": {"type": "boolean", "description": "体力领取", "default": false, "dependsOn": "actDessert_autoPlay", "help": "自动领取香卉甜糕体力奖励"},
        "actDessert_gameSpeed": {
          "type": "select",
          "description": "游戏倍速",
          "default": 1,
          "options": [
            {"label": "普通 (1体力/次)", "value": 1},
            {"label": "快速 (5体力/次)", "value": 2},
            {"label": "高速 (10体力/次)", "value": 3},
            {"label": "极速 (25体力/次)", "value": 4},
            {"label": "神速 (100体力/次)", "value": 5}
          ],
          "dependsOn": "actDessert_autoPlay",
          "help": "倍速越高每次消耗体力越多，获得积分也越高（普通=1体力/次，快速=5体力/次，高速=10体力/次，极速=25体力/次，神速=100体力/次）"
        },
        "actSpool_autoPlay": {"type": "boolean", "description": "梳丝引线", "default": false, "help": "自动进行梳丝引线小游戏，消耗体力获取积分"},
        "actSpool_recvStamina": {"type": "boolean", "description": "体力领取", "default": false, "dependsOn": "actSpool_autoPlay", "help": "自动领取梳丝引线体力奖励"},
        "actSpool_gameSpeed": {
          "type": "select",
          "description": "游戏倍速",
          "default": 0,
          "options": [
            {"label": "普通 1x (1体力/次)", "value": 0},
            {"label": "快速 5x (5体力/次，需积分≥3500)", "value": 1},
            {"label": "高速 9x (9体力/次，需积分≥20000)", "value": 2},
            {"label": "极速 24x (24体力/次，需积分≥55000)", "value": 3},
            {"label": "神速 99x (99体力/次，需积分≥140000)", "value": 4}
          ],
          "dependsOn": "actSpool_autoPlay",
          "help": "倍速越高每次消耗体力越多，获得积分也越高。高倍速需要累计积分达到门槛才能解锁使用。"
        },
        "actDuanWu_autoPlay": {"type": "boolean", "description": "龙舟竞渡", "default": false, "help": "自动进行端午龙舟竞渡比赛，消耗龙舟鼓获取竞渡积分和宝箱币"},
        "actDuanWu_gameMultiplier": {
          "type": "select",
          "description": "领取倍数",
          "default": 1,
          "options": [
            {"label": "1倍", "value": 1},
            {"label": "10倍", "value": 10},
            {"label": "50倍", "value": 50}
          ],
          "dependsOn": "actDuanWu_autoPlay",
          "help": "每次参赛后领取奖励的倍数，消耗对应数量龙舟鼓"
        },
        "actDuanWu_buyGift": {"type": "boolean", "description": "购买礼包", "default": false, "dependsOn": "actDuanWu_autoPlay", "help": "每日自动购买元宝礼包（160元宝×5次），每次获得龙舟鼓×40"},
        "actDuanWu_recvDaily": {"type": "boolean", "description": "每日奖励", "default": false, "dependsOn": "actDuanWu_autoPlay", "help": "自动领取七日豪礼每日奖励（第1~7天）"},
        "actDuanWu_recvProgress": {"type": "boolean", "description": "进度奖励", "default": false, "dependsOn": "actDuanWu_autoPlay", "help": "达到1800/3800/5800/8800竞渡积分后自动领取进度奖励"},
        "actDuanWu_maxScore": {"type": "integer", "description": "积分上限", "default": 8800, "min": 0, "max": 8800, "dependsOn": "actDuanWu_autoPlay", "help": "累计竞渡积分达到此值后停止参赛和购买礼包，最大8800"},
        "actMerge2_autoPlay": {"type": "boolean", "description": "田园奇趣", "default": false, "help": "自动进行田园奇趣合并小游戏，消耗体力获取积分"},
        "actMerge2_recvStamina": {"type": "boolean", "description": "体力领取", "default": false, "dependsOn": "actMerge2_autoPlay", "help": "自动领取田园奇趣体力奖励"},
        "actMerge2_gameSpeed": {
          "type": "select",
          "description": "游戏倍速",
          "default": 1,
          "options": [
            {"label": "普通 (1体力/次)", "value": 1},
            {"label": "快速 (2体力/次)", "value": 2},
            {"label": "高速 (4体力/次)", "value": 3},
            {"label": "极速 (8体力/次)", "value": 4},
            {"label": "超速 (16体力/次)", "value": 5},
            {"label": "神速 (32体力/次)", "value": 6}
          ],
          "dependsOn": "actMerge2_autoPlay",
          "help": "倍速越高每次消耗体力越多，随机出现的棋子等级也越高（普通=1体力/次，快速=2体力/次，高速=4体力/次，极速=8体力/次，超速=16体力/次，神速=32体力/次）"
        }
      }
    }
  }
};
