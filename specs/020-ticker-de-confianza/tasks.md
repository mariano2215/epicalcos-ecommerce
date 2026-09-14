# Tasks — Ticker de confianza + devolución a 30 días

| | |
|---|---|
| **Spec** | `020-ticker-de-confianza` |
| **Design** | [`design.md`](design.md) |
| **Estado** | `NO INICIADA` |

---

## ⛔ Antes de tocar una sola línea

**La existencia de esta lista no autoriza a ejecutarla.**

- [x] Los tres documentos anteriores están completos
- [ ] Mariano respondió P-1 a P-6 de `requirements.md` §12
- [ ] Mariano aprobó el diseño
- [ ] **Mariano pidió explícitamente la implementación** (*"Implementá la spec 020"*)

---

## Fase 0 — Preparación

- [ ] **0.1** Volcar las respuestas de P-1 a P-6 en `requirements.md` §9 y en el
      texto propuesto de `design.md` §3
  - *Verificación*: no queda ninguna **P-n** sin resolver
- [ ] **0.2** Releer `AnnouncementBar.jsx`, `Header.jsx`, `anuncios.test.js`,
      `Cambios.jsx`, `Terminos.jsx` y `FAQ.jsx`
- [ ] **0.3** Suite en verde antes de empezar
  ```bash
  npm test
  ```
  - *Verificación*: todos los tests pasan (anotar el número)

---

## Fase 1 — Datos en el config

- [ ] **1.1** `devoluciones = { dias: 30 }` en `config/site.js`
  - *Verificación*: exportado, con el comentario de D-1
- [ ] **1.2** `announcements` → `anunciosVigentes(now)`, con los 4 mensajes de
      `design.md` §1; reescribir el comentario del bloque contando la decisión
      de la spec 014 (4/9) y la de esta (14/9)
  - *Verificación*: `grep -rn "announcements" frontend/src` solo encuentra
    comentarios
- [ ] **1.3** Reescribir `lib/anuncios.test.js` con los 7 casos de `design.md` §9
  - *Verificación*: los 7 pasan

---

## Fase 2 — La tira

- [ ] **2.1** Reescribir `AnnouncementBar.jsx`: dos grupos (el segundo
      `aria-hidden`), `<section aria-label>`, sin `aria-live`, sin timers;
      `null` si no hay mensajes
  - *Verificación*: el componente no tiene `useEffect` ni `setInterval`
- [ ] **2.2** `styles/index.css`: `.anuncio-barra*` → `.anuncio-ticker*`
      (sobrio, `min-width: 100vw` por grupo, pausa al hover, máscara en los
      bordes) + reglas en el `@media (prefers-reduced-motion)`
  - *Verificación*: `grep -n "anuncio-barra" frontend/src` no encuentra nada
- [ ] **2.3** `Header.jsx`: renderizar con `!compacto` solamente; sacar
      `hayPromo` y reescribir su comentario
  - *Verificación*: con el 3x2 vivo se ven el banner y la tira

---

## Fase 3 — Espejo de precios

⏭️ **No aplica**: no se toca ningún precio, promo, cupón ni envío.

---

## Fase 4 — Política de devoluciones

- [ ] **4.1** `routes/legal/Cambios.jsx` con el texto de `design.md` §3
      (ajustado a P-1..P-5), `useSeo` y `lastUpdated`
- [ ] **4.2** `routes/legal/Terminos.jsx` §6
- [ ] **4.3** `components/FAQ.jsx`, respuesta de devoluciones
- [ ] **4.4** Los tres leen `devoluciones.dias`; ninguno escribe "30" a mano
  - *Verificación*: `grep -n "30 días" frontend/src/routes/legal frontend/src/components/FAQ.jsx` → nada
- [ ] **4.5** `lib/politicaDevoluciones.test.js`
  - *Verificación*: pasa; y falla si se vuelve a poner "no aceptamos cambios ni
    devoluciones" en cualquiera de los tres

---

## Fase 5 — Analytics

⏭️ **No aplica**: sin eventos nuevos (`requirements.md` §11).

---

## Fase 6 — Tests y verificación

- [ ] **6.1** Suite completa en verde
  ```bash
  npm test
  ```
- [ ] **6.2** Build de producción sin errores
  ```bash
  npm run build --prefix frontend
  ```
- [ ] **6.3** Verificación manual de `design.md` §9 en el dev server (375 px,
      1920 px, reduced motion, scroll, lector de pantalla)

---

## Fase 7 — Documentación

- [ ] **7.1** `docs/business-rules.md` §7: sección *"Cambios y devoluciones"*
      con D-1..D-10
- [ ] **7.2** Comentarios con el **por qué** en `site.js`, `AnnouncementBar.jsx`
      y `Header.jsx`

---

## Fase 8 — Cierre

- [ ] **8.1** Validar contra `acceptance.md`, punto por punto
- [ ] **8.2** Reportar hallazgos fuera de scope
- [ ] **8.3** Commit + push — ⚠️ **push a `main` = deploy a producción**.
      Stagear archivo por archivo.
- [ ] **8.4** Estado de la spec → `DONE`

---

## Hallazgos fuera de scope

| Hallazgo | Archivo | Propuesta |
|---|---|---|
| La garantía no aparece en la lista de confianza del checkout, que es donde más pesa la duda y donde la tira ya se recogió | `components/CheckoutForm.jsx:343` | Sumar *"🔄 {dias} días para devolverlo"* a la lista. Spec aparte |
| El sitio no tiene **botón de arrepentimiento** (Res. 424/2020) | — | Confirmar con un profesional si aplica y cómo |
| El efecto del ticker no se puede aislar sin un A/B | `lib/experiments.js` | Experimento de presentación: con tira / sin tira |
| Los CRO docs dicen que la garantía "no se inventa" porque no había devoluciones | `docs/CRO-AUDIT.md:209`, `docs/CRO-IMPLEMENTATION.md:116` | Son registro histórico; si se quieren actualizar, nota al pie |

---

## Bitácora

| Fecha | Qué cambió respecto al diseño | Motivo |
|---|---|---|
