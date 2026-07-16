# CounterLex — Counterfactual Legal Precedent Explorer

> Trabajo de Fin de Máster (TFM). A full-stack legal-AI system that estimates the
> outcome of a Spanish criminal case from its **legal factors**, lets you ask
> **counterfactual** questions — *"what if the weapon had not been found?"* — and
> contrasts the estimate against the **real verdict (fallo)** extracted from an
> uploaded judgment PDF.

## 🗂️ Estructura del repositorio (ramas)

Este repositorio usa **una rama por componente**. El código **no** está en `main`:

| Rama | Contenido |
|------|-----------|
| [`main`](../../tree/main) | **Documentación** (este README + guía de despliegue). Sin código. |
| [`backend`](../../tree/backend) | **Código del backend** (FastAPI + CQRS) en la raíz de la rama. |
| [`frontend`](../../tree/frontend) | **Código del frontend** (Next.js 15 + React 19) en la raíz de la rama. |

**Obtener el código** — clona la rama que necesites:
```bash
git clone -b backend  https://github.com/Evitxu/CounterLex.git CounterLex-backend
git clone -b frontend https://github.com/Evitxu/CounterLex.git CounterLex-frontend
```
o, desde un único clon, usa *worktrees* para tener las dos a la vez:
```bash
git clone https://github.com/Evitxu/CounterLex.git CounterLex && cd CounterLex
git worktree add ../CounterLex-backend  backend
git worktree add ../CounterLex-frontend frontend
```
Cada rama de código trae su propio `README.md` con instrucciones y su propio
workflow de **CI** (GitHub Actions) que ejecuta sus tests en cada push.

## 🔗 Enlaces del proyecto (deliverables)

| Recurso | Enlace |
|---------|--------|
| 🌐 **Despliegue (app en funcionamiento)** | **App:** <https://counterlex.up.railway.app> · **API + docs:** <https://counterlex-api.up.railway.app/docs> |
| 💻 **Repositorio GitHub** | <https://github.com/Evitxu/CounterLex> |
| 🖼️ **Slides de la presentación** | Contenido: [`SLIDES.md`](SLIDES.md) + notas: [`SPEAKER_NOTES.md`](SPEAKER_NOTES.md) · _deck final: pendiente_ |
| 🎥 **Vídeo de explicación** | Guion y storyboard: [`VIDEO_SCRIPT.md`](VIDEO_SCRIPT.md) · _vídeo final: pendiente_ |
| 🔑 **Usuario y contraseña de prueba** | **No aplica** — la aplicación es de acceso libre, no tiene login. |

---

## 1. Descripción general del proyecto

CounterLex es un explorador de **razonamiento contrafactual** aplicado a la
predicción de resultados judiciales penales. En lugar de una "caja negra" que
devuelve una probabilidad, el sistema:

1. **Extrae factores jurídicos** de un caso (texto libre o PDF de sentencia) —
   p. ej. *prueba forense*, *confesión*, *coartada*, *prueba nula*.
2. **Estima la probabilidad de condena** con un modelo **interpretable** cuyos
   coeficientes *son* el efecto (log-odds) de cada factor.
3. Permite **intervenir** sobre los factores (`do(factor = x)`) y ver cómo cambia
   la probabilidad y qué precedentes impulsan el cambio — un contrafactual real
   bajo los supuestos del modelo.
4. Al analizar una sentencia real, **detecta el fallo** en el texto y lo
   **contrasta** con la estimación del modelo, explicando *por qué* coinciden o
   difieren.

**Contribución de la tesis:** el corpus sintético se genera a partir de **pesos
verdaderos conocidos**, lo que permite **medir cuantitativamente** cuán bien el
modelo recupera esos efectos (error absoluto medio sobre los log-odds), además de
la precisión y calibración en un conjunto de test (hold-out). Así, las
afirmaciones contrafactuales quedan ancladas en un modelo interpretable y
evaluado con rigor, con las limitaciones (datos sintéticos, ausencia de
confusión no modelada) declaradas abiertamente.

## 2. Stack tecnológico

**Backend** (rama `backend`)
- **Python 3.12**, **FastAPI** + **Uvicorn** — API REST (`/api/v1`).
- **Arquitectura limpia + CQRS**: `domain` (puro) → `application` (buses de
  Command/Query) → `infrastructure` (I/O) → `presentation` (rutas).
- **scikit-learn** (regresión logística) con *fallback* a numpy.
- **SQLite** (stdlib) para el corpus y el estado del modelo.
- **pypdf** + **pypdfium2/pytesseract** (OCR opcional), **fpdf2** (informes).
- **LLM agnóstico**: **Ollama** local o API compatible con OpenAI (**Groq**), con
  *fallback* por palabras clave.

**Frontend** (rama `frontend`)
- **Next.js 15** (App Router) + **React 19** + **TypeScript**.
- Visualizaciones **SVG/CSS propias**, **i18n ES/EN**, subida de PDF con progreso.

**Testing / tooling**
- **pytest** + **pytest-asyncio** (backend) · **Vitest** (frontend) · **ruff**.
- **CI**: GitHub Actions por rama (ver §Testing).

**Despliegue:** **Railway** (dos servicios; HTTPS gestionado en el edge).

## 3. Instalación y ejecución

Requisitos: Python ≥ 3.11 (3.12 recomendado) y Node.js ≥ 20.

### Backend (rama `backend`)
```bash
git clone -b backend https://github.com/Evitxu/CounterLex.git CounterLex-backend
cd CounterLex-backend
python -m venv .venv
.venv/Scripts/python -m pip install -e .          # Windows
# source .venv/bin/activate && pip install -e .    # macOS/Linux
uvicorn app.main:app --reload
```
En el primer arranque **genera el corpus y entrena el modelo** automáticamente.
API en <http://localhost:8000>, documentación en <http://localhost:8000/docs>.

### Frontend (rama `frontend`)
```bash
git clone -b frontend https://github.com/Evitxu/CounterLex.git CounterLex-frontend
cd CounterLex-frontend
npm install
# echo NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1 > .env.local
npm run dev            # http://localhost:3000
```

### LLM opcional (mejor extracción de factores)
Instala [Ollama](https://ollama.com) y `ollama pull llama3.2`. Sin él, la
extracción usa un heurístico de palabras clave en español (100% funcional). Para
la nube, usa Groq: `LLM_PROVIDER=openai`, `LLM_API_KEY=<tu clave>`.

## 4. Estructura del proyecto

> 📐 **Arquitectura y flujos** (Mermaid): [`ARCHITECTURE.md`](ARCHITECTURE.md)
> — sistema, CQRS del backend, pipeline de análisis, mecanismo contrafactual y
> topología de despliegue.

Cada componente vive en su rama, con el código en la raíz:

```
backend  (rama)                    frontend  (rama)
├─ app/                            ├─ app/            # páginas (App Router)
│  ├─ domain/       # factores     ├─ components/     # gauge, barras, waterfall…
│  ├─ application/  # CQRS          ├─ lib/            # api, model (+ tests), i18n
│  ├─ infrastructure/ # modelo,     ├─ package.json
│  │                 # LLM, PDF…    └─ .github/workflows/ci.yml
│  ├─ presentation/ # rutas API
│  └─ core/         # config, log
├─ tests/           # 66 tests
├─ pyproject.toml
└─ .github/workflows/ci.yml
```
**Regla de dependencias (backend):** las rutas solo tocan un *bus*; los *commands*
mutan estado (generar corpus, entrenar) y las *queries* son de solo lectura.

## 5. Funcionalidades principales

| Módulo | Qué hace |
|--------|----------|
| ⚖️ **Simulador contrafactual** (`/`) | Activa/desactiva factores y observa la probabilidad, las barras de contribución y el *waterfall* de sensibilidad. |
| 📄 **Analizar sentencia** (`/analyze`) | Texto libre **o PDF** → factores + estimación + precedentes. Detecta el **fallo** real y lo **contrasta** con el modelo, con los **motivos** de la (dis)coincidencia. |
| 🔎 **Buscar jurisprudencia** (`/search`) | Recupera los precedentes más similares por solapamiento de factores, explicando *por qué* coincide cada uno. |
| 🔀 **Comparar casos** (`/compare`) | Descompone la diferencia de log-odds entre dos casos, factor a factor. |
| 🗣️ **Debate multi-agente** (`/debate`) | Fiscal / defensa / juez argumentan (LLM), con consenso estadístico de respaldo. |
| 📊 **Informe PDF** (`/reports`) | Genera un informe descargable del escenario analizado. |
| 📈 **Evaluación del modelo** | Recuperación de los pesos verdaderos (MAE) + precisión / AUC / Brier en test. |

Detalles clave: subida de PDF hasta 20 MB, OCR para escaneados, i18n ES/EN,
sanitización de entrada (defensa XSS) y despliegue con HTTPS.

## 6. Usuario y contraseña de prueba

**No aplica.** CounterLex es una herramienta de análisis de acceso libre; no tiene
sistema de login ni datos de usuario. El corpus sintético se genera de forma
reproducible en el servidor.

---

## API — endpoints principales (backend)
| Método | Ruta | Propósito |
|--------|------|-----------|
| GET  | `/health` | Health check |
| GET  | `/api/v1/factors` | Catálogo de factores |
| POST | `/api/v1/analyze` · `/api/v1/analyze/pdf` | Texto/PDF → factores + predicción + **fallo** |
| POST | `/api/v1/counterfactual` | Factores + intervenciones → nueva predicción |
| POST | `/api/v1/search` · `/api/v1/debate` · `/api/v1/report` | Precedentes · debate · informe PDF |
| GET  | `/api/v1/model/evaluation` | Recuperación de pesos + métricas |
| POST | `/api/v1/corpus/generate` · `/api/v1/model/train` | Admin (protegibles con `ADMIN_API_KEY`) |

## Despliegue
Guía completa en [`DEPLOY_RAILWAY.md`](DEPLOY_RAILWAY.md). Dos servicios en
Railway, cada uno siguiendo su rama (`backend` / `frontend`) con **Root
Directory `/`**; Railway sirve **HTTPS** automáticamente. Sin Ollama en la nube,
la extracción usa el *fallback* por palabras clave; el corpus se **auto-genera**
al arrancar.

## Testing
- **Backend (66 tests, `pytest`)** — catálogo de factores, modelo (recuperación
  de signos, aditividad log-odds, métricas hold-out), **detección del fallo**
  (incluye "F A L L O" con espacios y el veredicto **mixto** real de la
  STS 1000/2025), extractor por palabras clave, sanitización, recuperación de
  precedentes, generador sintético, repositorio, buses CQRS, **guard de admin**,
  **límite de subida** y **todas las rutas HTTP** de extremo a extremo.
- **Frontend (8 tests, `Vitest`)** — reconstrucción del modelo lineal en cliente,
  probabilidad, efectos por factor, comparación de casos y *waterfall*.

Cada rama de código incluye su **workflow de GitHub Actions** que corre sus tests
en cada `push`/`pull request`. Toda la suite corre **offline**.

## Licencia / autoría
Proyecto académico (TFM). © 2026 — autoría de la alumna EMDA. El detalle metodológico y
las limitaciones se recogen en la memoria del trabajo.
