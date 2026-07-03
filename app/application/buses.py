"""Minimal Command/Query buses — the CQRS backbone.

Commands mutate state (generate corpus, train model). Queries are read-only
(analyze a case, run a counterfactual). Handlers are registered once at startup
in the composition root; routes only ever touch a bus, never infrastructure.
"""

from __future__ import annotations

from typing import Awaitable, Callable, TypeVar

from pydantic import BaseModel

M = TypeVar("M", bound=BaseModel)
R = TypeVar("R")
Handler = Callable[[BaseModel], Awaitable[object]]


class _Bus:
    def __init__(self, kind: str) -> None:
        self._kind = kind
        self._handlers: dict[type[BaseModel], Handler] = {}

    def register(self, message_type: type[M], handler: Callable[[M], Awaitable[R]]) -> None:
        self._handlers[message_type] = handler  # type: ignore[assignment]

    async def _dispatch(self, message: M) -> object:
        handler = self._handlers.get(type(message))
        if handler is None:
            raise KeyError(f"No {self._kind} handler for {type(message).__name__}")
        return await handler(message)


class CommandBus(_Bus):
    def __init__(self) -> None:
        super().__init__("command")

    async def dispatch(self, command: M) -> object:
        return await self._dispatch(command)


class QueryBus(_Bus):
    def __init__(self) -> None:
        super().__init__("query")

    async def ask(self, query: M) -> object:
        return await self._dispatch(query)
