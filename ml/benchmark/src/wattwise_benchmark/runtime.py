from __future__ import annotations

import hashlib
import platform
import threading
import time
from pathlib import Path
from types import TracebackType
from typing import Any

import psutil


class PeakMemoryMonitor:
    def __init__(self, interval_seconds: float = 0.05) -> None:
        self.interval_seconds = interval_seconds
        self.peak_bytes = 0
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _rss(self) -> int:
        process = psutil.Process()
        total = process.memory_info().rss
        for child in process.children(recursive=True):
            try:
                total += child.memory_info().rss
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return total

    def _sample(self) -> None:
        while not self._stop.wait(self.interval_seconds):
            self.peak_bytes = max(self.peak_bytes, self._rss())

    def __enter__(self) -> PeakMemoryMonitor:
        self.peak_bytes = self._rss()
        self._stop.clear()
        self._thread = threading.Thread(target=self._sample, daemon=True)
        self._thread.start()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        del exc_type, exc_value, traceback
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=1.0)
        self.peak_bytes = max(self.peak_bytes, self._rss())


def source_tree_fingerprint(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def hardware_summary() -> dict[str, Any]:
    memory = psutil.virtual_memory()
    return {
        "operating_system": platform.platform(),
        "cpu": platform.processor() or "unknown",
        "logical_cpu_count": psutil.cpu_count(logical=True),
        "physical_cpu_count": psutil.cpu_count(logical=False),
        "memory_bytes": int(memory.total),
        "gpu": "none; CPU execution",
    }


def utc_now_iso() -> str:
    return (
        time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
        + f".{int(time.time_ns() % 1_000_000_000):09d}Z"
    )
