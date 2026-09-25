# Requirements — Popup CRO: del mail a la compra

| | |
|---|---|
| **Spec** | `026-popup-embudo-de-compra` |
| **Estado** | `READY FOR REVIEW` |
| **Fecha** | 25/09/2026 |
| **Autor** | Mariano (request) · Claude (redacción) |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías: eso va en `design.md`.

---

## 0. El pedido, resumido

Mariano pidió convertir el popup de bienvenida en un paso del funnel de compra
y no solo en un formulario de newsletter:

```
VISITANTE → MUESTRA INTERÉS → POPUP → DEJA EMAIL → ACTIVA BENEFICIO
→ CONTINÚA COMPRANDO → ADD TO CART → CHECKOUT → PURCHASE
```

Con este orden de prioridad (pedido §37):

1. Disparo inteligente (tiempo, scroll e intención, distinto en celular y compu)
2. Frecuencia (7 días si lo cerró, 30 si dejó el mail, 1 apertura por sesión)
3. Captura de mail con estados claros
4. Pantalla de éxito sin cerrar el popup
5. Activación y persistencia del descuento
6. Selector MATE / TERMO / NOTEBOOK / CELULAR
7. CTA directo a compra
8. Beneficio visible mientras navega
9. Tracking del funnel completo
10. A/B testing preparado, sin prender

La métrica que manda es **revenue per session**, no la tasa de captura de mails.

⚠️ Este pedido **choca con dos decisiones vigentes**: la ventana de 10 minutos
de EPICA10 (spec 017, decisión del 7/9/2026) y la spec 025 (el mismo popup,
cambiado a pack sorpresa, en `READY FOR REVIEW`). Ver §12, P-1 y P-2.

---

## 1. Problema

Lo que pasa hoy con el popup, observable en el sitio:

1. **Aparece por reglas que no miran a la persona.** En el Home salta apenas se
   ve la sección de categorías destacadas. En el resto pide 2.600 px de scroll
   **y** 20 segundos, o intención de salida. No distingue celular de compu ni
   registra señales de interés (productos vistos, búsquedas).
2. **Una vez visto, no vuelve nunca.** Cerrarlo sin dejar el mail y dejarlo
   tienen el mismo efecto: el popup desaparece para siempre en ese navegador.
   Quien lo cerró apurado no tiene cómo volver a abrirlo.
3. **Después del mail no lleva a ningún lado.** El único botón es "Comprar
   ahora", que cierra el popup y deja a la persona donde estaba.
4. **El beneficio vence en 10 minutos y desaparece de la vista.** El contador
   corre en el popup y en el checkout, pero en el medio (catálogo, ficha,
   carrito) no hay nada que le recuerde que tiene 10% OFF. El carrito dice "tu
   cupón (si tenés uno) se aplica en el checkout".
5. **El copy promete algo que la pantalla no muestra.** El popup dice "Ya te lo
   dejamos aplicado en tu carrito", y el carrito no lo muestra: se aplica recién
   en el checkout.
6. **Ofrece el descuento donde no aplica.** EPICA10 solo descuenta calcos
   sueltas del catálogo, y el popup también aparece en personalizados,
   mayorista, negocio, polaroid y tatuajes, donde lo que la persona está mirando
   no tiene descuento.
7. **No se sabe cuánta gente lo ve.** Hoy se mide `generate_lead` y la ventana
   del cupón. No hay evento de vista, de cierre ni de qué hace la persona
   después, así que no hay tasa de captura ni funnel posterior.
8. **Accesibilidad.** No se anuncia como diálogo, el foco no entra al abrirlo,
   no cierra con Escape y el botón de cerrar mide menos de 44 px. El campo de
   mail tiene letra de 15,2 px: en iPhone eso hace zoom al tocarlo.

---

## 2. Objetivo

Que el popup capture el mail **en el momento en que la persona ya mostró
interés**, le active el 10% OFF sin fricción, lo lleve a los productos que
quiere personalizar y le muestre el beneficio hasta que compre.

**Cómo se sabrá que funcionó**

| Métrica | Lectura | Cuándo |
|---|---|---|
| **Revenue per session** (principal) | sesiones con `popup_view` contra el mismo período antes del deploy | 4 semanas |
| Purchase CVR después del popup | `purchase` / sesiones con `popup_view` | 4 semanas |
| Add to cart después del popup | `add_to_cart` en sesiones con `generate_lead` del popup | 4 semanas |
| Ticket promedio | `purchase` con EPICA10 contra sin cupón | 4 semanas |
| Tasa de captura | `generate_lead` (popup) / `popup_view` | desde la semana 1 |
| Bounce rate | no sube más de 2 puntos contra las 4 semanas previas | 4 semanas |

⚠️ Hoy no existe `popup_view`, así que no hay línea de base de tasa de captura.
La comparación antes/después se hace sobre `generate_lead → purchase` y sobre
revenue por sesión del sitio entero.

---

## 3. Scope

- [ ] Disparo por tiempo **o** scroll, con umbrales distintos para celular y
      compu, más señales de intención e intención de salida en compu.
- [ ] Reglas anti-interrupción: no abrir mientras la persona escribe, busca,
      tiene el carrito u otro diálogo abierto, o acaba de agregar un producto.
- [ ] Frecuencia: 7 días si lo cerró, 30 si dejó el mail, nunca después de
      comprar, máximo una apertura automática por sesión.
- [ ] Rutas donde no aparece: todo el camino de pago, y las secciones cuyos
      productos no tienen el 10%.
- [ ] Paso 1: solo el mail, con validación y estados de carga y error.
- [ ] Paso 2: el popup no se cierra; muestra el código activo, un selector de
      qué quiere personalizar y un CTA comercial.
- [ ] Beneficio persistente: un acceso chico y fijo que dice que el 10% está
      activo, y el descuento visible en el carrito.
- [ ] Un acceso manual para reabrir el popup a quien lo cerró.
- [ ] Interruptor para apagar el popup entero.
- [ ] Configuración de umbrales y variantes de A/B lista para prender, apagada.
- [ ] Los eventos de §11 y las marcas de usuario para analizar el funnel.
- [ ] Accesibilidad de diálogo completa.

---

## 4. Fuera de scope

- **La spec 025 (pack sorpresa).** Este pedido la reemplaza (P-1). La oferta
  queda configurable para poder probar el pack después.
- **Cambiar EPICA10**: su porcentaje, su alcance (solo calcos sueltas), su tope
  de acumulación o hacerlo de un solo uso. El servidor sigue validándolo igual.
- **Descuento de monto fijo o con mínimo de compra.** Se deja preparada la forma
  de la configuración del texto, pero el motor de precios hoy solo sabe de
  cupones en %. Un cupón de monto fijo es otra spec, con cambio espejado.
- **Landings nuevas de mate y celular** (P-4).
- **Prender el A/B.** Queda declarado y apagado.
- **Cambiar el upsell del carrito.** Ya existe y cumple lo pedido en §18 (ver
  design §0).
- **Encender GTM** o tocar el snippet de GA4.
- **Deduplicar leads en Notion.** Hoy cada mail enviado crea una fila, igual
  que ahora.
- **El zoom de iPhone en los demás campos del sitio** (checkout incluido). Se
  arregla solo en el popup y se reporta aparte.
- **Intención de salida en celular.** No hay un gesto confiable; el pedido
  mismo pide no usar trucos.
- **El mail que recibe el lead y el estado "Lead 10% OFF" de Notion.** Quedan
  como están.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Visitante nuevo desde Instagram (celular) | Ve el popup a los 15 s o a mitad de página, nunca apenas entra |
| Visitante en compu | 12 s, 30% de scroll, o al ir a cerrar la pestaña |
| Quien cerró el popup | No lo vuelve a ver solo por 7 días; puede reabrirlo desde el acceso manual |
| Quien dejó el mail | Ve su 10% activo mientras navega y en el carrito, y va directo a productos |
| Quien ya tenía EPICA10 guardado | Sigue funcionando igual en el checkout |
| Quien acaba de comprar | No vuelve a ver el popup de primera compra |
| Cliente mirando personalizados / mayorista / negocio | No ve un 10% que no aplica a lo que mira (P-6) |
| Cliente en el checkout | *No afectado*: el popup nunca aparece ahí |
| Carritos guardados | *No afectado*: el carrito no cambia de forma |
| Mariano (operación) | Mismos leads en Notion, CRM y mail que hoy |
| Mercado Pago / servidor de precios | *No afectado* si se acepta P-2 como está propuesta |
| GA4 | Eventos nuevos y dos propiedades de usuario |
| Meta | *No afectado*: `Lead` se sigue mandando igual |

---

## 6. User stories

- **US-1**: Como visitante que llegó desde un anuncio, quiero mirar un rato
  antes de que me pidan algo, para no sentir que me interrumpen apenas entro.
- **US-2**: Como visitante que ya vio varios diseños, quiero que me ofrezcan el
  descuento cuando estoy decidiendo, para tener un motivo para comprar ahora.
- **US-3**: Como visitante, quiero dejar solo mi mail y que el descuento quede
  activo al instante, sin buscar el código en otro lado.
- **US-4**: Como visitante que activó el 10%, quiero ir directo a calcos para lo
  que quiero personalizar, para no arrancar de cero en el catálogo.
- **US-5**: Como cliente con el 10% activo, quiero verlo en el carrito, para
  saber cuánto me ahorro antes de ir a pagar.
- **US-6**: Como visitante que cerró el popup, quiero poder volver a abrirlo si
  me arrepiento.
- **US-7**: Como cliente que acaba de comprar, no quiero que me ofrezcan un
  descuento de primera compra.
- **US-8**: Como Mariano, quiero saber si el popup aumenta la facturación por
  sesión, no solo si junta mails.
- **US-9**: Como Mariano, quiero apagar el popup o cambiar sus tiempos tocando
  una línea de configuración.

---

## 7. Requisitos funcionales

### Disparo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | En **compu**, el popup se abre solo cuando se cumple lo primero de: **12 s** en el sitio durante la sesión, o **30%** de scroll en la página actual. | 🔴 must |
| RF-2 | En **celular**, lo primero de: **15 s** en el sitio, o **50%** de scroll. | 🔴 must |
| RF-3 | También se abre por **intención**: 2 fichas de producto distintas vistas en la sesión, una búsqueda hecha, o una categoría abierta navegando (la página de entrada no cuenta). | 🔴 must |
| RF-4 | En **compu**, también por **intención de salida** (el mouse sale por arriba de la ventana), después de 5 s en el sitio. En celular no existe este disparo. | 🟡 should |
| RF-5 | Ningún disparo abre el popup antes de **5 s** de cargada la página. | 🔴 must |
| RF-6 | Todos los umbrales (tiempos, porcentajes, cantidad de productos, días de espera) se cambian desde un solo lugar de configuración. | 🔴 must |

### Anti-interrupción

| ID | Requisito | Prioridad |
|---|---|---|
| RF-7 | Si al cumplirse un disparo la persona está en alguna de estas situaciones, el popup **espera** a que termine y abre 3 s después: escribiendo en cualquier campo (incluye el buscador y el teclado abierto en celular), con el carrito abierto, con el buscador u otro diálogo abierto, con el menú del celular abierto, acaba de agregar un producto al carrito, o con la pestaña en segundo plano. | 🔴 must |
| RF-8 | Si mientras espera la persona entra al camino de pago, el popup no se abre ahí; se abre en la próxima página permitida si sigue en la misma sesión. | 🟡 should |

### Dónde no aparece

| ID | Requisito | Prioridad |
|---|---|---|
| RF-9 | Nunca aparece (ni solo ni el acceso manual) en carrito, checkout y las pantallas de resultado del pago (éxito, transferencia, pendiente, error). | 🔴 must |
| RF-10 | No se abre solo, ni muestra el acceso manual, en las secciones cuyos productos no tienen el 10%: personalizados, mayorista, negocio, polaroid, tatuajes, archivos imprimibles y arma tu pack (P-6). | 🟡 should |

### Frecuencia

| ID | Requisito | Prioridad |
|---|---|---|
| RF-11 | Máximo **una apertura automática por sesión**. Recargar la página no lo vuelve a abrir solo. | 🔴 must |
| RF-12 | Si lo cerró sin dejar el mail (o lo vio y se fue sin cerrarlo), no se abre solo por **7 días**. | 🔴 must |
| RF-13 | Si dejó el mail, no se abre solo por **30 días**, y nunca mientras tenga el 10% activo. | 🔴 must |
| RF-14 | Después de una compra confirmada en el sitio, no se vuelve a abrir solo. | 🔴 must |
| RF-15 | Si el navegador no deja guardar datos, el popup **no se abre solo** (no hay forma de respetar la frecuencia). El acceso manual sigue funcionando. | 🔴 must |
| RF-16 | Quien ya vio el popup antes de este cambio conserva su historial: si tiene el cupón guardado cuenta como que dejó el mail; si no, como que lo cerró, con los 7 días contados desde su primera visita posterior al deploy. | 🔴 must |

### Paso 1: captura

| ID | Requisito | Prioridad |
|---|---|---|
| RF-17 | Pide **solo el mail**. Jerarquía: descuento, beneficio, campo, botón, aclaración. | 🔴 must |
| RF-18 | Copy: título "Tenés 10% OFF en tu primer pedido 🎁", bajada "Elegí tus calcos favoritas y usá tu descuento en tu primera compra.", botón "Activar mi 10% OFF", aclaración "Te mandamos novedades y promos. Podés darte de baja cuando quieras." | 🔴 must |
| RF-19 | El porcentaje y el código que muestra el popup salen de la configuración de cupones que ya usa el checkout, no se escriben a mano en el texto. | 🔴 must |
| RF-20 | Mail con formato inválido → "Ingresá un email válido." sin llamar al servidor. | 🔴 must |
| RF-21 | Error del servidor, de red o demora mayor a 10 s → "No pudimos activar el descuento. Intentá nuevamente." El popup **no se cierra** y el mail escrito queda en el campo. | 🔴 must |
| RF-22 | Mientras se envía, el botón muestra que está cargando y no se puede enviar dos veces. | 🔴 must |
| RF-23 | El lead se sigue registrando igual que hoy: Notion, CRM interno, aviso interno y mail con el código al cliente. | 🔴 must |

### Paso 2: éxito

| ID | Requisito | Prioridad |
|---|---|---|
| RF-24 | Al registrar el mail, el popup **no se cierra**: cambia en el lugar a "🎉 ¡Listo! Tu 10% OFF ya está activo", con el código a la vista. | 🔴 must |
| RF-25 | El código tiene un botón **Copiar**. Si el navegador no deja copiar, el código queda seleccionable a mano. | 🟡 should |
| RF-26 | Debajo del código, una línea aclara que se aplica solo en el checkout y a qué productos vale (P-5). | 🟡 should |
| RF-27 | "¿Qué querés personalizar?" con 4 opciones: 🧉 Mate, ☕ Termo, 💻 Notebook, 📱 Celular. Tocar una lleva directo a los productos para ese uso y cierra el popup. | 🔴 must |
| RF-28 | Cada opción lleva a una **página que ya existe** (P-4). | 🔴 must |
| RF-29 | El botón principal es "Elegir mis calcos →". Si la persona está en el Home o en una página sin productos, la lleva al catálogo; si ya está en una categoría, ficha o landing, cierra el popup y la deja seguir donde estaba. | 🔴 must |
| RF-30 | Si el carrito tiene productos, aparece además un link secundario "Ya tengo calcos en el carrito: ir a pagar" que lleva al checkout. | 🟡 should |
| RF-31 | La ✕ de cerrar sigue visible en los dos pasos, pero nunca más destacada que el botón principal. | 🔴 must |

### Beneficio activo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-32 | Con el 10% activo, el checkout lo aplica solo, como hoy. | 🔴 must |
| RF-33 | Con el 10% activo, en todas las páginas permitidas se ve un acceso chico y fijo "🎁 10% OFF activo" que no tapa contenido ni al botón de WhatsApp. Tocarlo reabre el popup en el paso 2. | 🔴 must |
| RF-34 | Quien cerró el popup sin dejar el mail ve el mismo acceso con "🎁 10% OFF", que reabre el paso 1. Solo abre con un toque. | 🟡 should |
| RF-35 | En el carrito lateral y en la página de carrito, con el 10% activo y productos que lo reciben, se ve "🎁 Tu 10% OFF está activo" y la línea con el monto que descuenta. El total que se muestra es el mismo que la persona va a ver al entrar al checkout pagando con Mercado Pago. | 🟡 should |
| RF-36 | Si el monto no se puede mostrar con certeza (por ejemplo, el carrito no tiene productos que lo reciban), se muestra solo el aviso, sin números. Nunca se muestra un descuento que el checkout después no aplique. | 🔴 must |

### Después de comprar

| ID | Requisito | Prioridad |
|---|---|---|
| RF-37 | Al llegar a la pantalla de compra exitosa o de pedido por transferencia, el sitio registra que esa persona compró y deja de ofrecerle el popup y el acceso manual. | 🔴 must |
| RF-38 | Después de comprar, el checkout deja de autocompletar el código del popup (P-3). Escrito a mano sigue valiendo, como hoy. | 🟡 should |

### Interruptor y A/B

| ID | Requisito | Prioridad |
|---|---|---|
| RF-39 | Con un interruptor se apaga el popup entero (apertura automática y acceso manual). El 10% de quien ya lo tiene sigue funcionando en el checkout y en el carrito. | 🔴 must |
| RF-40 | Quedan declaradas tres variantes de disparo (12 s como control, 8 s, solo scroll/intención) que se prenden con un cambio de configuración. Mientras estén apagadas, todos reciben el control. | 🟡 should |
| RF-41 | La oferta que muestra el popup se describe en configuración (tipo, código, ventana), para que cambiar de oferta no obligue a reescribir la pantalla. | 🟡 should |

### Accesibilidad

| ID | Requisito | Prioridad |
|---|---|---|
| RF-42 | El popup se anuncia como diálogo modal con su título. | 🔴 must |
| RF-43 | Al abrir, el foco va al título del popup (no al campo: en celular abriría el teclado sin que la persona lo pida). | 🔴 must |
| RF-44 | El foco no sale del popup con Tab; Escape lo cierra; al cerrar, el foco vuelve a donde estaba. | 🔴 must |
| RF-45 | Al pasar al paso 2, el lector de pantalla anuncia el éxito. | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | a 375 px: sin scroll horizontal, margen lateral visible, no ocupa toda la altura, campo y botón de 48 px de alto, letra del campo de 16 px (sin zoom en iPhone) |
| RNF-2 | **Teclado** | con el teclado abierto en iPhone y Android, el botón "Activar mi 10% OFF" queda visible sin scrollear |
| RNF-3 | **Performance** | el código visual del popup no baja con la página: se carga cuando el disparo se arma. Cero scripts o peticiones nuevas al cargar. El LCP del Home no cambia |
| RNF-4 | **Estabilidad visual** | el acceso fijo no mueve el layout (CLS 0 atribuible) |
| RNF-5 | **Accesibilidad** | targets de 44 px, foco visible, sin animaciones con `prefers-reduced-motion` |
| RNF-6 | **Nunca rompe la venta** | ningún fallo del popup, del storage o del tracking impide agregar al carrito ni pagar |
| RNF-7 | **Instagram / storage bloqueado** | sin errores en consola que corten la app; el popup no se abre solo |
| RNF-8 | **Compatibilidad** | carritos guardados y el EPICA10 guardado siguen funcionando |
| RNF-9 | **Sin dependencias nuevas** | foco, diálogo y A/B con código propio |
| RNF-10 | **Sin PII** | ningún evento ni URL lleva el mail |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| El popup entrega `EPICA10` y queda guardado para el checkout | `business-rules.md` "Popup de bienvenida" | no (se agrega cuándo aparece y qué pasa después) |
| EPICA10: 10% solo sobre calcos sueltas del catálogo, acumulable con transferencia y 3x2, tope 20% | `business-rules.md` §2, §3 | no |
| Ventana de 10 min por usuario para el EPICA10 del popup | `business-rules.md` §3.4, spec 017 | **sí, si se acepta P-2**: el popup deja de arrancar la ventana |
| EPICA10 escrito a mano no vence | `business-rules.md` §2 | no |
| Experimentos solo de presentación, nunca de precio | `business-rules.md` "A/B testing" | no: se testea **cuándo** aparece el popup |

**Reglas nuevas del popup**

- Aparece como máximo una vez por sesión, nunca antes de 5 s, nunca en el
  camino de pago, nunca después de una compra.
- Espera: 7 días si se cerró, 30 si se dejó el mail. Con el 10% activo no se
  abre solo.
- "Primer pedido" es una promesa de copy: el sistema no verifica que sea la
  primera compra (hoy tampoco). Del lado del navegador, después de comprar se
  deja de autocompletar.

**Espejo de precios**

- [ ] ~~Cambio espejado en los dos `pricing.js`~~: con P-2 como está propuesta,
      la ventana se deja de arrancar desde el popup y la validación del
      servidor no cambia (un EPICA10 sin instante de emisión ya vale hoy)
- [ ] ~~Cambio espejado de envíos~~
- [x] Test nuevo: el código que devuelve el servidor al capturar el lead es el
      mismo que muestra el popup, y existe en los cupones de los dos lados

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Llega de Instagram directo a una categoría | La categoría de entrada no cuenta como intención. A los 15 s o al 50% de scroll, si no está haciendo otra cosa |
| Llega a una ficha, navega a otra ficha a los 3 s | Cumple 2 productos, pero espera a los 5 s de cargada la página |
| Busca "boca" en el buscador | Mientras el campo tiene foco no abre. 3 s después de salir del campo, abre |
| Toca "+" en la grilla y se abre el carrito | No abre mientras el carrito esté abierto ni en los 3 s siguientes a cerrarlo |
| Página más corta que la pantalla | El scroll no puede disparar; quedan tiempo, intención y salida |
| Pestaña en segundo plano cuando se cumplen los 12 s | Abre 3 s después de volver a la pestaña |
| Cierra el popup y recarga | No se abre solo. Ve el acceso manual "🎁 10% OFF" |
| Cierra con Escape, con la ✕ o tocando afuera | Cuenta como cerrado (7 días) |
| Deja un mail inválido ("hola@") | "Ingresá un email válido.", sin llamar al servidor |
| Sin conexión al enviar | Mensaje de error, el popup queda abierto con el mail escrito |
| El servidor tarda más de 10 s | Se corta, mensaje de error, puede reintentar |
| Deja el mail estando en una ficha y toca "Elegir mis calcos" | Se cierra el popup y sigue en la ficha |
| Deja el mail en el Home y toca "Elegir mis calcos" | Va al catálogo |
| Elige 📱 Celular | Va a la página definida en P-4 |
| Tiene el 10% activo y el carrito solo con personalizados | El carrito muestra el aviso sin monto: esos productos no reciben el 10% |
| Tiene el 10% activo y paga por transferencia | El checkout muestra la suma real (10% + 10% con tope del 20%), igual que hoy. El carrito mostró el monto de Mercado Pago, que es el medio por defecto |
| Navegador de Instagram con storage bloqueado | El popup no se abre solo; si lo abre a mano y deja el mail, el código se muestra y el checkout lo acepta si lo escribe |
| Ya tenía el popup visto antes del deploy, sin cupón | Vuelve a ser elegible 7 días después de su primera visita posterior al deploy |
| Ya tenía EPICA10 guardado con la ventana vencida | Sigue vencido, como se le prometió; el acceso manual le ofrece activarlo de nuevo |
| Compra y vuelve al sitio al día siguiente | Sin popup ni acceso manual. Si escribe EPICA10 a mano, vale |
| Paga en Mercado Pago y no vuelve al sitio | El navegador no se entera de la compra: sigue con el 10% activo y el acceso fijo, y el popup no se abre solo mientras lo tenga |
| Interruptor apagado con el popup abierto | Al recargar ya no aparece. El 10% activo sigue funcionando |
| El visitante tiene el sitio viejo cargado al deployar | Sigue con el popup viejo hasta recargar. El servidor responde igual a los dos |

---

## 11. Analytics necesarios

### Eventos nuevos

| Evento | Cuándo | Parámetros | Destino |
|---|---|---|---|
| `popup_view` | el popup se abre (solo o a mano) | `popup_variant`, `popup_trigger`, `page_path`, `device_type`, `new_vs_returning` | GA4 |
| `popup_close` | se cierra sin navegar | `popup_variant`, `popup_step` (`capture` · `success`), `close_method` (`x` · `esc` · `overlay`) | GA4 |
| `popup_email_submit` | se envía un mail con formato válido (antes de la respuesta del servidor) | `popup_variant`, `discount_type`, `page_path`, `device_type` | GA4 |
| `popup_interest_selected` | elige Mate, Termo, Notebook o Celular | `popup_variant`, `interest`, `destination` | GA4 |
| `popup_cta_click` | toca "Elegir mis calcos" o "ir a pagar" | `popup_variant`, `destination` (`catalog` · `stay` · `checkout`) | GA4 |

`popup_trigger`: `time` · `scroll` · `product_views` · `search` · `category` ·
`exit_intent` · `manual`.

### Eventos existentes que cambian

| Evento | Qué cambia | Por qué |
|---|---|---|
| `generate_lead` (`lead_source: 'welcome_popup'`) | suma `popup_variant`, `popup_trigger`, `device_type`. **Es la conversión del popup**: no se crea un `popup_conversion` aparte | es el evento recomendado de GA4 para leads y ya dispara `Lead` en Meta; duplicarlo contaría dos veces la misma conversión y cortaría la serie histórica |
| `cupon_emitido` | sin cambios | sigue siendo el denominador de la ventana |
| `cupon_vencido` | deja de dispararse desde el popup si se acepta P-2 | sin ventana no hay vencimiento |

### Propiedades de usuario (GA4)

| Propiedad | Valor | Se setea |
|---|---|---|
| `popup_exposed` | `'true'` | con el primer `popup_view`, y en cada carga posterior |
| `popup_converted` | `'true'` | con el `generate_lead` del popup, y en cada carga posterior |

Sirven para segmentar `add_to_cart`, `begin_checkout` y `purchase` sin PII.

### Qué se quiere poder responder

- ¿Qué parte de los que ven el popup deja el mail? (`generate_lead` / `popup_view`)
- ¿Cuántos envíos fallan? (`popup_email_submit` − `generate_lead`)
- ¿Qué disparo trae a la gente que después compra? (`purchase` por `popup_trigger`)
- ¿Qué interés elige la gente y cuál convierte? (`popup_interest_selected`)
- ¿Los que dejan el mail compran más y con ticket más alto? (`purchase` con `popup_converted`)
- ¿Revenue por sesión antes y después? ¿Por variante, cuando se prenda el A/B?
- ¿Se cierra más en celular que en compu? (`popup_close` / `popup_view` por `device_type`)

Sin mail ni ningún dato del lead en el `dataLayer`. `page_path` es solo la ruta,
sin parámetros de URL.

⚠️ **Acción de Mariano en GA4**: registrar como dimensiones personalizadas los
parámetros de evento y las dos propiedades de usuario. Sin eso GA4 los recibe
pero no deja usarlos en informes.

---

## 12. Preguntas abiertas

Cada una tiene una **propuesta por defecto**, que es la que usa el diseño. Si
Mariano no la cambia, se implementa así.

- [ ] **P-1: ¿Qué pasa con la spec 025 (pack sorpresa)?** Las dos cambian el
      mismo popup en direcciones opuestas: la 025 saca el 10% y ofrece un pack;
      esta arma el funnel alrededor del 10%.
      *Propuesta*: esta spec **reemplaza** a la 025, que pasa a `DISCARDED` con
      el motivo escrito. La oferta queda en configuración (RF-41), así el pack
      se puede probar más adelante como otra oferta sobre este mismo popup, en
      una spec chica.

- [ ] **P-2: ¿Se mantiene la ventana de 10 minutos del EPICA10 del popup?**
      Este pedido manda a la persona a elegir varias calcos y muestra el 10%
      mientras navega. Con 10 minutos, el recorrido que se busca (elegir,
      agregar varias, pagar) apura la compra y achica el carrito, que es lo
      contrario del objetivo de ticket promedio. Además, el mismo código llega
      por mail **sin ventana**, y escrito a mano no vence: la ventana solo le
      llega a quien no abre el mail.
      *Propuesta*: **el popup deja de arrancar la ventana**. El 10% queda activo
      hasta que compra. No cambia ningún precio ni el servidor: un EPICA10 sin
      instante de emisión ya vale hoy. La ventana queda como opción de
      configuración de la oferta, por si se quiere volver.
      ⚠️ Revierte la decisión del 7/9/2026. Costo: más pedidos con el 10%
      encima del 3x2 y de la transferencia (hasta el tope del 20%). Se mide con
      `cupon_aplicado_en_promo`, que ya existe.

- [ ] **P-3: ¿Qué pasa con el cupón guardado después de comprar?** Hoy el
      checkout lo autocompleta en cada compra futura desde ese navegador. Sin
      ventana (P-2), sería un 10% permanente.
      *Propuesta*: después de una compra confirmada, el navegador **olvida** el
      código del popup. Escrito a mano sigue valiendo, como hoy.

- [ ] **P-4: ¿A dónde lleva cada interés?** Existen `/calcos-termo` y
      `/calcos-notebook`. **No existen** páginas de mate ni de celular.
      *Propuesta*:
      | Interés | Destino | Por qué |
      |---|---|---|
      | 🧉 Mate | `/calcos-termo` | la landing ya habla del mate y recomienda 6 cm, el tamaño que la guía indica para mate |
      | ☕ Termo | `/calcos-termo` | coincide |
      | 💻 Notebook | `/calcos-notebook` | coincide |
      | 📱 Celular | `/categorias` con la grilla en **4 cm** | la guía de tamaños dice 4 cm para celular; el tamaño elegido ya se recuerda para toda la grilla |
      Si `popup_interest_selected` muestra volumen en mate o celular, se
      justifica una landing propia en otra spec.

- [ ] **P-5: ¿Se aclara a qué productos aplica el 10%?** EPICA10 solo descuenta
      calcos sueltas del catálogo. Quien arma un carrito de personalizados o
      packs ve $0 de descuento en el checkout.
      *Propuesta*: **sí**, una línea chica en el paso 2, debajo del código: "Se
      aplica solo en el checkout. Vale para las calcos del catálogo." El paso 1
      no se toca.

- [ ] **P-6: ¿Se saca el popup de las secciones donde el 10% no aplica?**
      Personalizados, mayorista, negocio, polaroid, tatuajes, imprimibles y
      arma tu pack.
      *Propuesta*: **sí**. Ofrecer ahí un descuento que no se aplica a lo que la
      persona está mirando es una promesa rota en el checkout. Si navega a una
      página permitida en la misma sesión, el disparo sigue su curso.

- [ ] **P-7: "Podés darte de baja cuando quieras".** No hay link de baja en el
      mail del cupón; hoy la baja es respondiendo el mail.
      *Propuesta*: mantener el texto (es cierto si la baja se atiende a mano). Si
      las novedades se mandan desde una herramienta con link de baja, ya está
      cubierto.
