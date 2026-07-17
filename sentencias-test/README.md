# Material de prueba — sentencias de ejemplo

PDFs reales de jurisprudencia española (documentos públicos del Tribunal Supremo)
para probar el módulo **Analizar sentencia** de CounterLex sin tener que buscar
ninguno. Súbelos en `/analyze` de la app desplegada
(<https://counterlex.up.railway.app/analyze>) o pega su texto.

| Archivo | Resultado esperado | Qué demuestra |
|---------|--------------------|----------------|
| `STS_1000_2025.pdf` | **Condena** (veredicto mixto) | Sentencia real extensa (~500 págs. de texto); el sistema localiza el fallo condenatorio pese a ser **mixto** y muy largo. |
| `STS_3067_2026.pdf` | **Condena** | Detección de condena en una sentencia penal breve. |
| `STS_3118_2026.pdf` | **Condena** | Otra sentencia penal con condena. |
| `STS_5477_2025.pdf` | **Resolución procesal** | Se localiza el fallo, pero no es condena/absolución → mensaje aclaratorio. |
| `STS_6333_2024.pdf` | **Resolución procesal** | **Conflicto de jurisdicción**: el fallo resuelve la competencia, sin condena/absolución. |

> Una **condena/absolución** activa el *contraste con el fallo* (fallo real vs.
> estimación del modelo, con los motivos). Las **resoluciones procesales**
> (conflictos de jurisdicción o competencia, etc.) muestran un mensaje que aclara
> que se encontró el fallo pero no hay culpabilidad que contrastar.

## Conseguir más sentencias
Buscador oficial del Poder Judicial (CENDOJ):
- <https://www.poderjudicial.es/search/>
- <https://www.poderjudicial.es/search/TS/> (Tribunal Supremo)

Para ver el contraste completo, elige sentencias **penales** cuyo fallo **condene o
absuelva** a una persona. Muchas resoluciones del Supremo son procesales (casación
por motivos técnicos, competencia, etc.) y mostrarán el mensaje "resolución
procesal".
