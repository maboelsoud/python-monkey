from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from python_monkey.serializer import serialize


def test_none():
    assert serialize(None) is None


def test_primitives():
    assert serialize("hello") == "hello"
    assert serialize(42) == 42
    assert serialize(3.14) == 3.14
    assert serialize(True) is True
    assert serialize(False) is False


def test_uuid():
    uid = UUID("12345678-1234-5678-1234-567812345678")
    assert serialize(uid) == "12345678-1234-5678-1234-567812345678"


def test_datetime():
    dt = datetime(2025, 1, 15, 10, 30, 0)
    result = serialize(dt)
    assert result["__py_type__"] == "datetime"
    assert result["value"] == "2025-01-15T10:30:00"


def test_date():
    d = date(2025, 1, 15)
    result = serialize(d)
    assert result["__py_type__"] == "date"
    assert result["value"] == "2025-01-15"


def test_decimal():
    result = serialize(Decimal("99.99"))
    assert result == {"__py_type__": "Decimal", "value": "99.99"}


def test_enum():
    class Status(Enum):
        ACTIVE = 1
        INACTIVE = 0

    result = serialize(Status.ACTIVE)
    assert result["__py_type__"] == "Enum"
    assert result["__py_class__"] == "Status"
    assert result["name"] == "ACTIVE"
    assert result["value"] == 1


def test_dict():
    result = serialize({"key": "value", "num": 42})
    assert result["__py_type__"] == "dict"
    assert result["data"]["key"] == "value"
    assert result["data"]["num"] == 42


def test_list():
    result = serialize([1, "two", 3.0])
    assert result["__py_type__"] == "list"
    assert result["data"] == [1, "two", 3.0]


def test_tuple():
    result = serialize((1, 2, 3))
    assert result["__py_type__"] == "tuple"
    assert result["data"] == [1, 2, 3]


def test_set():
    result = serialize({1, 2, 3})
    assert result["__py_type__"] == "set"
    assert set(result["data"]) == {1, 2, 3}


def test_bytes_utf8():
    result = serialize(b"hello")
    assert result == {"__py_type__": "bytes", "value": "hello"}


def test_bytes_binary():
    result = serialize(bytes([0xFF, 0xFE]))
    assert result["__py_type__"] == "bytes"
    assert "2 bytes" in result["value"]


def test_exception():
    try:
        raise ValueError("bad input")
    except ValueError as e:
        result = serialize(e)

    assert result["__py_type__"] == "Exception"
    assert result["__py_class__"] == "ValueError"
    assert result["message"] == "bad input"
    assert isinstance(result["traceback"], list)


def test_dataclass():
    @dataclass
    class User:
        name: str
        age: int

    result = serialize(User(name="alice", age=30))
    assert result["__py_type__"] == "dataclass"
    assert result["__py_class__"] == "User"
    assert result["data"]["name"] == "alice"
    assert result["data"]["age"] == 30


def test_nested_objects():
    @dataclass
    class Item:
        price: Decimal
        created: datetime

    obj = {"items": [Item(price=Decimal("9.99"), created=datetime(2025, 6, 1))]}
    result = serialize(obj)
    assert result["__py_type__"] == "dict"
    items = result["data"]["items"]
    assert items["__py_type__"] == "list"
    item = items["data"][0]
    assert item["__py_type__"] == "dataclass"
    assert item["data"]["price"]["__py_type__"] == "Decimal"
    assert item["data"]["created"]["__py_type__"] == "datetime"


def test_generic_object():
    class Custom:
        def __init__(self):
            self.name = "test"
            self.value = 42

    result = serialize(Custom())
    assert result["__py_type__"] == "object"
    assert result["__py_class__"] == "Custom"
    assert result["data"]["name"] == "test"
    assert result["data"]["value"] == 42


def test_max_depth():
    deeply_nested = {"a": {"b": {"c": {"d": "value"}}}}
    result = serialize(deeply_nested, max_depth=2)
    # depth 0: outer dict, depth 1: {"b":...}, depth 2: {"c":...}
    # at depth 3 we hit max_depth, so {"d": "value"} becomes a string
    inner_c = result["data"]["a"]["data"]["b"]["data"]["c"]
    assert isinstance(inner_c, str)
    assert "max depth" in inner_c
