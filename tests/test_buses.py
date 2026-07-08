from __future__ import annotations

import pytest
from pydantic import BaseModel

from app.application.buses import CommandBus, QueryBus


class Ping(BaseModel):
    value: int


class Unregistered(BaseModel):
    pass


async def test_command_bus_dispatches_to_handler():
    bus = CommandBus()

    async def handler(msg: Ping) -> int:
        return msg.value * 2

    bus.register(Ping, handler)
    assert await bus.dispatch(Ping(value=21)) == 42


async def test_query_bus_asks_handler():
    bus = QueryBus()

    async def handler(msg: Ping) -> str:
        return f"got {msg.value}"

    bus.register(Ping, handler)
    assert await bus.ask(Ping(value=7)) == "got 7"


async def test_missing_handler_raises_keyerror():
    bus = QueryBus()
    with pytest.raises(KeyError):
        await bus.ask(Unregistered())
