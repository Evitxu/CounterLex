"""The counterfactual engine is the thesis's contribution: intervening on a factor
must move the predicted probability in the learned direction, and the reported
delta must be internally consistent."""

from __future__ import annotations

from app.application.queries import CounterfactualHandler, CounterfactualQuery
from app.domain.factors import empty_factors


async def test_removing_an_incriminating_factor_lowers_probability(trained_repo):
    handler = CounterfactualHandler(trained_repo)
    factors = {**empty_factors(), "forensic_evidence": True, "weapon_present": True}
    result = await handler(
        CounterfactualQuery(factors=factors, overrides={"forensic_evidence": False})
    )
    assert result.counterfactual.probability < result.base.probability
    assert result.delta < 0
    assert result.delta == round(
        result.counterfactual.probability - result.base.probability, 4
    )
    assert result.changed == {"forensic_evidence": False}
    assert "forense" in result.narrative.lower() or "forensic" in result.narrative.lower()


async def test_no_change_leaves_probability_untouched(trained_repo):
    handler = CounterfactualHandler(trained_repo)
    factors = {**empty_factors(), "confession": True}
    result = await handler(
        CounterfactualQuery(factors=factors, overrides={"confession": True})  # no-op
    )
    assert result.changed == {}
    assert result.delta == 0.0
    assert result.base.probability == result.counterfactual.probability


async def test_contributions_are_sorted_by_impact(trained_repo):
    handler = CounterfactualHandler(trained_repo)
    factors = {**empty_factors(), "confession": True, "alibi": True}
    result = await handler(CounterfactualQuery(factors=factors, overrides={}))
    impacts = [abs(c.contribution) for c in result.base.contributions]
    assert impacts == sorted(impacts, reverse=True)
