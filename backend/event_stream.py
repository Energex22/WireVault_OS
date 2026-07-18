from __future__ import annotations

from queue import Queue, Empty
from threading import Lock
import json
import time


class EventStream:
    def __init__(self):
        self._subscribers: list[Queue] = []
        self._lock = Lock()

    def subscribe(self) -> Queue:
        queue = Queue(maxsize=100)
        with self._lock:
            self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: Queue) -> None:
        with self._lock:
            if queue in self._subscribers:
                self._subscribers.remove(queue)

    def publish(self, event_type: str, payload: dict) -> None:
        event = {
            "type": event_type,
            "payload": payload,
            "timestamp": time.time(),
        }
        with self._lock:
            subscribers = list(self._subscribers)

        for queue in subscribers:
            try:
                queue.put_nowait(event)
            except Exception:
                pass

    @staticmethod
    def encode(event: dict) -> bytes:
        return (
            f"event: {event['type']}\n"
            f"data: {json.dumps(event)}\n\n"
        ).encode("utf-8")