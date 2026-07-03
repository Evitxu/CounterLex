"""SQLite persistence for the case corpus and the trained model state.

Stdlib sqlite3 only — no ORM, no server. A single connection guarded by a lock
(FastAPI runs handlers in a threadpool). This is the only place that touches disk.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from uuid import UUID

from app.domain.entities import Case


class CorpusRepository:
    def __init__(self, path: str) -> None:
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._create()

    def _create(self) -> None:
        with self._lock, self._conn:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    id TEXT PRIMARY KEY,
                    text TEXT NOT NULL DEFAULT '',
                    factors TEXT NOT NULL,
                    convicted INTEGER NOT NULL,
                    is_real INTEGER NOT NULL DEFAULT 0,
                    reference TEXT
                );
                CREATE TABLE IF NOT EXISTS model_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    coef TEXT NOT NULL,
                    intercept REAL NOT NULL,
                    metrics TEXT NOT NULL,
                    trained_at TEXT NOT NULL
                );
                """
            )

    # ---- corpus ----------------------------------------------------------
    def add_cases(self, cases: list[Case]) -> None:
        with self._lock, self._conn:
            self._conn.executemany(
                "INSERT OR REPLACE INTO cases (id, text, factors, convicted, is_real, reference)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                [
                    (
                        str(c.id),
                        c.text,
                        json.dumps(c.factors),
                        int(c.convicted),
                        int(c.is_real),
                        c.reference,
                    )
                    for c in cases
                ],
            )

    def all_cases(self) -> list[Case]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM cases").fetchall()
        return [
            Case(
                id=UUID(r["id"]),
                text=r["text"],
                factors=json.loads(r["factors"]),
                convicted=bool(r["convicted"]),
                is_real=bool(r["is_real"]),
                reference=r["reference"],
            )
            for r in rows
        ]

    def count(self) -> int:
        with self._lock:
            return self._conn.execute("SELECT COUNT(*) AS n FROM cases").fetchone()["n"]

    def clear(self) -> None:
        with self._lock, self._conn:
            self._conn.execute("DELETE FROM cases")

    # ---- model state -----------------------------------------------------
    def save_model(self, coef: dict[str, float], intercept: float, metrics: dict, trained_at: str) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT OR REPLACE INTO model_state (id, coef, intercept, metrics, trained_at)"
                " VALUES (1, ?, ?, ?, ?)",
                (json.dumps(coef), intercept, json.dumps(metrics), trained_at),
            )

    def load_model(self) -> tuple[dict[str, float], float, dict] | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM model_state WHERE id = 1").fetchone()
        if row is None:
            return None
        return json.loads(row["coef"]), row["intercept"], json.loads(row["metrics"])
