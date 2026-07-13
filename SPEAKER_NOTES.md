# CounterLex — Notas del ponente

> Notas para la defensa, una por diapositiva y **en el mismo orden** que
> `SLIDES.md`. Cópialas en el panel de *notas del orador* de cada diapositiva en
> Gamma (no van en la lámina).

---

## 1 · CounterLex (portada)
Preséntate y da la idea en una frase: *"CounterLex estima si un caso penal
acabaría en condena a partir de sus factores jurídicos, y permite preguntar «¿y si
un hecho hubiera sido distinto?» sobre un modelo interpretable."*

## 2 · El problema
Enfatiza la tensión entre utilidad predictiva y exigencia de justificación en el
dominio jurídico. Una probabilidad sin porqué no le sirve a un jurista.

## 3 · Objetivo y pregunta de investigación
Fija el criterio de éxito: no solo "acierta", sino "recupera los efectos
verdaderos" — que es lo que da validez a los contrafactuales.

## 4 · Contribución de la tesis
Este es el corazón del TFM. La mayoría de trabajos solo miden accuracy; aquí, al
conocer la "verdad", medimos la *recuperación de efectos*, que es lo que legitima
un contrafactual.

## 5 · Enfoque metodológico
Justifica por qué logística y no una red neuronal: no es (solo) por rendimiento, es
porque el coeficiente ES la explicación y hace del `do()` una operación exacta bajo
los supuestos del modelo.

## 6 · Arquitectura del sistema
Destaca la separación de responsabilidades (las rutas solo tocan un bus; los
commands mutan estado, las queries son de solo lectura) como buena práctica de
ingeniería.

## 7 · Funcionalidades
No enumeres todo con detalle; di que el núcleo científico es el simulador + el
contraste con el fallo, y el resto son aplicaciones del mismo modelo.

## 8 · Contraste con el fallo real
Aclara el matiz ético: el sistema NO dice si el fallo es "correcto"; dice si el
patrón de factores es coherente con lo que hicieron tribunales similares.

## 9 · Resultados
El MAE bajo es la evidencia clave: el modelo no solo predice, recupera los efectos
reales → los contrafactuales son creíbles. Recuerda que son cifras de esta
instancia (semilla fija, reproducibles).

## 10 · Validación e ingeniería
Mensaje: no es un prototipo frágil; está probado end-to-end y con CI. Demuestra
madurez de ingeniería, no solo un notebook.

## 11 · Demo en vivo
Ten la app abierta en otra pestaña. Si falla la red, este guion sirve como respaldo
narrado. URL: counterlex-production-frontend.up.railway.app.

## 12 · Limitaciones
Mostrar las limitaciones con claridad suma credibilidad y suele adelantarse a las
preguntas del tribunal.

## 13 · Despliegue
Un clic en la URL basta para demostrarlo en vivo. Menciona que la extracción usa el
fallback por palabras clave en la nube (sin LLM).

## 14 · Conclusiones y trabajo futuro
Cierra volviendo a la pregunta de investigación y respóndela: *sí, y esta es la
evidencia*.

## 15 · Gracias · Preguntas
Posibles preguntas del tribunal:
- *¿Por qué sintético?* → para conocer la verdad y medir recuperación; se declara la limitación.
- *¿Por qué no deep learning?* → interpretabilidad y `do()` exacto priman sobre un margen de accuracy.
- *¿Causalidad real?* → contrafactual **bajo los supuestos del modelo**, no causalidad garantizada.
- *¿Sesgos?* → el corpus es sintético y controlado; con datos reales habría que auditar sesgos.
