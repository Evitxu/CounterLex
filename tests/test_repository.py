from __future__ import annotations

from app.domain.entities import Case
from app.domain.factors import empty_factors


def test_add_count_and_roundtrip(repo):
    assert repo.count() == 0
    c = Case(factors={**empty_factors(), "confession": True}, convicted=True, reference="X/1")
    repo.add_cases([c])
    assert repo.count() == 1
    loaded = repo.all_cases()[0]
    assert loaded.id == c.id
    assert loaded.convicted is True
    assert loaded.factors["confession"] is True
    assert loaded.reference == "X/1"


def test_clear_empties_the_corpus(repo):
    repo.add_cases([Case(factors=empty_factors(), convicted=False)])
    assert repo.count() == 1
    repo.clear()
    assert repo.count() == 0


def test_add_cases_replaces_on_same_id(repo):
    c = Case(factors=empty_factors(), convicted=False, reference="v1")
    repo.add_cases([c])
    c2 = Case(id=c.id, factors=empty_factors(), convicted=True, reference="v2")
    repo.add_cases([c2])
    assert repo.count() == 1
    assert repo.all_cases()[0].reference == "v2"


def test_model_state_roundtrip(repo):
    assert repo.load_model() is None
    coef = {"confession": 2.2, "alibi": -1.7}
    repo.save_model(coef, intercept=-0.4, metrics={"n": 10}, trained_at="2026-01-01T00:00:00Z")
    loaded = repo.load_model()
    assert loaded is not None
    got_coef, got_intercept, got_metrics = loaded
    assert got_coef == coef
    assert got_intercept == -0.4
    assert got_metrics == {"n": 10}


def test_save_model_is_singleton(repo):
    repo.save_model({"a": 1.0}, 0.0, {}, "t1")
    repo.save_model({"a": 2.0}, 0.0, {}, "t2")
    coef, _, _ = repo.load_model()
    assert coef == {"a": 2.0}  # id=1 row is replaced, not duplicated
