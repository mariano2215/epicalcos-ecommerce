# Tasks — Menú principal por tipo de compra (Mayorista / Minorista)

| | |
|---|---|
| **Spec** | `033-menu-principal-mayorista-minorista` |
| **Design** | [`design.md`](design.md) |

> ⛔ Nada de esto arranca sin **"Implementá la spec 033"**.
> En orden. Cada paso se marca solo cuando su verificación pasó.

---

## 0. Antes de empezar

- [x] **0.1** `git fetch` + `git pull --ff-only` en `main` (sin cambiar de
      rama). Verificación: `git status -sb` sin `behind`.
- [x] **0.2** Anotar el WIP ajeno sin commitear (`git status`): **no** se
      stagea ni se commitea. Verificación: lista copiada en el reporte final.
- [x] **0.3** `npm test` en verde antes de tocar nada. Verificación: número de
      tests anotado.

## 1. Datos del menú

- [x] **1.1** `config/site.js`: `NAV_CATEGORIAS`, `menuVisible()` y `navMenu`
      (design §3). `navLinks` se borra. Comentario actualizado: qué decía la
      031, qué cambió el 15/10/2026 y por qué. Verificación: `grep -rn
      "navLinks" frontend/src` solo devuelve el test a actualizar.
- [x] **1.2** `config/navMenu.test.js` (design §8). Verificación: corre en
      verde.
- [x] **1.3** `config/negocios.test.js`: el caso del nav pasa a remitir a la
      033; se siguen verificando `#precios`, `COTIZAR_FORM_HREF` y
      `#como-funciona`. Verificación: verde.

## 2. Analytics

- [x] **2.1** `lib/analytics.js`: `trackMenu({ accion, grupo, destino, vista })`
      → `menu_nav` por `pushDataLayer` (sin Meta). Verificación: `grep -rn
      "gtag\|fbq\|dataLayer" frontend/src/components/Header.jsx` vacío.

## 3. Header

- [x] **3.1** Nav de compu (≥ lg): Home y Contacto como `NavLink`; grupos como
      `<button aria-expanded aria-controls>` + panel `absolute`; panel de
      Minorista en dos columnas (design §3). Verificación: navegador a 1024 y
      1440 px.
- [x] **3.2** Apertura y cierre: click/Enter/Espacio, hover solo con mouse con
      150 ms de gracia, uno a la vez, Escape (foco al botón), click afuera,
      cambio de ruta, al elegir. Verificación: probar cada uno en el navegador.
- [x] **3.3** Activo por ruta (RF-C5), incluido `/categoria/*` → Minorista.
      Verificación: abrir `/categoria/anime` y ver Minorista marcado.
- [x] **3.4** Menú del celular: Home, acordeones, Contacto, Cotizar; targets
      ≥ 44 px; scroll interno (`max-h` + `overflow-y-auto`); grupo de la ruta
      actual abierto. Verificación: navegador a 375 px con los tres grupos
      abiertos.
- [x] **3.5** `data-popup-bloqueo` en paneles abiertos y en el menú del
      celular. Verificación: inspeccionar el DOM con un panel abierto.
- [x] **3.6** `trackMenu` en abrir y en cada click. Verificación: `dataLayer`
      en la consola del navegador.

## 4. Negocio tornasolado

- [x] **4.1** `lib/lineasNegocio.js` (design §3). Verificación: test 4.2.
- [x] **4.2** `lib/lineasNegocio.test.js` con la paridad contra
      `validateAndPriceOrder` (MP y transferencia; sin recargo → rechazo).
      Verificación: verde.
- [x] **4.3** `NegocioForm.jsx`: opción tornasolado (apagada por defecto, con
      `+{formatPrice(RECARGO_HOLOGRAFICO.precio)}`), fila en el resumen y total
      que cambia; `submit` usa `lineasNegocio()`. Verificación: navegador.
- [x] **4.4** `lib/resumenPedido.js`: la rama del formulario imprime
      `materialLabel`; caso nuevo en `resumenPedido.test.js`. Verificación:
      verde.

## 5. Verificación completa

- [x] **5.1** `npm test` en verde. Verificación: número de tests.
- [x] **5.2** `npm run build` en `frontend/`. Verificación: sin errores.
- [x] **5.3** Recorrido en el navegador (375 / 768 / 1024 / 1440 px, teclado,
      tap, hover) y Negocio tornasolado hasta el checkout (sin pagar).
      Verificación: capturas.

## 6. Documentación y cierre

- [x] **6.1** Nota en `specs/031-calcos-para-negocios/requirements.md` RF-N1:
      "reemplazado por la spec 033 (15/10/2026)".
- [x] **6.2** `docs/analytics.md`: sección `menu_nav`. ⚠️ El archivo tiene WIP
      ajeno (spec 030): commitear **solo el hunk propio** (patch +
      `git apply --cached`), nunca `git add` del archivo entero. Verificación:
      `git diff --cached docs/analytics.md` muestra solo lo de la 033.
- [x] **6.3** Recorrer `acceptance.md` punto por punto con el resultado real.
- [x] **6.4** Commit con rutas explícitas (`git commit -- <rutas>`) y push a
      `main`. Verificación: deploy de Netlify en verde y el menú nuevo en
      producción.

---

## Resultado de cada paso (15–16/10/2026)

| Paso | Resultado |
|---|---|
| 0.1 | `main` al día con `origin/main` antes de empezar |
| 0.2 | WIP ajeno sin commitear (spec 030): `docs/analytics.md`, `components/Reveal.jsx`, `styles/index.css`, `netlify.toml`, `specs/030-…/requirements.md`. Ninguno se stageó; de `docs/analytics.md` se commiteó solo la sección de la 033 (`git update-index` con HEAD + la sección) |
| 0.3 | Suite en verde antes de tocar nada: 819 pasan, 17 skip |
| 1.1 | `navLinks` borrado. Apareció un tercer consumidor, `lib/personalizadosEstatico.js` (design H-5): usa `navMenuPlano` |
| 1.2 / 1.3 | `navMenu.test.js` (10 tests) y `negocios.test.js` en verde |
| 2.1 | `trackMenu` → `menu_nav`; sin `gtag`/`fbq`/`dataLayer` en el header ni en `MenuPrincipal.jsx` |
| 3.1–3.6 | El menú vive en `components/MenuPrincipal.jsx` (nuevo). Verificado con Chrome headless por CDP: 40/40 chequeos (hover real, cruce al panel, click que fija, Escape con foco, click afuera, Tab, tap en tablet, celular a 375 px, `data-popup-bloqueo`, `menu_nav`). Corregidos en el camino: logo aplastado a 1024 px (H-6) y flotantes encima del menú (H-7) |
| 4.1–4.4 | `lineasNegocio.js` + 11 tests (paridad MP y transferencia, rechazo sin recargo, nota del pedido). Formulario probado en el navegador a 375 px: $72.999 y dos líneas ligadas en el carrito. Imagen del recargo (H-8) |
| 5.1 | Ver `acceptance.md` (número final de tests) |
| 5.2 | Build de Netlify en verde: el deploy de `19b7f986` publicó el bundle con `menu_nav` en epicalcos.com |
| 5.3 | Ver capturas descritas en `acceptance.md` |
| 6.1 | Nota de reemplazo en RF-N1 y AC-N1 de la 031 |
| 6.2 | Sección "Menú principal (spec 033)" en `docs/analytics.md` |
| 6.3 | `acceptance.md` recorrido punto por punto |
| 6.4 | `19b7f986` (código) + el commit de cierre (docs, H-7, H-8) |
