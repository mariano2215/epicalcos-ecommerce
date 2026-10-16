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
| AC-M1 | *(RF-M1)* El menú dice Home · Mayorista · Minorista · Otros productos · Contacto, en ese orden, en compu y en celular | Test + navegador | |
| AC-M2 | *(RF-M3)* Mayorista abre Mayorista +100 calcos (→ /mayorista) y Negocio (→ /negocio) | Navegador | |
| AC-M3 | *(RF-M4, RF-M7)* Minorista abre Personalizados, las 8 categorías con emoji (cada una lleva a su categoría) y Ver todas las categorías (→ /categorias) | Test + navegador | |
| AC-M4 | *(RF-M5)* Otros productos abre Fotos Polaroid y Tatuajes temporales | Navegador | |
| AC-M5 | *(RF-M8)* Ningún texto del menú dice "más vendidas" / "populares" | Test | |
| AC-M6 | *(RF-M9)* Con una sección en `HIDDEN_SECTIONS`, su opción no aparece; un grupo vacío desaparece | Test | |
| AC-M7 | *(RF-M10)* Buscar, Cotizar y Carrito funcionan como antes; Cotizar sigue dentro del menú del celular | Navegador | |

## Menú — comportamiento

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-C1 | *(RF-C1, RF-C2)* En compu el grupo abre con click, con Enter/Espacio y con hover; con el mouse se puede cruzar al panel sin que se cierre | Navegador | |
| AC-C2 | *(RF-C3, RF-C4)* Un solo panel abierto; se cierra con Escape (foco vuelve al título), click afuera, al elegir y al cambiar de página | Navegador | |
| AC-C3 | *(RF-C5)* En `/categoria/anime` Minorista está marcado; en `/negocio`, Mayorista | Navegador | |
| AC-C4 | *(RF-C6, RF-C8)* A 375 px: acordeones que abren y cierran con tap, el menú scrollea por dentro con los tres grupos abiertos | Navegador | |
| AC-C5 | *(RF-C9)* Con un panel o el menú del celular abierto existe `[data-popup-bloqueo]` en el DOM | Navegador | |
| AC-C6 | *(RNF-1)* A 375 px: sin scroll horizontal; cada opción mide ≥ 44 px de alto | Navegador (medido) | |
| AC-C7 | *(RNF-2)* A 1024 px: menú + Buscar + Cotizar + Carrito en una línea, sin desborde | Navegador (medido) | |
| AC-C8 | *(RNF-4)* Todo el menú se usa solo con teclado; los botones de grupo tienen `aria-expanded` correcto | Navegador | |

## Negocio tornasolado

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-T1 | *(RF-T1, RF-T3)* La opción arranca apagada; sin tocarla, el carrito recibe la misma línea que hoy | Test + navegador | |
| AC-T2 | *(RF-T2)* La opción muestra "+$20.000" y el total pasa a $72.999 | Navegador | |
| AC-T3 | *(RF-T4)* Con la opción, el carrito tiene la promo holográfica y el recargo; quitar la promo quita el recargo | Navegador | |
| AC-T4 | *(RF-T5)* El servidor acepta el pedido tornasolado al precio mostrado, con MP y con transferencia; sin el recargo lo rechaza | Test de paridad | |
| AC-T5 | *(RF-T6)* La nota del pedido dice `Negocio "X": 100u 6cm Vinilo Holográfico (logo…)` | Test | |

## Analytics

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-A1 | `menu_nav` con `accion: 'abrir'` al abrir un grupo y `accion: 'click'` + `destino` al elegir, con `vista` correcta | `dataLayer` en la consola | |
| AC-A2 | Ningún `gtag` / `fbq` / `dataLayer` directo en `Header.jsx` | grep | |

---

## Definition of Done

- [ ] Todos los criterios de arriba con resultado real
- [ ] `npm test` en verde (número de tests anotado)
- [ ] `npm run build` sin errores
- [ ] Sin cambios en `config/pricing.js`, `netlify/functions/lib/pricing.js`
      ni en `CartContext.jsx`
- [ ] `docs/analytics.md` con `menu_nav`; RF-N1 de la 031 marcado como
      reemplazado
- [ ] WIP ajeno sin commitear intacto
- [ ] Deploy en verde y menú verificado en producción
