"""Query side (reads): factor catalog, case analysis, counterfactuals, evaluation."""

from __future__ import annotations

from pydantic import BaseModel

from app.domain.entities import (
    CaseAnalysis,
    CounterfactualResult,
    DebateResult,
    DebateTurn,
    FactorContribution,
    JurisprudenceSearch,
    OutcomePrediction,
)
from app.domain.factors import FACTORS, GROUND_TRUTH
from app.infrastructure.factor_extractor import FactorExtractor, detect_outcome
from app.infrastructure.llm_client import LlmClient
from app.infrastructure.outcome_model import OutcomeModel
from app.infrastructure.repository import CorpusRepository
from app.infrastructure.retrieval import PrecedentIndex

_LABELS = {f.key: f.label_es for f in FACTORS}


def _load_model(repo: CorpusRepository) -> OutcomeModel:
    state = repo.load_model()
    if state is None:
        raise ValueError("Model not trained yet — train it before querying.")
    coef, intercept, _metrics = state
    return OutcomeModel(coef, intercept)


def _build_prediction(model: OutcomeModel, factors: dict[str, bool]) -> OutcomePrediction:
    contribs = [
        FactorContribution(
            key=f.key,
            label=f.label_es,
            present=bool(factors.get(f.key)),
            weight=round(model.coef[f.key], 4),
            contribution=round(model.coef[f.key] * (1 if factors.get(f.key) else 0), 4),
        )
        for f in FACTORS
    ]
    contribs.sort(key=lambda c: abs(c.contribution), reverse=True)
    return OutcomePrediction(
        probability=round(model.probability(factors), 4),
        log_odds=round(model.log_odds(factors), 4),
        contributions=contribs,
    )


# --- factor catalog -------------------------------------------------------
class ListFactorsQuery(BaseModel):
    pass


class ListFactorsHandler:
    async def __call__(self, _: ListFactorsQuery) -> list[dict]:
        return [
            {"key": f.key, "label_es": f.label_es, "label_en": f.label_en,
             "description_es": f.description_es, "direction": f.direction}
            for f in FACTORS
        ]


# --- analyze a free-text case --------------------------------------------
class AnalyzeCaseQuery(BaseModel):
    text: str


class AnalyzeCaseHandler:
    def __init__(self, repo: CorpusRepository, extractor: FactorExtractor) -> None:
        self._repo = repo
        self._extractor = extractor

    async def __call__(self, q: AnalyzeCaseQuery) -> CaseAnalysis:
        factors, source = await self._extractor.extract(q.text)
        model = _load_model(self._repo)
        prediction = _build_prediction(model, factors)
        from app.core.config import get_settings

        precedents = PrecedentIndex(self._repo.all_cases()).query(
            factors, get_settings().top_k_precedents
        )
        return CaseAnalysis(
            factors=factors,
            prediction=prediction,
            precedents=precedents,
            extraction_source=source,
            detected_outcome=detect_outcome(q.text),
        )


# --- semantic (factor-based) jurisprudence search ------------------------
class SearchJurisprudenceQuery(BaseModel):
    text: str
    top_k: int = 10


class SearchJurisprudenceHandler:
    def __init__(self, repo: CorpusRepository, extractor: FactorExtractor) -> None:
        self._repo = repo
        self._extractor = extractor

    async def __call__(self, q: SearchJurisprudenceQuery) -> JurisprudenceSearch:
        factors, source = await self._extractor.extract(q.text)
        results = PrecedentIndex(self._repo.all_cases()).query(factors, q.top_k)
        return JurisprudenceSearch(
            query_factors=factors, extraction_source=source, results=results
        )


# --- counterfactual intervention -----------------------------------------
class CounterfactualQuery(BaseModel):
    factors: dict[str, bool]
    overrides: dict[str, bool]


class CounterfactualHandler:
    def __init__(self, repo: CorpusRepository) -> None:
        self._repo = repo

    async def __call__(self, q: CounterfactualQuery) -> CounterfactualResult:
        from app.core.config import get_settings

        model = _load_model(self._repo)
        base_factors = dict(q.factors)
        cf_factors = {**base_factors, **q.overrides}
        changed = {k: v for k, v in q.overrides.items() if base_factors.get(k) != v}

        base = _build_prediction(model, base_factors)
        cf = _build_prediction(model, cf_factors)
        delta = round(cf.probability - base.probability, 4)

        precedents = PrecedentIndex(self._repo.all_cases()).query(
            cf_factors, get_settings().top_k_precedents
        )
        narrative = self._narrate(changed, base.probability, cf.probability, delta, precedents)
        return CounterfactualResult(
            base=base, counterfactual=cf, changed=changed, delta=delta,
            narrative=narrative, driving_precedents=precedents,
        )

    @staticmethod
    def _narrate(changed, base_p, cf_p, delta, precedents) -> str:
        if not changed:
            return "No se ha modificado ningún factor; el resultado no varía."
        labels = ", ".join(_LABELS.get(k, k) for k in changed)
        direction = "baja" if delta < 0 else ("sube" if delta > 0 else "no varía")
        conv = sum(1 for p in precedents if p.convicted)
        rate = round(100 * conv / len(precedents)) if precedents else 0
        return (
            f"Al modificar «{labels}», la probabilidad de condena {direction} "
            f"del {round(base_p * 100)}% al {round(cf_p * 100)}% "
            f"({round(delta * 100):+d} puntos). De {len(precedents)} precedentes similares, "
            f"el {rate}% terminaron en condena."
        )


# --- multi-agent debate (LLM) --------------------------------------------
class DebateQuery(BaseModel):
    factors: dict[str, bool]
    lang: str = "es"


_DEBATE_SYS = {
    "es": (
        "Eres un simulador de debate jurídico sobre un caso penal español. A partir de "
        "los factores del caso y los precedentes, redacta argumentos BREVES (2-3 frases "
        "cada uno) para tres roles. Devuelve SOLO un objeto JSON con las claves exactas "
        "'fiscal', 'defensa' y 'juez'. El fiscal argumenta a favor de la condena; la "
        "defensa a favor de la absolución; el juez hace una síntesis ponderada y prudente. "
        "No inventes hechos fuera de los factores dados."
    ),
    "en": (
        "You simulate a legal debate about a Spanish criminal case. From the case factors "
        "and precedents, write BRIEF arguments (2-3 sentences each) for three roles. Return "
        "ONLY a JSON object with the exact keys 'fiscal', 'defensa', 'juez'. The 'fiscal' "
        "(prosecutor) argues for conviction; 'defensa' (defence) for acquittal; 'juez' "
        "(judge) gives a balanced, cautious synthesis. Do not invent facts beyond those given."
    ),
}


class DebateHandler:
    def __init__(self, repo: CorpusRepository, llm: LlmClient) -> None:
        self._repo = repo
        self._llm = llm

    async def __call__(self, q: DebateQuery) -> DebateResult:
        from app.core.config import get_settings

        model = _load_model(self._repo)
        prob = model.probability(q.factors)
        precedents = PrecedentIndex(self._repo.all_cases()).query(
            q.factors, get_settings().top_k_precedents
        )
        lang = "en" if q.lang == "en" else "es"
        label = {f.key: (f.label_en if lang == "en" else f.label_es) for f in FACTORS}
        present = [label[f.key] for f in FACTORS if q.factors.get(f.key)]
        n = len(precedents)
        conv = sum(1 for p in precedents if p.convicted)
        rate = round(100 * conv / n) if n else 0
        pct = round(prob * 100)

        if lang == "en":
            consensus = (
                f"Model estimate: {pct}% probability of conviction. Of {n} similar "
                f"precedents, {conv} ({rate}%) ended in conviction."
            )
            user = (
                f"Present factors: {', '.join(present) or 'none'}. Model-estimated probability "
                f"of conviction: {pct}%. Of {n} similar precedents, {conv} ({rate}%) ended in conviction."
            )
        else:
            consensus = (
                f"Estimación del modelo: {pct}% de probabilidad de condena. De {n} precedentes "
                f"similares, {conv} ({rate}%) terminaron en condena."
            )
            user = (
                f"Factores presentes: {', '.join(present) or 'ninguno'}. Probabilidad de condena "
                f"estimada por el modelo: {pct}%. De {n} precedentes similares, {conv} ({rate}%) "
                f"terminaron en condena."
            )

        turns: list[DebateTurn] = []
        available = True
        try:
            raw = await self._llm.generate_json(_DEBATE_SYS[lang], user)
            for role in ("fiscal", "defensa", "juez"):
                val = raw.get(role)
                if isinstance(val, list):  # small models often return a list of sentences
                    text = " ".join(str(x) for x in val if x)
                elif isinstance(val, str):
                    text = val
                else:
                    text = ""
                if text.strip():
                    turns.append(DebateTurn(role=role, argument=text.strip()))
            if not turns:
                available = False
        except Exception as exc:
            log.info("debate_llm_unavailable", error=str(exc))
            available = False

        return DebateResult(
            probability=round(prob, 4),
            turns=turns,
            consensus=consensus,
            precedents=precedents,
            llm_available=available,
        )


# --- evaluation: did the model recover the true (synthetic) effects? ------
class EvaluationQuery(BaseModel):
    pass


class EvaluationHandler:
    def __init__(self, repo: CorpusRepository) -> None:
        self._repo = repo

    async def __call__(self, _: EvaluationQuery) -> dict:
        state = self._repo.load_model()
        if state is None:
            raise ValueError("Model not trained yet.")
        coef, intercept, metrics = state
        rows = []
        errors = []
        for f in FACTORS:
            true_w = GROUND_TRUTH[f.key]
            learned = coef[f.key]
            rows.append({
                "key": f.key, "label": f.label_es,
                "true_weight": round(true_w, 3), "learned_weight": round(learned, 3),
                "abs_error": round(abs(true_w - learned), 3),
            })
            errors.append(abs(true_w - learned))
        return {
            "intercept": round(intercept, 3),
            "mean_abs_error": round(sum(errors) / len(errors), 3),
            "training_metrics": metrics,
            "weights": rows,
        }
