# Tasks — Ticker de confianza + devolución a 30 días

| | |
|---|---|
| **Spec** | `020-ticker-de-confianza` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `DONE` — 14/09/2026 |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [x] Mariano respondió P-1 a P-6 de `requirements.md` §12 (*"ok a lo recomendado"*, 14/9/2026)
- [x] Mariano aprobó el diseño
- [x] **Mariano pidió explícitamente la implementación** (*"implementá la spec 020"*, 14/9/2026)

---

## Fase 0 — Preparación

- [x] **0.1** Volcar las respuestas de P-1 a P-6 en `requirements.md` §9 y en el
      texto propuesto de `design.md` §3
  - *Verificación*: no queda ninguna **P-n** sin resolver
- [x] **0.2** Releer `AnnouncementBar.jsx`, `Header.jsx`, `anuncios.test.js`,
      `Cambios.jsx`, `Terminos.jsx` y `FAQ.jsx`
- [x] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: todos los tests pasan (anotar el número) → **496 / 496**

---

## Fase 1 — Datos en el config

- [x] **1.1** `devoluciones = { dias: 30 }` en `config/site.js`
  - *Verificación*: exportado, con el comentario de D-1
- [x] **1.2** `announcements` → `anunciosVigentes(now)`, con los 4 mensajes de
      `design.md` §1; reescribir el comentario del bloque contando la decisión
      de la spec 014 (4/9) y la de esta (14/9)
  - *Verificación*: `grep -rn "announcements" frontend/src` solo encuentra
    comentarios
- [x] **1.3** Reescribir `lib/anuncios.test.js` con los 7 casos de `design.md` §9
  - *Verificación*: los 7 pasan

---

## Fase 2 — La tira

- [x] **2.1** Reescribir `AnnouncementBar.jsx`: dos grupos (el segundo
      `aria-hidden`), `<section aria-label>`, sin `aria-live`, sin timers;
      `null` si no hay mensajes
  - *Verificación*: el componente no tiene `useEffect` ni `setInterval`
- [x] **2.2** `styles/index.css`: `.anuncio-barra*` → `.anuncio-ticker*`
      (sobrio, `min-width: 100vw` por grupo, pausa al hover, máscara en los
      bordes) + reglas en el `@media (prefers-reduced-motion)`
  - *Verificación*: `grep -n "anuncio-barra" frontend/src` no encuentra nada →
    queda solo la mención histórica en el comentario del bloque nuevo
- [x] **2.3** `Header.jsx`: renderizar con `!compacto` solamente; sacar
      `hayPromo` y reescribir su comentario
  - *Verificación*: con el 3x2 vivo se ven el banner y la tira

---

## Fase 3 — Espejo de precios

⏭️ **No aplica**: no se toca ningún precio, promo, cupón ni envío.

---

## Fase 4 — Política de devoluciones

- [x] **4.1** `routes/legal/Cambios.jsx` con el texto de `design.md` §3
      (ajustado a P-1..P-5), `useSeo` y `lastUpdated`
- [x] **4.2** `routes/legal/Terminos.jsx` §6
- [x] **4.3** `components/FAQ.jsx`, respuesta de devoluciones
- [x] **4.4** Los tres leen `devoluciones.dias`; ninguno escribe "30" a mano
  - *Verificación*: `grep -n "30 días" frontend/src/routes/legal frontend/src/components/FAQ.jsx` → nada
- [x] **4.5** `lib/politicaDevoluciones.test.js`
  - *Verificación*: pasa; y falla si se vuelve a poner "no aceptamos cambios ni
    devoluciones" en cualquiera de los tres

---

## Fase 5 — Analytics

⏭️ **No aplica**: sin eventos nuevos (`requirements.md` §11).

---

## Fase 6 — Tests y verificación

- [x] **6.1** Suite completa en verde → **507 / 507** (496 + 3 de `anuncios` + 8 de
      `politicaDevoluciones`)
  ```bash
  npm test
  ```
- [x] **6.2** Build de producción sin errores
  ```bash
  npm run build --prefix frontend
  ```
- [x] **6.3** Verificación manual de `design.md` §9 en el dev server (375 px,
      1920 px, reduced motion, scroll, lector de pantalla)

---

## Fase 7 — Documentación

- [x] **7.1** `docs/business-rules.md` §7: sección *"Cambios y devoluciones"*
      con D-1..D-10
- [x] **7.2** Comentarios con el **por qué** en `site.js`, `AnnouncementBar.jsx`
      y `Header.jsx`

---

## Fase 8 — Cierre

- [x] **8.1** Validar contra `acceptance.md`, punto por punto
- [x] **8.2** Reportar hallazgos fuera de scope
- [x] **8.3** Commit + push — ⚠️ **push a `main` = deploy a producción**.
      Stagear archivo por archivo.
- [x] **8.4** Estado de la spec → `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| La garantía no aparece en la lista de confianza del checkout, que es donde más pesa la duda y donde la tira ya se recogió | `components/CheckoutForm.jsx:343` | Sumar *"🔄 {dias} días para devolverlo"* a la lista. Spec aparte |
| El sitio no tiene **botón de arrepentimiento** (Res. 424/2020) | — | Confirmar con un profesional si aplica y cómo |
| El efecto del ticker no se puede aislar sin un A/B | `lib/experiments.js` | Experimento de presentación: con tira / sin tira |
| Los CRO docs dicen que la garantía "no se inventa" porque no había devoluciones | `docs/CRO-AUDIT.md:209`, `docs/CRO-IMPLEMENTATION.md:116` | Son registro histórico; si se quieren actualizar, nota al pie |
| El `sitemap.xml` commiteado está atrasado: le faltan categorías del segundo lote (spec 016). Producción no se entera porque el `prebuild` lo regenera en cada deploy | `frontend/public/sitemap.xml` | Commitear el regenerado en un cambio aparte, o sacarlo del repo y dejarlo solo como artefacto del build |
| `CLAUDE.md` dice "210 tests"; hoy son 507 | `CLAUDE.md` | Actualizar el número o sacarlo |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
| 14/09/2026 | Tatuajes temporales quedan del lado de *solo por falla* | La pregunta estaba abierta en P-3; se resolvió desde el código: `routes/Tatuajes.jsx` pide *"Subí tus diseños"* |
| 14/09/2026 | Con movimiento reducido el ítem suma `flex-shrink: 1; min-width: 0` | En la verificación, la frase del envío (~410 px) se salía del borde a 375 px en vez de partirse en dos líneas |
| 14/09/2026 | Duración 34 s en celular y 40 s desde 640 px | Medido en el dev server: 40 px/s a 375 px y 48 px/s a 1920 px |
| 14/09/2026 | `Cambios.jsx` dice *"no en la devolución por cualquier motivo"* en vez de *"arrepentimiento"* | "Arrepentimiento" es el término legal de la Ley 24.240, cuyo botón el sitio todavía no tiene (hallazgo); mejor no nombrarlo que prometerlo a medias |
