# -*- coding: utf-8 -*-
"""
一路狂飙 - 刷三倍芯片核心（直连架构，不依赖模拟器）
流程：登录 → WS握手 → 循环刷图（480开战 → 966技能升级随机 → 481失败结算随机时间）
     → 解析掉落芯片 → 品质判定 → 好芯片 381×2+382 三倍领取
     → 直到今日剩余3倍次数为 0 停止

复用 clear_core 的登录/握手工具。
"""
import asyncio
import json
import os
import random
import re
import ssl
import struct
import sys
import time

from clear_core import (
    varint, ws_frame, ws_uri, ios_login, android_login, ws_handshake,
    WsPreError, _pull_113, gen_skill_times,
)

THRESHOLD_NAMES = {3: "Q3蓝", 4: "Q4紫", 5: "Q5金"}
AD_WAIT = 35         # 381申请后等待秒数：对齐 2026-08-12 验证成功的模拟器协议（381×2 → 等35s模拟广告 → 382确认）。曾用 5s 被服务器拒绝（普通号广告未看完）
AD_SLOT = 10         # 双倍/三倍领取广告位
AD_MAX = 3           # 每日上限
STAMINA_MIN = 10     # 体力低于该值停止刷图（新增停止条件）
STAMINA_ITEM = "21010003"   # 体力道具 ID（113 玩家数据 item.item_record 中的键）


# 13 个主技能（14080000=超导 属通关专用，不列入刷图随机池）
MAIN_SKILLS = [14000000, 14010000, 14020000, 14030000, 14040000, 14050000,
               14060000, 14070000, 14090000, 14100000, 14130000, 14140000,
               14150000]


def gen_skill_seq():
    """每把随机选 3 个主技能，生成 10-13 次技能选择（1 个主升 + 2 个辅助，count 递增）。
    保证每把技能组合不同，避免固定技能被检测"""
    n = random.randint(10, 13)
    mains = random.sample(MAIN_SKILLS, 3)   # 随机 3 个主技能
    a, b, c = mains
    seq = []
    ca = cb = cc = 0
    for i in range(n):
        r = random.random()
        if r < 0.6 or (ca < 5 and i < n - 3):   # 主升 a（约60%）
            ca += 1
            seq.append((a, ca))
        elif r < 0.8:                            # 辅助 b（约20%）
            cb += 1
            seq.append((b, cb))
        else:                                    # 辅助 c（约20%）
            cc += 1
            seq.append((c, cc))
    return seq


def build_966(skill_id, count):
    """966 嵌套结构（扁平服务器不计入角色升级）"""
    inner = b"\x08" + varint(skill_id) + b"\x10" + varint(count)
    return b"\x0a" + varint(len(inner)) + inner


def build_triple_settle(time_val, score, skills=None):
    """481 失败结算（对照 2026-08-11 用户手动刷图实录）：
    嵌套 {3:8, 4:{击杀×4种}, 6:time, 8:{技能×N}, 9:score, 23:2(失败退出)}
    skills: [(技能ID, 次数), ...]，默认用实录固定值；刷图时传实际选择统计"""
    if skills is None:
        skills = ((14010000, 2), (14100000, 8), (14050000, 1))
    inner = b"\x18\x08"  # field 3 = 8
    for k, v in ((41100046, 138), (41100044, 51), (41200031, 1), (41100047, 9)):
        sub = b"\x08" + varint(k) + b"\x10" + varint(v)
        inner += b"\x22" + varint(len(sub)) + sub
    inner += b"\x30" + varint(time_val)                    # field 6 时间
    for sid, cnt in skills:
        sub = b"\x08" + varint(sid) + b"\x10" + varint(cnt)
        inner += b"\x42" + varint(len(sub)) + sub           # field 8 技能
    inner += b"\x48" + varint(score)                        # field 9 得分
    inner += b"\xb8\x01\x02"                                # field 23 = 2 失败
    return b"\x0a" + varint(len(inner)) + inner


def chip_quality(cid):
    s = str(cid)
    return int(s[2:4]) if len(s) >= 4 else 0


def parse_chips(text):
    """从帧文本解析 gem 芯片 [(cid, num), ...]（trigger 段 + gem_record）"""
    gems = []
    for m in re.finditer(r"\{1:16,\s*2:(\d+),\s*3:(\d+)(?:,\s*4:1)?\}", text):
        gems.append((int(m.group(1)), int(m.group(2))))
    for m in re.finditer(
        r'"(\d{8})":\{"(?:id":\d+,"?|num":\d+,"?|is_lock":\d+,"?|gem_refine_id":\d+,"?)+',
        text,
    ):
        cid = int(m.group(1))
        if str(cid).startswith("16"):
            num_m = re.search(r'"num":(\d+)', m.group(0))
            num = int(num_m.group(1)) if num_m else 1
            gems.append((cid, num))
    seen = set()
    out = []
    for cid, num in gems:
        if cid not in seen:
            seen.add(cid)
            out.append((cid, num))
    return out


def ad_used_from(data):
    """从 113 玩家数据取今日广告位10已用次数"""
    try:
        return data.get("pay", {}).get("ad", {}).get("ad_record", {}).get("10", {}).get("value", 0)
    except Exception:
        return 0


def stamina_from(data):
    """从 113 玩家数据取当前体力（item_record 中 21010003 的数量）"""
    try:
        return data.get("item", {}).get("item_record", {}).get(STAMINA_ITEM, {}).get("num", 0)
    except Exception:
        return 0


async def _run_one_battle(ws, q, conn_alive, level, threshold, mt, on_log, stop_flag=None):
    """刷一把：480 → 966(随机10-13次) → 481失败结算 → 解析掉落。
    返回 (chips, good, next_mt)"""
    seq = gen_skill_seq()
    time_val = random.randint(80, 130)   # 上报时间每把随机 80-130（反作弊）
    score = 69150

    # 480 开战
    start = time.time()   # 记录战斗开始（用于对齐上报时间）
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
        if mid in (480, 110):
            got = True
            break
    if not got:
        if on_log: on_log("  ⚠️ 480 未收到确认，可能体力不足")

    # 技能选择时刻表：由快到慢分摊到上报时间（与通关逻辑一致，避免一进图连发被检测）
    skill_times = gen_skill_times(time_val, len(seq), first=8, tail=8)
    if on_log:
        on_log(f"  966 选技能 ×{len(seq)} 上报{time_val}s "
               f"首技能t={skill_times[0]}s 末技能t={skill_times[-1]}s")
    counts = {}
    for i, (t_skill, (sid, _)) in enumerate(zip(skill_times, seq)):
        if stop_flag is not None and stop_flag.get("stop"):
            if on_log: on_log("  🛑 停止请求，中断技能升级")
            break
        wait = t_skill - (time.time() - start)
        if wait > 0:
            await asyncio.sleep(wait)
        counts.setdefault(sid, 0)
        counts[sid] += 1
        mt += 1
        await ws.send(ws_frame(966, mt, build_966(sid, counts[sid])))
        if on_log: on_log(f"  [{i+1:02d}/{len(seq)}] t={t_skill}s 技能{sid} count={counts[sid]}")
        try:
            await asyncio.wait_for(q.get(), timeout=1)
        except asyncio.TimeoutError:
            pass

    # 等待对齐上报时间：实际战斗时长 = time_val（避免"上报分钟级/实际几十秒"被检测）
    elapsed = time.time() - start
    remain = time_val - elapsed
    if remain > 0:
        if on_log: on_log(f"  [等待] 上报 {time_val}s，已进行 {elapsed:.0f}s，再等 {remain:.0f}s 后结算...")
        # 分段等待，期间响应停止
        while remain > 0 and conn_alive["ok"]:
            if stop_flag is not None and stop_flag.get("stop"):
                if on_log: on_log("  🛑 停止请求，中断等待")
                break
            await asyncio.sleep(min(5, remain))
            remain = time_val - (time.time() - start)

    # 481 失败结算（技能统计用实际选择，保证与 966 一致）
    skill_usage = [(sid, cnt) for sid, cnt in counts.items()]
    mt += 1
    await ws.send(ws_frame(481, mt, build_triple_settle(time_val, score, skill_usage)))

    # 收集 481 响应 + 110 推送（解析掉落芯片）
    chips = []
    got_481_resp = False
    deadline = time.time() + 8
    while time.time() < deadline:
        try:
            mid, mt2, body = await asyncio.wait_for(q.get(), timeout=2)
        except asyncio.TimeoutError:
            continue
        if mid == 481:
            got_481_resp = True
            try:
                # 检查是否被拒（100000）
                if len(body) <= 4 and body:
                    if on_log: on_log(f"  ⚠️ 481 响应异常: {body.hex()[:60]}")
                else:
                    if on_log: on_log(f"  481 响应 len={len(body)}")
                # 直接从 body 递归解析芯片
                gems = extract_gems_from_body(body)
                if gems:
                    chips.extend(gems)
                    if on_log: on_log(f"  💎 481响应含芯片: " +
                           ", ".join(f"{c}q{chip_quality(c)}" for c, _ in gems))
            except Exception:
                pass
        elif mid == 110:
            try:
                j = json.loads(body.decode())
                s = json.dumps(j, ensure_ascii=False)
                # 从 JSON gem_record 解析芯片
                gems = parse_chips(s)
                if gems:
                    chips.extend(gems)
                    if on_log: on_log(f"  💎 110含芯片: " +
                           ", ".join(f"{c}q{chip_quality(c)}" for c, _ in gems))
                elif "gem" in s and on_log:
                    on_log(f"  110: {s[:150]}")
            except Exception:
                pass
    if not got_481_resp:
        if on_log: on_log("  ⚠️ 481 未收到响应")

    # 去重
    seen = set()
    uniq = []
    for c, n in chips:
        if c not in seen:
            seen.add(c)
            uniq.append((c, n))
    chips = uniq
    good = [(c, n) for c, n in chips if chip_quality(c) >= threshold]
    return chips, good, mt + 1


async def ws_triple_chip(account, token, zone, level, threshold, stats, on_log=None, platform="ios", stop_flag=None, device=None):
    """循环刷芯片直到今日剩余3倍次数为 0 或收到停止。stats 用于回传统计"""
    import websockets

    if on_log: on_log(f"[5] WS 握手（{platform}）...")
    ctx = ssl.create_default_context()
    async with websockets.connect(ws_uri(zone), ssl=ctx, additional_headers={
        "User-Agent": "UnityPlayer/2022.3.42f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    }) as ws:
        ok, info = await ws_handshake(ws, account, token, zone, on_log, platform, device)
        if not ok:
            raise WsPreError(f"握手被拒 错误码={info.get('err_code')}")
        if on_log: on_log(f"  ★ WS 握手成功！玩家: {info['nick']}")
        await ws.send(ws_frame(815, 2, b"\x10\xa4\x03"))  # 815 玩家列表 {2:420}
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

        try:
            # 拉初始数据（战力 + 广告剩余次数 + 体力）
            if on_log: on_log("[6] 113 拉初始数据...")
            before = await _pull_113(ws, q, conn_alive, "before", 12, on_log)
            if before is None:
                raise WsPreError("113 拉取失败")
            b = before.get("basic", {})
            ad_used = ad_used_from(before)
            stats["ad_used"] = ad_used
            stats["ad_left"] = max(0, AD_MAX - ad_used)
            stats["stamina"] = stamina_from(before)
            stats["nick"] = b.get("name", "")  # 回传真实角色名（113 basic.name 干净无乱码）
            if on_log:
                on_log(f"  角色 {b.get('name')} 战力{b.get('power')} | "
                       f"今日三倍剩余 {stats['ad_left']} 次 | 体力 {stats['stamina']}")

            # 循环刷图直到剩余次数为 0
            round_no = 0
            mt = 66
            while (stats["ad_left"] > 0 and stats["stamina"] >= STAMINA_MIN
                   and conn_alive["ok"]):
                if stop_flag is not None and stop_flag.get("stop"):
                    if on_log: on_log("🛑 收到停止请求，停止刷图")
                    break
                round_no += 1
                if on_log: on_log(f"\n===== 第 {round_no} 把（剩余 {stats['ad_left']} 次，体力 {stats['stamina']}）=====")
                chips, good, mt = await _run_one_battle(ws, q, conn_alive, level, threshold, mt, on_log, stop_flag)

                # 展示掉落
                if chips:
                    if on_log: on_log(f"  💎 掉落芯片 {len(chips)} 颗: " +
                           ", ".join(f"{c}q{chip_quality(c)}" for c, _ in chips))
                else:
                    if on_log: on_log("  💎 本把无芯片掉落")

                # 好芯片且剩余次数>0 → 三倍领取
                if good and stats["ad_left"] > 0:
                    if on_log: on_log(f"  ★ 好芯片 {len(good)} 颗（阈值 {THRESHOLD_NAMES[threshold]}），三倍领取中...")
                    mt += 1
                    await ws.send(ws_frame(381, mt, b"\x08" + varint(AD_SLOT)))
                    await asyncio.sleep(1)
                    mt += 1
                    await ws.send(ws_frame(381, mt, b"\x08" + varint(AD_SLOT)))
                    if on_log: on_log(f"  [广告] 381×2 已发，等待 {AD_WAIT}s...")
                    await asyncio.sleep(AD_WAIT)
                    mt += 1
                    await ws.send(ws_frame(382, mt, b"\x08" + varint(AD_SLOT)))
                    if on_log: on_log("  [广告] 382 确认已发")

                    # 验证次数是否增加
                    await asyncio.sleep(3)
                    after = await _pull_113(ws, q, conn_alive, "after", 12, on_log)
                    if after:
                        new_ad = ad_used_from(after)
                        if new_ad > stats["ad_used"]:
                            stats["claimed"] = True
                            stats["ad_used"] = new_ad
                            stats["ad_left"] = max(0, AD_MAX - new_ad)
                            # 统计蓝紫金
                            for c, n in good:
                                q_ = chip_quality(c)
                                if q_ >= 5:
                                    stats["claimed_q5"] += n
                                elif q_ == 4:
                                    stats["claimed_q4"] += n
                                elif q_ == 3:
                                    stats["claimed_q3"] += n
                            if on_log: on_log(
                                f"  ✅ 三倍领取成功！剩余 {stats['ad_left']} 次 | "
                                f"本次已领蓝{stats['claimed_q3']}紫{stats['claimed_q4']}金{stats['claimed_q5']}")
                        else:
                            if on_log: on_log("  ⚠️ 次数未增加（可能被拒），跳过本把")
                elif good:
                    if on_log: on_log(f"  [!] 有好芯片但今日次数已满（{stats['ad_left']}/3）")

                stats["chips"] = (stats.get("chips") or []) + chips
                stats["good"] = (stats.get("good") or []) + good

                # 每把间隔（降低反作弊风险）
                await asyncio.sleep(3)

                # 每把后拉最新数据，更新体力/剩余次数（体力 < STAMINA_MIN 时下一轮停止）
                if conn_alive["ok"]:
                    fresh = await _pull_113(ws, q, conn_alive, "stamina", 10, on_log)
                    if fresh:
                        stats["stamina"] = stamina_from(fresh)
                        stats["ad_used"] = ad_used_from(fresh)
                        stats["ad_left"] = max(0, AD_MAX - stats["ad_used"])

            # 退出原因判定（供外层 run_triple_chip 决定是否自动重连）
            if stats["ad_left"] <= 0:
                if on_log: on_log(f"\n🏁 今日剩余次数已用完，停止刷图")
                return "done"
            if stats["stamina"] < STAMINA_MIN:
                if on_log: on_log(f"\n🏁 体力不足（当前 {stats['stamina']} < {STAMINA_MIN}），停止刷图")
                return "stamina"
            if stop_flag is not None and stop_flag.get("stop"):
                return "stop"
            if not conn_alive["ok"]:
                if on_log: on_log(f"\n⚠️ 连接断开，停止")
                return "disconnect"
            return "done"
        finally:
            # 无论正常返回还是抛异常（连接断开等），都确保收尾 task 被取消
            recv_task.cancel()
            heartbeat_task.cancel()


def parse_pb_body(body):
    """把 481 响应的 protobuf body 转成可搜索文本（提取 field2 的 trigger/battle 段）"""
    try:
        i = 0
        out = []
        while i < len(body):
            key, i = read_varint_at(body, i)
            field = key >> 3
            wt = key & 7
            if wt == 0:
                _, i = read_varint_at(body, i)
            elif wt == 1:
                i += 8
            elif wt == 2:
                ln, i = read_varint_at(body, i)
                data = body[i:i+ln]
                i += ln
                out.append(f"{field}:{data.hex()}")
            elif wt == 5:
                i += 4
            else:
                break
        return " ".join(out)
    except Exception:
        return ""


def read_varint_at(data, i):
    result = 0
    shift = 0
    while i < len(data):
        b = data[i]
        i += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            break
        shift += 7
    return result, i


def extract_gems_from_body(body):
    """递归解析 protobuf body，收集芯片结构 {1:16, 2:<cid>, 3:<num>, [4:1]}
    直接在 bytes 层解析（不依赖文本格式），从 481 响应 trigger/battle 段提取 gem"""
    gems = []

    def walk(data):
        i = 0
        fields = {}
        nested = []
        while i < len(data):
            try:
                key, i = read_varint_at(data, i)
                field = key >> 3
                wt = key & 7
                if wt == 0:
                    val, i = read_varint_at(data, i)
                    fields.setdefault(field, []).append(("varint", val))
                elif wt == 1:
                    i += 8
                    fields.setdefault(field, []).append(("fixed64", None))
                elif wt == 2:
                    ln, i = read_varint_at(data, i)
                    sub = data[i:i+ln]
                    i += ln
                    fields.setdefault(field, []).append(("bytes", sub))
                    nested.append((field, sub))
                elif wt == 5:
                    i += 4
                    fields.setdefault(field, []).append(("fixed32", None))
                else:
                    break
            except Exception:
                break
        # 检查本层是否芯片结构: field1=16(物品类型), field2=芯片ID, field3=数量
        f1 = fields.get(1, [])
        f2 = fields.get(2, [])
        f3 = fields.get(3, [])
        if (len(f1) == 1 and f1[0][0] == "varint" and f1[0][1] == 16
                and len(f2) == 1 and f2[0][0] == "varint"
                and len(f3) >= 1 and f3[0][0] == "varint"):
            cid = f2[0][1]
            num = f3[0][1]
            if str(cid).startswith("16"):
                gems.append((cid, num))
        # 递归子消息
        for field, sub in nested:
            walk(sub)

    walk(body)
    # 去重
    seen = set()
    out = []
    for cid, num in gems:
        if cid not in seen:
            seen.add(cid)
            out.append((cid, num))
    return out


async def _query_ad(account, token, zone, on_log=None, platform="ios", device=None):
    """登录后拉一次 113，返回 (剩余次数, 昵称)"""
    import websockets
    ctx = ssl.create_default_context()
    async with websockets.connect(ws_uri(zone), ssl=ctx, additional_headers={
        "User-Agent": "UnityPlayer/2022.3.42f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    }) as ws:
        ok, info = await ws_handshake(ws, account, token, zone, on_log, platform, device)
        if not ok:
            return None, None
        await ws.send(ws_frame(815, 2, b"\x10\xa4\x03"))
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

        data = await _pull_113(ws, q, conn_alive, "query", 12, on_log)
        recv_task.cancel()
        if data is None:
            return None, None
        ad_used = ad_used_from(data)
        nick = data.get("basic", {}).get("name", "")
        return max(0, AD_MAX - ad_used), nick


def query_ad_left(platform, username, password, on_log=None, device=None):
    """登录并查询今日剩余三倍次数。返回 (ad_left, nick) 或 (None, None)。device 注入独立设备指纹。"""
    if platform == "ios":
        result = ios_login(username, password, on_log, device)
    else:
        result = android_login(username, password, on_log, device)
    if result is None:
        return None, None
    account, token, zone = result
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_query_ad(account, token, zone, on_log, platform, device))
    except Exception:
        return None, None
    finally:
        loop.close()


# ============ 同步入口（供 Flask 调用）============

def run_triple_chip(platform, username, password, level, threshold, stats, on_log, stop_flag=None, device=None):
    """同步运行刷芯片流程：刷到剩余次数为0、收到停止，或自动重连超过上限。
    stats 由调用方传入；连接断开（ConnectionClosed）或握手失败会自动重新登录续跑，
    保留已刷进度和剩余次数。device 注入独立设备指纹。"""
    from websockets.exceptions import ConnectionClosed

    on_log(f"🎯 刷三倍芯片: 关卡{level}  阈值{THRESHOLD_NAMES.get(threshold, threshold)}+")

    # 断连/失败自动重连：指数退避间隔（秒），总窗口约 5 分钟（5+10+20+40+80+120）
    RECONNECT_DELAYS = [5, 10, 20, 40, 80, 120]
    MAX_RECONNECT = len(RECONNECT_DELAYS)
    reconnect = 0
    while True:
        if stop_flag is not None and stop_flag.get("stop"):
            on_log("🛑 停止请求，退出")
            return
        if stats["ad_left"] <= 0:
            on_log("🏁 今日剩余次数已用完，停止刷图")
            return
        if reconnect >= MAX_RECONNECT:
            on_log(f"  ❌ 连续 {MAX_RECONNECT} 次连接失败，任务终止")
            return

        # 登录（重连时重新走完整登录，拿新 token/zone）
        if platform == "ios":
            result = ios_login(username, password, on_log, device)
        else:
            result = android_login(username, password, on_log, device)
        if result is None:
            if reconnect < MAX_RECONNECT:
                delay = RECONNECT_DELAYS[min(reconnect, MAX_RECONNECT - 1)]
                on_log(f"  ↻ 登录失败，{delay} 秒后重试（{reconnect + 1}/{MAX_RECONNECT}）...")
                reconnect += 1
                time.sleep(delay)
                continue
            on_log("❌ 登录失败，流程终止")
            return
        account, token, zone = result

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            status = loop.run_until_complete(
                ws_triple_chip(account, token, zone, level, threshold, stats, on_log, platform, stop_flag, device))
            if status in ("done", "stop", "stamina"):
                return                     # 正常刷完 / 用户停止 / 体力不足
            # status == "disconnect"：连接断开且未刷完 → 走下方重连
            on_log("  ↻ 连接断开，自动重连...")
        except WsPreError as e:
            on_log(f"  ↻ 握手/前置失败（{e}），自动重连...")
        except ConnectionClosed as e:
            on_log(f"  ↻ 连接断开（{e}），自动重连...")
        except Exception as e:
            on_log(f"  ❌ 异常: {e}")
            if reconnect >= MAX_RECONNECT:
                on_log("  ❌ 连续异常，任务终止")
                return
        finally:
            loop.close()

        reconnect += 1
        if reconnect > MAX_RECONNECT:
            on_log(f"  ❌ 连续 {MAX_RECONNECT} 次连接失败，任务终止")
            return
        delay = RECONNECT_DELAYS[min(reconnect - 1, MAX_RECONNECT - 1)]
        on_log(f"  ⏳ {delay} 秒后重新连接（{reconnect}/{MAX_RECONNECT}）...")
        time.sleep(delay)
