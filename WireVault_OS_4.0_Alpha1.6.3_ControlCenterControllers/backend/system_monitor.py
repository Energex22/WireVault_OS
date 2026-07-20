from __future__ import annotations

from pathlib import Path
import os
import platform
import shutil
import socket
import time


def cpu_temperature_c() -> float | None:
    candidates = [
        Path("/sys/class/thermal/thermal_zone0/temp"),
        Path("/sys/class/hwmon/hwmon0/temp1_input"),
    ]
    for path in candidates:
        try:
            value = float(path.read_text().strip())
            return round(value / 1000 if value > 1000 else value, 1)
        except (OSError, ValueError):
            continue
    return None


def memory_status() -> dict:
    try:
        values = {}
        for line in Path("/proc/meminfo").read_text().splitlines():
            key, raw = line.split(":", 1)
            values[key] = int(raw.strip().split()[0]) * 1024

        total = values.get("MemTotal", 0)
        available = values.get("MemAvailable", 0)
        used = max(0, total - available)
        percent = round((used / total) * 100, 1) if total else None
        return {"total_bytes": total, "used_bytes": used, "percent": percent}
    except (OSError, ValueError):
        return {"total_bytes": None, "used_bytes": None, "percent": None}


def load_average() -> dict:
    try:
        one, five, fifteen = os.getloadavg()
        return {"one": round(one, 2), "five": round(five, 2), "fifteen": round(fifteen, 2)}
    except (AttributeError, OSError):
        return {"one": None, "five": None, "fifteen": None}


def system_status(project_root: Path, started_at: float) -> dict:
    disk = shutil.disk_usage(project_root)
    return {
        "hostname": socket.gethostname(),
        "platform": platform.platform(),
        "machine": platform.machine(),
        "python": platform.python_version(),
        "uptime_seconds": round(time.time() - started_at),
        "cpu_temperature_c": cpu_temperature_c(),
        "load_average": load_average(),
        "memory": memory_status(),
        "storage": {
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "percent": round((disk.used / disk.total) * 100, 1) if disk.total else None,
        },
    }