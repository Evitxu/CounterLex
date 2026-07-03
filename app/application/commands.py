"""Command side (writes): build the synthetic corpus and train the model."""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.domain.entities import Case
from app.infrastructure.outcome_model import OutcomeModel
from app.infrastructure.repository import CorpusRepository
from app.infrastructure.synthetic import generate_corpus

# A few hand-authored "real" seed cases (Spanish). They give the corpus some
# genuine text and let the demo show real→factor extraction alongside synthetic.
REAL_SEED: list[Case] = [
    Case(
        text=(
            "El acusado fue identificado por un testigo presencial y se halló el arma "
            "del delito con sus huellas. Empleó violencia sobre la víctima."
        ),
        factors={"forensic_evidence": True, "eyewitness": True, "weapon_present": True, "violence_used": True},
        convicted=True, is_real=True, reference="DEMO-REAL-1",
    ),
    Case(
        text=(
            "La principal prueba de cargo fue declarada nula por haberse obtenido sin "
            "autorización judicial. El acusado presentó además una coartada verificable."
        ),
        factors={"evidence_inadmissible": True, "alibi": True},
        convicted=False, is_real=True, reference="DEMO-REAL-2",
    ),
    Case(
        text=(
            "El acusado confesó los hechos y presentaba antecedentes penales. "
            "Existió premeditación."
        ),
        factors={"confession": True, "prior_convictions": True, "premeditation": True},
        convicted=True, is_real=True, reference="DEMO-REAL-3",
    ),
    Case(
        text=(
            "El único testigo mostró contradicciones graves y su credibilidad quedó "
            "cuestionada. El acusado alegó legítima defensa."
        ),
        factors={"witness_unreliable": True, "self_defense": True},
        convicted=False, is_real=True, reference="DEMO-REAL-4",
    ),
]


class GenerateCorpusCommand(BaseModel):
    size: int = Field(default=0, ge=0, le=10000)  # 0 → use config default
    seed: int | None = None
    reset: bool = True


class GenerateCorpusResult(BaseModel):
    total: int
    synthetic: int
    real: int


class TrainModelCommand(BaseModel):
    pass


class TrainModelResult(BaseModel):
    coef: dict[str, float]
    intercept: float
    metrics: dict


class GenerateCorpusHandler:
    def __init__(self, repo: CorpusRepository) -> None:
        self._repo = repo

    async def __call__(self, cmd: GenerateCorpusCommand) -> GenerateCorpusResult:
        s = get_settings()
        size = cmd.size or s.default_corpus_size
        seed = s.synthetic_seed if cmd.seed is None else cmd.seed
        if cmd.reset:
            self._repo.clear()
        synthetic = generate_corpus(size, seed)
        self._repo.add_cases(synthetic)
        self._repo.add_cases(REAL_SEED)
        return GenerateCorpusResult(
            total=self._repo.count(), synthetic=len(synthetic), real=len(REAL_SEED)
        )


class TrainModelHandler:
    def __init__(self, repo: CorpusRepository) -> None:
        self._repo = repo

    async def __call__(self, cmd: TrainModelCommand) -> TrainModelResult:
        cases = self._repo.all_cases()
        if not cases:
            raise ValueError("Corpus is empty — generate it before training.")
        model, metrics = OutcomeModel.train(cases, seed=get_settings().synthetic_seed)
        self._repo.save_model(
            model.coef, model.intercept, metrics, datetime.now(timezone.utc).isoformat()
        )
        return TrainModelResult(coef=model.coef, intercept=model.intercept, metrics=metrics)
