import asyncio
import json
import logging

from python_monkey import PythonMonkey
from python_monkey.handler import MonkeyHandler
from python_monkey.server import _broadcast_queue, _connected_clients


def test_handler_noop_when_disabled():
    handler = MonkeyHandler(dev_mode=False)
    record = logging.LogRecord("test", logging.INFO, "test.py", 1, "hello", (), None)
    handler.emit(record)


def test_handler_noop_when_no_clients():
    handler = MonkeyHandler(dev_mode=True)
    _connected_clients.clear()
    record = logging.LogRecord("test", logging.INFO, "test.py", 1, "hello", (), None)
    handler.emit(record)


def test_handler_queues_message_when_client_connected():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    import python_monkey.server as server
    server._broadcast_queue = asyncio.Queue(maxsize=1000)

    class FakeWs:
        pass

    _connected_clients.add(FakeWs())

    try:
        handler = MonkeyHandler(dev_mode=True)
        record = logging.LogRecord("test", logging.INFO, "test.py", 10, "test message", (), None)
        handler.emit(record)

        assert not server._broadcast_queue.empty()
        msg = json.loads(server._broadcast_queue.get_nowait())
        assert msg["type"] == "log"
        assert msg["level"] == "INFO"
        assert msg["message"] == "test message"
    finally:
        _connected_clients.clear()
        server._broadcast_queue = None
        loop.close()


def test_python_monkey_disabled():
    monkey = PythonMonkey(dev_mode=False)
    monkey.patch_logging()
    monkey.log("should be noop")


def test_python_monkey_enabled():
    monkey = PythonMonkey(dev_mode=True)
    assert monkey.dev_mode is True
