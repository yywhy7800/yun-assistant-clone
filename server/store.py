# -*- coding: utf-8 -*-
"""
云助手数据存储（JSON 文件 + 线程锁）
users / scripts / configs / devices 存 data/ 目录
"""
import base64
import datetime
import hashlib
import json
import os
import threading
import time

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
SECRET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".secret")
_lock = threading.Lock()


# ==================== 基础读写 ====================
def _ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)


def _read_json(name, fallback):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        return fallback
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return fallback


def _write_json(name, data):
    _ensure_dirs()
    path = os.path.join(DATA_DIR, name)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


# ==================== 密码加密（XOR + pbkdf2 派生 key）====================
def _secret_key():
    if os.path.exists(SECRET_FILE):
        with open(SECRET_FILE, "rb") as f:
            return f.read()
    key = os.urandom(32)
    with open(SECRET_FILE, "wb") as f:
        f.write(key)
    return key


def _derive_key():
    return hashlib.pbkdf2_hmac("sha256", _secret_key(), b"yun-assistant", 100000)


def encrypt_text(plain):
    """加密脚本游戏密码（本地自用，XOR 混淆 + 随机密钥文件）"""
    key = _derive_key()
    raw = plain.encode("utf-8")
    stream = bytes((b ^ key[i % len(key)]) for i, b in enumerate(raw))
    return base64.b64encode(stream).decode("ascii")


def decrypt_text(enc):
    key = _derive_key()
    raw = base64.b64decode(enc.encode("ascii"))
    plain = bytes((b ^ key[i % len(key)]) for i, b in enumerate(raw))
    return plain.decode("utf-8")


def hash_password(pw):
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, 100000)
    return base64.b64encode(salt + dk).decode("ascii")


def verify_password(pw, stored):
    try:
        raw = base64.b64decode(stored.encode("ascii"))
        salt, dk = raw[:16], raw[16:]
        return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt, 100000) == dk
    except Exception:
        return False


# ==================== users ====================
def get_users():
    return _read_json("users.json", [])


def find_user(username=None, uid=None):
    for u in get_users():
        if uid is not None and u.get("id") == uid:
            return u
        if username is not None and u.get("username") == username:
            return u
    return None


def next_user_id():
    return max([u.get("id", 0) for u in get_users()], default=0) + 1


def add_user(user):
    with _lock:
        users = get_users()
        users.append(user)
        _write_json("users.json", users)


def update_user(uid, fn):
    with _lock:
        users = get_users()
        for u in users:
            if u.get("id") == uid:
                fn(u)
                break
        _write_json("users.json", users)


# ==================== scripts ====================
def get_scripts():
    return _read_json("scripts.json", [])


def find_script(sid, user_id=None):
    for s in get_scripts():
        if s.get("id") == sid and (user_id is None or s.get("user_id") == user_id):
            return s
    return None


def next_script_id():
    return max([s.get("id", 0) for s in get_scripts()], default=0) + 1


def add_script(script):
    with _lock:
        scripts = get_scripts()
        scripts.append(script)
        _write_json("scripts.json", scripts)


def update_script(sid, fn):
    with _lock:
        scripts = get_scripts()
        for s in scripts:
            if s.get("id") == sid:
                fn(s)
                break
        _write_json("scripts.json", scripts)


def set_script_status(sid, status):
    update_script(sid, lambda s: s.__setitem__("status", status))


def delete_script(sid):
    with _lock:
        scripts = get_scripts()
        scripts = [s for s in scripts if s.get("id") != sid]
        _write_json("scripts.json", scripts)


# ==================== configs ====================
def get_configs():
    return _read_json("configs.json", {})


def get_config(sid):
    return get_configs().get(str(sid), {})


def save_config(sid, config):
    with _lock:
        configs = get_configs()
        configs[str(sid)] = config or {}
        _write_json("configs.json", configs)


def delete_config(sid):
    with _lock:
        configs = get_configs()
        configs.pop(str(sid), None)
        _write_json("configs.json", configs)


# ==================== devices ====================
def get_devices():
    return _read_json("devices.json", {})


def save_devices(devices):
    with _lock:
        _write_json("devices.json", devices)


# ==================== 时间工具 ====================
def now_str():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def now_dt():
    return datetime.datetime.now()


def add_days(n, base=None):
    d = datetime.date.today() if base is None else datetime.date.fromisoformat(base)
    return (d + datetime.timedelta(days=n)).isoformat()


def extend_expiry(days, base=None):
    """从 max(当前时间, base 到期) 起延后 days 天，返回 'YYYY-MM-DD HH:MM:SS'（精确到分秒）。
    base 为空 → 从当前时间起算；兼容旧 YYYY-MM-DD 格式。"""
    now = datetime.datetime.now()
    start = now
    if base:
        bd = None
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                bd = datetime.datetime.strptime(base, fmt)
                break
            except ValueError:
                bd = None
        if bd and bd > now:
            start = bd
    return (start + datetime.timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")


# ==================== cards（卡密表） ====================
def get_cards():
    return _read_json("cards.json", [])


def save_cards(cards):
    with _lock:
        _write_json("cards.json", cards)


def add_cards(cards):
    with _lock:
        all_cards = get_cards()
        all_cards.extend(cards)
        _write_json("cards.json", all_cards)


def find_card(code):
    code = code.strip().upper()
    for c in get_cards():
        if c.get("code", "").upper() == code:
            return c
    return None


def mark_card_used(code, username):
    code = code.strip().upper()
    with _lock:
        cards = get_cards()
        for c in cards:
            if c.get("code", "").upper() == code:
                c["used"] = True
                c["used_by"] = username
                c["used_at"] = now_str()
                break
        _write_json("cards.json", cards)
