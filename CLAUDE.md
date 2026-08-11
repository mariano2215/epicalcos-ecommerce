# CLAUDE.md — Constitución técnica de EPICALCOS

Este archivo manda sobre cualquier comportamiento por defecto. Si algo de acá
choca con una costumbre general, gana lo que dice acá.

EPICALCOS es un ecommerce **en producción, con ventas reales**. No es un
proyecto de práctica: cada deploy a `main` sale a la calle en minutos. Un error
en el camino de precios no rompe un test — deja a un cliente sin poder comprar,
o le cobra de menos.

---

## 0. Regla cero: este proyecto usa Spec-Driven Development

El trabajo se hace en este orden y no en otro:

```
REQUEST → DISCOVERY → REQUIREMENTS → DESIGN → TASKS → APPROVAL
        → IMPLEMENTATION → TESTING → ACCEPTANCE → DONE
```

El proceso completo está en [`/specs/README.md`](specs/README.md).

---

## Las 15 reglas

### 1. Este proyecto utiliza Spec-Driven Development
Toda feature vive en `/specs/<nombre>/` con sus cuatro documentos. La spec es el
contrato; el código es su consecuencia.

### 2. Ninguna feature nueva se implementa sin spec
No hay excepción por "es chiquito". Un cambio de una línea en `pricing.js` puede
rechazar todos los checkouts del país (ver regla 11).

Lo que **no** necesita spec: corregir un typo, actualizar un valor que ya está
declarado como configurable (ej. `HIDDEN_SECTIONS`), o un fix de un bug ya
diagnosticado y acordado en la conversación.

### 3. Antes de modificar código se debe inspeccionar la implementación existente
Leer el archivo, sus tests, y quién lo importa — **antes** de escribir. Este
repo tiene comentarios densos que explican *por qué* algo está como está: casi
siempre documentan un error ya cometido. Borrar el comentario suele significar
volver a cometerlo.

Búsqueda mínima antes de tocar un módulo compartido:
```bash
grep -rn "nombreDelModulo" frontend/src netlify/
```

### 4. `requirements.md` define QUÉ debe suceder
Problema, objetivo, scope, usuarios, user stories, requisitos funcionales y no
funcionales, reglas de negocio, edge cases y analytics necesarios. **Sin
soluciones técnicas.** Si aparece un nombre de archivo, va en `design.md`.

### 5. `design.md` define CÓMO se implementará
Arquitectura propuesta, componentes afectados, datos, APIs, integraciones,
seguridad, manejo de errores y estrategia de migración. Acá sí van rutas de
archivo, nombres de función y formas de payload.

### 6. `tasks.md` divide la implementación en pasos verificables
Checklist ordenado. Cada paso tiene que poder marcarse como hecho sin
ambigüedad. Un paso que no se puede verificar está mal escrito.

### 7. `acceptance.md` determina cuándo la feature está terminada
Criterios verificables + Definition of Done. Si no está en `acceptance.md`, no
es parte de "terminado" — y si está, no se cierra hasta cumplirlo.

### 8. No realizar refactors fuera del scope
Si aparece algo feo al lado de lo que estás tocando, **no se arregla en el
mismo cambio**: se anota en la spec como hallazgo y se propone aparte. Un
refactor de oportunidad mezcla en el mismo diff lo que hay que revisar con lo
que hay que confiar.

### 9. No modificar componentes compartidos sin analizar dependencias
Los de mayor radio de impacto en este repo:

| Módulo | Por qué es delicado |
|---|---|
| `frontend/src/config/pricing.js` | Espejado en el servidor. Ver regla 11. |
| `frontend/src/config/site.js` | Envíos, umbrales y nav. Espejado en el servidor. |
| `frontend/src/context/CartContext.jsx` | Todo el carrito y el cálculo de precios del cliente. |
| `netlify/functions/lib/pricing.js` | Revalida **todos** los checkouts. |
| `frontend/src/lib/analytics.js` | Único punto de salida a GA4 y Meta. |

Antes de tocar cualquiera: listar quién lo importa y decirlo en `design.md`.

### 10. No introducir librerías innecesariamente
El stack es deliberadamente chico: React + React Router + Tailwind + Vite, y
`mercadopago` + `@netlify/blobs` del lado del servidor. **No hay** state manager,
librería de formularios, de fechas ni de tests más allá de Vitest.

Para agregar una dependencia hay que justificar en `design.md`: qué problema
resuelve, cuánto pesa, y por qué no alcanza con código propio. El A/B testing y
el formateo de precios son propios a propósito — está explicado en
`lib/experiments.js` y `lib/formato.js`.

### 11. Preservar compatibilidad con funcionalidades existentes

**El espejo de precios es la regla más importante del repo.**

`frontend/src/config/pricing.js` y `netlify/functions/lib/pricing.js` contienen
las mismas reglas escritas dos veces, a propósito: el cliente calcula lo que
muestra, el servidor **revalida y rechaza** lo que no coincide
(`price_mismatch`). Si cambiás un precio, una promo, un cupón o un umbral de
envío en un lado y no en el otro, **todo checkout que toque esa regla se
rechaza**.

Lo mismo aplica a `config/site.js` ↔ el bloque de envío del servidor.

Los tests que verifican la paridad:
```bash
npm test --prefix frontend
```
- `src/lib/promoPricing.test.js` — promos, cupones, precios espejados
- `src/lib/envio.test.js` — umbrales y costos de envío
- `src/lib/precioPersonalizados.test.js` — precios del configurador

Además: los carritos viven en `localStorage` (`epicalcos.cart.v2`). Un cambio en
la forma de las líneas tiene que contemplar los carritos ya guardados — hay
precedente en `esCustomViejo()` del `CartContext`.

### 12. Priorizar mobile-first, performance, accesibilidad y conversión
- **Mobile-first**: la mayoría del tráfico viene de anuncios en Instagram, en
  celular. Se diseña para 375 px y se escala hacia arriba.
- **Performance**: el Home es eager por LCP; el resto de las rutas son `lazy()`.
  No agregar scripts bloqueantes en el `<head>`. Clarity ya se difiere a
  `window.load` por esto.
- **Accesibilidad**: `aria-label` en todo control cuyo texto no se explique solo,
  targets táctiles de 44 px, foco visible.
- **Conversión**: si un cambio agrega un paso, un campo o una fricción al camino
  de compra, hay que justificarlo en la spec.

### 13. Las acciones comerciales relevantes deben contemplar analytics
Toda feature que toque el funnel declara sus eventos en `requirements.md`
(sección Analytics) y los implementa **solo** a través de
`frontend/src/lib/analytics.js`. No se llama a `gtag`, `fbq` ni `dataLayer`
directamente desde un componente.

El tracking **nunca** puede romper la compra: todo va envuelto en `try/catch`
(hay precedente — `fbevents.js` tiraba excepciones en el navegador embebido de
Instagram y abortaba el checkout).

### 14. Nunca exponer secrets o credenciales en frontend
- Todo lo que empieza con `VITE_` **se hornea en el bundle y es público**. Ahí
  solo van IDs públicos (pixel, GTM, cloud name de Cloudinary).
- Los secretos viven en Netlify → Environment variables, y se leen únicamente
  desde `netlify/functions/**`.
- No se commitea ningún `.env`. `.mcp.json` está en `.gitignore` **porque
  contiene un token**.
- Nunca loguear un token, ni el body completo de un pago, ni PII cruda.

### 15. Toda implementación debe finalizar con validación contra `acceptance.md`
Al terminar: recorrer `acceptance.md` punto por punto y reportar el resultado
real de cada uno. Si algo no se cumple, se dice — no se cierra la feature.

---

## Cómo se trabaja acá

### Antes de tocar nada
1. Leer la spec (o escribirla).
2. Leer el código que vas a modificar **y sus tests**.
3. Si toca precios, envíos o promos: leer **los dos** lados del espejo.

### Al terminar
```bash
npm test --prefix frontend      # 100 tests, todos tienen que pasar
```

### Deploy
`main` deploya solo. `netlify.toml` tiene `ignore = "exit 1"`, así que **todo**
push a `main` dispara build, incluso si solo tocaste `netlify/functions/`.
No hace falta forzar nada. Esto significa que **un push es un deploy a
producción**.

### Idioma
El código, los comentarios y la documentación de este repo están **en español**.
Seguí esa convención.

### Comentarios
El estilo del repo es explicar **por qué**, no **qué**. Un comentario que
parafrasea la línea de abajo sobra; uno que explica qué error se cometió antes,
vale oro. Mantené esa densidad.

---

## Mapa rápido

| Necesito… | Está en |
|---|---|
| Cómo está armado el sistema | [`docs/architecture.md`](docs/architecture.md) |
| Precios, promos, cupones, envíos | [`docs/business-rules.md`](docs/business-rules.md) |
| Dónde se guardan los datos | [`docs/database.md`](docs/database.md) |
| Mercado Pago, Notion, Resend, Cloudinary, Meta | [`docs/integrations.md`](docs/integrations.md) |
| Tracking y eventos | [`docs/analytics.md`](docs/analytics.md) |
| Cómo escribir una spec | [`specs/README.md`](specs/README.md) |

Documentación operativa previa al SDD (sigue vigente):
`docs/AUTOMATIZACIONES.md`, `docs/NOTIFICACIONES.md`, `docs/DASHBOARD.md`,
`docs/QA-CHECKLIST.md`, `docs/CRO-*.md`.

---

## Lo que NO se hace sin pedirlo explícitamente

- Implementar una spec. **Que exista una spec no autoriza a implementarla.**
  La implementación arranca solo cuando Mariano dice: *"Implementá la spec XXX"*.
- Cambiar precios, promos o cupones.
- Prender la recuperación de carrito abandonado (`ABANDONED_CART_ENABLED`):
  manda mails a clientes reales.
- Enforcar la CSP (hoy `Report-Only`).
- Publicar o despublicar secciones (`HIDDEN_SECTIONS`).
- Tocar `backend/` — es código legacy no desplegado (ver `docs/architecture.md`).
