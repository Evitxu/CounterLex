# CounterLex — Frontend

Frontend (Next.js 15 + React 19 + TypeScript) del proyecto **CounterLex**.
Esta rama contiene **solo el código del frontend**, en la raíz, lista para
desplegar en Railway (Root Directory `/`).

- 📖 Documentación completa del proyecto → rama [`main`](../../tree/main)
- ⚙️ Código del backend → rama [`backend`](../../tree/backend)

## Ejecutar en local
```bash
npm install
# Apunta al backend (por defecto http://localhost:8000/api/v1):
# echo NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1 > .env.local
npm run dev            # http://localhost:3000
```

## Tests
```bash
npm test               # Vitest (lógica del modelo)
npx tsc --noEmit       # type-check
```
