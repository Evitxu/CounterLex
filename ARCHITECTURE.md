# CounterLex — Arquitectura y flujos

Diagramas (Mermaid) del sistema. Se renderizan automáticamente en GitHub y
pueden exportarse a PNG/SVG para la memoria o las diapositivas.

---

## 1. Arquitectura del sistema

Frontend y backend desacoplados; el backend usa un modelo interpretable en
proceso, SQLite en un volumen persistente y un LLM externo (Groq) con *fallback*
por palabras clave.

```mermaid
flowchart LR
    U(["Usuario · navegador"]) -->|HTTPS| FE["Frontend<br/>Next.js 15 · React 19"]
    FE -->|"REST · /api/v1 · JSON"| BE["Backend<br/>FastAPI · CQRS"]
    BE --> MODEL["Modelo interpretable<br/>regresión logística · scikit-learn"]
    BE --> EXT["Extractor de factores"]
    EXT -->|preferente| GROQ["Groq · LLM ☁️"]
    EXT -->|fallback| KW["Palabras clave"]
    BE --> DB[("SQLite en volumen<br/>corpus · modelo<br/>contactos · uso")]
    subgraph RW ["Railway — HTTPS gestionado en el edge"]
      FE
      BE
      MODEL
      EXT
      KW
      DB
    end
```

---

## 2. Backend — Clean Architecture + CQRS

Regla de dependencias: las **rutas** solo tocan un *bus*; los **comandos** mutan
estado y las **consultas** son de solo lectura. La infraestructura es la única
capa que hace I/O.

```mermaid
flowchart TB
    R["Ruta HTTP<br/>presentation/api.py"] --> DEC{"¿muta estado?"}
    DEC -->|"sí · comando"| CB["CommandBus"]
    DEC -->|"no · consulta"| QB["QueryBus"]
    CB --> CH["Command handlers<br/>generar corpus · entrenar · enviar contacto"]
    QB --> QH["Query handlers<br/>analizar · contrafactual · buscar<br/>debate · evaluación · stats"]
    CH --> INFRA["Infrastructure (I/O)<br/>repositorios · modelo · LLM · PDF/OCR"]
    QH --> INFRA
    INFRA --> DB[("SQLite")]
    INFRA -.-> GROQ["Groq · LLM ☁️"]
```

---

## 3. Pipeline de «Analizar sentencia»

Texto libre o PDF (con OCR para escaneados) → factores → predicción, y en
paralelo se detecta el **fallo** real para contrastarlo con la estimación.

```mermaid
flowchart TB
    A["Entrada: texto libre o PDF"] --> B{"¿es PDF?"}
    B -->|sí| C["Extraer texto · pypdf"]
    C --> D{"¿poco texto?<br/>(escaneado)"}
    D -->|sí| E["OCR · Tesseract"]
    D -->|no| F["Sanitizar · anti-XSS"]
    E --> F
    B -->|no| F
    F --> G["Extraer factores<br/>LLM (Groq) o palabras clave"]
    G --> H["Predicción del modelo<br/>probabilidad + contribuciones"]
    F --> I["Detectar el fallo<br/>parte dispositiva"]
    H --> J["CaseAnalysis"]
    I --> J
    J --> K["Contraste:<br/>fallo real vs estimación + motivos"]
```

---

## 4. Mecanismo contrafactual

El coeficiente de cada factor *es* su efecto (log-odds), por lo que un
contrafactual es una intervención limpia: fijar un factor y recomputar.

```mermaid
flowchart LR
    F["Factores del caso"] --> BASE["Predicción base<br/>P(condena)"]
    F --> INT["Intervención<br/>do(factor = x)"]
    INT --> CF["Nueva predicción<br/>P'(condena)"]
    BASE --> DLT["Δ = P' − P<br/>+ narrativa"]
    CF --> DLT
    DLT --> PREC["Precedentes que<br/>respaldan el escenario"]
```

---

## 5. Topología de despliegue (Railway)

Una repo con **una rama por componente**; cada servicio de Railway sigue su rama.
El backend monta un volumen persistente y usa Groq; el frontend hornea la URL de
la API en tiempo de build.

```mermaid
flowchart LR
    U(["Usuario"]) -->|HTTPS| FS
    subgraph GH ["GitHub · Evitxu/CounterLex"]
      MB["rama main · docs"]
      BB["rama backend"]
      FB["rama frontend"]
    end
    FB -->|deploy| FS["Railway · frontend<br/>counterlex.up.railway.app"]
    BB -->|deploy| BS["Railway · backend<br/>counterlex-api.up.railway.app"]
    FS -->|"NEXT_PUBLIC_API_BASE"| BS
    BS --- VOL[("Volumen /data<br/>counterlex.db")]
    BS -.->|OpenAI-compatible| GROQ["Groq ☁️"]
```