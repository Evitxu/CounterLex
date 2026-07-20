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
| 🖼️ **Slides de la presentación** | [Google Slides](https://docs.google.com/presentation/d/1rZt5vkk-vgozn9bCRd5-nzjj-kwqrUOW1ssbAOxdDio/edit?usp=sharing) |
| 🎥 **Vídeo de explicación** | [YouTube](https://youtu.be/41TUDV--R1A) |
| 🔑 **Usuario y contraseña de prueba** | **No aplica** — la aplicación es de acceso libre, no tiene login. |
| 🧪 **Material de prueba** | Sentencias de ejemplo en [`sentencias-test/`](sentencias-test/) para el módulo *Analizar sentencia* (ver §7). |

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
- **SQLite** (stdlib) para el corpus, el modelo, los mensajes de contacto y los
  contadores de uso.
- **pypdf** + **pypdfium2/pytesseract** (OCR opcional), **fpdf2** (informes).
- **LLM agnóstico**: **Ollama** local o API compatible con OpenAI (**Groq**), con
  *fallback* por palabras clave.

**Frontend** (rama `frontend`)
- **Next.js 15** (App Router) + **React 19** + **TypeScript**.
- Visualizaciones **SVG/CSS propias**, **i18n ES/EN**, **modo claro/oscuro**, subida de PDF con progreso.

**Testing / tooling**
- **pytest** + **pytest-asyncio** (backend) · **Vitest** + **Playwright** (frontend) · **ruff**.
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
│  ├─ infrastructure/ # modelo,     ├─ e2e/           # tests Playwright (E2E)
│  │                 # LLM, PDF…    ├─ package.json
│  ├─ presentation/ # rutas API     └─ .github/workflows/  # ci.yml + e2e.yml
│  └─ core/         # config, log
├─ tests/           # 80 tests
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
| 🕵️ **Detective contrafactual** (`/detective`) | Juego educativo: acusa a un sospechoso y compáralo con el veredicto del modelo. |
| 📑 **Informe PDF** (`/reports`) | Genera un informe descargable del escenario analizado. |
| ✉️ **Contacta conmigo** (`/contact`) | Formulario validado y saneado (anti-XSS); guarda en SQLite y envía email (SMTP opcional). |
| 📈 **Panel de métricas / KPIs** (`/dashboard`) | Rendimiento del modelo, datos del corpus, formulario de contacto y uso de la API. |
| ❓ **Ayuda / Guía** (`/help`) | Explica cada módulo, glosario de factores, metodología y limitaciones (ES/EN). |
| 📊 **Evaluación del modelo** | Recuperación de los pesos verdaderos (MAE) + precisión / AUC / Brier en test. |

Detalles clave: subida de PDF hasta 20 MB, OCR para escaneados, i18n ES/EN,
**modo claro/oscuro**, sanitización de entrada (defensa XSS) y despliegue con HTTPS.

## 6. Usuario y contraseña de prueba

**No aplica.** CounterLex es una herramienta de análisis de acceso libre; no tiene
sistema de login ni datos de usuario. El corpus sintético se genera de forma
reproducible en el servidor. (Los endpoints de administración pueden protegerse de
forma opcional con la cabecera `X-Admin-Key` si se configura `ADMIN_API_KEY`.)

---

## 7. Material de prueba (para evaluar el proyecto)

Para facilitar la evaluación, el repositorio incluye **sentencias de ejemplo** en
[`sentencias-test/`](sentencias-test/): súbelas en **Analizar sentencia**
(<https://counterlex.up.railway.app/analyze>) sin tener que buscar ninguna.

| Archivo | Resultado esperado |
|---------|--------------------|
| `STS_1000_2025.pdf` | Condena (veredicto mixto, sentencia extensa) |
| `STS_3067_2026.pdf` · `STS_3118_2026.pdf` | Condena |
| `STS_5477_2025.pdf` · `STS_6333_2024.pdf` | Resolución procesal (fallo sin condena/absolución) |

Detalles por archivo en [`sentencias-test/README.md`](sentencias-test/README.md).

**Conseguir más sentencias** — buscador oficial del Poder Judicial (CENDOJ):
<https://www.poderjudicial.es/search/> · Tribunal Supremo:
<https://www.poderjudicial.es/search/TS/>. Elige sentencias **penales** cuyo fallo
**condene o absuelva** para ver el *contraste con el fallo* completo; las
resoluciones procesales muestran un mensaje aclaratorio.

---

## API — endpoints principales (backend)
| Método | Ruta | Propósito |
|--------|------|-----------|
| GET  | `/health` | Health check |
| GET  | `/api/v1/factors` | Catálogo de factores |
| POST | `/api/v1/analyze` · `/api/v1/analyze/pdf` | Texto/PDF → factores + predicción + **fallo** |
| POST | `/api/v1/counterfactual` | Factores + intervenciones → nueva predicción |
| POST | `/api/v1/search` · `/api/v1/debate` · `/api/v1/report` | Precedentes · debate · informe PDF |
| GET  | `/api/v1/model/evaluation` · `/api/v1/stats` | Recuperación de pesos + métricas · KPIs del panel |
| POST | `/api/v1/contact` · GET `/api/v1/contact/messages` | Contacto (público) · listado (admin, `X-Admin-Key`) |
| POST | `/api/v1/corpus/generate` · `/api/v1/model/train` | Admin (protegibles con `ADMIN_API_KEY`) |

## Despliegue
Guía completa en [`DEPLOY_RAILWAY.md`](DEPLOY_RAILWAY.md). Dos servicios en
Railway, cada uno siguiendo su rama (`backend` / `frontend`) con **Root
Directory `/`**; Railway sirve **HTTPS** automáticamente. Sin Ollama en la nube,
la extracción usa **Groq** (o el *fallback* por palabras clave); el corpus se
**auto-genera** al arrancar. Con un **volumen** persistente, los mensajes de
contacto y los contadores de uso sobreviven a los redespliegues.

## Testing
- **Backend (80 tests, `pytest`)** — catálogo de factores, modelo (recuperación
  de signos, aditividad log-odds, métricas hold-out), **detección del fallo**
  (incluye "F A L L O" con espacios y el veredicto **mixto** real de la
  STS 1000/2025), extractor por palabras clave, sanitización, recuperación de
  precedentes, generador sintético, repositorio, buses CQRS, **guard de admin**,
  **límite de subida**, **módulo de contacto**, **KPIs** y **todas las rutas
  HTTP** de extremo a extremo.
- **Frontend (8 tests, `Vitest`)** — reconstrucción del modelo lineal en cliente,
  probabilidad, efectos por factor, comparación de casos y *waterfall*.
- **E2E (17 tests, `Playwright`)** — flujos de UI en un navegador real
  (alternativa moderna a Selenium, con auto-espera): *smoke* de todas las rutas,
  simulador contrafactual, formulario de contacto, cambio de idioma ES/EN, **modo
  claro/oscuro**, panel de KPIs y debate (con degradación elegante sin LLM). En CI
  se arranca un backend aislado para ejecutarlos.

Cada rama de código incluye su **workflow de GitHub Actions** que corre sus tests
en cada `push`/`pull request`. Toda la suite corre **offline**.

## Licencia / autoría
Proyecto académico (TFM). © 2026 — autoría de la alumna EMDA. El detalle metodológico y
las limitaciones se recogen en la memoria del trabajo.