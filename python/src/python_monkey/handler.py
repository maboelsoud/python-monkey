"""
Logging handler and monkey-patcher that intercepts Python's logging module
and broadcasts log messages to connected browser clients.
"""

import inspect
import json
import logging
import traceback
from datetime import datetime
from functools import wraps
from typing import Any

from python_monkey.serializer import serialize
import python_monkey.server as _server


class MonkeyHandler(logging.Handler):
    """logging.Handler that broadcasts log records to connected WebSocket clients."""

    def __init__(self, dev_mode: bool = True) -> None:
        super().__init__()
        self.setLevel(logging.DEBUG)
        self._dev_mode = dev_mode

    def emit(self, record: logging.LogRecord) -> None:
        if not self._dev_mode or getattr(record, "_skip_monkey", False) or not _server._connected_clients:
            return
        try:
            log_data = {
                "type": "log",
                "level": record.levelname,
                "message": record.getMessage(),
                "timestamp": datetime.now().isoformat(),
                "filename": record.filename,
                "lineno": record.lineno,
            }
            if _server._broadcast_queue:
                _server._broadcast_queue.put_nowait(json.dumps(log_data))
        except Exception:
            pass


def monkey_log(
    *args: Any,
    level: str = "INFO",
    filename: str | None = None,
    lineno: int | None = None,
    stack_trace: list | None = None,
    _dev_mode: bool = True,
) -> None:
    """Log objects directly to browser DevTools. Like console.log() for Python."""
    if not _dev_mode or not _server._connected_clients or not args:
        return
    try:
        log_data = {
            "type": "object",
            "level": level.upper(),
            "timestamp": datetime.now().isoformat(),
            "objects": [serialize(arg) for arg in args],
            "filename": filename,
            "lineno": lineno,
            "stack_trace": stack_trace,
        }
        if _server._broadcast_queue:
            _server._broadcast_queue.put_nowait(json.dumps(log_data))
    except Exception:
        pass


def _create_patched_log_method(original_method: Any, level_name: str, dev_mode: bool) -> Any:
    """Create a patched logging method that handles objects like console.log()."""

    @wraps(original_method)
    def patched_method(msg: Any, *args: Any, **kwargs: Any) -> None:
        if isinstance(msg, str) and "%" in msg and any(f"%{c}" in msg for c in "sdrifFeEgGxXoaAcbp"):
            original_method(msg, *args, stacklevel=2, **kwargs)
            return

        all_parts = [msg if isinstance(msg, str) else repr(msg)]
        all_parts.extend(arg if isinstance(arg, str) else repr(arg) for arg in args)

        extra = kwargs.pop("extra", None) or {}
        extra["_skip_monkey"] = True
        original_method(" ".join(all_parts), extra=extra, stacklevel=2, **kwargs)

        frame = inspect.currentframe()
        caller = frame.f_back if frame else None
        filename = caller.f_code.co_filename.split("/")[-1] if caller else "unknown"
        lineno_val = caller.f_lineno if caller else 0

        stack_trace = None
        if level_name in ("ERROR", "CRITICAL"):
            stack_trace = traceback.format_stack()[:-1]

        monkey_log(
            msg,
            *args,
            level=level_name,
            filename=filename,
            lineno=lineno_val,
            stack_trace=stack_trace,
            _dev_mode=dev_mode,
        )

    return patched_method


_logging_patched = False


def patch_logging(dev_mode: bool = True) -> None:
    """Patch the logging module to support console.log()-style multi-arg calls.

    Example after patching:
        logging.info("user:", user_object)
        logging.info("Processing", payment, "for", customer)
    """
    global _logging_patched
    if _logging_patched or not dev_mode:
        return

    logging.debug = _create_patched_log_method(logging.debug, "DEBUG", dev_mode)
    logging.info = _create_patched_log_method(logging.info, "INFO", dev_mode)
    logging.warning = _create_patched_log_method(logging.warning, "WARNING", dev_mode)
    logging.warn = _create_patched_log_method(logging.warn, "WARNING", dev_mode)
    logging.error = _create_patched_log_method(logging.error, "ERROR", dev_mode)
    logging.critical = _create_patched_log_method(logging.critical, "CRITICAL", dev_mode)

    _logging_patched = True
