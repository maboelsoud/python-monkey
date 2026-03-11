"""
Framework-agnostic WebSocket broadcast server.

Manages connected clients and an async broadcast queue.
The websocket_handler() function works with any WebSocket object that has
.accept(), .receive_text(), .send_text(), and .close() methods
(FastAPI, Starlette, Django Channels, etc.).
"""

import asyncio
import logging
from typing import Any

_connected_clients: set[Any] = set()
_broadcast_queue: asyncio.Queue | None = None

_worker_started = False
_worker_task: asyncio.Task | None = None


async def _broadcast_worker() -> None:
    """Worker coroutine that broadcasts queued messages to all connected clients."""
    global _broadcast_queue
    _broadcast_queue = asyncio.Queue(maxsize=1000)

    while True:
        try:
            message = await _broadcast_queue.get()
            disconnected = set()
            for client in _connected_clients:
                try:
                    await client.send_text(message)
                except Exception:
                    disconnected.add(client)
            _connected_clients.difference_update(disconnected)
        except Exception:
            pass


async def _ensure_broadcast_worker() -> None:
    """Start the broadcast worker if it isn't running yet."""
    global _worker_started, _worker_task
    if not _worker_started:
        _worker_task = asyncio.create_task(_broadcast_worker())
        _worker_started = True


def _register_client(websocket: Any) -> None:
    _connected_clients.add(websocket)


def _unregister_client(websocket: Any) -> None:
    _connected_clients.discard(websocket)


async def websocket_handler(websocket: Any) -> None:
    """Handle a PythonMonkey WebSocket connection.

    Works with any WebSocket object that has:
      - await .accept()
      - await .receive_text() -> str
      - await .send_text(str)

    Usage with FastAPI / Starlette:
        @app.websocket("/ws/python-monkey")
        async def ws(websocket: WebSocket):
            await monkey.websocket_handler(websocket)

    Usage with Django Channels or any other framework:
        Wire this function to your framework's WebSocket routing.
    """
    await websocket.accept()
    await _ensure_broadcast_worker()
    _register_client(websocket)
    logging.info("PythonMonkey: browser client connected")

    try:
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text('{"type": "pong"}')
            except Exception:
                break
    finally:
        _unregister_client(websocket)
        logging.info("PythonMonkey: browser client disconnected")
