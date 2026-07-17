# CounterLex — Guion y storyboard del vídeo de explicación

> Vídeo de ~6 minutos. Formato por bloques: **[PANTALLA]** = qué se ve/graba,
> **🎙️ NARRACIÓN** = lo que dices. Graba la pantalla con la app abierta en
> `https://counterlex.up.railway.app` (idioma ES).
> Tiempos orientativos; ajústalos a tu ritmo.

---

## 0:00–0:30 · Introducción
**[PANTALLA]** Portada o página de inicio de la app (el simulador contrafactual).

🎙️ *"Hola, soy [nombre]. Esto es CounterLex, mi Trabajo de Fin de Máster: un
explorador contrafactual de precedentes jurídicos. Estima si un caso penal
acabaría en condena a partir de sus factores, lo explica factor a factor, y
permite preguntar: ¿y si un hecho hubiera sido distinto?"*

---

## 0:30–1:15 · El problema y la idea
**[PANTALLA]** Sigue en el simulador; señala con el cursor la probabilidad y las
barras de contribución.

🎙️ *"La predicción judicial suele ser una caja negra: te da una probabilidad,
pero no el porqué. En Derecho eso no basta: hay que justificar la decisión. Por
eso CounterLex usa un modelo interpretable —una regresión logística— donde el peso
de cada factor ES su efecto. Así la explicación no es un añadido: es el propio modelo."*

---

## 1:15–2:30 · Demo 1 — Simulador contrafactual
**[PANTALLA]**
1. Activa **"Prueba forense"** y **"Confesión"** → muestra cómo sube la probabilidad.
2. Señala las **barras de contribución** (qué empuja a condena / absolución).
3. Desactiva **"Prueba forense"** → muestra cómo **baja** la probabilidad.

🎙️ *"Activo dos factores incriminatorios, prueba forense y confesión, y la
probabilidad de condena sube. Cada barra muestra cuánto pesa cada factor. Ahora la
pregunta contrafactual: ¿y si no hubiera prueba forense? La quito… y la
probabilidad cae. Esto es una intervención real sobre el modelo, no una correlación
cualquiera: veo el efecto aislado de ese factor."*

---

## 2:30–3:45 · Demo 2 — Analizar una sentencia (PDF) y contraste con el fallo
**[PANTALLA]**
1. Ve a **Analizar sentencia**; sube un **PDF** (o pega texto).
2. Muestra los **factores detectados** y la **estimación**.
3. Destaca el bloque **"Contraste con el fallo"**: fallo real vs estimación + motivos.

🎙️ *"Aquí subo una sentencia en PDF. El sistema extrae los factores jurídicos del
texto —con OCR si está escaneada—, estima la probabilidad, y detecta el fallo real
del documento. Entonces contrasta: ¿coincide la estimación del modelo con lo que
decidió el tribunal? Y explica por qué, con los factores que más pesan. Importante:
no juzga si el fallo es correcto; solo si el patrón de factores es coherente con
casos similares."*

---

## 3:45–4:30 · Demo 3 — Panel de métricas (la contribución de la tesis)
**[PANTALLA]** Ve a **Panel de métricas**; muestra las tarjetas: precisión, AUC,
Brier, **MAE**, tamaño del corpus, uso.

🎙️ *"Y aquí está la aportación central de la tesis. Como el corpus se genera a
partir de pesos verdaderos conocidos, puedo medir cuánto se acerca el modelo a esos
efectos reales: el MAE, de unos 0,18 en log-odds. Además, en datos no vistos, una
precisión en torno al 83% y un AUC de 0,86. Es decir: el modelo no solo predice,
recupera los efectos verdaderos, y eso es lo que hace creíbles los contrafactuales."*

---

## 4:30–5:15 · Arquitectura e ingeniería (breve)
**[PANTALLA]** Opcional: el repo en GitHub, o el `/docs` (Swagger) del backend.
Toca el **interruptor de tema (🌙/☀️)** de la cabecera para enseñar el **modo oscuro**.

🎙️ *"Por dentro: backend en FastAPI con arquitectura limpia y CQRS, frontend en
Next.js y React, y scikit-learn para el modelo. La interfaz es bilingüe —español e
inglés— y tiene modo claro y oscuro. Está probado con más de 80 tests automáticos,
además de pruebas de extremo a extremo en el navegador con Playwright, e
integración continua; y está desplegado en Railway sobre HTTPS. La extracción de
factores funciona incluso sin un modelo de lenguaje, con un heurístico por
palabras clave."*

---

## 5:15–6:00 · Limitaciones y cierre
**[PANTALLA]** Vuelve a la página de inicio o a la portada.

🎙️ *"Con honestidad sobre las limitaciones: el corpus es mayoritariamente
sintético, el modelo asume que no hay confusión no modelada, y esto no es
asesoramiento jurídico, sino una herramienta analítica académica. En resumen,
CounterLex demuestra que un modelo interpretable puede sostener afirmaciones
contrafactuales medibles y explicables. Gracias por ver el vídeo; la aplicación
está disponible en línea y el código, en GitHub."*

---

## Consejos de grabación
- **Ensaya una pasada** sin grabar para cronometrar y evitar cargas lentas en directo.
- Graba a **1080p**, ventana del navegador limpia (sin pestañas de más), zoom del
  navegador al 100–110% para que se lea bien.
- Si el primer análisis tarda (arranque en frío de Railway), **haz una petición
  antes** de grabar para "calentar" el servicio.
- Ten un **PDF de sentencia de ejemplo** preparado en el escritorio.
- Sube el vídeo a YouTube/Drive y pega el enlace en la tabla de deliverables del `README.md`.
