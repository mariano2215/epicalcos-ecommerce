# Requirements — Cotizador B2B, mayorista por escala y Home B2B a prueba

| | |
|---|---|
| **Spec** | `034-b2b-cotizador-y-mayorista` |
| **Estado** | 🟡 `IMPLEMENTATION` en la rama `feat/034-b2b-conversion` (sin push). Autorizada por Mariano el 17/10/2026: *"Rama aparte, sin push"* + *"A/B apagado"* + *"Mantener la 033"*. **Nada llega a `main` sin su revisión** |
| **Fecha** | 17/10/2026 |
| **Autor** | Claude Code, a partir del segundo "prompt maestro" de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

---

## 0. De dónde sale esta spec

El 17/10/2026 Mariano pegó un pedido de 14 fases ("auditar, optimizar y
priorizar los pedidos mayoristas desde 100 unidades sin perjudicar la venta
minorista"). Es casi el mismo pedido del 5/10/2026, que produjo las specs
**031** (calcos para negocios), **032** (escala por volumen) y **033** (menú).
El discovery (`AUDITORIA_EPICALCOS.md`, en la raíz) encontró que:

- La 031 Fase 1, su enmienda E-1, la 032 Fase 1 y la 033 **ya están
  publicadas**.
- Lo que el pedido pide en las fases 4 a 6 (cotizador con precio real,
  landings que respondan objeciones, mayorista con ahorro demostrable) es la
  **031 Fases 2–4** y la **032 Fase 2**, que están especificadas y sin
  empezar. La escala por volumen existe en el servidor desde el 5/10 pero
  **ningún camino del sitio la usa**: hoy nadie puede comprar 250, 500 o
  1.000 calcos al precio aprobado.

Decisiones de Mariano en la conversación del 17/10/2026:

| Pregunta | Respuesta |
|---|---|
| ¿Cómo se implementa sin la frase del `CLAUDE.md`? | **En una rama aparte, sin push.** Se toma el pedido como "Implementá la 031 Fases 2–4 y la 032 Fase 2" más esta spec para lo que no cubren. Nada llega a producción hasta que lo revise y lo mergee |
| ¿El hero B2B del pedido reemplaza al selector del Home? | **No: A/B apagado.** La variante B2B se construye como experimento apagado, verificable por URL; producción sigue con el Home de hoy |
| ¿Se cambia el menú por el de 7 ítems del pedido? | **No: se mantiene la 033** (publicada el 16/10/2026). Solo se corrigen destinos o rótulos rotos |

Esta spec **no reescribe** la 031 ni la 032: las referencia. Acá vive lo que
el pedido nuevo agrega y las decisiones que cambian algo de aquellas.

---

## 1. Problema

1. **La escala aprobada no se puede comprar.** 250 calcos con logo deberían
   costar $118.999 (spec 032); hoy el sitio no tiene forma de cobrarlos así.
   En `/mayorista` hay que armar packs de exactamente 100 de a uno; en
   `/negocio` solo se compra el caso "un logo, 100, 6 cm".
2. **Un negocio no ve su precio sin escribir.** Fuera de ese caso, todo pasa
   por WhatsApp o el formulario: el que compara proveedores a la noche se va.
3. **`/mayorista` habla de una "promo por tiempo limitado"** que no tiene
   fecha de fin (spec 017) y no muestra el ahorro por cantidad, que es el
   argumento del pedido.
4. **El FAQ del Home publica tres frases que no están respaldadas**: una
   prohibida por Mariano ("archivo perfecto"), una promesa de
   "condiciones especiales" por recompra (N-4 sin responder) y "te ayudamos
   a adaptarlo" (N-5 sin responder). Dice además que el pack mayorista es
   "50 % de descuento", que con la escala deja de ser la regla.
5. **El `fbclid` del anuncio se pierde al navegar.** Si el Píxel no llega a
   cargar (bloqueadores, navegador embebido), la compra viaja a la API de
   conversiones sin `fbc` salvo que el cliente pague en la misma URL a la que
   llegó, cosa que no pasa nunca.
6. **No hay forma de probar un Home B2B sin publicarlo**: con un experimento
   apagado, el override por URL también se apaga.

---

## 2. Objetivo

Que un negocio que llega desde un anuncio o una búsqueda **vea el precio
exacto de su pedido de 100 a 1.000 calcos y lo compre sin hablar con nadie**,
o deje un pedido de presupuesto con su configuración completa si necesita
más; que `/mayorista` venda la escala con el ahorro a la vista; y que quede
lista, apagada, una variante B2B del Home para medir contra la de hoy.

**Cómo se sabrá que funcionó** (hipótesis a medir, no resultados):
- Aparecen pedidos con líneas de escala de 250, 500 y 1.000 calcos.
- `cotizador_start → cotizador_complete → add_to_cart` muestra dónde se cae
  la gente (hoy no hay embudo que mirar).
- Los pedidos de presupuesto llegan con cantidad, tamaño y material.

---

## 3. Scope

- [ ] **Cotizador** en `/negocio` (031 RF-C*, con los ajustes de §7.1)
- [ ] **Tabla de la escala** "Mientras más cantidad, más barato te sale" (031 RF-E*)
- [ ] **Pedidos grandes** (+1.000) con presupuesto y WhatsApp (031 RF-K1)
- [ ] **`/negocio` completa**: usos por rubro, materiales, preguntas de negocio con datos estructurados (031 RF-NE1, RF-U1, RF-M*, RF-F*)
- [ ] **`/mayorista` por escala**: el armador cobra con la escala de 100 a 1.000 en 4 y 6 cm (032 RF de caminos, tarea 2.2) y la página explica oferta, condiciones y plazos
- [ ] **El resumen del pedido** (mail y CRM) rotula las líneas de la escala (032 tarea 2.4)
- [ ] **WhatsApp contextual** en el botón flotante (031 RF-W2)
- [ ] **Cotizar con tres salidas**: precio online, WhatsApp o dejar datos (§7.2, cambia E-1)
- [ ] **Home B2B como A/B apagado**, previsualizable por URL (031 RF-HO*, §7.3)
- [ ] **HTML prerenderizado** de `/negocio` y `/mayorista` (031 RF-SEO1–3)
- [ ] **Alias 301** de URLs para anuncios (031 RF-SEO4)
- [ ] **Atribución**: el `fbclid` del anuncio sobrevive a la navegación (§7.4)
- [ ] **FAQ**: sacar o corregir lo que no está respaldado (§7.5)
- [ ] **Auditoría** `AUDITORIA_EPICALCOS.md` con diagnóstico, cambios, pruebas y pendientes

---

## 4. Fuera de scope

- [ ] **Cualquier cambio de precio, promo, cupón o umbral de envío.** Se usan
      los que están (escala de la 032, transferencia 10 %, umbrales del config).
- [ ] **Cambios en el servidor de pagos.** Las líneas que se emiten ya las acepta.
- [ ] **El menú** (se mantiene la 033).
- [ ] **El configurador de `/personalizados`** (032 tarea 2.3): toca código de
      la spec 023, en curso. Se deja anotado como siguiente paso.
- [ ] **Endpoint propio de presupuesto** (031 D-9): se reemplaza por el
      formulario de `/contacto` precargado (ver `design.md` D-1).
- [ ] **Barra fija móvil** de las páginas B2B (031 RF-B1, 🟡 should): queda
      para una iteración con datos de scroll.
- [ ] **Landing `/calcos-para-packaging`** (031 RF-SEO5, 🟢 could).
- [ ] **UTMs en el pedido guardado y en el CRM**: necesita cambiar el
      servidor de pagos; queda propuesto.
- [ ] **Configuración de GA4 / Meta / Search Console** (son paneles, no repo):
      se deja escrito qué hacer.
- [ ] **Encender el A/B del Home**: es decisión de Mariano, en un commit propio.
- [ ] **Fotos nuevas**: no hay; ninguna sección se monta con imágenes que no
      sean reales (regla vigente).

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Negocio que llega a `/negocio` | Elige cantidad, tamaño, material y diseños; ve total, precio por calco y transferencia; sube su logo y compra |
| Revendedor / comprador por cantidad en `/mayorista` | Arma de 100 a 1.000 calcos del catálogo o propias y paga el precio de la escala |
| Cliente minorista | Sin cambios fuera del Home B2B (apagado) y del FAQ |
| Carrito guardado | Sin cambios: las líneas viejas (`negocio:`, `pack:mayorista100:`, `pack:mayorista:`) se siguen cobrando igual |
| Mariano (operación) | La nota del pedido dice escalón, tamaño, material, razón social, CUIT, diseños y links; los presupuestos llegan por el formulario de contacto con la configuración escrita |

---

## 6. User stories

- **US-1** — Como dueña de un emprendimiento, quiero saber cuánto me salen
  250 calcos con mi logo sin escribirle a nadie.
- **US-2** — Como revendedor, quiero armar 500 calcos del catálogo y pagar el
  precio de 500, no cinco packs de 100.
- **US-3** — Como empresa que necesita 3.000, quiero dejar mis datos con lo
  que elegí y que me contesten con una propuesta.
- **US-4** — Como Mariano, quiero ver el Home B2B con mis propios ojos antes
  de decidir si lo pruebo con tráfico real.
- **US-5** — Como Mariano, quiero que una venta que vino de un anuncio de
  Instagram le llegue a Meta con su click, aunque el Píxel no haya cargado.

---

## 7. Requisitos funcionales

Los de la 031 y la 032 aplican tal como están escritos, salvo lo que se cambia
acá.

### 7.1 Cotizador (ajustes a 031 §7.5)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | Las cuatro elecciones (cantidad, tamaño, material, diseños) vienen **preseleccionadas** con el pedido más común (100 · 6 cm · vinilo blanco · un diseño), así el precio se ve sin tocar nada. Esa configuración cuesta **lo mismo que la Promo Negocio de hoy** | 🔴 must |
| RF-2 | Al tocar **Continuar con mi pedido** aparecen razón social (obligatoria), CUIT (opcional) y la subida de diseños (opcional); **Agregar al carrito** lleva al carrito, igual que el formulario de hoy | 🔴 must |
| RF-3 | **El tornasolado de la spec 033 no se pierde**: es el material holográfico del cotizador, y 100 holográficas cuestan lo mismo que Negocio + tornasolado | 🔴 must |
| RF-4 | Con "Varios diseños", el cliente dice cuántos (2 a 100) y, si quiere, cómo repartirlos. **Sin regla por defecto publicada**: si no lo dice, la nota del pedido dice "reparto a coordinar por WhatsApp" (N-9 sigue sin confirmar; cambió en la implementación, ver bitácora) | 🔴 must |
| RF-5 | Un interruptor en la configuración vuelve a mostrar el formulario de la Promo Negocio en lugar del cotizador, sin deploy de código nuevo más que ese valor | 🔴 must |

### 7.2 Cotizar con tres salidas (cambia 031 RF-CT1)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-6 | Todo botón **Cotizar** despliega, además de WhatsApp y "Dejar mis datos", **"Ver el precio ahora"**, que lleva al cotizador. Va primera: es la única que no depende de que alguien conteste | 🔴 must |
| RF-7 | En `/negocio` y en el Home B2B, el CTA del hero baja directo al cotizador de la página (031 RF-H5): el cotizador ya ofrece WhatsApp y presupuesto | 🔴 must |
| RF-8 | "Pedir presupuesto" (más de 1.000) abre el formulario de contacto con la consulta **armada con la configuración** del cotizador | 🔴 must |

### 7.3 Home B2B (031 §7.11)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-9 | Con el experimento apagado, todo el mundo ve el Home de hoy, y **`?exp_home_b2b=b2b` en la URL muestra la variante B2B** solo en esa visita, sin guardar la elección ni contar una exposición | 🔴 must |
| RF-10 | La variante usa el copy del pedido: **"Tu marca merece calcos que se destaquen."** · "Calcos personalizados en vinilo premium para negocios, emprendimientos y eventos. Con tu logo o diseño, desde 100 unidades." · **Cotizá tus calcos para negocio** · **Explorá la tienda** | 🔴 must |
| RF-11 | El precio del hero dice el de 100 y el de 1.000 por calco, leídos de la escala. Nunca "desde $X" con el precio de 1.000 al lado de "desde 100 unidades" | 🔴 must |
| RF-12 | El camino a la tienda (categorías + Ver tienda + personalizados desde 1 unidad) está en la variante, antes de las preguntas | 🔴 must |
| RF-13 | La variante no suma peso al Home de hoy (se baja aparte) | 🔴 must |

### 7.4 Atribución

| ID | Requisito | Prioridad |
|---|---|---|
| RF-14 | El `fbclid` con el que se llegó se recuerda durante la sesión y se usa para armar el `fbc` del pedido cuando no hay cookie `_fbc` | 🟡 should |
| RF-15 | Si el navegador no deja guardar nada, la compra sigue igual | 🔴 must |

### 7.5 FAQ

| ID | Requisito | Prioridad |
|---|---|---|
| RF-16 | Sale "No hace falta que nos mandes el archivo perfecto" (prohibida, 15/8 y 14/9/2026) | 🔴 must |
| RF-17 | "¿Hacen descuento por recompra?" deja de prometer "condiciones especiales" hasta que Mariano responda N-4: dice la escala (que sí existe) y ofrece WhatsApp | 🔴 must |
| RF-18 | "¿Aceptan mi logo en cualquier formato?" dice la política publicada (revisamos el archivo y avisamos si hay algo para ajustar) en lugar de "te ayudamos a adaptarlo" (N-5) | 🔴 must |
| RF-19 | "¿Cuál es el pedido mínimo para mayorista?" dice la escala real, leída del config | 🔴 must |

### 7.6 `/mayorista`

| ID | Requisito | Prioridad |
|---|---|---|
| RF-20 | El armador vende de **100 a 1.000** calcos en **4 y 6 cm** al precio de la escala; 9 cm no se ofrece (032 §9.4) y se dice que va suelto en la tienda | 🔴 must |
| RF-21 | Si la cantidad elegida cuesta lo mismo que el escalón siguiente, lo dice y ofrece completarlo ("con 240 pagás lo mismo que con 250") | 🔴 must |
| RF-22 | La página dice, antes del armador: qué se compra, desde cuánto, en qué tamaños, que se eligen los diseños (catálogo o propios), la tabla de la escala, plazo de producción, muestra gratis, envío por umbral y medios de pago | 🔴 must |
| RF-23 | Más de 1.000: pedidos grandes con presupuesto | 🔴 must |
| RF-24 | Deja de llamarse "promo por tiempo limitado" una oferta sin fecha | 🔴 must |
| RF-25 | Un link claro a `/negocio` para quien quiere sus calcos con su logo | 🟡 should |

### 7.7 Copy

Rigen 031 RF-CO1…CO5 sin cambios: ningún monto, %, plazo ni cifra escrito a
mano; nada de "archivo perfecto", "boceto" ni "muestra" sin aclarar que es
digital; ningún código de cupón; ortografía RAE.

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | Mobile-first | 375 px sin scroll horizontal; targets de 44 px |
| RNF-2 | Performance | el chunk del Home de hoy no crece más que lo que pesa importar la variante con `lazy()`; ningún script bloqueante |
| RNF-3 | Accesibilidad | grupos de opciones con nombre, precio anunciado con `aria-live`, foco visible |
| RNF-4 | Paridad de precios | todo precio del cotizador y del armador lo verifica un test contra el servidor real, con Mercado Pago y con transferencia |
| RNF-5 | Sin dependencias nuevas | — |
| RNF-6 | Rollback | cotizador: interruptor; Home B2B: ya apagado; `/mayorista`: revert de un commit |
| RNF-7 | Analytics sin PII | ni razón social, ni CUIT, ni nombre de archivo |

---

## 9. Reglas de negocio

| Regla | ¿Se modifica? |
|---|---|
| Escala por volumen (spec 032) | **no** — se usa |
| Transferencia 10 % a todo producto | no |
| Ninguna promo regala el envío | no |
| Promo x100 / Negocio / pack mayorista 50 % | **no** se borran: el servidor los sigue cobrando para carritos guardados. El sitio deja de emitirlos en `/negocio` (con el cotizador encendido) y `/mayorista` |
| Producción 3 a 5 días hábiles con 100+ | no |
| Muestra gratis = vista previa digital con 100+ | no |

- [ ] ~~Requiere cambio espejado en `pricing.js`~~ — **no**
- [x] Requiere test de paridad nuevo (cotizador y armador contra el servidor)

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| 240 calcos en el armador | "Con 240 pagás lo mismo que con 250": botón para completar; no se agrega con 240 |
| 99 calcos en el armador | "Faltan 1 para el mínimo" |
| 1.001 calcos en el armador | No deja pasar de 1.000; muestra pedidos grandes |
| Cotizador sin razón social | No agrega; el campo dice por qué se pide |
| Cotizador con 40 diseños para 100 calcos | Se acepta; el reparto lo escribe el cliente o se coordina por WhatsApp (RF-4) |
| Cotizador sin subir archivos | Agrega igual; la nota dice "diseños por WhatsApp" |
| Carrito guardado con `pack:mayorista100` | Se sigue cobrando igual |
| `?exp_home_b2b=b2b` con el experimento apagado | Muestra la variante en esa carga; al volver sin el parámetro, el control |
| Navegador embebido sin storage | Cotizador, armador y checkout funcionan; sin `fbclid` recordado |
| Escala cambia con la página abierta | El checkout rechaza con "recargá la página" (como cualquier suba) |

---

## 11. Analytics necesarios

| Evento | Cuándo | Parámetros | ¿Nuevo? |
|---|---|---|---|
| `cotizador_start` | primera elección tocada | `pagina` | nuevo |
| `cotizador_complete` | "Continuar con mi pedido" | `cantidad`, `tamano`, `material`, `disenos`, `value` | nuevo |
| `add_to_cart` | agregar desde el cotizador o el armador | se reconoce por el `item_id` (`volumen:…`); `item_list_name` propio necesitaría tocar `CartContext` (no se toca) | existente |
| `cotizar_click` | salida elegida en Cotizar | `via: 'precio' / 'whatsapp' / 'formulario'` | existente, valor nuevo |
| `generate_lead` | formulario enviado | `motivo: 'cotizar'`, `origen: 'cotizador'` | existente, parámetro nuevo |
| `whatsapp_click` | cualquier WhatsApp | contexto por página | existente |
| `faq_open` | abrir una pregunta de negocio | `pregunta_id`, `pagina` | nuevo |
| `experiment_view` | Home con el A/B prendido | `home_b2b`, variante | existente |
| `pack_completed` | armador de `/mayorista` | `units`, `designs`, `value` | existente |

---

## 12. Preguntas abiertas

Para Mariano — ninguna bloquea la rama:

- [ ] **P-1** ¿Se prende el A/B del Home B2B? ¿Con qué reparto? (recomendado: 50/50, 14 días, métrica facturación por sesión)
- [ ] **P-2** N-4 (beneficio por recompra) y N-5 (¿se ajustan logos?) siguen abiertas: el FAQ quedó en lo verificable
- [ ] **P-3** N-6: sin fotos de calcos aplicadas en negocios, los usos van con íconos
- [ ] **P-4** ¿Más de 1.000 solo presupuesto (N-8 A, lo implementado) u online también?
- [ ] **P-5** ¿Se suma el configurador de `/personalizados` a la escala (032 tarea 2.3) junto con la 023?
