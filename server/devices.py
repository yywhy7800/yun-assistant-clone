# -*- coding: utf-8 -*-
"""
设备指纹池：为每个账号分配独立设备指纹（避免多账号共用同一指纹被风控关联）
同一账号固定复用同一指纹（模拟同一设备）；不同账号指纹不同
"""
import json
import secrets
import uuid

import store

# 沿用 clear_core.py 的成功抓包安卓签名
ANDROID_SIGNATURE = "AB:1F:51:AF:0E:0C:7C:D3:29:AB:5A:C2:B8:28:54:E6:75:97:0D:E4"


def _gen_ios():
    return {
        "platform": "ios",
        "uuid": str(uuid.uuid4()),
        "device_id": str(uuid.uuid4()),
    }


def _gen_android():
    device_id = secrets.token_hex(8)
    client_id = secrets.token_hex(16)
    android_id = "7a7a6e7b" + secrets.token_hex(4)
    base_info = json.dumps({"aid": android_id, "androidId": android_id, "mac": "", "oaid": ""},
                           separators=(",", ":"))
    return {
        "platform": "android",
        "client_id": client_id,
        "device_id": device_id,
        "android_id": android_id,
        "mac": "",
        "signature": ANDROID_SIGNATURE,
        "base_info": base_info,
    }


def gen_device(platform):
    """生成一组新指纹（platform: ios / android）"""
    return _gen_ios() if platform == "ios" else _gen_android()


def get_or_create_device(account, platform):
    """按账号稳定分配设备指纹：返回 (device_key, device_meta)"""
    key = f"{platform}:{account}"
    devices = store.get_devices()
    if key in devices:
        return key, devices[key]
    meta = gen_device(platform)
    devices[key] = meta
    store.save_devices(devices)
    return key, meta


def get_device(device_key):
    """按 device_key 取指纹（脚本启动时用）"""
    return store.get_devices().get(device_key)
