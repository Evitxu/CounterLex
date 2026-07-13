---

## CounterLex

**Explorador contrafactual de precedentes jurídicos**

Predicción interpretable de resultados judiciales penales y análisis contrafactual

Trabajo de Fin de Máster · EMDA · 2026

App: counterlex-production-frontend.up.railway.app

---

## El problema

- La predicción de resultados judiciales suele ser una **caja negra**: da una probabilidad, no una explicación.
- En Derecho, la **explicabilidad** no es opcional: hay que poder justificar *por qué*.
- Las preguntas realmente útiles son **contrafactuales**: *¿habría cambiado el fallo sin la prueba forense?*

---

## Objetivo y pregunta de investigación

- Un sistema que **estime** el resultado, lo **explique** factor a factor y permita **intervenir** sobre los factores: `do(factor = x)`.
- Pregunta: *¿puede un modelo interpretable recuperar los efectos reales de cada factor y sostener afirmaciones contrafactuales con rigor medible?*

---

## Contribución de la tesis

- El corpus sintético se genera a partir de **pesos verdaderos conocidos**.
- Permite **medir cuantitativamente** cuánto se acerca el modelo a esos efectos: **MAE sobre los log-odds**.
- Además: precisión, AUC y calibración (Brier) en un conjunto **hold-out**.
- Las afirmaciones contrafactuales quedan **ancladas** en un modelo evaluado.

---

## Enfoque metodológico

- Un caso = vector de **factores jurídicos** (prueba forense, confesión, coartada, prueba nula…). **11 factores**.
- Modelo: **regresión logística** → los coeficientes *son* el efecto (log-odds) de cada factor → transparente por construcción.
- Contrafactual = intervención limpia: fijar un factor y recomputar el predictor lineal.

---

## Arquitectura del sistema

- **Backend**: Python + FastAPI, arquitectura limpia + **CQRS** (domain → application → infrastructure → presentation).
- **Frontend**: Next.js 15 / React 19, i18n ES/EN, visualizaciones propias.
- **Datos**: SQLite · **Modelo**: scikit-learn.
- **Extracción de factores**: LLM-agnóstico (Ollama / Groq) con **fallback por palabras clave**.

---

## Funcionalidades

- ⚖️ **Simulador contrafactual**: activa factores y observa probabilidad, contribuciones y sensibilidad.
- 📄 **Analizar sentencia**: texto o **PDF (con OCR)** → factores + estimación + **contraste con el fallo real**.
- 🔎 Buscar jurisprudencia · 🔀 Comparar casos · 🗣️ Debate multiagente · 📊 Informe PDF · 🕵️ Detective.
- ✉️ Contacto · 📈 Panel de métricas (KPIs).

---

## Contraste con el fallo real

- Del PDF se **detecta la parte dispositiva** ("condeno…", "absuelvo…", incluso "F A L L O" con espacios; veredictos mixtos).
- Se compara **fallo real vs estimación del modelo** y se explican los **motivos** con los factores que más pesan.
- No dice si el fallo es "correcto"; dice si el patrón de factores es coherente con casos similares.

---

## Resultados (instancia desplegada)

- Corpus: **404 casos** (400 sintéticos + 4 reales), **11 factores**.
- **Recuperación de efectos — MAE ≈ 0,18** (log-odds) frente a los pesos verdaderos.
- Hold-out: **precisión ≈ 83 %**, **AUC ≈ 0,86**, **Brier ≈ 0,13**.

---

## Validación e ingeniería

- **80 tests** de backend (pytest) + **8** de frontend (vitest); suite **offline**.
- Cubre modelo, detección del fallo, sanitización (XSS), rutas HTTP, guard de admin, límites de subida y KPIs.
- **Integración continua** por rama (GitHub Actions) en cada push/PR.

---

## Demo en vivo

- **Simulador**: activo prueba forense + confesión → sube la probabilidad; quito la forense → cae (contrafactual).
- **Analizar sentencia**: subo un PDF → factores + estimación + contraste con el fallo.
- **Panel de métricas**: MAE, precisión, AUC y uso.

---

## Limitaciones

- Corpus **mayoritariamente sintético** → validez externa limitada.
- Supuestos del modelo: factores como variables causales, **sin confusión no modelada**.
- **No es asesoramiento jurídico**; herramienta analítica con fines académicos.

---

## Despliegue

- **Railway**: dos servicios (frontend / backend) desde una repo (una rama por componente), **HTTPS** en el edge.
- **Persistencia** con volumen (mensajes de contacto + contadores de uso).
- El corpus se **auto-genera y entrena** al arrancar (bootstrap reproducible).

---

## Conclusiones y trabajo futuro

- Un modelo **interpretable** puede sostener **contrafactuales medibles**: lo probamos recuperando los efectos verdaderos (MAE).
- Futuro: corpus **real anotado**, factores continuos, control de **confusión**, calibración por tipo de delito.

---

## Gracias · Preguntas

**CounterLex** · EMDA · 2026

App: counterlex-production-frontend.up.railway.app

Repo: github.com/Evitxu/CounterLex
