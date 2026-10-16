# Acceptance — Menú principal por tipo de compra (Mayorista / Minorista)

| | |
|---|---|
| **Spec** | `033-menu-principal-mayorista-minorista` |
| **Requirements** | [`requirements.md`](requirements.md) |

> La feature está terminada cuando **todos** los criterios tienen resultado real.

---

## Menú — contenido

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-M1 | *(RF-M1)* El menú dice Home · Mayorista · Minorista · Otros productos · Contacto, en ese orden, en compu y en celular | Test + navegador | ✅ `navMenu.test.js` + navegador a 1024/1280 px y celular a 375 px ("Home · Mayorista · Minorista · Otros productos · Contacto") |
| AC-M2 | *(RF-M3)* Mayorista abre Mayorista +100 calcos (→ /mayorista) y Negocio (→ /negocio) | Navegador | ✅ CDP: hover/click en Mayorista y click en Negocio → `/negocio`; links verificados en el test |
| AC-M3 | *(RF-M4, RF-M7)* Minorista abre Personalizados, las 8 categorías con emoji (cada una lleva a su categoría) y Ver todas las categorías (→ /categorias) | Test + navegador | ✅ CDP: el panel trae `/personalizados`, las 8 `/categoria/…` y `/categorias`; celular: tap en Disney → `/categoria/disney` |
| AC-M4 | *(RF-M5)* Otros productos abre Fotos Polaroid y Tatuajes temporales | Navegador | ✅ test (rutas y textos) + panel abierto a 1024 px dentro de la pantalla (376–664 px) |
| AC-M5 | *(RF-M8)* Ningún texto del menú dice "más vendidas" / "populares" | Test | ✅ test (sin "vendid", "popular", "top", "ranking") |
| AC-M6 | *(RF-M9)* Con una sección en `HIDDEN_SECTIONS`, su opción no aparece; un grupo vacío desaparece | Test | ✅ test de `menuVisible` (opción oculta, grupo vacío, link directo oculto) |
| AC-M7 | *(RF-M10)* Buscar, Cotizar y Carrito funcionan como antes; Cotizar sigue dentro del menú del celular | Navegador | ✅ Cotizar sigue en el header desde lg y al pie del menú del celular ("Cotizar mis calcos", alcanzable scrolleando el menú); Buscar y Carrito sin cambios de código, el carrito usado en la prueba de /negocio |

## Menú — comportamiento

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-C1 | *(RF-C1, RF-C2)* En compu el grupo abre con click, con Enter/Espacio y con hover; con el mouse se puede cruzar al panel sin que se cierre | Navegador | ✅ CDP con mouse real: hover abre, cruce título→panel no cierra, click después del hover lo fija; Enter abre |
| AC-C2 | *(RF-C3, RF-C4)* Un solo panel abierto; se cierra con Escape (foco vuelve al título), click afuera, al elegir y al cambiar de página | Navegador | ✅ CDP: uno a la vez; Escape cierra y el foco vuelve a `menu-boton-minorista`; click afuera, elegir y "atrás" cierran |
| AC-C3 | *(RF-C5)* En `/categoria/anime` Minorista está marcado; en `/negocio`, Mayorista | Navegador | ✅ CDP: `/categoria/anime` → Minorista marcado; `/negocio` → Mayorista marcado |
| AC-C4 | *(RF-C6, RF-C8)* A 375 px: acordeones que abren y cierran con tap, el menú scrollea por dentro con los tres grupos abiertos | Navegador | ✅ CDP táctil a 375×667: tap abre/cierra acordeones; con Minorista abierto el menú mide 496 px y scrollea (623 px de contenido); al fondo se llega a Cotizar |
| AC-C5 | *(RF-C9)* Con un panel o el menú del celular abierto existe `[data-popup-bloqueo]` en el DOM | Navegador | ✅ CDP: `data-popup-bloqueo` en el panel abierto y en el menú del celular |
| AC-C6 | *(RNF-1)* A 375 px: sin scroll horizontal; cada opción mide ≥ 44 px de alto | Navegador (medido) | ✅ CDP a 375 px: 0 px de desborde horizontal; ningún link o botón del menú abierto mide menos de 44 px |
| AC-C7 | *(RNF-2)* A 1024 px: menú + Buscar + Cotizar + Carrito en una línea, sin desborde | Navegador (medido) | ✅ CDP a 1024 px: fila de 76 px (una línea), 0 px de desborde, logo de 44 px (estaba aplastado a 25 px: H-6) |
| AC-C8 | *(RNF-4)* Todo el menú se usa solo con teclado; los botones de grupo tienen `aria-expanded` correcto | Navegador | ✅ CDP: Enter abre, Tab entra al panel, Tab fuera lo cierra, Escape devuelve el foco; `aria-expanded` correcto en cada paso. ⚠️ Sin prueba con VoiceOver |

## Negocio tornasolado

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-T1 | *(RF-T1, RF-T3)* La opción arranca apagada; sin tocarla, el carrito recibe la misma línea que hoy | Test + navegador | ✅ test (sin tornasolado = la misma línea de hoy) + navegador: arranca destildado |
| AC-T2 | *(RF-T2)* La opción muestra "+$20.000" y el total pasa a $72.999 | Navegador | ✅ navegador a 375 px: "+$ 20.000" en la opción, fila "Tornasoladas" y total $72.999 (sin tachado) |
| AC-T3 | *(RF-T4)* Con la opción, el carrito tiene la promo holográfica y el recargo; quitar la promo quita el recargo | Navegador | ✅ navegador: carrito con `negocio:vinilo-holografico:6cm:…` ($52.999) y `fixed:material-holografico:…` ($20.000); "Quitar" en la promo dejó el carrito vacío |
| AC-T4 | *(RF-T5)* El servidor acepta el pedido tornasolado al precio mostrado, con MP y con transferencia; sin el recargo lo rechaza | Test de paridad | ✅ `lineasNegocio.test.js`: MP $72.999, transferencia con el 10 % en cada línea, sin recargo → `recargo_material_faltante` |
| AC-T5 | *(RF-T6)* La nota del pedido dice `Negocio "X": 100u 6cm Vinilo Holográfico (logo…)` | Test | ✅ `lineasNegocio.test.js`: `PEDIDO: Negocio "Bar": 100u 6cm Vinilo Holográfico (logo (1): …)` |

## Analytics

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-A1 | `menu_nav` con `accion: 'abrir'` al abrir un grupo y `accion: 'click'` + `destino` al elegir, con `vista` correcta | `dataLayer` en la consola | ✅ CDP: `{accion:"abrir",grupo:"mayorista",vista:"desktop"}`, `{accion:"click",destino:"/negocio",vista:"desktop"}` y los mismos con `vista:"mobile"` |
| AC-A2 | Ningún `gtag` / `fbq` / `dataLayer` directo en `Header.jsx` | grep | ✅ grep vacío en `Header.jsx`, `MenuPrincipal.jsx` y `NegocioForm.jsx` |

---

## Definition of Done

- [x] Todos los criterios de arriba con resultado real
- [x] `npm test` en verde: 839 pasan, 17 skip (50 archivos)
- [x] Build sin errores: lo corrió Netlify en el deploy de `19b7f986` (el
      bundle de epicalcos.com trae `menu_nav`). No se corrió `npm run build`
      local: regenera `public/sitemap.xml`
- [x] Sin cambios en `config/pricing.js`, `netlify/functions/lib/pricing.js`
      ni en `CartContext.jsx` (último cambio de los tres: spec 032).
      `config/personalizados.js` solo suma `IMAGEN_HOLOGRAFICO` (H-8), ningún
      precio
- [x] `docs/analytics.md` con `menu_nav`; RF-N1 y AC-N1 de la 031 marcados
      como reemplazados
- [x] WIP ajeno sin commitear intacto (spec 030)
- [x] Deploy en verde y menú verificado en producción (ver abajo)

### Producción (16/10/2026)

Deploys `19b7f986` (menú y tornasolado) y `042af5b3` (flotantes, imagen del
recargo, docs), los dos en verde. El mismo arnés CDP corrido contra
**epicalcos.com** —con GA4, Meta, Clarity, `track-cart` y `capture-lead`
bloqueados para no ensuciar la analítica—: **40/40**. A 375 px el menú del
celular llega hasta "Cotizar mis calcos" sin WhatsApp encima.

### Fuera de lo verificado

- ⚠️ Lector de pantalla: el patrón y los atributos están verificados en el
  DOM, pero no se probó con VoiceOver.
- ⚠️ El recargo del **configurador** de /personalizados ahora lleva imagen
  (H-8): es la misma constante y el mismo `addFixed` que se vio en /negocio,
  pero el flujo del configurador no se recorrió (pide subir un archivo a
  Cloudinary).
- ⚠️ "🎁 10% OFF" con el menú abierto: usa la misma clase que WhatsApp y la
  barra de /personalizados (verificados), pero en la prueba no estaba visible
  (aparece solo a quien cerró el popup sin dejar el mail).
