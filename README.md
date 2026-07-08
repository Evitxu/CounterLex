# CounterLex — Backend

Backend (FastAPI + arquitectura limpia + CQRS) del proyecto **CounterLex**.
Esta rama contiene **solo el código del backend**, en la raíz, lista para
desplegar en Railway (Root Directory `/`).

- 📖 Documentación completa del proyecto → rama [`main`](../../tree/main)
- 🎨 Código del frontend → rama [`frontend`](../../tree/frontend)

## Ejecutar en local
```bash
python -m venv .venv
.venv/Scripts/python -m pip install -e .        # Windows
# source .venv/bin/activate && pip install -e .  # macOS/Linux
uvicorn app.main:app --reload                    # http://localhost:8000/docs
```
En el primer arranque genera el corpus sintético y entrena el modelo.

## Tests
```bash
python -m pip install -e ".[dev]"
python -m pytest        # 66 tests
```
