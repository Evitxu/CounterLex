# CounterLex — Notas del ponente (10 diapositivas)

> Una nota por diapositiva, en el **mismo orden** que `SLIDES.md` (adaptado al
> límite de 10 tarjetas del plan gratuito de Gamma). Cópialas en el panel de
> *notas del orador* de cada diapositiva (no van en la lámina).
>
> Gamma (plan gratuito) **no importa las notas automáticamente** al pegar el
> texto: hay que añadirlas a mano en el panel de notas de cada diapositiva. Con
> 10 diapositivas es rápido.

---

## 1 · CounterLex (portada)
Preséntate y da la idea en una frase: *"CounterLex estima si un caso penal
acabaría en condena a partir de sus factores jurídicos, y permite preguntar «¿y si
un hecho hubiera sido distinto?» sobre un modelo interpretable."*

## 2 · El problema y el objetivo
Enfatiza la tensión entre utilidad predictiva y exigencia de justificación en
Derecho: una probabilidad sin porqué no le sirve a un jurista. Fija el criterio de
éxito: no solo "acierta", sino que permite intervenir y explicar.

## 3 · Contribución de la tesis
Este es el corazón del TFM. La mayoría de trabajos solo miden accuracy; aquí, al
conocer la "verdad" (los pesos con los que se generó el corpus), medimos la
*recuperación de efectos*, que es lo que legitima un contrafactual.

## 4 · Enfoque metodológico
Justifica por qué logística y no una red neuronal: no es (solo) por rendimiento,
es porque **el coeficiente ES la explicación** y hace del `do()` una operación
exacta bajo los supuestos del modelo.

- **Log-odds** = la escala en la que los efectos se suman de forma constante:
  `log-odds = β₀ + Σ βᵢ·xᵢ`; luego la función logística lo convierte en
  probabilidad. Cada coeficiente = cuánto suma (o resta) ese factor.
- **Ejemplo numérico** (pesos reales del corpus): intercepto β₀ = −0,4 →
  σ(−0,4) ≈ **40 %**. Añado *confesión* (β = 2,2): −0,4 + 2,2 = 1,8 →
  σ(1,8) ≈ **86 %**. La confesión «suma 2,2 al log-odds» = pasar del 40 % al 86 %.
- **`do(factor = x)`** (operador *do* de Pearl) = **intervenir**: fijar el factor y
  recomputar, no solo observar. `do(confesión = 0)` deshace ese salto y muestra el
  efecto **aislado** → eso es el contrafactual.
- Si preguntan por causalidad: es un contrafactual **bajo los supuestos del
  modelo** (factores = variables relevantes, sin confusión no modelada), no una
  garantía causal del mundo real.

## 5 · Arquitectura y funcionalidades
Destaca la separación de responsabilidades (rutas → un bus; commands mutan estado,
queries de solo lectura). Del catálogo de módulos, el núcleo científico es el
**simulador** y el **contraste con el fallo**; el resto son aplicaciones del mismo modelo.
La interfaz es **bilingüe (ES/EN)** y tiene **modo claro/oscuro** (interruptor en la
cabecera) — buen detalle para enseñar en vivo. Apóyate en el **diagrama de
arquitectura** (ver `ARCHITECTURE.md`, diagramas 1 y 2): expórtalo a imagen en
mermaid.live e insértalo en esta diapositiva en Gamma.

## 6 · Contraste con el fallo real
Aclara el matiz ético: el sistema NO dice si el fallo es "correcto"; dice si el
patrón de factores es coherente con lo que hicieron tribunales similares.

## 7 · Resultados
El MAE bajo es la evidencia clave: el modelo no solo predice, recupera los efectos
reales → los contrafactuales son creíbles. Son cifras de esta instancia (semilla
fija, reproducibles).

## 8 · Validación, ingeniería y despliegue
No es un prototipo frágil: **80 tests** de backend (pytest) + **8** de frontend
(Vitest) + **17 pruebas E2E** en navegador con **Playwright** (alternativa moderna
a Selenium), con **CI** por rama, y desplegado en vivo sobre HTTPS con persistencia
(volumen). En la nube usa **Groq** como LLM, así que la
extracción con IA y el **debate multiagente** funcionan (con fallback por palabras
clave si el LLM no estuviera disponible).
Demo en vivo: **https://counterlex.up.railway.app** · API/docs:
**https://counterlex-api.up.railway.app/docs**

## 9 · Limitaciones y trabajo futuro
Mostrar las limitaciones con claridad suma credibilidad y adelanta preguntas del
tribunal. Cierra apuntando al futuro: datos reales anotados y control de confusión.

## 10 · Gracias · Preguntas
Posibles preguntas del tribunal:
- *¿Por qué sintético?* → para conocer la verdad y medir recuperación; se declara la limitación.
- *¿Por qué no deep learning?* → interpretabilidad y `do()` exacto priman sobre un margen de accuracy.
- *¿Causalidad real?* → contrafactual **bajo los supuestos del modelo**, no causalidad garantizada.
- *¿Sesgos?* → corpus sintético y controlado; con datos reales habría que auditar sesgos.
