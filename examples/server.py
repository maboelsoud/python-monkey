"""
PythonMonkey demo server.

Run:
    pip install fastapi uvicorn
    cd python && pip install -e .
    python examples/server.py

Then open examples/index.html in your browser and check DevTools Console.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum

import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from python_monkey import PythonMonkey

app = FastAPI(title="PythonMonkey Demo")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

monkey = PythonMonkey(dev_mode=True)
monkey.patch_logging()


@app.websocket("/ws/python-monkey")
async def ws(websocket: WebSocket):
    await monkey.websocket_handler(websocket)


class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Payment:
    id: str
    amount: Decimal
    status: PaymentStatus
    created_at: datetime


@dataclass
class User:
    name: str
    email: str
    payments: list


@app.get("/demo")
async def demo():
    """Hit this endpoint to generate sample log messages."""
    payment = Payment(
        id="pay_abc123",
        amount=Decimal("149.99"),
        status=PaymentStatus.COMPLETED,
        created_at=datetime.now(),
    )
    user = User(
        name="Alice",
        email="alice@example.com",
        payments=[payment],
    )

    logging.info("Processing payment", payment)
    logging.info("User data", user)
    logging.warning("Low balance", {"user": "alice", "balance": Decimal("5.00")})
    logging.error("Payment failed", {"reason": "insufficient funds", "amount": Decimal("999.99")})
    logging.debug("Debug details", {"nested": {"deep": {"value": 42}}})

    return {"status": "Logs sent! Check your browser DevTools Console."}


@app.get("/")
async def root():
    return {"message": "PythonMonkey demo - hit /demo to generate logs, or open examples/index.html"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
