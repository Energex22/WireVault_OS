from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json


@dataclass(frozen=True)
class CorePaths:
    root: Path
    data: Path
    logs: Path
    database: Path
    settings: Path


def project_paths(project_root: Path) -> CorePaths:
    data = project_root / "data"
    logs = project_root / "logs"
    data.mkdir(parents=True, exist_ok=True)
    logs.mkdir(parents=True, exist_ok=True)
    return CorePaths(
        root=project_root,
        data=data,
        logs=logs,
        database=data / "wirevault.db",
        settings=data / "core-settings.json",
    )


DEFAULT_SETTINGS = {
    "host": "127.0.0.1",
    "port": 8080,
    "scan_interval_seconds": 10,
    "media_folders": {
        "music": str(Path.home() / "Media" / "Music"),
        "pictures": str(Path.home() / "Media" / "Pictures"),
        "games": str(Path.home() / "Media" / "Games"),
        "videos": str(Path.home() / "Media" / "Videos"),
    },
}


def load_settings(path: Path) -> dict:
    if not path.exists():
        path.write_text(json.dumps(DEFAULT_SETTINGS, indent=2), encoding="utf-8")
        return json.loads(json.dumps(DEFAULT_SETTINGS))

    try:
        saved = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        saved = {}

    merged = json.loads(json.dumps(DEFAULT_SETTINGS))
    merged.update({k: v for k, v in saved.items() if k != "media_folders"})
    merged["media_folders"].update(saved.get("media_folders", {}))
    return merged


def save_settings(path: Path, settings: dict) -> None:
    path.write_text(json.dumps(settings, indent=2), encoding="utf-8")