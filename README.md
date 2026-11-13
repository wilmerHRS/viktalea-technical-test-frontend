# Wallet Cash-In · Simulador (frontend)

Frontend en React que **simula la cuenta de un usuario** y **ejecuta contra el backend real** los escenarios que exige el challenge _Wallet Cash-In_ (idempotencia, concurrencia y webhooks). Cada escenario muestra qué exige el documento, cómo lo resuelve el backend y verifica el resultado automáticamente.

Backend: [`viktalea-technical-test`](../viktalea-technical-test).

**Stack:** React 19 · TypeScript (strict) · Vite 8 · Vitest · ESLint + Prettier.

## Cómo ejecutarlo

```bash
# 1. Backend (en ../viktalea-technical-test): BD + dos pods
npm run db:up && npm run db:migrate
PORT=3000 RECONCILE_INTERVAL_MS=3000 RECONCILE_AFTER_MS=30000 npm run dev  # pod A (reconciliador)
PORT=3001 RECONCILE_INTERVAL_MS=3600000 npm run dev                         # pod B

# 2. Frontend (aquí)
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
```

> Solo el pod A ejecuta el reconciliador de forma periódica: la pasarela del backend es **simulada y vive en memoria de cada proceso**, así que un pod no conoce los cobros hechos en otro. Con una pasarela real (compartida) no hace falta esta precaución.

## Qué hay en la pantalla

A la izquierda, **la cuenta dentro de un teléfono** (como la vería el usuario en la app). A la derecha, un **panel con pestañas**: _Escenarios_ y _Registro de llamadas_. En pantallas estrechas el panel pasa debajo del teléfono.

| Zona                         | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado de los pods**       | Comprueba `GET /health` de cada pod cada 3 s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Mi cuenta**                | Saldo, formulario de recarga e historial. Se comporta como una app real: un intento de recarga conserva su `Idempotency-Key` hasta tener resultado final, así que un **doble click** o un **reintento** envían la misma key. El botón no se deshabilita a propósito, para poder demostrarlo. Con el **retry automático** activo, ante un `202` / `503` / sin conexión la app reintenta sola respetando `Retry-After`. Cada recarga permite simular a la **pasarela**: webhook `approved`, `declined` o duplicado. |
| **Escenarios del documento** | Los 10 escenarios del challenge más las validaciones del contrato. 9 son automáticos (botón "Ejecutar los 9 automáticos") y 2 son **guiados** (fallo de la BD y reinicio del servicio): te piden detener la BD o el backend en el momento justo.                                                                                                                                                                                                                                                                  |
| **Registro de llamadas**     | Todas las requests reales al backend: pod, key, código HTTP, duración, request y respuesta.                                                                                                                                                                                                                                                                                                                                                                                                                       |

`payment_method` elige el comportamiento de la pasarela simulada: aprueba, rechaza, aprueba lento (3 s), cobra pero no responde (la pregunta central), no cobra y no responde, o error de red.

### Probar el webhook a mano (`POST /webhooks/payment`)

1. Elige la tarjeta **"No cobra y no responde"** (o "Cobra pero no responde") y desactiva el retry automático.
2. Pulsa **Recargar**: el movimiento queda _pendiente_ y aparece el aviso **"Esperando a la pasarela"** con los botones `approved` / `declined`.
3. Pulsa uno: el navegador firma el webhook (HMAC) y lo envía; luego la app vuelve a consultar la operación con la misma key. El movimiento muestra lo que hizo el backend (`aplicado`, `duplicado, ignorado`, `conflicto, no cambia nada`) y el saldo se actualiza.

Tienes **30 s** (`RECONCILE_AFTER_MS` del pod A) antes de que el reconciliador cierre la operación. Si el webhook llega después, el backend responde `conflict`: es el caso de webhook fuera de orden. Al abrir un movimiento también puedes enviar `approved`, `declined` o el mismo evento dos veces (duplicado ×2).

## Escenarios

| #   | Escenario                      | Tipo       | Qué verifica                                                               |
| --- | ------------------------------ | ---------- | -------------------------------------------------------------------------- |
| 1   | Doble click                    | automático | 2 requests a la vez con la misma key → misma operación, saldo 100 (no 200) |
| 2   | Retry de la app                | automático | 3 intentos → respuestas idénticas, un solo abono                           |
| 3   | Varios pods                    | automático | 10 requests repartidas entre pods → una operación, un abono                |
| 4   | Timeout (pregunta central)     | automático | 202 + Retry-After → reintento sin recobrar → reconciliador → 200, un abono |
| 5   | Webhook duplicado              | automático | mismo evento a 2 pods a la vez → 1 aplicado, 1 duplicado                   |
| 6   | Webhook fuera de orden         | automático | `declined` tras completada → `conflict`, saldo intacto                     |
| 7   | Webhook antes que la respuesta | automático | el webhook liquida mientras la API espera → API 200, un abono              |
| 8   | Fallo temporal de la BD        | guiado     | con la BD detenida → 503 `SERVICE_UNAVAILABLE` + Retry-After, sin caerse   |
| 9   | Reinicio durante la operación  | guiado     | pod muerto a mitad del cobro → al volver, `FAILED` sin abono               |
| 10  | Race condition del saldo       | automático | 20 recargas distintas a la vez → saldo = suma exacta                       |
| 11  | Validaciones del contrato      | automático | 422 key reutilizada · 400 key/monto inválidos · 401 firma inválida         |

Resultado verificado en el navegador: **11/11**.

## Estructura

```
src/
├── config/            app.config.ts (VITE_API_URLS, VITE_WEBHOOK_SECRET)
├── constants/         payment-methods.constants.ts
├── types/             cash-in, api-call, scenario, wallet (*.types.ts)
├── api/
│   ├── clients/       http, cash-in, payment-webhook (firma HMAC), health
│   └── utils/         hmac.util.ts (Web Crypto)
├── utils/             recharge-attempt.util.ts (lógica pura de la cuenta), format.util.ts
├── hooks/             use-wallet, use-scenario-runner, use-api-log, use-pod-health
├── scenarios/
│   ├── definitions/   un archivo por escenario (*.scenario.ts)
│   ├── utils/         scenario.util.ts (helpers comunes, pollUntilFinal)
│   └── scenarios.registry.ts
├── components/        common/, layout/, wallet/, scenarios/, log/ (*.component.tsx)
├── styles/app.css     tema claro (variables CSS)
└── test/              tests de Vitest
```

## Calidad

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
```

## Nota de seguridad

El navegador firma los webhooks **solo para simular a la pasarela en desarrollo**. En producción la firma la hace la pasarela con un secreto que nunca llega al cliente.
