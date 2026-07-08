from __future__ import annotations

from app.domain.entities import Case
from app.domain.factors import empty_factors
from app.infrastructure.retrieval import PrecedentIndex


def _case(convicted=True, ref="R", **present) -> Case:
    f = empty_factors()
    f.update({k: True for k in present})
    return Case(factors=f, convicted=convicted, reference=ref)


def test_identical_factors_score_one():
    c = _case(forensic_evidence=True, weapon_present=True)
    idx = PrecedentIndex([c])
    res = idx.query({**empty_factors(), "forensic_evidence": True, "weapon_present": True}, top_k=5)
    assert res[0].similarity == 1.0
    assert set(res[0].shared_factors) == {"forensic_evidence", "weapon_present"}


def test_disjoint_factors_score_zero():
    c = _case(alibi=True)
    idx = PrecedentIndex([c])
    res = idx.query({**empty_factors(), "forensic_evidence": True}, top_k=5)
    assert res[0].similarity == 0.0
    assert res[0].shared_factors == []


def test_partial_overlap_is_jaccard():
    # query {A,B} vs case {A,C} → shared 1, union 3 → 1/3.
    c = _case(forensic_evidence=True, eyewitness=True)
    idx = PrecedentIndex([c])
    q = {**empty_factors(), "forensic_evidence": True, "weapon_present": True}
    res = idx.query(q, top_k=5)
    assert res[0].similarity == round(1 / 3, 3)


def test_results_are_sorted_and_top_k_limited():
    cases = [
        _case(forensic_evidence=True, weapon_present=True, ref="both"),
        _case(forensic_evidence=True, ref="one"),
        _case(alibi=True, ref="none"),
    ]
    idx = PrecedentIndex(cases)
    q = {**empty_factors(), "forensic_evidence": True, "weapon_present": True}
    res = idx.query(q, top_k=2)
    assert len(res) == 2
    sims = [r.similarity for r in res]
    assert sims == sorted(sims, reverse=True)
    assert res[0].reference == "both"


def test_require_factor_filters_pool():
    cases = [_case(forensic_evidence=True, ref="has"), _case(alibi=True, ref="hasnt")]
    idx = PrecedentIndex(cases)
    res = idx.query(empty_factors(), top_k=5, require_factor="forensic_evidence")
    assert [r.reference for r in res] == ["has"]
