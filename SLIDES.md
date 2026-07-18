---

## CounterLex

**Explorador contrafactual de precedentes jurídicos**

Predicción interpretable de resultados judiciales penales y análisis contrafactual

Trabajo de Fin de Máster · EMDA · 2026

App: counterlex.up.railway.app

---

## El problema y el objetivo

- La predicción judicial suele ser una **caja negra**: da una probabilidad, no una explicación; en Derecho hay que justificar *por qué*.
- Las preguntas útiles son **contrafactuales**: *¿habría cambiado el fallo sin la prueba forense?*
- **Objetivo**: estimar el resultado, **explicarlo** factor a factor y permitir **intervenir** — `do(factor = x)`.

---

## Contribución de la tesis

- El corpus sintético se genera a partir de **pesos verdaderos conocidos**.
- Permite **medir** cuánto se acerca el modelo a esos efectos: **MAE sobre los log-odds**.
- Además, precisión, AUC y calibración (Brier) en un conjunto **hold-out**.
- Los contrafactuales quedan **anclados** en un modelo evaluado, no en una caja negra.

---

## Enfoque metodológico

- Un caso = vector de **factores jurídicos** (prueba forense, confesión, coartada, prueba nula…): **11 factores**.
- Modelo: **regresión logística** → los coeficientes *son* el efecto (log-odds) de cada factor → transparente por construcción.
- Contrafactual = intervención limpia: fijar un factor y recomputar el predictor lineal.
- **Ejemplo (log-odds):** intercepto −0,4 → 40 %; con *confesión* (β = 2,2): −0,4 + 2,2 = 1,8 → **86 %**. `do(confesión = 0)` deshace ese salto → efecto aislado.

---

## Arquitectura y funcionalidades

- **Backend** FastAPI + **CQRS**; **frontend** Next.js/React (i18n ES/EN, **modo claro/oscuro**); **SQLite**; **scikit-learn**.
- Extracción de factores LLM-agnóstica (Ollama/Groq) con **fallback por palabras clave**.
- Módulos: **simulador contrafactual**, **analizar sentencia (PDF + OCR)**, buscar jurisprudencia, comparar casos, debate multiagente, informe PDF, detective, **panel de KPIs** y ayuda.

---

## Contraste con el fallo real

- Del PDF se **detecta la parte dispositiva** ("condeno…", "absuelvo…", incluso "F A L L O"; veredictos mixtos).
- Se compara **fallo real vs estimación del modelo** y se explican los **motivos** con los factores que más pesan.
- No dice si el fallo es "correcto": dice si el patrón de factores es coherente con casos similares.

---

## Resultados (instancia desplegada)

- Corpus: **404 casos** (400 sintéticos + 4 reales), **11 factores**.
- **Recuperación de efectos — MAE ≈ 0,18** (log-odds) frente a los pesos verdaderos.
- Hold-out: **precisión ≈ 83 %**, **AUC ≈ 0,86**, **Brier ≈ 0,13**.

---

## Validación, ingeniería y despliegue

- **80 tests** backend (pytest) + **8** frontend (Vitest) + **17 E2E** en navegador (Playwright), suite **offline**; **CI** por rama.
- Sanitización (XSS), guard de admin, límites de subida, contraste del fallo — todo probado.
- **Railway**: dos servicios + **HTTPS**; **volumen** persistente; corpus **auto-generado** al arrancar.

---

## Limitaciones y trabajo futuro

- Corpus **mayoritariamente sintético** → validez externa limitada.
- Supuestos: factores como variables causales, **sin confusión no modelada**; **no es asesoramiento jurídico**.
- Futuro: corpus **real anotado**, factores continuos, control de **confusión**, calibración por tipo de delito.

---

## Gracias · Preguntas

**CounterLex** · EMDA · 2026

App: counterlex.up.railway.app

Repo: github.com/Evitxu/CounterLex
