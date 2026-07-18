from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable


SCHEMA = '''
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS media_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    extension TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    modified_at REAL NOT NULL DEFAULT 0,
    system_name TEXT,
    artist TEXT,
    album TEXT,
    duration_seconds REAL,
    favorite INTEGER NOT NULL DEFAULT 0,
    play_count INTEGER NOT NULL DEFAULT 0,
    last_played_at REAL,
    indexed_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(media_type);
CREATE INDEX IF NOT EXISTS idx_media_name ON media_items(name);

CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    detail TEXT,
    read_at REAL,
    created_at REAL NOT NULL
);
'''


class Database:
    def __init__(self, path: Path):
        self.path = path
        self.connection = sqlite3.connect(path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(SCHEMA)
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def upsert_media(self, items: Iterable[dict]) -> int:
        count = 0
        with self.connection:
            for item in items:
                self.connection.execute(
                    '''
                    INSERT INTO media_items (
                        media_type, name, path, extension, size_bytes,
                        modified_at, system_name, indexed_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(path) DO UPDATE SET
                        media_type=excluded.media_type,
                        name=excluded.name,
                        extension=excluded.extension,
                        size_bytes=excluded.size_bytes,
                        modified_at=excluded.modified_at,
                        system_name=excluded.system_name,
                        indexed_at=excluded.indexed_at
                    ''',
                    (
                        item["media_type"],
                        item["name"],
                        item["path"],
                        item["extension"],
                        item["size_bytes"],
                        item["modified_at"],
                        item.get("system_name"),
                        item["indexed_at"],
                    ),
                )
                count += 1
        return count

    def remove_missing_paths(self, existing_paths: set[str]) -> int:
        rows = self.connection.execute("SELECT path FROM media_items").fetchall()
        missing = [row["path"] for row in rows if row["path"] not in existing_paths]
        if not missing:
            return 0

        with self.connection:
            self.connection.executemany(
                "DELETE FROM media_items WHERE path = ?",
                ((path,) for path in missing),
            )
        return len(missing)

    def media(self, media_type: str | None = None, query: str = "") -> list[dict]:
        sql = "SELECT * FROM media_items"
        args: list[object] = []
        clauses = []

        if media_type:
            clauses.append("media_type = ?")
            args.append(media_type)

        if query:
            clauses.append("(name LIKE ? OR path LIKE ? OR system_name LIKE ?)")
            pattern = f"%{query}%"
            args.extend([pattern, pattern, pattern])

        if clauses:
            sql += " WHERE " + " AND ".join(clauses)

        sql += " ORDER BY name COLLATE NOCASE"
        return [dict(row) for row in self.connection.execute(sql, args).fetchall()]

    def counts(self) -> dict[str, int]:
        rows = self.connection.execute(
            "SELECT media_type, COUNT(*) AS total FROM media_items GROUP BY media_type"
        ).fetchall()
        result = {"music": 0, "pictures": 0, "games": 0, "videos": 0}
        result.update({row["media_type"]: row["total"] for row in rows})
        return result

    def add_activity(self, event_type: str, title: str, detail: str | None, created_at: float) -> None:
        with self.connection:
            self.connection.execute(
                "INSERT INTO activity(event_type,title,detail,created_at) VALUES(?,?,?,?)",
                (event_type, title, detail, created_at),
            )

    def recent_activity(self, limit: int = 30) -> list[dict]:
        rows = self.connection.execute(
            "SELECT * FROM activity ORDER BY created_at DESC LIMIT ?",
            (max(1, min(limit, 200)),),
        ).fetchall()
        return [dict(row) for row in rows]

    def add_notification(
        self,
        level: str,
        title: str,
        detail: str | None,
        created_at: float,
    ) -> None:
        with self.connection:
            self.connection.execute(
                "INSERT INTO notifications(level,title,detail,created_at) VALUES(?,?,?,?)",
                (level, title, detail, created_at),
            )

    def notifications(self, limit: int = 50) -> list[dict]:
        rows = self.connection.execute(
            "SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?",
            (max(1, min(limit, 200)),),
        ).fetchall()
        return [dict(row) for row in rows]