# app/core/system_handler.py
# Collects Pi system metrics — CPU, RAM, temp, disk, network, uptime

import time
import psutil
import threading
import subprocess
from datetime import datetime, timedelta

_system_data = {
    "cpu_temp":      None,
    "cpu_usage":     None,
    "ram_used":      None,
    "ram_total":     None,
    "ram_percent":   None,
    "disk_used":     None,
    "disk_total":    None,
    "disk_percent":  None,
    "cpu_freq":      None,
    "cpu_cores":     None,
    "uptime":        None,
    "net_sent":      None,
    "net_recv":      None,
    "process_count": None,
    "alerts":        [],
}

_start_time = datetime.now()
_system_thread = None

def _get_cpu_temp():
    """Read Pi CPU temperature via vcgencmd"""
    try:
        out = subprocess.check_output(
            ["vcgencmd", "measure_temp"],
            stderr=subprocess.DEVNULL
        ).decode()
        return float(out.replace("temp=", "").replace("'C\n", "").strip())
    except Exception:
        # Fallback for non-Pi systems
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for name, entries in temps.items():
                    if entries:
                        return round(entries[0].current, 1)
        except Exception:
            pass
        return None

def _get_uptime():
    """Returns uptime as formatted string"""
    delta = datetime.now() - _start_time
    total = int(delta.total_seconds())
    h = total // 3600
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d}"

def _system_loop():
    global _system_data

    # Get baseline network stats
    net_baseline = psutil.net_io_counters()

    while True:
        try:
            # CPU
            cpu_temp  = _get_cpu_temp()
            cpu_usage = psutil.cpu_percent(interval=0.5)
            cpu_freq  = psutil.cpu_freq()
            cpu_cores = psutil.cpu_count()

            # RAM
            ram = psutil.virtual_memory()

            # Disk
            disk = psutil.disk_usage('/')

            # Network
            net = psutil.net_io_counters()

            # Process count
            proc_count = len(psutil.pids())

            # Uptime
            uptime = _get_uptime()

            # Alerts
            alerts = []
            if cpu_temp and cpu_temp > 70:
                alerts.append("CPU OVERHEAT — Temperature critical")
            elif cpu_temp and cpu_temp > 60:
                alerts.append("CPU WARM — Temperature elevated")
            if cpu_usage > 85:
                alerts.append("CPU OVERLOAD — Usage critical")
            if ram.percent > 90:
                alerts.append("RAM CRITICAL — Memory near limit")
            if disk.percent > 90:
                alerts.append("DISK FULL — Storage near limit")

            _system_data = {
                "cpu_temp":      round(cpu_temp, 1) if cpu_temp else None,
                "cpu_usage":     round(cpu_usage, 1),
                "cpu_freq":      round(cpu_freq.current) if cpu_freq else None,
                "cpu_cores":     cpu_cores,
                "ram_used":      round(ram.used / 1024**3, 2),       # GB
                "ram_total":     round(ram.total / 1024**3, 2),      # GB
                "ram_percent":   round(ram.percent, 1),
                "disk_used":     round(disk.used / 1024**3, 2),      # GB
                "disk_total":    round(disk.total / 1024**3, 2),     # GB
                "disk_percent":  round(disk.percent, 1),
                "net_sent":      round(net.bytes_sent / 1024**2, 1), # MB
                "net_recv":      round(net.bytes_recv / 1024**2, 1), # MB
                "process_count": proc_count,
                "uptime":        uptime,
                "alerts":        alerts,
            }

        except Exception as e:
            print(f"[SYSTEM] Error: {e}")

        time.sleep(1)

def start_system_loop():
    global _system_thread
    if _system_thread is not None and _system_thread.is_alive():
        return
    _system_thread = threading.Thread(target=_system_loop, daemon=True)
    _system_thread.start()
    print("[SYSTEM] Loop started")

def get_system_data() -> dict:
    if _system_thread is None or not _system_thread.is_alive():
        start_system_loop()
    return _system_data.copy()