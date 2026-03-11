"""
PythonMonkey - See your Python backend logs in browser DevTools.

Usage:
    from python_monkey import PythonMonkey

    monkey = PythonMonkey(dev_mode=True)
    monkey.patch_logging()

    # Wire the WebSocket handler into your framework:
    @app.websocket("/ws/python-monkey")
    async def ws(websocket):
        await monkey.websocket_handler(websocket)
"""

import logging
from typing import Any

from python_monkey.handler import MonkeyHandler, monkey_log, patch_logging
from python_monkey.serializer import serialize
from python_monkey.server import websocket_handler

__all__ = [
    "PythonMonkey",
    "serialize",
    "monkey_log",
]


class PythonMonkey:
    """Main entry point. Instantiate with dev_mode to control enablement."""

    def __init__(self, dev_mode: bool = True) -> None:
        self.dev_mode = dev_mode
        self._handler: MonkeyHandler | None = None

    def patch_logging(self) -> None:
        """Patch the logging module and add the broadcast handler.

        After calling this, logging.info("msg", obj) sends the object
        to connected browser clients as a rich, inspectable value.
        """
        if not self.dev_mode:
            return

        self._handler = MonkeyHandler(dev_mode=self.dev_mode)
        self._handler.setLevel(logging.DEBUG)
        logging.getLogger().addHandler(self._handler)

        patch_logging(dev_mode=self.dev_mode)
        logging.info("PythonMonkey enabled - connect your browser to see logs in DevTools")

    async def websocket_handler(self, ws: Any) -> None:
        """Handle a WebSocket connection. Delegate to the framework-agnostic handler."""
        if not self.dev_mode:
            await ws.close(code=1008, reason="PythonMonkey disabled")
            return
        await websocket_handler(ws)

    def log(self, *args: Any, level: str = "INFO") -> None:
        """Log objects directly to browser DevTools (like console.log)."""
        monkey_log(*args, level=level, _dev_mode=self.dev_mode)
