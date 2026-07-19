from __future__ import annotations

from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Event, Lock, Thread
from urllib.parse import parse_qs, urlparse, unquote
from queue import Empty
import argparse
import json
import logging
import mimetypes
import os
import signal
import time
import shutil

from config import load_settings, save_settings, project_paths
from database import Database
from event_stream import EventStream
from media_scanner import MediaScanner
from system_monitor import system_status


class CoreState:
    def __init__(self, project_root: Path):
        self.paths = project_paths(project_root)
        self.settings = load_settings(self.paths.settings)
        self.database = Database(self.paths.database)
        self.events = EventStream()
        self.started_at = time.time()
        self.stop_event = Event()
        self.scan_lock = Lock()
        self.last_scan = {
            "running": False,
            "started_at": None,
            "finished_at": None,
            "indexed": 0,
            "removed": 0,
            "counts": self.database.counts(),
            "error": None,
        }

    def scan_library(self) -> dict:
        if not self.scan_lock.acquire(blocking=False):
            return self.last_scan

        try:
            self.last_scan.update({
                "running": True,
                "started_at": time.time(),
                "error": None,
            })
            self.events.publish("library.scan.started", {
                "folders": self.settings["media_folders"]
            })

            scanner = MediaScanner(self.settings["media_folders"])
            items, existing_paths = scanner.scan()
            indexed = self.database.upsert_media(items)
            removed = self.database.remove_missing_paths(existing_paths)
            counts = self.database.counts()

            self.last_scan.update({
                "running": False,
                "finished_at": time.time(),
                "indexed": indexed,
                "removed": removed,
                "counts": counts,
            })

            self.database.add_activity(
                "library.scan",
                "Media library scanned",
                f"Indexed {indexed}; removed {removed}",
                time.time(),
            )
            self.events.publish("library.scan.complete", self.last_scan)
            return self.last_scan
        except Exception as error:
            logging.exception("Library scan failed")
            self.last_scan.update({
                "running": False,
                "finished_at": time.time(),
                "error": str(error),
            })
            self.events.publish("library.scan.error", self.last_scan)
            return self.last_scan
        finally:
            self.scan_lock.release()


class WireVaultHandler(SimpleHTTPRequestHandler):
    server_version = "WireVaultCore/1.0"

    @property
    def core(self) -> CoreState:
        return self.server.core  # type: ignore[attr-defined]

    def log_message(self, format_string: str, *args) -> None:
        logging.info("%s - %s", self.address_string(), format_string % args)

    def send_json(self, payload, status: int = 200) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            value = json.loads(raw.decode("utf-8"))
            return value if isinstance(value, dict) else {}
        except (ValueError, json.JSONDecodeError):
            return {}

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/health":
            self.send_json({
                "ok": True,
                "service": "wirevault-core",
                "version": 1,
                "time": time.time(),
            })
            return

        if parsed.path == "/api/system":
            self.send_json(system_status(self.core.paths.root, self.core.started_at))
            return

        if parsed.path == "/api/library/counts":
            self.send_json(self.core.database.counts())
            return

        if parsed.path == "/api/library/status":
            self.send_json(self.core.last_scan)
            return

        if parsed.path == "/api/library":
            query = parse_qs(parsed.query)
            media_type = query.get("type", [None])[0]
            search = query.get("q", [""])[0]
            self.send_json(self.core.database.media(media_type, search))
            return

        if parsed.path == "/api/settings":
            self.send_json(self.core.settings)
            return

        if parsed.path == "/api/activity":
            query = parse_qs(parsed.query)
            limit = int(query.get("limit", ["30"])[0])
            self.send_json(self.core.database.recent_activity(limit))
            return

        if parsed.path == "/api/notifications":
            query = parse_qs(parsed.query)
            limit = int(query.get("limit", ["50"])[0])
            self.send_json(self.core.database.notifications(limit))
            return

        if parsed.path == "/api/events":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            queue = self.core.events.subscribe()
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()
                while not self.core.stop_event.is_set():
                    try:
                        event = queue.get(timeout=15)
                        self.wfile.write(self.core.events.encode(event))
                    except Empty:
                        self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                self.core.events.unsubscribe(queue)
            return


        if parsed.path == "/api/media/file":
            query = parse_qs(parsed.query)
            requested = unquote(query.get("path", [""])[0])
            if not requested:
                self.send_json({"error": "path is required"}, 400)
                return
            try:
                resolved = Path(requested).expanduser().resolve(strict=True)
            except OSError:
                self.send_json({"error": "file not found"}, 404)
                return
            allowed = [Path(value).expanduser().resolve() for value in self.core.settings.get("media_folders", {}).values()]
            if not any(root == resolved or root in resolved.parents for root in allowed):
                self.send_json({"error": "file is outside configured media folders"}, 403)
                return
            if not resolved.is_file():
                self.send_json({"error": "file not found"}, 404)
                return
            mime_type, _ = mimetypes.guess_type(str(resolved))
            size = resolved.stat().st_size
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type or "application/octet-stream")
            self.send_header("Content-Length", str(size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            with resolved.open("rb") as media_file:
                shutil.copyfileobj(media_file, self.wfile)
            return

        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path == "/api/library/scan":
            Thread(target=self.core.scan_library, daemon=True).start()
            self.send_json({"accepted": True, "status": self.core.last_scan}, 202)
            return

        if parsed.path == "/api/settings":
            payload = self.read_json()
            allowed = {"scan_interval_seconds", "media_folders"}
            for key in allowed:
                if key in payload:
                    self.core.settings[key] = payload[key]

            save_settings(self.core.paths.settings, self.core.settings)
            self.core.events.publish("settings.updated", self.core.settings)
            self.send_json(self.core.settings)
            return

        if parsed.path == "/api/notifications":
            payload = self.read_json()
            title = str(payload.get("title", "")).strip()
            if not title:
                self.send_json({"error": "title is required"}, 400)
                return

            level = str(payload.get("level", "info"))
            detail = payload.get("detail")
            created_at = time.time()
            self.core.database.add_notification(level, title, detail, created_at)
            notification = {
                "level": level,
                "title": title,
                "detail": detail,
                "created_at": created_at,
            }
            self.core.events.publish("notification.created", notification)
            self.send_json(notification, 201)
            return

        self.send_json({"error": "unknown endpoint"}, 404)


def scanner_loop(core: CoreState) -> None:
    core.scan_library()
    while not core.stop_event.wait(
        max(2, int(core.settings.get("scan_interval_seconds", 10)))
    ):
        core.scan_library()


def configure_logging(log_path: Path) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(log_path, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="WireVault Core")
    parser.add_argument("--host")
    parser.add_argument("--port", type=int)
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    core = CoreState(project_root)
    configure_logging(core.paths.logs / "wirevault-core.log")

    host = args.host or core.settings.get("host", "127.0.0.1")
    port = args.port or int(core.settings.get("port", 8080))

    os.chdir(project_root)
    server = ThreadingHTTPServer((host, port), WireVaultHandler)
    server.core = core  # type: ignore[attr-defined]

    def shutdown(*_):
        logging.info("Stopping WireVault Core")
        core.stop_event.set()
        Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    Thread(target=scanner_loop, args=(core,), daemon=True).start()

    logging.info("WireVault Core listening at http://%s:%s", host, port)
    try:
        server.serve_forever()
    finally:
        core.stop_event.set()
        core.database.close()
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
