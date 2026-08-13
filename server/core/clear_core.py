# -*- coding: utf-8 -*-
"""
一路狂飙 - 核心协议模块
包含：protobuf 工具、登录、WS握手、战斗（480/966/481）完整流程
"""
import asyncio
import hashlib
import json
import os
import random
import ssl
import struct
import time
import urllib.request
import urllib.error
from collections import Counter

# ============ 常量 ============
IOS_DAWN_V2 = "https://dawnv6.tongtut.com/api/data/v2/handleMsg"
ANDROID_DAWN_V3 = "https://dawn.shiyiyx.com/api/data/v3/handleMsg"
IAUTH = "https://iauth.ylkbiao.com/v1/auth"
SIGN_KEY = "yhfxjxcvojwocgmwwc"


def ws_uri(zone=None):
    """WS 路径动态构造：wss://game.ylkbiao.com/v1/ws/{zoneData.version}
    服务器会更新 zoneData.version（历史 'c' → 当前 'a'），不可硬编码。
    auth 下发的 zoneData 含 version 字段，取不到时兜底用 'a'。"""
    ver = (zone or {}).get("version") or "a"
    return f"wss://game.ylkbiao.com/v1/ws/{ver}"

# iOS 常量
IOS_APP_ID = "101729887378"
IOS_APP_VERSION = "1.7.1"
IOS_REUNION_SDK = "1.8.6"
IOS_CHANNEL_SDK = "1.8.6"
IOS_CHANNEL_ID = 1
IOS_SECONDARY = "0"
IOS_PCK_NAME = "com.shiyi.hjwj"
# iOS 设备指纹。默认使用历史成功值 9EDFF625/F2ADB121（08-06 iOS 真机抓包参数，服务器回显过）。
# 若服务器风控针对伪造设备号，可注入真实真机指纹做对照实验：
#   YLK_IOS_UUID=真实clientId  YLK_IOS_DEVICE_ID=真实deviceId
IOS_UUID = os.environ.get("YLK_IOS_UUID", "9EDFF625-2D40-4BB2-BEC9-9096CCA557E3")
IOS_DEVICE_ID = os.environ.get("YLK_IOS_DEVICE_ID", "F2ADB121-0A7A-4CFD-AC9D-4CD25A7EDBCF")
IOS_MODEL = "iPhone15,3"
IOS_VER = "29.71.310"
IOS_BAID = '[{"baid":"10af36046363237b5a207bd76da049a0","version":"20250325"},{"baid":"afd51678179546bd844bc551799a095a","version":"20260506"}]'
IOS_APC_ID = 10003780

# 安卓常量
ANDROID_APP_ID = "101729887378"
ANDROID_APP_VERSION = "16"
ANDROID_REUNION_SDK = "1.18.6"
ANDROID_CHANNEL_SDK = "3.0.5"
ANDROID_CHANNEL_ID = 1
ANDROID_SECONDARY = "100001"
ANDROID_PCK_NAME = "com.shiyi.hjwj"
ANDROID_DEVICE_ID = "ebfcdb837cfaadfc"
ANDROID_CLIENT_ID = "01a02d3ae59110b1615b308b098e1f4b"
ANDROID_MODEL = "SM-A5560"
ANDROID_VER = "16.71.344"
ANDROID_APC_ID = 10003392
ANDROID_OAID = ""
ANDROID_MAC = ""
ANDROID_ANDROID_ID = "7a7a6e7b7a7a7a7a"
ANDROID_PCK_SIGNATURE = "AB:1F:51:AF:0E:0C:7C:D3:29:AB:5A:C2:B8:28:54:E6:75:97:0D:E4"

# 安卓 BaseInfo
ANDROID_BASE_INFO = (
    '{"aid":"' + ANDROID_ANDROID_ID + '","androidId":"' + ANDROID_ANDROID_ID + '",'
    '"mac":"' + ANDROID_MAC + '","oaid":"' + ANDROID_OAID + '"}'
)

# 技能池
SKILL_POOL = [14080000] * 9 + [14120000] * 7 + [14110000] * 3
RANDOM_SKILL_IDS = [14000000, 14010000, 14020000, 14030000, 14040000,
                    14050000, 14060000, 14070000, 14090000, 14100000,
                    14130000, 14140000, 14150000, 14160000, 14170000]

# 玩家数据模块列表
MODULES = ["info", "basic", "item", "equip", "equip_slot", "point", "task", "mail", "client", "rank",
           "fund", "cultivate", "activity", "counter", "attribute", "battle", "gem", "hero", "sign_in",
           "skill", "pay", "shop", "draw", "vehicle", "driver", "gun", "innate", "friend", "team", "corps",
           "mining", "physical", "arena", "war_zone_arena", "pet", "shield", "chat", "red_pocket",
           "super_weapon", "tiktok", "drop", "wechat", "new_world", "partner", "slg", "alipay",
           "quick_game", "puzzle", "promotion", "acs", "wing_man", "rune", "help", "weapon_card",
           "facebook", "cup_vote", "zombie", "base"]


# ============ Protobuf 工具 ============
def varint(n):
    out = b""
    while n > 0x7F:
        out += bytes([(n & 0x7F) | 0x80]); n >>= 7
    out += bytes([n]); return out

def varint_len(n):
    return len(varint(n))

def vf(num, val):
    return varint(num << 3) + varint(val)

def sf(num, s):
    b = s.encode(); return varint((num << 3) | 2) + varint(len(b)) + b

def bf(num, b_data):
    return varint((num << 3) | 2) + varint(len(b_data)) + b_data


# ============ 签名 ============
def make_sign(msg_type, func_params, open_id, open_token, timestamp,
              app_id, app_version, channel_id, channel_sdk, pck_name,
              reunion_sdk, secondary, sign_key, pck_signature=""):
    params = {
        "appId": app_id, "appVersion": app_version, "channelId": channel_id,
        "channelSdkVersion": channel_sdk, "msgType": msg_type,
        "openId": open_id, "openToken": open_token,
        "pckName": pck_name, "reunionSdkVersion": reunion_sdk,
        "secondaryChannelId": secondary, "timestamp": timestamp,
    }
    # 安卓签名含 pckSignature（SHA1 APK 签名），iOS 无此参数
    if pck_signature:
        params["pckSignature"] = pck_signature
    params.update(func_params)
    s = "".join(str(params[k]) for k in sorted(params.keys()))
    s += sign_key
    return hashlib.md5(s.encode()).hexdigest()


# ============ 登录（iOS）============
def ios_login(username, password, on_log=None, device=None):
    """iOS 登录流程，返回 (account, token, zone) 或 None。
    device 可选 dict（可含 uuid/device_id）用于注入独立设备指纹，缺省用模块级默认。"""
    dev = device or {}
    if on_log: on_log("[账号] iOS 登录...")
    password_md5 = hashlib.md5(password.encode()).hexdigest()

    # op=1 配置
    if on_log: on_log("[1] op=1 配置")
    func = json.dumps({"apcId": IOS_APC_ID, "msgType": 1})
    pb, _ = build_msg(1, func, "", "", platform="ios", device=device)
    code, resp = _http_post(IOS_DAWN_V2, pb)
    if on_log:
        detail = f"（{resp.decode('utf-8', 'replace')}）" if code == -1 else ""
        on_log(f"  HTTP {code}{detail}")
    if code != 200:
        if on_log: on_log("  ❌ 配置失败"); return None

    # op=291 手机密码 / op=258 账号密码
    # 判断是手机号还是账号名
    is_mobile = username.isdigit()
    op = 291 if is_mobile else 258
    if is_mobile:
        func = json.dumps({"mobile": username, "password": password_md5,
                           "apcId": IOS_APC_ID, "msgType": op})
        if on_log: on_log(f"[2] op={op} 手机密码登录")
    else:
        func = json.dumps({"userName": username, "password": password_md5,
                           "apcId": IOS_APC_ID, "msgType": op})
        if on_log: on_log(f"[2] op={op} 账号密码登录")

    pb, _ = build_msg(op, func, "", "", platform="ios", device=device)
    code, resp = _http_post(IOS_DAWN_V2, pb)
    if on_log: on_log(f"  HTTP {code}")
    if code != 200:
        if on_log: on_log("  ❌ 登录失败"); return None
    try:
        data = json.loads(resp.decode())["data"]
        open_id, open_token = data["openId"], data["openToken"]
        if on_log: on_log(f"  openId: {open_id}")
    except Exception as e:
        if on_log: on_log(f"  解析失败: {resp[:200]}")
        return None

    # op=294 换码
    if on_log: on_log("[3] op=294 换码")
    func = json.dumps({"msgType": 294, "loginType": 0, "cancelCoolDown": 0})
    pb, _ = build_msg(294, func, open_id, open_token, platform="ios", device=device)
    code, resp = _http_post(IOS_DAWN_V2, pb)
    if on_log: on_log(f"  HTTP {code}")
    if code != 200:
        if on_log: on_log("  ❌ 换码失败"); return None
    try:
        auth_code = json.loads(resp.decode())["data"]["authCode"]
        if on_log: on_log(f"  authCode: {auth_code[:24]}...")
    except Exception as e:
        if on_log: on_log(f"  解析失败: {resp[:200]}")
        return None

    # /v1/auth (channel=12 iOS)
    if on_log: on_log("[4] /v1/auth (channel=12 iOS)")
    data_str = json.dumps({"channel": 12, "token": auth_code, "version": IOS_VER,
                           "appId": IOS_APP_ID, "platform": "ios",
                           "clientId": dev.get("uuid") or IOS_UUID,
                           "deviceId": dev.get("device_id") or IOS_DEVICE_ID},
                          separators=(",", ":"))
    code, resp = _iauth_post(data_str)
    if on_log: on_log(f"  HTTP {code}")
    if code != 200:
        if on_log: on_log("  ❌ auth失败"); return None
    try:
        auth = json.loads(resp.decode())
    except Exception:
        if on_log: on_log(f"  解析失败: {resp[:400]}")
        return None

    account = auth.get("account")
    token = auth.get("token")
    zone = auth.get("zoneData", {})
    if not token or not zone:
        if on_log: on_log("  ❌ 缺 token/zoneData"); return None
    if on_log:
        on_log(f"  account: {account}")
        on_log(f"  zone: {zone.get('name')} id={zone.get('id')}")
        on_log("  ✅ iOS 登录成功！")
    return account, token, zone


# ============ 登录（安卓）============
def android_login(username, password, on_log=None, device=None):
    """安卓登录流程，返回 (account, token, zone) 或 None。
    device 可选 dict（可含 client_id/device_id/android_id 等）用于注入独立设备指纹。"""
    dev = device or {}
    if on_log: on_log("[账号] 安卓登录...")
    password_md5 = hashlib.md5(password.encode()).hexdigest()

    # op=1 配置
    if on_log: on_log("[1] op=1 配置")
    func = json.dumps({"apcId": ANDROID_APC_ID, "msgType": 1})
    pb, _ = build_msg(1, func, "", "", platform="android", device=device)
    code, resp = _http_post(ANDROID_DAWN_V3, pb)
    if on_log:
        detail = f"（{resp.decode('utf-8', 'replace')}）" if code == -1 else ""
        on_log(f"  HTTP {code}{detail}")
    if code != 200:
        if on_log: on_log("  ❌ 配置失败"); return None

    # 判断登录方式
    is_mobile = username.isdigit()
    op = 291 if is_mobile else 258
    if is_mobile:
        func = json.dumps({"mobile": username, "password": password_md5,
                           "apcId": ANDROID_APC_ID, "msgType": op})
        if on_log: on_log(f"[2] op={op} 手机密码登录")
    else:
        func = json.dumps({"userName": username, "password": password_md5,
                           "apcId": ANDROID_APC_ID, "msgType": op, "cpUserId": 0})
        if on_log: on_log(f"[2] op={op} 账号密码登录")

    pb, _ = build_msg(op, func, "", "", platform="android", device=device)
    code, resp = _http_post(ANDROID_DAWN_V3, pb)
    if on_log: on_log(f"  HTTP {code}")
    if code != 200:
        if on_log: on_log("  ❌ 登录失败"); return None
    try:
        data = json.loads(resp.decode())["data"]
        open_id, open_token = data["openId"], data["openToken"]
        if on_log: on_log(f"  openId: {open_id}")
    except Exception as e:
        if on_log: on_log(f"  解析失败: {resp[:200]}")
        return None

    # op=294 换码
    if on_log: on_log("[3] op=294 换码")
    func = json.dumps({"msgType": 294, "loginType": 2, "cancelCoolDown": 0})
    pb, _ = build_msg(294, func, open_id, open_token, platform="android", device=device)
    code, resp = _http_post(ANDROID_DAWN_V3, pb)
    if on_log: on_log(f"  HTTP {code}")
    if code != 200:
        if on_log: on_log("  ❌ 换码失败"); return None
    try:
        auth_code = json.loads(resp.decode())["data"]["authCode"]
        if on_log: on_log(f"  authCode: {auth_code[:24]}...")
    except Exception:
        if on_log: on_log(f"  解析失败: {resp[:200]}")
        return None

    # /v1/auth (channel=9 安卓)
    if on_log: on_log("[4] /v1/auth (channel=9 安卓)")
    data_str = json.dumps({"channel": 9, "token": auth_code, "version": ANDROID_VER,
                           "appId": ANDROID_APP_ID, "platform": "android",
                           "clientId": dev.get("client_id") or ANDROID_CLIENT_ID,
                           "deviceId": dev.get("device_id") or ANDROID_DEVICE_ID},
                          separators=(",", ":"))
    code, resp = _iauth_post(data_str)
    if on_log: on_log(f"  HTTP {code}")
    if code != 200:
        if on_log: on_log("  ❌ auth失败"); return None
    try:
        auth = json.loads(resp.decode())
    except Exception:
        if on_log: on_log(f"  解析失败: {resp[:400]}")
        return None

    account = auth.get("account")
    token = auth.get("token")
    zone = auth.get("zoneData", {})
    if not token or not zone:
        if on_log: on_log("  ❌ 缺 token/zoneData"); return None
    if on_log:
        on_log(f"  account: {account}")
        on_log(f"  zone: {zone.get('name')} id={zone.get('id')}")
        on_log("  ✅ 安卓登录成功！")
    return account, token, zone


# ============ 构建消息 ============
def build_msg(msg_type, func_json, open_id="", open_token="", ts=None, platform="ios", device=None):
    if ts is None: ts = int(time.time() * 1000)
    func_params = json.loads(func_json)
    sign = make_sign(msg_type, func_params, open_id, open_token, ts,
                     IOS_APP_ID if platform == "ios" else ANDROID_APP_ID,
                     IOS_APP_VERSION if platform == "ios" else ANDROID_APP_VERSION,
                     IOS_CHANNEL_ID if platform == "ios" else ANDROID_CHANNEL_ID,
                     IOS_CHANNEL_SDK if platform == "ios" else ANDROID_CHANNEL_SDK,
                     IOS_PCK_NAME if platform == "ios" else ANDROID_PCK_NAME,
                     IOS_REUNION_SDK if platform == "ios" else ANDROID_REUNION_SDK,
                     IOS_SECONDARY if platform == "ios" else ANDROID_SECONDARY,
                     SIGN_KEY)
    pb = b""
    pb += vf(1, msg_type)
    pb += sf(2, IOS_APP_ID if platform == "ios" else ANDROID_APP_ID)
    pb += sf(3, IOS_APP_VERSION if platform == "ios" else ANDROID_APP_VERSION)
    pb += sf(4, IOS_REUNION_SDK if platform == "ios" else ANDROID_REUNION_SDK)
    pb += sf(5, IOS_CHANNEL_SDK if platform == "ios" else ANDROID_CHANNEL_SDK)
    pb += vf(6, IOS_CHANNEL_ID if platform == "ios" else ANDROID_CHANNEL_ID)
    pb += sf(7, IOS_SECONDARY if platform == "ios" else ANDROID_SECONDARY)
    pb += sf(8, open_id or "")
    pb += sf(9, open_token or "")
    pb += sf(10, IOS_PCK_NAME if platform == "ios" else ANDROID_PCK_NAME)
    pb += vf(11, ts)
    pb += sf(13, sign)

    # BaseInfo（平台差异；device 注入独立指纹，缺省回退模块级默认）
    dev = device or {}
    if platform == "ios":
        dev_uuid = dev.get("uuid") or IOS_UUID
        base = b""
        base += sf(1, "")
        base += vf(5, 2)
        base += sf(6, dev_uuid)
        base += sf(7, IOS_BAID)
        base += sf(8, dev_uuid)
        base += sf(10, dev_uuid)
        pb += bf(14, base)
    else:
        dev_base_info = dev.get("base_info") or ANDROID_BASE_INFO
        dev_client = dev.get("client_id") or ANDROID_CLIENT_ID
        dev_device = dev.get("device_id") or ANDROID_DEVICE_ID
        dev_mac = dev.get("mac") if dev.get("mac") is not None else ANDROID_MAC
        dev_signature = dev.get("signature") or ANDROID_PCK_SIGNATURE
        base = b""
        base += sf(1, dev_base_info)
        base += vf(5, 1)
        base += sf(6, dev_client)
        base += sf(7, dev_device)
        base += sf(8, ANDROID_MODEL)
        pb += bf(14, base)
        pb += sf(16, dev_mac)
        pb += sf(18, dev_signature)

    pb += sf(15, func_json)
    pb += vf(17, 0)
    return pb, sign


# ============ HTTP 工具 ============
def _http_post(url, pb):
    headers = {"Content-Type": "application/octet-stream"}
    req = urllib.request.Request(url, data=pb, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=20)
        return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return -1, str(e).encode()

def _iauth_post(data_str):
    headers = {"Content-Type": "application/octet-stream",
               "User-Agent": "UnityPlayer/2022.3.42f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)"}
    req = urllib.request.Request(IAUTH, data=("data=" + data_str).encode(), headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=20)
        return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return -1, str(e).encode()


# ============ WS 帧工具 ============
def ws_frame(msg_id, mtype, payload=b""):
    return struct.pack(">IIII", msg_id, len(payload), mtype, 0) + payload

def parse_pb_str_fields(buf):
    out = {}
    pos = 0
    n = len(buf)
    while pos < n:
        tag = 0; shift = 0
        while True:
            b = buf[pos]; pos += 1
            tag |= (b & 0x7F) << shift; shift += 7
            if not (b & 0x80): break
        fnum, wtype = tag >> 3, tag & 7
        if wtype == 2:
            ln = 0; shift = 0
            while True:
                b = buf[pos]; pos += 1
                ln |= (b & 0x7F) << shift; shift += 7
                if not (b & 0x80): break
            val = buf[pos:pos + ln]; pos += ln
            out.setdefault(fnum, []).append(val)
        elif wtype == 0:
            v = 0; shift = 0
            while True:
                b = buf[pos]; pos += 1
                v |= (b & 0x7F) << shift; shift += 7
                if not (b & 0x80): break
        else:
            if wtype == 5: pos += 4
            elif wtype == 1: pos += 8
            else: break
    return out

class WsPreError(Exception):
    """WS 前置阶段（握手 / 拉取初始数据）失败，可重新登录重试"""
    pass


async def ws_handshake(ws, account, token, zone, on_log=None, platform="ios", device=None):
    """发送握手帧并等待响应，区分「成功」与「错误码拒绝」。
    返回 (ok, info)：
      ok=True  → info={"nick": 昵称}
      ok=False → info={"err_code": 错误码或 None, "body_hex": 原始 body 十六进制}
    device 可选 dict（可含 device_id）用于注入独立设备指纹。"""
    inner = b""
    inner += vf(1, account)
    inner += sf(2, token)
    inner += vf(3, zone["id"])
    dev = device or {}
    if platform == "android":
        # 安卓平台握手参数（与 android_login 的 channel=9 配套）
        inner += sf(4, ANDROID_VER)
        inner += sf(6, "android")
        inner += sf(7, dev.get("device_id") or ANDROID_DEVICE_ID)
        inner += sf(8, ANDROID_MODEL)
        inner += sf(10, ANDROID_PCK_NAME)
    else:
        inner += sf(4, IOS_VER)
        inner += sf(6, "ios")
        inner += sf(7, dev.get("device_id") or IOS_DEVICE_ID)
        inner += sf(8, IOS_MODEL)
        inner += sf(10, IOS_PCK_NAME)
    inner += vf(12, 100001)
    await ws.send(ws_frame(1, 1, bf(1, inner)))

    other_frames = []   # 记录非 mid=1 的帧，用于失败诊断
    for i in range(10):
        try:
            r = await asyncio.wait_for(ws.recv(), timeout=15)
        except Exception:
            extra = f"；期间收到 {other_frames[:5]}" if other_frames else ""
            return False, {"err_code": None, "body_hex": f"<recv 超时>{extra}"}
        if len(r) < 16:
            continue
        mid, plen, mtype, flags = struct.unpack(">IIII", r[:16])
        if mid != 1:
            other_frames.append((mid, mtype))
            continue
        body = r[16:]
        fields = parse_pb_fields_full(body)
        # 成功：field 3 为嵌套玩家信息（含昵称）
        if 3 in fields:
            for wtype, val in fields[3]:
                if wtype == 2:
                    return True, {"nick": val.decode(errors="replace")}
            return True, {"nick": "<无昵称>"}
        # 失败：field 1 varint 为错误码（如 100011/101005/101016），无昵称字段
        err_code = None
        if 1 in fields:
            for wtype, val in fields[1]:
                if wtype == 0:
                    err_code = val
                    break
        return False, {"err_code": err_code, "body_hex": body.hex()[:64]}
    extra = f"；期间收到 {other_frames[:5]}" if other_frames else ""
    return False, {"err_code": None, "body_hex": f"<10 帧内未收到 mid=1 响应>{extra}"}


async def _pull_113(ws, q, conn_alive, tag, timeout, on_log=None):
    """发送 113 拉取请求并等待响应。
    连接断开时立即返回 None；超时输出诊断（期间收到几个其他帧）。
    返回玩家数据 dict 或 None"""
    payload113 = b"".join(sf(1, m) for m in MODULES)
    await ws.send(ws_frame(113, 3, payload113))
    deadline = time.time() + timeout
    got_other = 0
    while time.time() < deadline:
        if not conn_alive["ok"]:
            if on_log: on_log(f"  ⚠️ {tag} 拉取中断：连接已断开")
            return None
        try:
            mid, mt2, body = await asyncio.wait_for(q.get(), timeout=2)
        except asyncio.TimeoutError:
            continue
        if mid == 113:
            fields = parse_pb_str_fields(body)
            if 2 in fields:
                try:
                    return json.loads(fields[2][0].decode("utf-8", errors="replace"))
                except Exception:
                    continue
        else:
            got_other += 1
    if on_log:
        extra = f"，期间收到 {got_other} 个其他帧" if got_other else ""
        on_log(f"  ⚠️ {tag} 拉取失败：{timeout}s 内无 113 响应{extra}")
    return None


def build_skill_ids(n):
    if n <= 19:
        pool = SKILL_POOL[:n]
    else:
        extra = random.choice(RANDOM_SKILL_IDS)
        pool = SKILL_POOL + [extra]
    random.shuffle(pool)
    return pool

def gen_skill_times(clear_time, n, first=20, tail=20):
    total_span = clear_time - first - tail
    intervals = n - 1
    if intervals <= 0:
        return [first]
    avg = total_span / intervals
    d_start = avg * 0.6
    d_end = avg * 1.4
    b = (d_end - d_start) / (intervals - 1)
    a = d_start - b
    times = [first]
    t = first
    for k in range(1, intervals + 1):
        t += a + b * k
        times.append(round(t))
    return times

def build_966_payload(skill_id, count):
    inner = b"\x08" + varint(skill_id) + b"\x10" + varint(count)
    return b"\x0a" + varint(len(inner)) + inner

def build_481_payload(time_val, score, skills):
    inner = bytes.fromhex(
        "1814"
        "220808fdc5cc1310a405"
        "220808fcc5cc1310a001"
        "220808fec5cc1310e302"
        "22040807105e"
        "22070893d3d2131001"
        "22070892d3d2131002"
        "22070891d3d2131001"
        "220408701001"
        "2a09080110d1ac820a1864"
    )
    inner += b"\x30" + varint(time_val)
    for sid, cnt in skills:
        inner += b"\x42" + varint(2 + varint_len(sid) + varint_len(cnt)) \
                 + b"\x08" + varint(sid) + b"\x10" + varint(cnt)
    inner += b"\x48" + varint(score)
    inner += b"\xb8\x01\x01"
    return b"\x0a" + varint(len(inner)) + inner


# ============ 战斗流程（异步）============
async def ws_clear(account, token, zone, level, clear_time, skill_selects, on_log=None, platform="ios", device=None):
    import websockets

    skill_ids = build_skill_ids(skill_selects)
    skill_times = gen_skill_times(clear_time, skill_selects)

    if on_log: on_log(f"[5] WS 握手（{platform}）...")
    ctx = ssl.create_default_context()
    async with websockets.connect(ws_uri(zone), ssl=ctx, additional_headers={
        "User-Agent": "UnityPlayer/2022.3.42f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    }) as ws:
        ok, info = await ws_handshake(ws, account, token, zone, on_log, platform, device)
        if not ok:
            if on_log: on_log(f"  ❌ 握手被服务器拒绝 错误码={info.get('err_code')} body={info.get('body_hex')}")
            raise WsPreError(f"握手被拒 错误码={info.get('err_code')}")
        if on_log: on_log(f"  ★ WS 握手成功！玩家: {info['nick']}")
        # 补发 815 玩家列表（完全模拟真实客户端流程：握手 → 815 → 113）
        await ws.send(ws_frame(815, 2, vf(2, 420)))
        await ws.send(ws_frame(882, 5))

        # 收帧队列
        q = asyncio.Queue()
        conn_alive = {"ok": True}   # 连接状态
        async def recv_loop():
            try:
                while True:
                    r = await ws.recv()
                    if len(r) < 16: continue
                    mid, plen, mtype, flags = struct.unpack(">IIII", r[:16])
                    await q.put((mid, mtype, r[16:]))
            except Exception:
                conn_alive["ok"] = False   # 连接断开标记
        recv_task = asyncio.create_task(recv_loop())

        # 心跳保活：每 30 秒发一次 882，防止服务器断开连接
        async def heartbeat_loop():
            while True:
                await asyncio.sleep(30)
                if not conn_alive["ok"]:
                    break
                try:
                    await ws.send(ws_frame(882, 4))
                except Exception:
                    conn_alive["ok"] = False
                    break
        heartbeat_task = asyncio.create_task(heartbeat_loop())

        if on_log: on_log("[6] 113 拉初始数据...")
        before = await _pull_113(ws, q, conn_alive, "before", 12, on_log)
        if before is None:
            recv_task.cancel()
            heartbeat_task.cancel()
            raise WsPreError("113 拉取失败（无响应或连接断开）")
        b = before.get("basic", {})
        items = before.get("item", {}).get("item_record", {}) or {}
        en = items.get("21010003", {})
        if on_log: on_log(f"  💾 角色 {b.get('name')} 等级{b.get('level')} "
                          f"战力{b.get('power')} 体力{en.get('num','?')}")

        # 480 开战
        mt = 66
        if on_log: on_log(f"[7] 480 开始战斗 关卡{level}")
        inner480 = b"\x08" + varint(level)
        payload480 = b"\x0a" + varint(len(inner480)) + inner480
        await ws.send(ws_frame(480, mt, payload480))
        deadline = time.time() + 6
        got = False
        while time.time() < deadline:
            try:
                mid, mt2, body = await asyncio.wait_for(q.get(), timeout=2)
            except asyncio.TimeoutError:
                continue
            if mid == 480:
                if on_log: on_log(f"  480 确认"); got = True
            elif mid == 110:
                if on_log: on_log(f"  110 战斗数据推送"); got = True
        if not got:
            if on_log: on_log("  ⚠️ 480 未收到确认，继续")

        # 966 选技能
        if on_log: on_log(f"[8] 966 选技能 ×{len(skill_ids)}")
        c_sd = skill_ids.count(14080000)
        c_db = skill_ids.count(14120000)
        c_xq = skill_ids.count(14110000)
        c_ot = len(skill_ids) - c_sd - c_db - c_xq
        parts = [f"超导×{c_sd}"]
        if c_db: parts.append(f"毒镖×{c_db}")
        if c_xq: parts.append(f"雪球×{c_xq}")
        if c_ot: parts.append(f"随机×{c_ot}")
        if on_log: on_log(f"  技能池: {' / '.join(parts)}（随机打乱）")
        if on_log: on_log(f"  时间表: 首技能t={skill_times[0]}s → 末技能t={skill_times[-1]}s")

        counts = {}
        start = time.time()
        for i, (t_skill, sid) in enumerate(zip(skill_times, skill_ids)):
            wait = t_skill - (time.time() - start)
            if wait > 0:
                await asyncio.sleep(wait)
            counts.setdefault(sid, 0)
            counts[sid] += 1
            cnt = counts[sid]
            mt += 1
            await ws.send(ws_frame(966, mt, build_966_payload(sid, cnt)))
            name = {14080000: "超导", 14120000: "毒镖", 14110000: "雪球"}.get(sid, "随机")
            if on_log: on_log(f"  [{i+1:02d}/{len(skill_ids)}] t={t_skill}s  {name}{sid} count={cnt}")
            try:
                await asyncio.wait_for(q.get(), timeout=1)
            except asyncio.TimeoutError:
                pass

        # 等待结算（期间检测连接断开）
        wait = clear_time - (time.time() - start)
        if wait > 0:
            if on_log: on_log(f"[等待] 距结算还剩 {wait:.0f} 秒...")
            while wait > 0:
                if not conn_alive["ok"]:
                    if on_log: on_log("  ⚠️ 连接已断开，通关失败")
                    recv_task.cancel()
                    heartbeat_task.cancel()
                    return
                await asyncio.sleep(min(5, wait))
                wait = clear_time - (time.time() - start)

        # 481 结算
        m, s = divmod(clear_time, 60)
        if on_log: on_log(f"[9] 481 结算（{clear_time}秒 = {m}分{s}秒）")
        score = 1000000 + level * 100000
        skill_usage = list(Counter(skill_ids).items())
        mt += 1
        await ws.send(ws_frame(481, mt, build_481_payload(clear_time, score, skill_usage)))
        deadline = time.time() + 15
        while time.time() < deadline:
            try:
                mid, mt2, body = await asyncio.wait_for(q.get(), timeout=2)
            except asyncio.TimeoutError:
                continue
            if mid == 481:
                if on_log: on_log(f"  481 响应 len={len(body)} ✅")
            elif mid == 110:
                try:
                    j = json.loads(body.decode())
                    if on_log: on_log(f"  110 推送: {json.dumps(j, ensure_ascii=False)[:120]}")
                except Exception:
                    pass

        # 113 验证
        await asyncio.sleep(3)
        after = await _pull_113(ws, q, conn_alive, "after", 12, on_log)
        if after:
            layer = (after.get("battle", {}).get("main", {}) or {}).get("layer_record", {}) or {}
            rec = layer.get(str(level))
            if rec:
                if on_log: on_log(f"\n  ✅✅ 通关成功！layer_record[{level}] = {json.dumps(rec, ensure_ascii=False)}")
            else:
                if on_log: on_log(f"\n  ⚠️ 未找到关卡{level}")
            if before:
                pb_ = before.get("basic", {}); pa_ = after.get("basic", {})
                if on_log: on_log(f"  战力: {pb_.get('power')} → {pa_.get('power')}")

        recv_task.cancel()
        heartbeat_task.cancel()


# ============ 红包解析工具 ============
def parse_pb_fields_full(buf):
    """完整 protobuf 解析，返回 {field_num: [(wire_type, value)]}
    wire_type 0 = varint, 2 = length-delimited(bytes)"""
    out = {}
    pos = 0
    n = len(buf)
    while pos < n:
        tag = 0; shift = 0
        while True:
            b = buf[pos]; pos += 1
            tag |= (b & 0x7F) << shift; shift += 7
            if not (b & 0x80): break
        fnum, wtype = tag >> 3, tag & 7
        if wtype == 2:
            ln = 0; shift = 0
            while True:
                b = buf[pos]; pos += 1
                ln |= (b & 0x7F) << shift; shift += 7
                if not (b & 0x80): break
            val = buf[pos:pos + ln]; pos += ln
            out.setdefault(fnum, []).append((wtype, val))
        elif wtype == 0:
            v = 0; shift = 0
            while True:
                b = buf[pos]; pos += 1
                v |= (b & 0x7F) << shift; shift += 7
                if not (b & 0x80): break
            out.setdefault(fnum, []).append((wtype, v))
        else:
            if wtype == 5: pos += 4
            elif wtype == 1: pos += 8
            else: break
    return out

def parse_redpocket_broadcast(body):
    """解析 506 红包广播，返回 (guid, configId) 或 None"""
    # 结构: 1:{1: 发红包者PlayerInfo, 2:"{json}", 3:时间戳, 6:3}, 2:2
    fields = parse_pb_fields_full(body)
    if 1 not in fields:
        return None
    for wtype, val in fields[1]:
        if wtype != 2: continue
        inner = parse_pb_fields_full(val)
        if 2 not in inner: continue
        for iwt, ival in inner[2]:
            if iwt != 2: continue
            try:
                content = json.loads(ival.decode("utf-8", errors="replace"))
                if "guid" in content:
                    guid = int(content["guid"])
                    config_id = int(content.get("configId", 11))
                    return guid, config_id
            except Exception:
                continue
    return None

def parse_110_json(body):
    """解析 110 推送，返回其中的 JSON（field 3 或 field 4）或 None"""
    fields = parse_pb_fields_full(body)
    # 多模块更新在 field 3，单模块更新在 field 4
    for fnum in (3, 4):
        if fnum not in fields:
            continue
        for wtype, val in fields[fnum]:
            if wtype != 2: continue
            try:
                return json.loads(val.decode("utf-8", errors="replace"))
            except Exception:
                continue
    return None

def parse_1033_code(body):
    """解析 1033 响应，返回错误码 varint（field 1）或 None"""
    fields = parse_pb_fields_full(body)
    if 1 in fields:
        for wtype, val in fields[1]:
            if wtype == 0:
                return val
    return None


# ============ 抢红包主流程（异步）============
async def ws_redpocket(account, token, zone, target, on_log=None, platform="ios", stop_flag=None, device=None, stats=None):
    import websockets
    ctx = ssl.create_default_context()

    if on_log: on_log(f"[抢红包] WS 连接中（{platform}）...")
    async with websockets.connect(ws_uri(zone), ssl=ctx, additional_headers={
        "User-Agent": "UnityPlayer/2022.3.42f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    }) as ws:
        ok, info = await ws_handshake(ws, account, token, zone, on_log, platform, device)
        if not ok:
            if on_log: on_log(f"  ❌ 握手被服务器拒绝 错误码={info.get('err_code')} body={info.get('body_hex')}")
            raise WsPreError(f"握手被拒 错误码={info.get('err_code')}")
        if on_log: on_log(f"  ★ WS 握手成功！玩家: {info['nick']}")
        # 补发 815 玩家列表（完全模拟真实客户端流程：握手 → 815 → 113）
        await ws.send(ws_frame(815, 2, vf(2, 420)))
        await ws.send(ws_frame(882, 5))

        # 收帧队列
        q = asyncio.Queue()
        conn_alive = {"ok": True}   # 连接状态
        async def recv_loop():
            try:
                while True:
                    r = await ws.recv()
                    if len(r) < 16: continue
                    mid, plen, mtype, flags = struct.unpack(">IIII", r[:16])
                    await q.put((mid, mtype, r[16:]))
            except Exception:
                conn_alive["ok"] = False   # 连接断开标记
        recv_task = asyncio.create_task(recv_loop())

        # 心跳保活：每 30 秒发一次 882，防止服务器断开连接
        async def heartbeat_loop():
            while True:
                await asyncio.sleep(30)
                if not conn_alive["ok"]:
                    break
                try:
                    await ws.send(ws_frame(882, 4))
                except Exception:
                    conn_alive["ok"] = False
                    break
        heartbeat_task = asyncio.create_task(heartbeat_loop())

        async def pull_113(tag, timeout=12):
            return await _pull_113(ws, q, conn_alive, tag, timeout, on_log)

        # 拉初始数据，获取当前 get_times 和钻石数
        if on_log: on_log("[抢红包] 拉取初始数据...")
        init = await pull_113("init")
        if init and stats is not None:
            stats["nick"] = init.get("basic", {}).get("name", "")  # 回传真实角色名（113 basic.name 干净）
        start_times = 0
        start_diamond = 0
        # 只关注当前红包活动 configId=11 的 get_times（每日累计）
        REDPOCKET_CID = "11"
        if init:
            rp = init.get("red_pocket", {}).get("pocket_record", {})
            # 调试：打印所有 configId 的 get_times，确认结构
            if on_log:
                try:
                    rp_summary = {k: v.get("get_times", 0) for k, v in rp.items()}
                    on_log(f"  📋 113 red_pocket 全部记录: {json.dumps(rp_summary, ensure_ascii=False)}")
                except Exception:
                    on_log(f"  📋 113 red_pocket 原始: {json.dumps(rp, ensure_ascii=False)[:300]}")
            rec = rp.get(REDPOCKET_CID, {})
            start_times = rec.get("get_times", 0) or 0
            items = init.get("item", {}).get("item_record", {})
            d = items.get("21010002", {})
            start_diamond = d.get("num", 0) or 0
            if on_log: on_log(f"  初始: 今日已抢 {start_times} 次, 钻石 {start_diamond}")
        else:
            if on_log: on_log("  ⚠️ 113 拉取失败，使用默认值 0")

        # 每日上限 10 次，本次最多还能抢 10 - start_times 个
        remaining_daily = max(0, 10 - start_times)
        target = min(target, remaining_daily)
        if target <= 0:
            if on_log: on_log("  ⚠️ 今日已抢满 10 次（每日上限），无需再抢")
            recv_task.cancel()
            heartbeat_task.cancel()
            # 等 2 秒让日志推送出去再返回
            await asyncio.sleep(2)
            return

        grabbed = start_times      # 当前 get_times（累计）
        grabbed_this_run = 0       # 本次启动抢到数
        diamond_this_run = 0       # 本次启动累计钻石
        last_diamond = start_diamond
        seen_guids = set()         # 已抢红包 guid 去重
        running = True
        mt = 100                   # type 业务序号
        MAX_WAIT = 60 * 30         # 最多监听 30 分钟

        start_wait = time.time()
        if on_log: on_log(f"🎯 抢红包启动！目标 {target} 个红包（本次）")
        if on_log: on_log(f"  每日上限 10 次，剩余 {remaining_daily} 次")

        frame_count = 0
        while running and grabbed_this_run < target:
            if stop_flag is not None and stop_flag.get("stop"):
                if on_log: on_log("🛑 停止请求，退出")
                break
            if time.time() - start_wait > MAX_WAIT:
                if on_log: on_log("⏱️ 超时（30分钟）自动停止")
                break
            # 连接断开检测
            if not conn_alive["ok"]:
                if on_log: on_log("  ⚠️ 连接已断开，自动停止")
                break
            try:
                mid, mt2, body = await asyncio.wait_for(q.get(), timeout=5)
            except asyncio.TimeoutError:
                if stop_flag is not None and stop_flag.get("stop"):
                    if on_log: on_log("🛑 停止请求，退出")
                    break
                continue

            # 调试：打印收到的帧（每 10 帧汇总一次，避免刷屏）
            frame_count += 1
            if frame_count <= 5 or frame_count % 10 == 0:
                if on_log: on_log(f"  📡 收到帧 msg_id={mid} type={mt2} len={len(body)}")

            if mid == 506:
                # 红包广播（也可能是普通聊天）—— 先解析
                rp_info = parse_redpocket_broadcast(body)
                if rp_info:
                    guid, config_id = rp_info
                    if guid in seen_guids:
                        if on_log: on_log(f"  👀 收到红包广播 guid={guid}（已抢过，跳过）")
                        continue
                    seen_guids.add(guid)
                    mt += 1
                    payload1033 = vf(1, guid) + vf(2, config_id)
                    await ws.send(ws_frame(1033, mt, payload1033))
                    if on_log: on_log(f"  🧧 发现红包 guid={guid} config={config_id} → 已发送抢")
                else:
                    # 打印 506 原始内容（调试用），确认是不是红包
                    if on_log:
                        try:
                            # 尝试提取内层 field2 文本
                            fields = parse_pb_fields_full(body)
                            txt = ""
                            if 1 in fields:
                                for wtype, val in fields[1]:
                                    if wtype == 2:
                                        inner = parse_pb_fields_full(val)
                                        if 2 in inner:
                                            for iwt, ival in inner[2]:
                                                if iwt == 2:
                                                    txt = ival.decode("utf-8", errors="replace")
                            if "guid" in txt:
                                on_log(f"  🔍 506含guid但解析失败! content={txt[:200]}")
                            else:
                                on_log(f"  💬 506聊天: {txt[:120]}")
                        except Exception:
                            pass

            elif mid == 1033:
                code = parse_1033_code(body)
                if code == 109204:
                    if on_log: on_log("  ⚠️ 每日抢红包次数已达上限 (109204)，自动停止")
                    running = False
                elif code == 109205:
                    if on_log: on_log("  ✅ 抢红包请求成功（等待 110 确认）")
                elif code:
                    if on_log: on_log(f"  ℹ️ 1033 响应 code={code}")
                else:
                    if on_log: on_log(f"  ℹ️ 1033 响应（无code字段） body={body[:40].hex()}")

            elif mid == 110:
                jdata = parse_110_json(body)
                if jdata is None:
                    continue
                # 抢到确认：red_pocket.pocket_record.<id>.get_times 增加
                # ⚠️ 只关注 configId=11（当前红包活动）的记录，
                #    其他 configId（如 12）的 get_times 是历史累计，不能误判！
                rp_new = jdata.get("red_pocket", {}).get("pocket_record", {})
                if not rp_new:
                    continue
                rec = rp_new.get(REDPOCKET_CID)
                if not rec:
                    if on_log: on_log(f"  ℹ️ 110含red_pocket但无{ REDPOCKET_CID }号记录: {list(rp_new.keys())}")
                    continue
                new_times = rec.get("get_times", 0) or 0
                if new_times > grabbed:
                    gained = new_times - grabbed
                    grabbed = new_times
                    grabbed_this_run += gained
                    # 钻石变化
                    items = jdata.get("item", {}).get("item_record", {})
                    d = items.get("21010002", {})
                    if d and d.get("num") is not None:
                        cur_d = int(d["num"])
                        if cur_d >= last_diamond:
                            diamond_this_run += cur_d - last_diamond
                        last_diamond = cur_d
                    if on_log: on_log(
                        f"  ✅ 抢到红包！本次已抢 {grabbed_this_run} 个, "
                        f"累计钻石 +{diamond_this_run}")
                    if grabbed_this_run >= target:
                        if on_log: on_log(f"  🎉 已抢满 {target} 个红包，任务完成！")
                        running = False
                    # 检查是否每日上限
                    if grabbed >= 10:
                        if on_log: on_log("  ⚠️ 已达每日上限 10 次")
                        running = False

        recv_task.cancel()
        heartbeat_task.cancel()
        if on_log:
            on_log(f"\n📊 本次抢红包统计：")
            on_log(f"  抢到红包: {grabbed_this_run} 个")
            on_log(f"  累计钻石: +{diamond_this_run}")


# ============ 抢红包同步入口 ============
def run_redpocket(platform, username, password, target, on_log, stop_flag=None, device=None, stats=None):
    """同步运行抢红包流程，on_log 回调实时输出日志。
    stop_flag 可选 dict（{"stop": bool}）协作式停止；device 注入独立设备指纹；stats 可选 dict 回传昵称。"""
    on_log(f"🎯 目标: 抢 {target} 个红包")

    MAX_ATTEMPT = 3
    for attempt in range(1, MAX_ATTEMPT + 1):
        if platform == "ios":
            result = ios_login(username, password, on_log, device)
        else:
            result = android_login(username, password, on_log, device)
        if result is None:
            on_log("❌ 登录失败，流程终止"); return

        account, token, zone = result

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(ws_redpocket(account, token, zone, target, on_log, platform, stop_flag, device, stats))
            return
        except WsPreError as e:
            if attempt < MAX_ATTEMPT:
                on_log(f"  ↻ 前置阶段失败（{e}），10 秒后重新登录重试（{attempt}/{MAX_ATTEMPT}）...")
                time.sleep(10)
            else:
                on_log(f"  ❌ 连续 {MAX_ATTEMPT} 次失败（{e}），任务终止")
                on_log("  💡 若持续 101016：服务器已对该连接特征风控（同 WiFi 真机正常→非 IP）。可尝试："
                       "① 注入真实真机设备指纹（环境变量 YLK_IOS_UUID/YLK_IOS_DEVICE_ID）；"
                       "② 面板切安卓平台 + 真实安卓设备指纹对照；③ 间隔数小时再试（风控可能自动解除）")
        finally:
            loop.close()


# ============ 同步入口（供 Flask 调用）============
def run_clear(platform, username, password, level, clear_time, skill_selects, on_log, device=None):
    """同步运行完整通关流程，on_log 回调用于实时输出日志。device 注入独立设备指纹。"""
    on_log(f"🎯 目标: 关卡{level}  {clear_time}秒 ({clear_time//60}分{clear_time%60}秒)  技能{skill_selects}次")

    MAX_ATTEMPT = 3
    for attempt in range(1, MAX_ATTEMPT + 1):
        # 登录
        if platform == "ios":
            result = ios_login(username, password, on_log, device)
        else:
            result = android_login(username, password, on_log, device)
        if result is None:
            on_log("❌ 登录失败，流程终止"); return

        account, token, zone = result

        # 战斗（创建新事件循环，避免线程冲突）
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(ws_clear(account, token, zone, level, clear_time, skill_selects, on_log, platform, device))
            return
        except WsPreError as e:
            if attempt < MAX_ATTEMPT:
                on_log(f"  ↻ 前置阶段失败（{e}），10 秒后重新登录重试（{attempt}/{MAX_ATTEMPT}）...")
                time.sleep(10)
            else:
                on_log(f"  ❌ 连续 {MAX_ATTEMPT} 次失败（{e}），任务终止")
                on_log("  💡 若持续 101016：服务器已对该连接特征风控（同 WiFi 真机正常→非 IP）。可尝试："
                       "① 注入真实真机设备指纹（环境变量 YLK_IOS_UUID/YLK_IOS_DEVICE_ID）；"
                       "② 面板切安卓平台 + 真实安卓设备指纹对照；③ 间隔数小时再试（风控可能自动解除）")
        finally:
            loop.close()