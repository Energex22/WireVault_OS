from __future__ import annotations

from pathlib import Path
import time


SUPPORTED = {
    "music": {"mp3", "wav", "flac", "m4a", "aac", "ogg"},
    "pictures": {"jpg", "jpeg", "png", "webp", "gif", "bmp"},
    "games": {"nes", "sfc", "smc", "n64", "z64", "v64", "iso", "cue", "chd", "gba", "gb", "gbc", "bin"},
    "videos": {"mp4", "mkv", "avi", "mov", "webm", "m4v"},
}


def game_system(extension: str) -> str | None:
    systems = {
        "nes": "NES",
        "sfc": "SNES",
        "smc": "SNES",
        "n64": "Nintendo 64",
        "z64": "Nintendo 64",
        "v64": "Nintendo 64",
        "gba": "Game Boy Advance",
        "gb": "Game Boy",
        "gbc": "Game Boy Color",
        "cue": "Disc Image",
        "chd": "Disc Image",
        "iso": "Disc Image",
        "bin": "Disc Image",
    }
    return systems.get(extension)


class MediaScanner:
    def __init__(self, folders: dict[str, str]):
        self.folders = folders

    def scan(self) -> tuple[list[dict], set[str]]:
        indexed_at = time.time()
        items: list[dict] = []
        existing_paths: set[str] = set()

        for media_type, folder_value in self.folders.items():
            if media_type not in SUPPORTED:
                continue

            folder = Path(folder_value).expanduser()
            if not folder.exists() or not folder.is_dir():
                continue

            for path in folder.rglob("*"):
                if not path.is_file():
                    continue

                extension = path.suffix.lower().lstrip(".")
                if extension not in SUPPORTED[media_type]:
                    continue

                try:
                    stat = path.stat()
                except OSError:
                    continue

                resolved = str(path.resolve())
                existing_paths.add(resolved)
                items.append(
                    {
                        "media_type": media_type,
                        "name": path.stem,
                        "path": resolved,
                        "extension": extension,
                        "size_bytes": stat.st_size,
                        "modified_at": stat.st_mtime,
                        "system_name": game_system(extension) if media_type == "games" else None,
                        "indexed_at": indexed_at,
                    }
                )

        return items, existing_paths