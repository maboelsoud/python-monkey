# PythonMonkey Wire Protocol

PythonMonkey communicates between the Python backend and the browser frontend over a WebSocket connection using JSON messages.

## Transport

- **WebSocket** - The Python server accepts WebSocket connections at a path chosen by the consumer (e.g. `/ws/python-monkey`).
- **Keepalive** - The client sends `"ping"` as a text frame; the server responds with `{"type": "pong"}`.

## Message Types

### `log` - Standard log message

Sent when a standard `logging.info()` / `logging.error()` / etc. call is intercepted by the MonkeyHandler.

```json
{
  "type": "log",
  "level": "INFO",
  "message": "Processing payment for customer",
  "timestamp": "2025-01-15T10:30:00.123456",
  "filename": "payments.py",
  "lineno": 42
}
```

### `object` - Rich object message

Sent when `logging.info("label", python_object)` or `monkey.log(obj)` is called. Contains fully serialized Python objects.

```json
{
  "type": "object",
  "level": "INFO",
  "timestamp": "2025-01-15T10:30:00.123456",
  "objects": [ ... ],
  "filename": "payments.py",
  "lineno": 42,
  "stack_trace": null
}
```

## Serialization Format

All Python objects are serialized recursively. Each non-primitive value is wrapped in an object with a `__py_type__` discriminator.

### Primitives

`str`, `int`, `float`, `bool`, `None` pass through as-is. `UUID` is serialized as a plain string.

### `datetime` / `date`

```json
{ "__py_type__": "datetime", "value": "2025-01-15T10:30:00" }
{ "__py_type__": "date", "value": "2025-01-15" }
```

### `Decimal`

```json
{ "__py_type__": "Decimal", "value": "123.45" }
```

### `Enum`

```json
{ "__py_type__": "Enum", "__py_class__": "Status", "name": "ACTIVE", "value": 1 }
```

### `PydanticModel` / `dataclass`

Detected via duck-typing (`model_fields` for Pydantic v2, `__fields__` for v1, `dataclasses.fields` for dataclasses).

```json
{
  "__py_type__": "PydanticModel",
  "__py_class__": "Payment",
  "__py_module__": "app.models",
  "data": {
    "id": "abc-123",
    "amount": { "__py_type__": "Decimal", "value": "99.99" },
    "status": { "__py_type__": "Enum", "__py_class__": "Status", "name": "ACTIVE", "value": 1 }
  }
}
```

### `Exception`

```json
{
  "__py_type__": "Exception",
  "__py_class__": "ValueError",
  "message": "Invalid amount",
  "traceback": ["Traceback (most recent call last):\n", "  ..."]
}
```

### Collections

```json
{ "__py_type__": "dict", "data": { "key": "value" } }
{ "__py_type__": "list", "data": [1, 2, 3] }
{ "__py_type__": "tuple", "data": [1, 2, 3] }
{ "__py_type__": "set", "data": [1, 2, 3] }
```

### `bytes`

```json
{ "__py_type__": "bytes", "value": "utf-8 decoded string" }
{ "__py_type__": "bytes", "value": "<1024 bytes>" }
```

### Generic objects

Fallback for any object not matched above. If the object has `__dict__`, its public attributes are serialized:

```json
{
  "__py_type__": "object",
  "__py_class__": "MyThing",
  "__py_module__": "app.things",
  "data": { "name": "foo", "count": 42 }
}
```

If `__dict__` is not available, falls back to `repr()`:

```json
{
  "__py_type__": "object",
  "__py_class__": "MyThing",
  "__py_module__": "app.things",
  "repr": "<MyThing at 0x...>"
}
```
