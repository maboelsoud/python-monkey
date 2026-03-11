"""
Recursive serializer for Python objects into a JSON-compatible format
that the PythonMonkey TypeScript client can reconstruct in browser DevTools.

Zero external dependencies -- detects Pydantic, dataclasses, etc. via duck-typing.
"""

import dataclasses
import traceback
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID


def serialize(obj: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """Recursively serialize a Python object for browser DevTools display."""
    if depth > max_depth:
        return f"<max depth exceeded: {type(obj).__name__}>"

    if obj is None:
        return None
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return {"__py_type__": "datetime", "value": obj.isoformat()}
    if isinstance(obj, date):
        return {"__py_type__": "date", "value": obj.isoformat()}
    if isinstance(obj, Decimal):
        return {"__py_type__": "Decimal", "value": str(obj)}
    if isinstance(obj, Enum):
        return {
            "__py_type__": "Enum",
            "__py_class__": type(obj).__name__,
            "name": obj.name,
            "value": obj.value,
        }

    # Pydantic v2 (has model_fields)
    if hasattr(obj, "model_fields") and hasattr(obj, "model_dump"):
        model_data = {}
        for field_name in obj.model_fields.keys():
            try:
                model_data[field_name] = serialize(getattr(obj, field_name), depth + 1, max_depth)
            except Exception:
                model_data[field_name] = f"<error accessing {field_name}>"
        return {
            "__py_type__": "PydanticModel",
            "__py_class__": type(obj).__name__,
            "__py_module__": type(obj).__module__,
            "data": model_data,
        }

    # Pydantic v1 (has __fields__ but no model_fields)
    if hasattr(obj, "__fields__") and not hasattr(obj, "model_fields"):
        model_data = {}
        for field_name in obj.__fields__.keys():
            try:
                model_data[field_name] = serialize(getattr(obj, field_name), depth + 1, max_depth)
            except Exception:
                model_data[field_name] = f"<error accessing {field_name}>"
        return {
            "__py_type__": "PydanticModel",
            "__py_class__": type(obj).__name__,
            "__py_module__": type(obj).__module__,
            "data": model_data,
        }

    # Dataclasses
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        model_data = {}
        for field in dataclasses.fields(obj):
            try:
                model_data[field.name] = serialize(getattr(obj, field.name), depth + 1, max_depth)
            except Exception:
                model_data[field.name] = f"<error accessing {field.name}>"
        return {
            "__py_type__": "dataclass",
            "__py_class__": type(obj).__name__,
            "__py_module__": type(obj).__module__,
            "data": model_data,
        }

    if isinstance(obj, Exception):
        return {
            "__py_type__": "Exception",
            "__py_class__": type(obj).__name__,
            "message": str(obj),
            "traceback": traceback.format_exception(type(obj), obj, obj.__traceback__),
        }

    if isinstance(obj, dict):
        return {
            "__py_type__": "dict",
            "data": {str(k): serialize(v, depth + 1, max_depth) for k, v in obj.items()},
        }
    if isinstance(obj, (list, tuple)):
        return {
            "__py_type__": "list" if isinstance(obj, list) else "tuple",
            "data": [serialize(item, depth + 1, max_depth) for item in obj],
        }
    if isinstance(obj, (set, frozenset)):
        return {
            "__py_type__": "set",
            "data": [serialize(item, depth + 1, max_depth) for item in obj],
        }
    if isinstance(obj, bytes):
        try:
            return {"__py_type__": "bytes", "value": obj.decode("utf-8")}
        except UnicodeDecodeError:
            return {"__py_type__": "bytes", "value": f"<{len(obj)} bytes>"}

    # Generic object with __dict__
    if hasattr(obj, "__dict__") and not isinstance(obj, type):
        obj_data = {}
        for k, v in obj.__dict__.items():
            if not k.startswith("_"):
                try:
                    obj_data[k] = serialize(v, depth + 1, max_depth)
                except Exception:
                    obj_data[k] = f"<error accessing {k}>"
        return {
            "__py_type__": "object",
            "__py_class__": type(obj).__name__,
            "__py_module__": type(obj).__module__,
            "data": obj_data,
        }

    # Final fallback
    try:
        return {
            "__py_type__": "object",
            "__py_class__": type(obj).__name__,
            "__py_module__": type(obj).__module__,
            "repr": repr(obj)[:500],
        }
    except Exception:
        return f"<unserializable: {type(obj).__name__}>"
