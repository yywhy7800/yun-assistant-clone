# -*- coding: utf-8 -*-
"""
云助手真实后端（Flask, :8000）
复用 web_panel 的脚本核心（triple_core / clear_core），多账号并发跑三倍/抢红包。
通关不开放（前端 schema 已 locked，后端无通关启动接口）。
"""
import datetime
import os
import sys

# 引用脚本核心目录（clear_core/triple_core）：部署包用 server/core/ 自包含，本地回退 web_panel
_core_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core")
if os.path.isdir(_core_dir):
    _WEB_PANEL = _core_dir
else:
    _WEB_PANEL = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              "..", "..", ".project_context", "explore", "game-reverse",
                              "tools", "web_panel")
sys.path.insert(0, _WEB_PANEL)

from flask import Flask, Blueprint, request, jsonify, send_from_directory

import store
import auth
import devices
import tasks

from triple_core import run_triple_chip
from clear_core import run_redpocket, ios_login, android_login

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.json.ensure_ascii = False

# 路由统一挂 /api 前缀（vite 代理 /api 原样转发到 8000，不重写前缀）
api = Blueprint("api", __name__)

task_manager = tasks.TaskManager()

THRESHOLD_MAP = {"q3": 3, "q4": 4, "q5": 5}


# ==================== helpers ====================
def json_body():
    return request.get_json(silent=True) or {}


def ok(data=None, message="ok"):
    return jsonify({"success": True, "data": data, "message": message})


def fail(message, status=200):
    return jsonify({"success": False, "message": message}), status


def unauthorized():
    return jsonify({"success": False, "message": "请先登录"}), 401


def public_user(u):
    return {"username": u["username"], "vip_level": u.get("vip_level", 0),
            "sun_balance": u.get("sun_balance", 0), "role": u.get("role", "user")}


def public_script(s):
    return {
        "id": s["id"],
        "gameType": s.get("gameType", "gs"),
        "roleName": s.get("roleName", s.get("account", "")),
        "server": s.get("server", "默认服务器"),
        "status": s.get("status", "stopped"),
        "channel": s.get("channel", "official"),
        "account": s.get("account", ""),
        "number": s.get("number", ""),
        "expire": s.get("expire", ""),
    }


def platform_of(channel):
    return "ios" if channel == "ios" else ("android" if channel == "android" else None)


# 会员卡：周卡/月卡/永久卡（不设天卡；永久卡 days=None 表示永不过期）
MEMBERSHIP_PLANS = {
    "week": {"name": "周卡", "price": 38, "days": 7},
    "month": {"name": "月卡", "price": 128, "days": 30},
    "permanent": {"name": "永久卡", "price": 648, "days": None},
}

# 永久卡到期标记（用 2099-12-30 表示，_expire_ok 永远为真）
PERMANENT_EXPIRE = "2099-12-30 23:59:59"


def _expire_ok(expire):
    """到期是否有效：非空且在有效期之后"""
    if not expire:
        return False
    try:
        exp = datetime.datetime.strptime(expire, "%Y-%m-%d %H:%M:%S")
        return exp > datetime.datetime.now()
    except ValueError:
        return False


def require_admin():
    """管理员校验，返回 (user, None) 或 (None, 错误响应)"""
    user = auth.current_user()
    if not user:
        return None, unauthorized()
    if user.get("role") != "admin":
        return None, fail("无权限", 403)
    return user, None


def ensure_admin():
    """启动时确保内置 admin 账号存在（admin/admin123）"""
    if not store.find_user(username="admin"):
        store.add_user({"id": store.next_user_id(), "username": "admin",
                        "password_hash": store.hash_password("admin123"),
                        "sun_balance": 0, "vip_level": 0, "role": "admin",
                        "created_at": store.now_str()})


# ==================== 脚本任务执行（后台线程）====================
def _task_triple(task, script, platform, password, device, config):
    triple = config.get("triple", {}) or {}
    level = int(triple.get("tripleLevel") or 211)
    threshold = THRESHOLD_MAP.get(triple.get("tripleThreshold"), 4)
    stats = {"ad_used": 0, "ad_left": 3, "stamina": 0, "claimed": False,
             "claimed_q3": 0, "claimed_q4": 0, "claimed_q5": 0, "chips": [], "good": []}
    task.stats = stats
    task.task_type = "triple"
    task.add_log(f"🚀 开始刷三倍芯片: 关卡{level} 阈值Q{threshold} ({platform})")
    try:
        run_triple_chip(platform, script["account"], password, level, threshold,
                        stats, task.add_log, task.stop_flag, device)
    except Exception as e:
        task.add_log(f"❌ 异常: {e}")
    finally:
        task.stats = dict(stats)
        if stats.get("nick"):
            # 任务运行后回传真实角色名，更新 roleName（绑定阶段只有账号名）
            store.update_script(script["id"], lambda s: s.__setitem__("roleName", stats["nick"]))
        task.add_log("🏁 任务结束")
        task.running = False
        store.set_script_status(script["id"], "stopped")


def _task_redpocket(task, script, platform, password, device, config):
    rp = config.get("redpocket", {}) or {}
    target = max(1, min(10, int(rp.get("rpTarget") or 10)))
    stats = {}
    task.stats = stats
    task.task_type = "redpocket"
    task.add_log(f"🚀 开始抢红包: 目标 {target} 个 ({platform})")
    try:
        run_redpocket(platform, script["account"], password, target, task.add_log,
                      task.stop_flag, device, stats)
    except Exception as e:
        task.add_log(f"❌ 异常: {e}")
    finally:
        if stats.get("nick"):
            # 任务运行后回传真实角色名，更新 roleName（绑定阶段只有账号名）
            store.update_script(script["id"], lambda s: s.__setitem__("roleName", stats["nick"]))
        task.add_log("🏁 任务结束")
        task.running = False
        store.set_script_status(script["id"], "stopped")


def _build_task_fn(task_type, script, platform, password, device, config):
    if task_type == "triple":
        return lambda task: _task_triple(task, script, platform, password, device, config)
    return lambda task: _task_redpocket(task, script, platform, password, device, config)


# ==================== auth ====================
@api.route("/auth/register", methods=["POST"])
def register():
    body = json_body()
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not username or not password:
        return fail("用户名和密码不能为空")
    if store.find_user(username=username):
        return fail("用户名已存在")
    user = {"id": store.next_user_id(), "username": username,
            "password_hash": store.hash_password(password),
            "sun_balance": 0, "vip_level": 0, "role": "user", "created_at": store.now_str()}
    store.add_user(user)
    token = auth.create_token(user["id"])
    return ok({"token": token, "user": public_user(user)}, "注册成功")


@api.route("/auth/login", methods=["POST"])
def login():
    body = json_body()
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    user = store.find_user(username=username)
    if not user or not store.verify_password(password, user["password_hash"]):
        return fail("用户名或密码错误")
    token = auth.create_token(user["id"])
    return ok({"token": token, "user": public_user(user)}, "登录成功")


@api.route("/auth/me", methods=["GET"])
def me():
    user = auth.current_user()
    if not user:
        return unauthorized()
    return ok({"user": public_user(user), "invite_code": ""})


@api.route("/auth/change-password", methods=["POST"])
def change_password():
    user = auth.current_user()
    if not user:
        return unauthorized()
    body = json_body()
    old_pw = body.get("old_password") or ""
    new_pw = body.get("new_password") or ""
    if not store.verify_password(old_pw, user["password_hash"]):
        return fail("原密码错误")
    if len(new_pw) < 4:
        return fail("新密码至少 4 位")
    store.update_user(user["id"], lambda u: u.__setitem__("password_hash", store.hash_password(new_pw)))
    return ok(None, "修改成功")


# ==================== scripts ====================
@api.route("/scripts", methods=["GET"])
def list_scripts():
    user = auth.current_user()
    if not user:
        return unauthorized()
    scripts = [public_script(s) for s in store.get_scripts() if s.get("user_id") == user["id"]]
    return ok({"scripts": scripts})


@api.route("/scripts", methods=["POST"])
def create_script():
    user = auth.current_user()
    if not user:
        return unauthorized()
    body = json_body()

    # 确认创建：复制已有脚本
    if body.get("copyOf"):
        src = store.find_script(int(body["copyOf"]), user["id"])
        if not src:
            return fail("源脚本不存在")
        new_id = store.next_script_id()
        copy = dict(src)
        copy["id"] = new_id
        copy["number"] = f"NO.{1000 + new_id}"
        copy["status"] = "stopped"
        store.add_script(copy)
        return ok({"script": public_script(copy)}, "创建成功")

    # 绑定新账号
    game_type = body.get("gameType", "gs")
    channel = body.get("channel", "official")
    account = (body.get("account") or "").strip()
    password = body.get("password") or ""
    if not account or not password:
        return fail("请输入账号和密码")

    platform = platform_of(channel)
    if game_type == "一路狂飙" and platform is None:
        return fail("该渠道暂不支持")

    # 一路狂飙：真实验证账号 + 分配设备指纹
    device_key, device, server = None, None, "默认服务器"
    if game_type == "一路狂飙" and platform:
        try:
            device_key, device = devices.get_or_create_device(account, platform)
            if platform == "ios":
                result = ios_login(account, password, None, device)
            else:
                result = android_login(account, password, None, device)
        except Exception as e:
            print(f"[create_script] 账号验证异常: {e!r}")
            result = None
        if result is None:
            return fail("账号验证失败，请检查账号密码")
        # 防御：登录返回非 (account, token, zone) 结构时不崩溃
        zone = result[2] if isinstance(result, (tuple, list)) and len(result) >= 3 else {}
        if not isinstance(zone, dict):
            zone = {}
        server = zone.get("name") or "默认服务器"

    new_id = store.next_script_id()
    script = {
        "id": new_id, "user_id": user["id"], "gameType": game_type,
        "channel": channel, "roleName": account, "server": server,
        "status": "stopped", "account": account,
        "password_enc": store.encrypt_text(password) if password else "",
        "device_key": device_key,
        "number": f"NO.{1000 + new_id}",
        "expire": "",  # 未开通，需购买周卡/月卡
        "created_at": store.now_str(),
    }
    store.add_script(script)
    return ok({"script": public_script(script)}, "绑定成功")


@api.route("/scripts/<int:sid>/toggle", methods=["POST"])
def toggle_script(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")

    task = task_manager.get_task(sid)
    if script.get("status") == "running" or (task and task.running):
        task_manager.stop(sid)
        store.set_script_status(sid, "stopped")
        return ok({"newStatus": "stopped"}, "已发送停止")

    # 启动
    platform = platform_of(script.get("channel"))
    if platform is None:
        return fail("该游戏脚本暂未接入真实运行")
    if not _expire_ok(script.get("expire")):
        return fail("脚本未开通或已过期，请先购买周卡或月卡")

    config = store.get_config(sid)
    auto_triple = bool(config.get("triple", {}).get("autoTriple"))
    auto_redpocket = bool(config.get("redpocket", {}).get("autoRedpocket"))
    if not auto_triple and not auto_redpocket:
        return fail("请先在配置中开启功能（三倍芯片或抢红包）")

    password = store.decrypt_text(script["password_enc"]) if script.get("password_enc") else ""
    if not password:
        return fail("脚本缺少账号密码，请删除后重新绑定")

    device = None
    if script.get("device_key"):
        device = devices.get_device(script["device_key"])
    if not device:
        _, device = devices.get_or_create_device(script["account"], platform)

    task_type = "triple" if auto_triple else "redpocket"
    ok_start, msg = task_manager.start(
        sid, _build_task_fn(task_type, script, platform, password, device, config))
    if not ok_start:
        return fail(msg)
    store.set_script_status(sid, "running")
    return ok({"newStatus": "running"}, "已启动")


@api.route("/scripts/<int:sid>", methods=["DELETE"])
def delete_script(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    task_manager.stop(sid)
    store.delete_script(sid)
    store.delete_config(sid)
    return ok(None, "删除成功")


@api.route("/scripts/<int:sid>/purchase", methods=["POST"])
def purchase_script(sid):
    """购买会员卡（周卡 38☀️/7天、月卡 128☀️/30天），延长角色到期时间"""
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    body = json_body()
    plan = body.get("plan")
    plan_info = MEMBERSHIP_PLANS.get(plan)
    if not plan_info:
        return fail("无效的会员卡类型（周卡/月卡/永久卡）")
    if (script.get("expire") or "").startswith("2099-12-30"):
        return fail("该脚本已开通永久，无需续费")
    cost = plan_info["price"]
    if user.get("sun_balance", 0) < cost:
        return fail(f"太阳余额不足，需要 {cost} ☀️")
    store.update_user(user["id"], lambda u: u.__setitem__("sun_balance", u["sun_balance"] - cost))
    days = plan_info["days"]
    if days is None:
        new_expire = PERMANENT_EXPIRE  # 永久卡：永不过期
        tip = "永久有效"
    else:
        new_expire = store.extend_expiry(days, script.get("expire"))
        tip = f"+{days}天"
    store.update_script(sid, lambda s: s.__setitem__("expire", new_expire))
    bal = store.find_user(uid=user["id"])["sun_balance"]
    return ok({"sun_balance": bal, "expire": new_expire},
              f"{plan_info['name']}购买成功（{tip}）")


@api.route("/scripts/<int:sid>/config", methods=["GET"])
def get_script_config(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    return ok({"config": store.get_config(sid)})


@api.route("/scripts/<int:sid>/config", methods=["PUT"])
def save_script_config(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    body = json_body()
    store.save_config(sid, body.get("config") or {})
    return ok(None, "配置已保存")


@api.route("/scripts/<int:sid>/runtime-stats", methods=["GET"])
def script_runtime_stats(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    # 任务运行中若已回传真实角色名，顺手同步 roleName（无需等任务结束）
    task = task_manager.get_task(sid)
    if task and task.running:
        nick = task.stats.get("nick")
        if nick and script.get("roleName") != nick:
            store.update_script(sid, lambda s: s.__setitem__("roleName", nick))
    return ok(task_manager.runtime_stats(sid))


@api.route("/scripts/<int:sid>/logs", methods=["GET"])
def script_logs(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    return ok({"logs": task_manager.logs(sid)})


# ==================== 卡密 ====================
@api.route("/cards/redeem", methods=["POST"])
def card_redeem():
    user = auth.current_user()
    if not user:
        return unauthorized()
    body = json_body()
    code = (body.get("code") or "").strip()
    if not code:
        return fail("卡密不能为空")
    card = store.find_card(code)
    if not card:
        return fail("卡密不存在")
    if card.get("used"):
        return fail("卡密已被使用")
    amount = card.get("amount", 0)
    store.mark_card_used(code, user["username"])
    store.update_user(user["id"], lambda u: u.__setitem__("sun_balance", u.get("sun_balance", 0) + amount))
    bal = store.find_user(uid=user["id"])["sun_balance"]
    return ok({"sun_balance": bal}, f"兑换成功（+{amount} ☀️）")


@api.route("/cards/records", methods=["GET"])
def card_records():
    if not auth.current_user():
        return unauthorized()
    return ok({"records": [{"code": "CARD-001", "created_at": store.now_str(), "amount": 50}]})


@api.route("/sun/transfer", methods=["POST"])
def sun_transfer():
    user = auth.current_user()
    if not user:
        return unauthorized()
    body = json_body()
    amount = int(body.get("amount") or 0)
    if amount <= 0:
        return fail("传递金额必须大于 0")
    fee = -(-amount // 10)  # 手续费 10% 向上取整
    if user.get("sun_balance", 0) < amount + fee:
        return fail("太阳余额不足")
    store.update_user(user["id"], lambda u: u.__setitem__("sun_balance", u["sun_balance"] - amount - fee))
    bal = store.find_user(uid=user["id"])["sun_balance"]
    return ok({"sun_balance": bal, "fee": fee}, "传递成功")


@api.route("/billing/records", methods=["GET"])
def billing_records():
    if not auth.current_user():
        return unauthorized()
    return ok({"records": []})


@api.route("/promo/config", methods=["GET"])
def promo_config():
    return ok({"enabled": False})


@api.route("/promo/my", methods=["GET"])
def promo_my():
    if not auth.current_user():
        return unauthorized()
    return ok({"invite_code": "", "invited_count": 0, "total_reward": 0})


@api.route("/promo/rewards", methods=["GET"])
def promo_rewards():
    if not auth.current_user():
        return unauthorized()
    return ok({"rewards": []})


@api.route("/announcements", methods=["GET"])
def announcements():
    return ok({"announcements": [
        {"id": 1, "title": "系统公告",
         "content": "云助手已接入一路狂飙真实脚本（三倍芯片/抢红包），完美通关暂不开放。"},
    ]})


@api.route("/changelogs", methods=["GET"])
def changelogs():
    return ok({"changelogs": [
        {"version": "v2.1.0", "date": store.now_str()[:10],
         "notes": "接入一路狂飙真实脚本运行（三倍/抢红包），多账号独立设备指纹。"},
    ]})


# ==================== 管理后台（需管理员 role=admin） ====================
@api.route("/admin/users", methods=["GET"])
def admin_users():
    admin, err = require_admin()
    if err:
        return err
    scripts = store.get_scripts()
    result = []
    for u in store.get_users():
        count = sum(1 for s in scripts if s.get("user_id") == u["id"])
        result.append({"id": u["id"], "username": u["username"],
                       "vip_level": u.get("vip_level", 0),
                       "sun_balance": u.get("sun_balance", 0),
                       "role": u.get("role", "user"),
                       "created_at": u.get("created_at", ""),
                       "script_count": count})
    return ok({"users": result})


@api.route("/admin/users/<int:uid>/sun", methods=["PUT"])
def admin_user_sun(uid):
    admin, err = require_admin()
    if err:
        return err
    target = store.find_user(uid=uid)
    if not target:
        return fail("用户不存在")
    body = json_body()
    amount = int(body.get("amount") or 0)
    if amount == 0:
        return fail("调整金额不能为 0")
    new_bal = target.get("sun_balance", 0) + amount
    if new_bal < 0:
        return fail("扣减后余额不能为负数")
    store.update_user(uid, lambda u: u.__setitem__("sun_balance", new_bal))
    return ok({"sun_balance": new_bal}, f"已调整 {'+' if amount > 0 else ''}{amount} ☀️")


@api.route("/admin/scripts", methods=["GET"])
def admin_scripts():
    admin, err = require_admin()
    if err:
        return err
    users = {u["id"]: u["username"] for u in store.get_users()}
    result = []
    for s in store.get_scripts():
        item = public_script(s)
        item["username"] = users.get(s.get("user_id"), "?")
        result.append(item)
    return ok({"scripts": result})


@api.route("/admin/scripts/<int:sid>/stop", methods=["POST"])
def admin_script_stop(sid):
    admin, err = require_admin()
    if err:
        return err
    task_manager.stop(sid)
    store.set_script_status(sid, "stopped")
    return ok(None, "已停止")


@api.route("/admin/scripts/<int:sid>/expire", methods=["PUT"])
def admin_script_expire(sid):
    admin, err = require_admin()
    if err:
        return err
    body = json_body()
    expire = (body.get("expire") or "").strip()
    if not expire:
        return fail("到期时间不能为空")
    store.update_script(sid, lambda s: s.__setitem__("expire", expire))
    return ok({"expire": expire}, "到期时间已更新")


@api.route("/admin/cards/generate", methods=["POST"])
def admin_cards_generate():
    admin, err = require_admin()
    if err:
        return err
    import secrets
    body = json_body()
    amount = int(body.get("amount") or 0)
    count = int(body.get("count") or 1)
    if amount <= 0:
        return fail("卡密面额必须大于 0")
    count = max(1, min(500, count))
    codes = set()
    while len(codes) < count:
        codes.add("".join(secrets.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(16)))
    cards = [{"code": c, "amount": amount, "used": False, "used_by": None,
              "used_at": None, "created_at": store.now_str()} for c in codes]
    store.add_cards(cards)
    return ok({"count": len(cards), "amount": amount, "codes": list(codes)},
              f"已生成 {len(cards)} 张卡密")


@api.route("/admin/cards", methods=["GET"])
def admin_cards():
    admin, err = require_admin()
    if err:
        return err
    cards = list(reversed(store.get_cards()))  # 新的在前
    return ok({"cards": cards})


app.register_blueprint(api, url_prefix="/api")


@app.errorhandler(Exception)
def handle_unexpected(e):
    """捕获未处理异常：traceback 落日志（便于定位），返回统一 JSON，避免前端收到非 JSON 的 500 HTML"""
    import traceback

    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return e  # 404/401 等按默认处理
    traceback.print_exc()
    return jsonify({"success": False, "message": "服务器异常，请稍后重试"}), 500

# /game/state/:id 占位（小花仙状态页请求，本次不接入真实数据）
@app.route("/game/state/<int:sid>", methods=["GET"])
def game_state_placeholder(sid):
    return jsonify({"success": True, "message": "ok",
                    "data": {"code": 404, "scriptId": sid, "land": {"details": []},
                             "items": {}, "statistics": {}}})


# ==================== 前端静态托管（单端口部署：Flask 直接 serve dist/） ====================
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist"))


@app.route("/")
def serve_index():
    return send_from_directory(DIST_DIR, "index.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(os.path.join(DIST_DIR, "assets"), filename)


@app.route("/config-pages/<path:filename>")
def serve_config_pages(filename):
    return send_from_directory(os.path.join(DIST_DIR, "config-pages"), filename)


@app.route("/status-pages/<path:filename>")
def serve_status_pages(filename):
    return send_from_directory(os.path.join(DIST_DIR, "status-pages"), filename)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ensure_admin()  # 确保内置 admin/admin123 存在
    print("=" * 50)
    print("  云助手真实后端 (一路狂飙 三倍/抢红包)")
    print("  访问地址: http://localhost:8000")
    print("  管理后台: admin / admin123")
    print("=" * 50)
    app.run(host="0.0.0.0", port=8000, debug=False)
