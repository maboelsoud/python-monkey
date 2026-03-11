# PythonMonkey 🐒

See your Python backend logs in browser DevTools. Like `console.log()` for Python.

PythonMonkey patches Python's `logging` module so that `logging.info("label", object)` sends the full, inspectable Python object to your browser console over WebSocket -- no print-debugging, no copying UUIDs, no `repr()` walls.

## Install

```bash
# Python (backend)
pip install python-monkey

# JavaScript/TypeScript (frontend)
npm install python-monkey
```

## Quick Start

### Python (FastAPI example)

```python
from fastapi import FastAPI, WebSocket
from python_monkey import PythonMonkey

app = FastAPI()
monkey = PythonMonkey(dev_mode=True)  # pass False in production
monkey.patch_logging()

@app.websocket("/ws/python-monkey")
async def ws(websocket: WebSocket):
    await monkey.websocket_handler(websocket)
```

Now just use standard logging -- objects are sent to the browser automatically:

```python
import logging

logging.info("Processing payment", payment_obj)
logging.error("Failed for user", user, "with error", exc)
```

### TypeScript (React)

```tsx
import { PythonMonkeyProvider } from 'python-monkey/react';

function App() {
  return (
    <PythonMonkeyProvider
      url="ws://localhost:8000/ws/python-monkey"
      enabled={process.env.NODE_ENV !== 'production'}
    >
      <YourApp />
    </PythonMonkeyProvider>
  );
}
```

### TypeScript (Vanilla JS / Angular / Vue / etc.)

```typescript
import { PythonMonkey } from 'python-monkey';

const monkey = new PythonMonkey({
  url: 'ws://localhost:8000/ws/python-monkey',
  enabled: true,
});

monkey.connect();
```

## What you get

- **Rich objects in DevTools** -- Pydantic models, dataclasses, dicts, datetimes, Decimals, Enums, and exceptions all display as expandable, named objects in the browser console.
- **Zero config serialization** -- No need to install Pydantic or any other dependency. PythonMonkey detects model types via duck-typing.
- **Standard logging** -- Just use `logging.info()`, `logging.error()`, etc. No new API to learn.
- **Framework agnostic** -- Works with FastAPI, Starlette, Django, or any Python framework that gives you a WebSocket object. On the frontend, works with React, Angular, Vue, or vanilla JS.

## How it works

1. `monkey.patch_logging()` adds a `logging.Handler` that serializes Python objects into a JSON wire format and queues them for broadcast.
2. `monkey.websocket_handler(ws)` accepts browser WebSocket connections and streams the queued messages.
3. The JavaScript `PythonMonkey` client receives messages, deserializes them back into named JavaScript class instances, and logs them to `console.log` / `console.error` / etc.

The wire protocol is documented in [PROTOCOL.md](PROTOCOL.md).

## API

### Python

```python
from python_monkey import PythonMonkey

monkey = PythonMonkey(dev_mode=True)

monkey.patch_logging()                    # Patch logging.info/error/etc.
await monkey.websocket_handler(ws)        # Handle a WebSocket connection
monkey.log(obj1, obj2, level="INFO")      # Log directly (like console.log)
```

### TypeScript

```typescript
import { PythonMonkey } from 'python-monkey';

const monkey = new PythonMonkey({
  url: 'ws://localhost:8000/ws/python-monkey',
  enabled: true,
  reconnectDelay: 3000,   // optional
  pingInterval: 30000,    // optional
});

monkey.connect();
monkey.disconnect();
```

### React

```tsx
import { PythonMonkeyProvider } from 'python-monkey/react';

<PythonMonkeyProvider url="ws://..." enabled={true}>
  <App />
</PythonMonkeyProvider>
```

## Development

```bash
# Build both packages
make build

# Build individually
make build-python
make build-js

# Clean
make clean
```

## License

MIT
