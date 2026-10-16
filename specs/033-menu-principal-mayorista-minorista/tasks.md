# Tasks — Menú principal por tipo de compra (Mayorista / Minorista)

| | |
|---|---|
| **Spec** | `033-menu-principal-mayorista-minorista` |
| **Design** | [`design.md`](design.md) |

> ⛔ Nada de esto arranca sin **"Implementá la spec 033"**.
> En orden. Cada paso se marca solo cuando su verificación pasó.

---

## 0. Antes de empezar

- [ ] **0.1** `git fetch` + `git pull --ff-only` en `main` (sin cambiar de
      rama). Verificación: `git status -sb` sin `behind`.
- [ ] **0.2** Anotar el WIP ajeno sin commitear (`git status`): **no** se
      stagea ni se commitea. Verificación: lista copiada en el reporte final.
- [ ] **0.3** `npm test` en verde antes de tocar nada. Verificación: número de
      tests anotado.

## 1. Datos del menú

- [ ] **1.1** `config/site.js`: `NAV_CATEGORIAS`, `menuVisible()` y `navMenu`
      (design §3). `navLinks` se borra. Comentario actualizado: qué decía la
      031, qué cambió el 15/10/2026 y por qué. Verificación: `grep -rn
      "navLinks" frontend/src` solo devuelve el test a actualizar.
- [ ] **1.2** `config/navMenu.test.js` (design §8). Verificación: corre en
      verde.
- [ ] **1.3** `config/negocios.test.js`: el caso del nav pasa a remitir a la
      033; se siguen verificando `#precios`, `COTIZAR_FORM_HREF` y
      `#como-funciona`. Verificación: verde.

## 2. Analytics

- [ ] **2.1** `lib/analytics.js`: `trackMenu({ accion, grupo, destino, vista })`
      → `menu_nav` por `pushDataLayer` (sin Meta). Verificación: `grep -rn
      "gtag\|fbq\|dataLayer" frontend/src/components/Header.jsx` vacío.

## 3. Header

- [ ] **3.1** Nav de compu (≥ lg): Home y Contacto como `NavLink`; grupos como
      `<button aria-expanded aria-controls>` + panel `absolute`; panel de
      Minorista en dos columnas (design §3). Verificación: navegador a 1024 y
      1440 px.
- [ ] **3.2** Apertura y cierre: click/Enter/Espacio, hover solo con mouse con
      150 ms de gracia, uno a la vez, Escape (foco al botón), click afuera,
      cambio de ruta, al elegir. Verificación: probar cada uno en el navegador.
- [ ] **3.3** Activo por ruta (RF-C5), incluido `/categoria/*` → Minorista.
      Verificación: abrir `/categoria/anime` y ver Minorista marcado.
- [ ] **3.4** Menú del celular: Home, acordeones, Contacto, Cotizar; targets
      ≥ 44 px; scroll interno (`max-h` + `overflow-y-auto`); grupo de la ruta
      actual abierto. Verificación: navegador a 375 px con los tres grupos
      abiertos.
- [ ] **3.5** `data-popup-bloqueo` en paneles abiertos y en el menú del
      celular. Verificación: inspeccionar el DOM con un panel abierto.
- [ ] **3.6** `trackMenu` en abrir y en cada click. Verificación: `dataLayer`
      en la consola del navegador.

## 4. Negocio tornasolado

- [ ] **4.1** `lib/lineasNegocio.js` (design §3). Verificación: test 4.2.
- [ ] **4.2** `lib/lineasNegocio.test.js` con la paridad contra
      `validateAndPriceOrder` (MP y transferencia; sin recargo → rechazo).
      Verificación: verde.
- [ ] **4.3** `NegocioForm.jsx`: opción tornasolado (apagada por defecto, con
      `+{formatPrice(RECARGO_HOLOGRAFICO.precio)}`), fila en el resumen y total
      que cambia; `submit` usa `lineasNegocio()`. Verificación: navegador.
- [ ] **4.4** `lib/resumenPedido.js`: la rama del formulario imprime
      `materialLabel`; caso nuevo en `resumenPedido.test.js`. Verificación:
      verde.

## 5. Verificación completa

- [ ] **5.1** `npm test` en verde. Verificación: número de tests.
- [ ] **5.2** `npm run build` en `frontend/`. Verificación: sin errores.
- [ ] **5.3** Recorrido en el navegador (375 / 768 / 1024 / 1440 px, teclado,
      tap, hover) y Negocio tornasolado hasta el checkout (sin pagar).
      Verificación: capturas.

## 6. Documentación y cierre

- [ ] **6.1** Nota en `specs/031-calcos-para-negocios/requirements.md` RF-N1:
      "reemplazado por la spec 033 (15/10/2026)".
- [ ] **6.2** `docs/analytics.md`: sección `menu_nav`. ⚠️ El archivo tiene WIP
      ajeno (spec 030): commitear **solo el hunk propio** (patch +
      `git apply --cached`), nunca `git add` del archivo entero. Verificación:
      `git diff --cached docs/analytics.md` muestra solo lo de la 033.
- [ ] **6.3** Recorrer `acceptance.md` punto por punto con el resultado real.
- [ ] **6.4** Commit con rutas explícitas (`git commit -- <rutas>`) y push a
      `main`. Verificación: deploy de Netlify en verde y el menú nuevo en
      producción.
