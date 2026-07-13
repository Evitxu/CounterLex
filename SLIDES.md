# CounterLex — Guion de la presentación (TFM)

> Contenido diapositiva a diapositiva para la defensa. Cada diapositiva incluye
> **título**, **puntos** para la lámina y **notas del ponente** (lo que dices).
> Pensado para ~12–15 min. Las métricas son las de la instancia desplegada
> (dependen del tamaño de corpus y la semilla; ajústalas si reentrenas).

---

## 1 · Portada
- **CounterLex** — Explorador contrafactual de precedentes jurídicos
- Predicción interpretable de resultados judiciales penales y análisis *contrafactual*
- Trabajo de Fin de Máster · Autoría: **EMDA** · 2026
- App en vivo: `counterlex-production-frontend.up.railway.app`

**Notas del ponente:** Preséntate y da la idea en una frase: *"CounterLex estima
si un caso penal acabaría en condena a partir de sus factores jurídicos, y permite
preguntar «¿y si un hecho hubiera sido distinto?» sobre un modelo interpretable."*

---

## 2 · El problema
- La predicción de resultados judiciales suele ser una **caja negra**: da una
  probabilidad, no una explicación.
- En Derecho, la **explicabilidad** no es opcional: hay que poder justificar *por qué*.
- Las preguntas realmente útiles son **contrafactuales**: *"¿habría cambiado el
  fallo sin la prueba forense?"*

**Notas:** Enfatiza la tensión entre utilidad predictiva y exigencia de
justificación en el dominio jurídico. Una probabilidad sin porqué no sirve a un jurista.

---

## 3 · Objetivo y pregunta de investigación
- Construir un sistema que (1) **estime** el resultado, (2) lo **explique** factor
  a factor y (3) permita **intervenir** sobre los factores (`do(factor = x)`).
- Pregunta: *¿puede un modelo interpretable recuperar los efectos reales de cada
  factor y sostener afirmaciones contrafactuales con rigor medible?*

**Notas:** Aquí fijas el criterio de éxito: no solo "acierta", sino "recupera los
efectos verdaderos" — que es lo que da validez a los contrafactuales.

---

## 4 · Contribución de la tesis (lo diferencial)
- El corpus sintético se genera a partir de **pesos verdaderos conocidos**.
- Eso permite **medir cuantitativamente** cuánto se acerca el modelo a esos
  efectos → **MAE sobre los log-odds**.
- Además: precisión, AUC y calibración (Brier) en un conjunto **hold-out**.
- Las afirmaciones contrafactuales quedan **ancladas** en un modelo evaluado.

**Notas:** Este es el corazón del TFM. La mayoría de trabajos solo miden accuracy;
aquí, al conocer la "verdad", podemos medir la *recuperación de efectos*, que es lo
que legitima un contrafactual.

---

## 5 · Enfoque metodológico
- Un caso = vector de **factores jurídicos** (p. ej. prueba forense, confesión,
  coartada, prueba nula…). **11 factores**.
- Modelo: **regresión logística** → los coeficientes *son* el efecto (log-odds) de
  cada factor → transparente por construcción.
- Contrafactual = intervención limpia: fijar un factor y recomputar el predictor lineal.

**Notas:** Justifica por qué logística y no una red neuronal: no es (solo) por
rendimiento, es porque el coeficiente ES la explicación y hace del `do()` una
operación exacta bajo los supuestos del modelo.

---

## 6 · Arquitectura del sistema
- **Backend**: Python + **FastAPI**, **arquitectura limpia + CQRS**
  (domain → application (buses Command/Query) → infrastructure → presentation).
- **Frontend**: **Next.js 15 / React 19** (App Router), i18n ES/EN, visualizaciones propias.
- **Datos**: **SQLite**; **scikit-learn** para el modelo.
- **Extracción de factores**: LLM-agnóstico (Ollama / Groq) con **fallback por
  palabras clave** (100% funcional sin LLM).

**Notas:** Destaca la separación de responsabilidades (las rutas solo tocan un bus;
los commands mutan estado, las queries son de solo lectura) como buena práctica de ingeniería.

---

## 7 · Funcionalidades
- ⚖️ **Simulador contrafactual** — activa/desactiva factores y ve la probabilidad,
  contribuciones y análisis de sensibilidad.
- 📄 **Analizar sentencia** — texto o **PDF** (con **OCR**); extrae factores, estima,
  y **detecta el fallo real** para **contrastarlo** con el modelo.
- 🔎 **Buscar jurisprudencia** · 🔀 **Comparar casos** · 🗣️ **Debate multiagente**
  · 📊 **Informe PDF** · 🕵️ **Detective** (juego educativo).
- ✉️ **Contacto** · 📈 **Panel de métricas (KPIs)**.

**Notas:** No enumeres todo con detalle; di que el núcleo científico es el
simulador + el contraste con el fallo, y el resto son aplicaciones del mismo modelo.

---

## 8 · Contraste con el fallo real
- Del PDF de una sentencia se **detecta la parte dispositiva** ("condeno…",
  "absuelvo…", incluso "F A L L O" con espacios; veredictos mixtos).
- Se compara **fallo real vs estimación del modelo** y se explican los **motivos**
  de la (dis)coincidencia con los factores que más pesan.

**Notas:** Aclara el matiz ético: el sistema NO dice si el fallo es "correcto";
dice si el patrón de factores es coherente con lo que hicieron tribunales similares.

---

## 9 · Resultados (instancia desplegada)
- Corpus: **404 casos** (400 sintéticos + 4 reales sembrados), **11 factores**.
- **Recuperación de efectos — MAE ≈ 0,18** (log-odds) frente a los pesos verdaderos.
- Hold-out: **precisión ≈ 83%**, **AUC ≈ 0,86**, **Brier ≈ 0,13**.

**Notas:** Explica que el MAE bajo es la evidencia clave: el modelo no solo predice,
recupera los efectos reales → los contrafactuales son creíbles. Recuerda que son
cifras de esta instancia (semilla fija, reproducibles).

---

## 10 · Validación e ingeniería
- **80 tests** de backend (pytest) + **8** de frontend (vitest); suite **offline**.
- Cubre: modelo (recuperación de signos, aditividad log-odds, métricas), detección
  del fallo, sanitización (XSS), rutas HTTP, guard de admin, límites de subida, KPIs.
- **CI** por rama (GitHub Actions) en cada push/PR.

**Notas:** Mensaje: no es un prototipo frágil; está probado end-to-end y con CI.
Esto demuestra madurez de ingeniería, no solo un notebook.

---

## 11 · Demo en vivo (guion breve)
1. **Simulador**: activo "prueba forense" y "confesión" → sube la probabilidad;
   quito la forense → cae (contrafactual).
2. **Analizar sentencia**: subo un PDF → factores + estimación + **contraste con el fallo**.
3. **Panel de métricas**: enseño MAE, precisión, AUC y el uso.

**Notas:** Ten la app abierta en otra pestaña. Si falla la red, este guion sirve
como respaldo narrado. URL: `counterlex-production-frontend.up.railway.app`.

---

## 12 · Limitaciones (declaradas con honestidad)
- Corpus **mayoritariamente sintético** → validez externa limitada.
- Supuestos del modelo: factores como variables causales, **sin confusión no modelada**.
- **No es asesoramiento jurídico**; es una herramienta analítica con fines académicos.

**Notas:** Mostrar las limitaciones con claridad suma credibilidad y suele
adelantarse a las preguntas del tribunal.

---

## 13 · Despliegue
- **Railway**: dos servicios (frontend / backend) desde una única repo (una rama
  por componente), **HTTPS** gestionado en el edge.
- **Persistencia** con volumen (mensajes de contacto + contadores de uso).
- El corpus se **auto-genera y entrena** al arrancar (bootstrap reproducible).

**Notas:** Un clic en la URL basta para demostrarlo en vivo. Menciona que la
extracción usa el fallback por palabras clave en la nube (sin LLM).

---

## 14 · Conclusiones y trabajo futuro
- Un modelo **interpretable** puede sostener **contrafactuales medibles**: lo
  probamos recuperando los efectos verdaderos (MAE).
- Futuro: corpus **real anotado**, factores continuos, control de **confusión**,
  calibración por tipo de delito.

**Notas:** Cierra volviendo a la pregunta de investigación y respóndela: *sí, y
esta es la evidencia*.

---

## 15 · Gracias · Preguntas
- **CounterLex** · EMDA · 2026
- App: `counterlex-production-frontend.up.railway.app` · Repo: `github.com/Evitxu/CounterLex`

**Notas — posibles preguntas del tribunal:**
- *¿Por qué sintético?* → para conocer la verdad y medir recuperación; se declara la limitación.
- *¿Por qué no deep learning?* → interpretabilidad y `do()` exacto priman sobre un margen de accuracy.
- *¿Causalidad real?* → contrafactual **bajo los supuestos del modelo**, no causalidad garantizada.
- *¿Sesgos?* → el corpus es sintético y controlado; con datos reales habría que auditar sesgos.
