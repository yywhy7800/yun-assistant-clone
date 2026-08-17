# -*- coding: utf-8 -*-
"""云助手收菜核心：WS 直连游戏，定时收基地菜/停车票/码头船

协议（2026-08-15 车机脚本抓包破解）：
- 基地收菜：982 {1:建筑ID, 2:"01 02 03"}
- 停车场收票：1026 {1:"ghijfe"}
- 停车场停车：974 {1:车位, 2:车手, 3:角色}
- 码头收船：1002 {1:船位ID}
- 码头派船：1001 {1:船位, 2:{1:槽位, 2:数量}} ×3 槽（装载数量不严格校验，固定 387/323/19）

依赖：clear_core.py（登录/WS/帧构造公共函数）
"""
import asyncio
import ssl
import struct
import time

from clear_core import (vf, sf, bf, ws_frame, ws_uri, ios_login, android_login,
                        ws_handshake, _pull_113, WsPreError)

DEFAULT_LOAD = (387, 323, 19)  # 码头派船装载数量（槽位1/2/3）
PARK2_ID = 30026  # 二号停车场建筑 ID（2026-08-15 实测）


def build_982(bid):
    """收基地建筑: {1: 建筑ID, 2: "01 02 03"}"""
    return vf(1, bid) + bf(2, b"\x01\x02\x03")


def build_1026():
    """一号停车场收票: {1: "65 c9 01"}（2026-08-16 实测当前号值，非固定字符串）"""
    return bf(1, b"\x65\xc9\x01")


def build_973(building_id):
    """二号停车场收票: {1: 停车场建筑ID}（2026-08-15 实测 30026=二号停车场）"""
    return vf(1, building_id)


def build_974(park, driver, hero):
    """停车: {1: 车位, 2: 车手, 3: 角色}"""
    return vf(1, park) + vf(2, driver) + vf(3, hero)


def build_1002(wharf):
    """收船: {1: 船位}"""
    return vf(1, wharf)


def build_1001(wharf, slot, cnt):
    """派船: {1: 船位, 2: {1: 槽位, 2: 数量}}"""
    return vf(1, wharf) + bf(2, vf(1, slot) + vf(2, cnt))


async def _base_collect(base, mt, ws, on_log):
    """基地收菜：有产出且已到时的建筑 → 982"""
    builds = base.get("build_record", {}) or {}
    now = time.time()
    n = 0
    for bid, info in builds.items():
        pr = info.get("produce_record") or {}
        if not pr:
            continue
        times = [v.get("finish_time", 0) for v in pr.values() if isinstance(v, dict)]
        if times and max(times) <= now:
            await ws.send(ws_frame(982, mt, build_982(int(bid))))
            mt += 1
            n += 1
            if on_log:
                on_log(f"  🏭 基地收菜 {bid}")
            await asyncio.sleep(1)
    return mt, n


async def _park_tickets(base, mt, ws, on_log):
    """停车场收票：1026 {1: 可收车位varint序列}（2026-08-16 确认 payload=车位列表，动态构造）"""
    if not base.get("park_record"):
        return mt, 0
    now = time.time()
    slots = []
    for pid, info in (base.get("park_record", {}) or {}).items():
        if not isinstance(info, dict) or not info.get("start_time"):
            continue
        if info.get("start_time", 0) + info.get("max_time", 0) <= now:
            slots.append(int(pid))
    if not slots:
        return mt, 0
    # payload = 所有可收车位的 varint 序列（field1 bytes）
    body = b"".join(vf(1, s)[1:] for s in slots)
    payload = bf(1, body)
    await ws.send(ws_frame(1026, mt, payload))
    mt += 1
    if on_log:
        on_log(f"  🅿️ 停车场收票（{len(slots)} 辆: {slots}）")
    await asyncio.sleep(1.5)
    return mt, 1


async def _park_park(data, base, mt, ws, on_log):
    """停车：空车位 + 未占用车手/角色 → 974
    必须用【收票后刷新】的数据——收票前车位都停着，空车位判断会出错"""
    reward = base.get("reward_record", {}) or {}
    occ_heroes = set(str(k) for k in reward.keys())
    occ_drivers = set()
    for k, v in reward.items():
        if isinstance(v, dict) and v.get("driver_id"):
            occ_drivers.add(str(v["driver_id"]))
    parks = [p for p, info in (base.get("park_record", {}) or {}).items()
             if (info or {}).get("start_time") == 0]
    drivers = [d for d in (data.get("driver", {}).get("driver_record", {}) or {}).keys()
               if str(d) not in occ_drivers]
    heroes = [h for h in (data.get("hero", {}).get("hero_record", {}) or {}).keys()
              if str(h) not in occ_heroes]
    n = min(len(parks), len(drivers), len(heroes))
    for i in range(n):
        await ws.send(ws_frame(974, mt, build_974(int(parks[i]), int(drivers[i]), int(heroes[i]))))
        mt += 1
        if on_log:
            on_log(f"  🅿️ 停车 {parks[i]} ← 车手{drivers[i]}+角色{heroes[i]}")
        await asyncio.sleep(1)
    return mt, n


async def _wharf_collect(base, mt, ws, on_log, loads):
    """码头：收船 1002 + 派船 1001"""
    wharfs = base.get("wharf_record", {}) or {}
    n = 0
    for wid, info in wharfs.items():
        if not info.get("reward_record"):
            continue
        await ws.send(ws_frame(1002, mt, build_1002(int(wid))))
        mt += 1
        if on_log:
            on_log(f"  ⛵ 收船 {wid}")
        await asyncio.sleep(1.5)
        for slot, cnt in enumerate(loads, start=1):
            await ws.send(ws_frame(1001, mt, build_1001(int(wid), slot, cnt)))
            mt += 1
        if on_log:
            on_log(f"  ⛵ 派船 {wid} 出海（装载 {loads}）")
        await asyncio.sleep(1)
        n += 1
    return mt, n


async def _shoucai_once(ws, q, conn_alive, pull_113, on_log, loads, stats):
    """一轮收菜：拉 113 → 解析 base → 收基地/停车/码头"""
    data = await pull_113("shoucai")
    if not data:
        return False
    base = data.get("base", {}) or {}
    if stats is not None and not stats.get("nick"):
        stats["nick"] = data.get("basic", {}).get("name", "")
    mt = 10  # 握手后 815/882 之后的消息序号起点
    if on_log:
        on_log("  📡 拉取基地/停车场/码头数据...")
    mt, nb = await _base_collect(base, mt, ws, on_log)
    # 停车场：先收票（1026），收票后刷新 113 再停车（空车位判断需新数据）
    np = 0
    if base.get("park_record"):
        mt, _ = await _park_tickets(base, mt, ws, on_log)
        data2 = await pull_113("shoucai2")
        if data2:
            base2 = data2.get("base", {}) or {}
            mt, np = await _park_park(data2, base2, mt, ws, on_log)
    mt, nw = await _wharf_collect(base, mt, ws, on_log, loads)
    total = nb + np + nw
    if on_log:
        on_log(f"  ✅ 本轮收菜完成：基地 {nb} / 停车 {np} / 码头 {nw}")
    if stats is not None:
        stats.setdefault("shoucai_total", 0)
        stats["shoucai_total"] += total
    return True


async def ws_shoucai(account, token, zone, on_log=None, platform="ios",
                     stop_flag=None, device=None, stats=None, loads=DEFAULT_LOAD):
    """WS 直连 + 定时收菜循环"""
    import websockets
    ctx = ssl.create_default_context()
    if on_log:
        on_log("[收菜] WS 连接中...")
    async with websockets.connect(ws_uri(zone), ssl=ctx, additional_headers={
        "User-Agent": "UnityPlayer/2022.3.42f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    }) as ws:
        ok, info = await ws_handshake(ws, account, token, zone, on_log, platform, device)
        if not ok:
            raise WsPreError(f"握手被拒 错误码={info.get('err_code')}")
        if on_log:
            on_log(f"  ★ WS 握手成功！玩家: {info['nick']}")
        await ws.send(ws_frame(815, 2, vf(2, 420)))
        await ws.send(ws_frame(882, 5))

        q = asyncio.Queue()
        conn_alive = {"ok": True}

        async def recv_loop():
            try:
                while True:
                    r = await ws.recv()
                    if len(r) < 16:
                        continue
                    mid, plen, mtype, flags = struct.unpack(">IIII", r[:16])
                    await q.put((mid, mtype, r[16:]))
            except Exception:
                conn_alive["ok"] = False

        recv_task = asyncio.create_task(recv_loop())

        async def pull_113(tag, timeout=12):
            return await _pull_113(ws, q, conn_alive, tag, timeout, on_log)

        # 单轮收菜：收完即断开（游戏下线），下次由 run_shoucai 重新登录再收
        if on_log:
            on_log("  📡 开始收菜...")
        try:
            await _shoucai_once(ws, q, conn_alive, pull_113, on_log, loads, stats)
        except Exception as e:
            if on_log:
                on_log(f"  ⚠️ 收菜异常: {e}")
        if on_log:
            on_log("  ✅ 本轮收菜完成，断开连接（游戏下线）")
    # with 块退出 = WS 连接关闭，游戏下线


def run_shoucai(platform, username, password, interval, on_log, stop_flag=None,
                device=None, stats=None, loads=DEFAULT_LOAD):
    """同步入口：循环 = 登录 → 收菜一轮 → 游戏下线 → 等 interval 小时 → 重新登录收菜"""
    stop_flag = stop_flag or {"stop": False}
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    round_no = 0
    try:
        while not stop_flag.get("stop"):
            round_no += 1
            if on_log:
                on_log(f"===== 第 {round_no} 轮收菜 =====")
            # 登录
            try:
                if platform == "ios":
                    result = ios_login(username, password, on_log, device)
                else:
                    result = android_login(username, password, on_log, device)
            except Exception as e:
                on_log(f"❌ 登录失败: {e}")
                for _ in range(30):
                    if stop_flag.get("stop"):
                        break
                    time.sleep(2)
                continue
            account, token, zone = result
            if on_log:
                try:
                    import json
                    on_log(f"  [调试] zoneData: {json.dumps(zone, ensure_ascii=False)[:500]}")
                except Exception:
                    pass
            # 收菜一轮（完成后 WS 断开 = 游戏下线）
            try:
                loop.run_until_complete(ws_shoucai(
                    account, token, zone, on_log, platform, stop_flag, device, stats, loads))
            except Exception as e:
                on_log(f"  ⚠️ 本轮异常: {e}")
            if stop_flag.get("stop"):
                break
            if on_log:
                on_log(f"  ⏸️ 游戏下线，{interval:g} 小时后重新登录收菜")
            h = interval * 3600
            waited = 0
            while waited < h and not stop_flag.get("stop"):
                time.sleep(10)
                waited += 10
    finally:
        loop.close()
