# -*- coding: utf-8 -*-
"""简化认证：token 内存管理（服务重启失效，本地自用可接受）"""
import secrets
import time

from flask import request

import store

_tokens = {}  # token -> (user_id, expires_ts)
TOKEN_TTL = 7 * 24 * 3600


def create_token(user_id):
    token = secrets.token_hex(20)
    _tokens[token] = (user_id, time.time() + TOKEN_TTL)
    return token


def current_user():
    """从 Authorization: Bearer <token> 解析当前用户，无效返回 None"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    info = _tokens.get(token)
    if not info:
        return None
    uid, exp = info
    if time.time() > exp:
        _tokens.pop(token, None)
        return None
    return store.find_user(uid=uid)
