# -*- coding: utf-8 -*-
"""
多账号任务管理器：每个脚本独立状态容器（线程 + 日志 + 统计 + 停止标记）
不同脚本可并发；同一脚本同时只跑一个任务（防双连接干扰同一账号）
"""
import os
import re
import threading
import time


class ScriptTask:
    """单个脚本的运行任务状态容器"""

    def __init__(self, script_id):
        self.script_id = script_id
        self.stop_flag = {"stop": False}
        self.stats = {}          # 运行统计（三倍: ad_left/claimed_q*；红包: rp_grabbed/rp_diamond）
        self.log_buffer = []     # 最近日志 [{time, text}]
        self.lock = threading.Lock()
        self.thread = None
        self.task_type = None    # 'triple' | 'redpocket'
        self.running = False

    def add_log(self, msg):
        """日志回调：追加内存缓冲 + 落盘 + 提取红包统计"""
        ts = time.strftime("%H:%M:%S")
        with self.lock:
            self.log_buffer.append({"time": ts, "text": msg})
            if len(self.log_buffer) > 500:
                self.log_buffer = self.log_buffer[-500:]
        # 落盘
        try:
            logdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
            os.makedirs(logdir, exist_ok=True)
            with open(os.path.join(logdir, f"{self.script_id}.log"), "a", encoding="utf-8") as f:
                f.write(f"[{ts}] {msg}\n")
        except Exception:
            pass
        self._parse_stats(msg)

    def _parse_stats(self, msg):
        """从日志提取红包/收菜统计（照抄 web_panel app.py 的提取逻辑，但每账号独立）"""
        try:
            if "本次已抢" in msg:
                parts = msg.split("本次已抢")[1].split("个")
                self.stats["rp_grabbed"] = int(parts[0].strip())
                if "累计钻石" in msg:
                    dp = msg.split("累计钻石 +")[1].strip()
                    self.stats["rp_diamond"] = int(dp)
            if "本轮收菜完成" in msg:
                m = re.search(r"基地 (\d+) / 停车 (\d+) / 码头 (\d+)", msg)
                if m:
                    self.stats["shoucai_base"] = int(m.group(1))
                    self.stats["shoucai_park"] = int(m.group(2))
                    self.stats["shoucai_wharf"] = int(m.group(3))
                    self.stats["shoucai_total"] = self.stats["shoucai_base"] + \
                        self.stats["shoucai_park"] + self.stats["shoucai_wharf"]
        except Exception:
            pass


class TaskManager:
    def __init__(self):
        self._tasks = {}
        self._lock = threading.Lock()

    def get_task(self, script_id):
        with self._lock:
            return self._tasks.get(script_id)

    def start(self, script_id, fn):
        """启动任务线程。fn(task) 在后台线程执行；返回 (ok, message)"""
        with self._lock:
            task = self._tasks.get(script_id)
            if task and task.running:
                return False, "脚本正在运行中"
            task = ScriptTask(script_id)
            self._tasks[script_id] = task
        task.running = True
        task.thread = threading.Thread(target=fn, args=(task,), daemon=True)
        task.thread.start()
        return True, "已启动"

    def stop(self, script_id):
        """请求停止（协作式，检查点生效）；返回 (ok, message)"""
        with self._lock:
            task = self._tasks.get(script_id)
        if not task or not task.running:
            return False, "脚本未在运行"
        task.stop_flag["stop"] = True
        return True, "已发送停止"

    def runtime_stats(self, script_id):
        """返回对齐前端的运行统计"""
        task = self.get_task(script_id)
        if not task or not task.running:
            return {
                "running": False, "ad_left": 0,
                "claimed_q3": 0, "claimed_q4": 0, "claimed_q5": 0,
                "rp_diamond": 0, "rp_grabbed": 0,
                "shoucai_total": 0,
            }
        st = task.stats
        return {
            "running": True,
            "ad_left": st.get("ad_left", 0),
            "claimed_q3": st.get("claimed_q3", 0),
            "claimed_q4": st.get("claimed_q4", 0),
            "claimed_q5": st.get("claimed_q5", 0),
            "rp_diamond": st.get("rp_diamond", 0),
            "rp_grabbed": st.get("rp_grabbed", 0),
            "shoucai_total": st.get("shoucai_total", 0),
        }

    def logs(self, script_id, limit=200):
        task = self.get_task(script_id)
        if not task:
            return []
        with task.lock:
            return list(task.log_buffer[-limit:])
