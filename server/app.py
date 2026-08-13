# -*- coding: utf-8 -*-
"""
云助手真实后端（Flask, :8000）
复用 web_panel 的脚本核心（triple_core / clear_core），多账号并发跑三倍/抢红包。
通关不开放（前端 schema 已 locked，后端无通关启动接口）。
"""
import os
import sys

# 引用 web_panel 脚本核心目录（clear_core/triple_core 与其同目录才能 import）
_WEB_PANEL = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "..", "..", ".project_context", "explore", "game-reverse",
                          "tools", "web_panel")
sys.path.insert(0, _WEB_PANEL)

from flask import Flask, Blueprint, request, jsonify

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
            "sun_balance": u.get("sun_balance", 0)}


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
        task.add_log("🏁 任务结束")
        task.running = False
        store.set_script_status(script["id"], "stopped")


def _task_redpocket(task, script, platform, password, device, config):
    rp = config.get("redpocket", {}) or {}
    target = max(1, min(10, int(rp.get("rpTarget") or 10)))
    task.task_type = "redpocket"
    task.add_log(f"🚀 开始抢红包: 目标 {target} 个 ({platform})")
    try:
        run_redpocket(platform, script["account"], password, target, task.add_log,
                      task.stop_flag, device)
    except Exception as e:
        task.add_log(f"❌ 异常: {e}")
    finally:
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
            "sun_balance": 100, "vip_level": 1, "created_at": store.now_str()}
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
        device_key, device = devices.get_or_create_device(account, platform)
        try:
            if platform == "ios":
                result = ios_login(account, password, None, device)
            else:
                result = android_login(account, password, None, device)
        except Exception:
            result = None
        if result is None:
            return fail("账号验证失败，请检查账号密码")
        zone = result[2] or {}
        server = zone.get("name") or "默认服务器"

    new_id = store.next_script_id()
    script = {
        "id": new_id, "user_id": user["id"], "gameType": game_type,
        "channel": channel, "roleName": account, "server": server,
        "status": "stopped", "account": account,
        "password_enc": store.encrypt_text(password) if password else "",
        "device_key": device_key,
        "number": f"NO.{1000 + new_id}",
        "expire": store.add_days(30),
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


@api.route("/scripts/<int:sid>/renew", methods=["POST"])
def renew_script(sid):
    user = auth.current_user()
    if not user:
        return unauthorized()
    script = store.find_script(sid, user["id"])
    if not script:
        return fail("脚本不存在")
    body = json_body()
    days = max(1, min(365, int(body.get("days") or 1)))
    if user.get("sun_balance", 0) < days:
        return fail("太阳余额不足")
    store.update_user(user["id"], lambda u: u.__setitem__("sun_balance", u["sun_balance"] - days))
    store.update_script(sid, lambda s: s.__setitem__("expire", store.add_days(days, s.get("expire"))))
    bal = store.find_user(uid=user["id"])["sun_balance"]
    return ok({"sun_balance": bal}, f"已续期 {days} 天")


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


# ==================== 占位（SaaS 功能简化返回）====================
@api.route("/cards/redeem", methods=["POST"])
def card_redeem():
    user = auth.current_user()
    if not user:
        return unauthorized()
    body = json_body()
    code = (body.get("code") or "").strip()
    if not code:
        return fail("卡密不能为空")
    store.update_user(user["id"], lambda u: u.__setitem__("sun_balance", u.get("sun_balance", 0) + 50))
    bal = store.find_user(uid=user["id"])["sun_balance"]
    return ok({"sun_balance": bal}, "兑换成功")


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


app.register_blueprint(api, url_prefix="/api")

# /game/state/:id 占位（小花仙状态页请求，本次不接入真实数据）
@app.route("/game/state/<int:sid>", methods=["GET"])
def game_state_placeholder(sid):
    return jsonify({"success": True, "message": "ok",
                    "data": {"code": 404, "scriptId": sid, "land": {"details": []},
                             "items": {}, "statistics": {}}})


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("=" * 50)
    print("  云助手真实后端 (一路狂飙 三倍/抢红包)")
    print("  访问地址: http://localhost:8000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=8000, debug=False)
