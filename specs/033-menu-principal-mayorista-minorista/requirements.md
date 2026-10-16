# Requirements — Menú principal por tipo de compra (Mayorista / Minorista)

| | |
|---|---|
| **Spec** | `033-menu-principal-mayorista-minorista` |
| **Estado** | `DONE` — implementada el 15–16/10/2026 ("Implementá la spec 033") y validada contra `acceptance.md`. Quedan dos confirmaciones de texto abiertas (§12) |
| **Fecha** | 15/10/2026 |
| **Autor** | Claude Code, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Mariano, 15/10/2026: *"en el HEADER, con las opciones de arriba de todo, quedó
muy confuso"*.

El menú de hoy (spec 031, RF-N1) es **Para negocios · Precios · Con tu diseño ·
Tienda · Preguntas** + el botón **Cotizar**. Mezcla tres cosas distintas al
mismo nivel:

- **lugares** (Para negocios, Tienda),
- **anclas dentro de un lugar** ("Precios" baja a una sección de /negocio,
  "Preguntas" al FAQ del Home),
- y un **nombre de producto que no se entiende solo** ("Con tu diseño").

Además, cosas que el sitio vende no tienen entrada desde el menú: **Mayorista
(+100 calcos)**, **Fotos Polaroid**, **Tatuajes temporales** y **Contacto**
viven solo en el footer. El que entra desde un anuncio de Instagram no
encuentra por dónde ir según lo que quiere comprar: muchas (mayorista) o pocas
(minorista).

En el Home ya existe la misma división (el selector **POR MENOR / POR MAYOR**
del hero, spec 031 enmienda E-1), pero el menú no la repite.

Por otro lado, el Vinilo Holográfico (tornasolado) se vende hoy solo desde el
configurador de /personalizados. En /negocio —donde está el cliente que encarga
100 calcos con su logo— no se puede pedir, aunque el precio ya existe y el
servidor ya lo cobra.

---

## 2. Objetivo

Que el menú de arriba se lea como **una decisión de compra**: Home ·
**Mayorista** · **Minorista** · **Otros productos** · Contacto, cada grupo con
sus opciones adentro. Y que en /negocio se pueda elegir, de forma opcional, el
acabado tornasolado.

**Cómo se sabrá que funcionó**
- Con el evento nuevo del menú (§11) se puede leer qué grupo y qué opción se
  usan, en celular y en compu.
- `select_item` / `add_to_cart` que vienen de /mayorista, /negocio y
  /personalizados no bajan en las dos semanas siguientes al deploy.
- Aparecen pedidos de Negocio en tornasolado.

---

## 3. Scope

- [ ] Menú principal nuevo, en compu y en celular, con este orden y contenido:
  1. **Home**
  2. **Mayorista** → *Mayorista +100 calcos* · *Negocio*
  3. **Minorista** → *Personalizados* · 8 categorías destacadas · *Ver todas las
     categorías*
  4. **Otros productos** → *Fotos Polaroid* · *Tatuajes temporales*
  5. **Contacto**
- [ ] Los grupos se despliegan (submenú) en compu y en celular.
- [ ] El botón **Cotizar**, **Buscar** y **Carrito** se quedan donde están.
- [ ] En /negocio: opción **tornasolado** (Vinilo Holográfico) para la Promo
  Negocio, opcional, con su recargo a la vista.
- [ ] Evento de analytics del menú.

---

## 4. Fuera de scope

- [ ] El **footer** (sigue con sus 4 grupos de la spec 031).
- [ ] El **selector POR MENOR / POR MAYOR** del Home y la página /mayorista.
- [ ] Cambiar **precios**: el tornasolado se cobra con el precio y el recargo
  que ya existen (ver §9).
- [ ] Un ranking real de "categorías más vendidas": no hay dato de ventas por
  categoría (§12).
- [ ] Mega-menú con las 72 categorías: decidido el 15/10/2026, van 8 + "ver
  todas".
- [ ] Rediseño visual del header (colores, logo, tira de anuncios, banner de
  promo, compactado al scrollear).
- [ ] Unificar el código que agrega el recargo holográfico en /personalizados
  con el de /negocio (ver hallazgo H-2 en `design.md`).

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra (celular) | Menú hamburguesa nuevo, con grupos que se despliegan |
| Cliente que compra (compu) | Menú de 5 entradas con submenús |
| Cliente de /negocio | Puede pedir sus 100 calcos en tornasolado |
| Cliente que vuelve (carrito guardado) | *no afectado*: no cambia la forma de ninguna línea que ya exista |
| Mariano (operación) | Los pedidos de Negocio en tornasolado le llegan con el material en la nota del pedido (mail/CRM) y en el título de la línea |
| Sistemas externos (CRM, Meta, MP) | *no afectado* en contrato; el pedido tornasolado viaja como dos líneas que el servidor ya conoce |

---

## 6. User stories

- **US-1** — Como cliente que quiere **muchas** calcos (para revender o para su
  negocio), quiero un lugar en el menú que diga **Mayorista**, para ir directo a
  las opciones de 100 o más sin pasar por la tienda.
- **US-2** — Como cliente que quiere **pocas** calcos, quiero un lugar que diga
  **Minorista** con las categorías y los personalizados, para encontrar mi
  diseño en uno o dos toques.
- **US-3** — Como cliente que busca Polaroid o tatuajes, quiero verlos en el
  menú, para no tener que bajar hasta el footer.
- **US-4** — Como dueño de un negocio, quiero pedir mis 100 calcos con logo en
  **tornasolado**, para que se destaquen, sabiendo antes cuánto suma.
- **US-5** — Como Mariano, quiero que un pedido de Negocio tornasolado me llegue
  diciendo que es tornasolado, para no imprimirlo en vinilo común.

---

## 7. Requisitos funcionales

### Menú — contenido

| ID | Requisito | Prioridad |
|---|---|---|
| RF-M1 | El menú principal muestra, en este orden: **Home · Mayorista · Minorista · Otros productos · Contacto** | 🔴 must |
| RF-M2 | **Home** lleva al inicio; **Contacto**, a la página de contacto. Son links directos, sin submenú | 🔴 must |
| RF-M3 | **Mayorista** despliega: **Mayorista +100 calcos** (página mayorista) y **Negocio** (página de negocios) | 🔴 must |
| RF-M4 | **Minorista** despliega: **Personalizados** (calcos con tu diseño), **8 categorías destacadas** con su emoji y nombre, y **Ver todas las categorías** | 🔴 must |
| RF-M5 | **Otros productos** despliega: **Fotos Polaroid** y **Tatuajes temporales** | 🔴 must |
| RF-M6 | Cada opción de Mayorista y Personalizados lleva una línea corta que explica qué es (ej. "100 calcos con tu logo") | 🟡 should |
| RF-M7 | Las 8 categorías destacadas son las mismas 8 primeras que el Home muestra en "categorías destacadas" hoy: Argentina, Anime, Disney, Escudos de Fútbol, Harry Potter, Marvel, Memes, Los Simpsons. Se pueden cambiar sin tocar el componente | 🔴 must |
| RF-M8 | Ningún texto del menú dice "más vendidas", "populares" ni similar: no hay dato que lo respalde | 🔴 must |
| RF-M9 | Una sección despublicada (interruptor de secciones ocultas) no aparece en el menú; un grupo que queda sin opciones no aparece | 🔴 must |
| RF-M10 | Los botones **Buscar**, **Cotizar** y **Carrito** siguen en el header con el comportamiento de hoy (Cotizar: solo desde compu en el header y dentro del menú en el celular) | 🔴 must |
| RF-M11 | "Precios" y "Preguntas" salen del menú. El FAQ sigue en el Home y en el footer; los precios, en /negocio | 🔴 must |

### Menú — comportamiento

| ID | Requisito | Prioridad |
|---|---|---|
| RF-C1 | **Compu (≥ 1024 px)**: el título del grupo abre su submenú con click/tap, con Enter o Espacio, y al pasar el mouse por encima | 🔴 must |
| RF-C2 | Abierto con el mouse, el submenú no se cierra al cruzar del título al panel, y un click en el título no lo cierra de golpe | 🔴 must |
| RF-C3 | Hay **un solo** submenú abierto a la vez | 🔴 must |
| RF-C4 | El submenú se cierra con: Escape (el foco vuelve al título), click fuera, elegir una opción, o cambio de página | 🔴 must |
| RF-C5 | El título del grupo se marca como activo cuando la página actual es una de sus opciones (incluye cualquier página de categoría para Minorista) | 🟡 should |
| RF-C6 | **Celular (< 1024 px)**: el menú hamburguesa muestra Home, los tres grupos como acordeón (toque para abrir / cerrar), Contacto y, al final, Cotizar | 🔴 must |
| RF-C7 | En el celular, el grupo de la página actual arranca abierto | 🟢 could |
| RF-C8 | En el celular, si el contenido del menú no entra en la pantalla, el menú se scrollea por dentro (el header no se va de la pantalla) | 🔴 must |
| RF-C9 | Mientras un submenú o el menú del celular están abiertos, el popup de bienvenida espera (spec 026) | 🔴 must |

### Negocio tornasolado

| ID | Requisito | Prioridad |
|---|---|---|
| RF-T1 | El formulario de la Promo Negocio ofrece, **opcional y apagado por defecto**, la terminación **tornasolada (Vinilo Holográfico)** | 🔴 must |
| RF-T2 | La opción muestra cuánto suma (**+$20.000** hoy) y, al elegirla, el total del resumen pasa a **$72.999** (precio de la promo + recargo). Los montos salen de la configuración, no del texto | 🔴 must |
| RF-T3 | Sin tornasolado, el pedido es idéntico al de hoy | 🔴 must |
| RF-T4 | Con tornasolado, el carrito muestra la promo (cuyo nombre dice que es holográfica) y el recargo como líneas separadas; sacar la promo saca también el recargo | 🔴 must |
| RF-T5 | El pedido tornasolado se paga y se valida en el servidor sin `price_mismatch`, por Mercado Pago y por transferencia | 🔴 must |
| RF-T6 | La nota del pedido que le llega a Mariano (mail + CRM) dice el negocio, la cantidad, el tamaño, el logo **y que es Vinilo Holográfico** | 🔴 must |
| RF-T7 | El texto de la opción no promete nada que no se haga (ver `docs/business-rules.md` y las reglas de copy: sin boceto con menos de 100; acá son 100, pero tampoco hace falta mencionarlo) | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | a 375 px: sin scroll horizontal; cada opción del menú con target ≥ 44 px |
| RNF-2 | **Una línea en compu** | a 1024 px el menú, Buscar, Cotizar y Carrito entran en una línea sin desbordar |
| RNF-3 | **Performance** | sin scripts nuevos en el `<head>`; el JS que suma el header es solo datos y markup (sin librerías) |
| RNF-4 | **Accesibilidad** | `<nav>` con nombre; títulos de grupo como botones con `aria-expanded` y `aria-controls`; foco visible; usable solo con teclado |
| RNF-5 | **Compatibilidad** | los carritos guardados siguen funcionando: ninguna línea existente cambia de forma |
| RNF-6 | **Sin dependencias nuevas** | — |
| RNF-7 | **El tracking no rompe nada** | todo evento sale por `lib/analytics.js`, en `try/catch` |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Promo Negocio: 100 calcos de 6 cm, un diseño, $52.999 | `business-rules.md` / `config/pricing.js` `NEGOCIO` | no |
| Recargo Vinilo Holográfico: $20.000 por pack de 100, en línea propia | `config/personalizados.js` `RECARGO_HOLOGRAFICO` ↔ servidor `FIXED_PRICES['material-holografico']` | no |
| Pack holográfico solo en 4 y 6 cm | `PACK_HOLOGRAFICO.tamanos` ↔ `HOLOGRAFICO_TAMANOS` | no (6 cm está permitido) |
| Escala por volumen: 100 holográficas = $72.999 | spec 032 | no — coincide con promo + recargo |
| Secciones ocultas | `config/site.js` `HIDDEN_SECTIONS` | no |

⚠️ Precios, promos, cupones o envíos:
- [ ] ~~Cambio espejado en `pricing.js`~~ — **no hace falta**: el tornasolado
      usa líneas que el servidor ya valida (enmienda 26/9/2026 de la spec 023).
- [ ] ~~Cambio espejado en `site.js` ↔ envío del servidor~~ — no se toca el
      bloque de envío.
- [x] **Test de paridad nuevo**: el pedido tornasolado que arma /negocio pasa la
      validación del servidor al precio que muestra el cliente.

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Sección despublicada (ej. /personalizados, /polaroid) | No aparece en el menú; si un grupo queda vacío, el grupo tampoco |
| Una categoría destacada deja de existir en el catálogo | No aparece en el menú (sin link roto) |
| Tablet con pantalla táctil ≥ 1024 px | Los submenús abren con tap (no dependen del hover) |
| Mouse que pasa rápido por el menú | No queda un submenú "pegado" abierto al salir |
| Menú del celular abierto + cambio de página | Se cierra |
| Cliente agrega Negocio tornasolado y después saca solo el recargo | No puede: el recargo no tiene controles propios en el carrito; y si un carrito manipulado llega sin él, el servidor lo rechaza (`recargo_material_faltante`) |
| Cliente agrega dos Negocio tornasolados | Dos pares de líneas independientes, cada una con su recargo |
| Navegador embebido de Instagram | El menú funciona con tap; el evento de analytics no puede romper nada |
| Lector de pantalla | Anuncia "Mayorista, botón, contraído/expandido" |

---

## 11. Analytics necesarios

### Eventos nuevos

| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `menu_nav` | Al abrir un grupo del menú (`accion: 'abrir'`) y al elegir cualquier opción del menú (`accion: 'click'`) | `accion` (`abrir` / `click`), `grupo` (`raiz` / `mayorista` / `minorista` / `otros`), `destino` (ruta elegida; vacío en `abrir`), `vista` (`desktop` / `mobile`) | GA4 (dataLayer). **No** Meta: no es una señal de compra |

### Eventos existentes que cambian

| Evento | Qué cambia | Por qué |
|---|---|---|
| `add_to_cart` | Con tornasolado se disparan dos: la promo (id `negocio:vinilo-holografico:…`) y el recargo. Sin cambios en el código del evento | Es lo que ya pasa con el pack holográfico de /personalizados |
| `cotizar_click` | Ninguno: `origen` sigue siendo `header` / `menu` | — |

### Qué se quiere poder responder

- ¿Qué parte del tráfico del menú elige Mayorista vs. Minorista? ¿Cambia entre
  celular y compu?
- ¿Se abre un grupo y no se elige nada (abrir sin click)? → el grupo confunde.
- ¿Qué categorías del menú se usan? ¿Vale la pena cambiar las 8?
- ¿Cuántos pedidos de Negocio salen en tornasolado?

---

## 12. Preguntas abiertas

- [x] ~~¿Qué muestra Minorista con 72 categorías?~~ → Personalizados + 8
      destacadas + "Ver todas" (Mariano, 15/10/2026).
- [x] ~~¿"Opcional tornasolado" es un link o una opción del formulario?~~ →
      opción del formulario de /negocio (Mariano, 15/10/2026).
- [x] ~~¿Queda el botón Cotizar?~~ → queda (Mariano, 15/10/2026).
- [ ] `REQUIRES CONFIRMATION` — **"Home"** va literal, como en el pedido (las
      migas de pan del sitio dicen "Inicio"). Si prefiere "Inicio", es cambiar
      un texto.
- [ ] `REQUIRES CONFIRMATION` — las 8 categorías destacadas: hoy no hay dato de
      ventas por categoría, así que se toman las del Home. Si Mariano sabe
      cuáles venden más, se cambian en la configuración.
