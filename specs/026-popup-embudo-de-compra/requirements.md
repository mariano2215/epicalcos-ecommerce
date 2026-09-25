# Requirements — Popup CRO: del mail a la compra

| | |
|---|---|
| **Spec** | `026-popup-embudo-de-compra` |
| **Estado** | `IN PROGRESS` — implementada; falta QA en dispositivos reales (ver `acceptance.md`) |
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

### Decisiones de Mariano (25/09/2026)

| Tema | Decisión |
|---|---|
| Acumulación | El 10% **sigue acumulable** con el 3x2 y con el 10% por transferencia (tope del 20%, como hoy) |
| P-1 · spec 025 | Sin respuesta: rige la propuesta, la 026 reemplaza a la 025 |
| P-2 · ventana de 10 min | **Se saca** |
| P-3 · el cupón después de comprar | **Sigue valiendo** y el checkout lo sigue aplicando solo: "la idea es que compren al final" |
| P-4 · mate y celular | Van a **categorías**, sin tamaño preelegido: la persona elige tamaño y diseño |
| P-5 · aclarar a qué aplica | **Sí**, con la línea propuesta |
| P-6 · dónde aparece | El popup aparece **solo en el Home** |
| P-7 · "darte de baja" | **Se deja** como está |

Los requisitos de abajo ya incorporan estas decisiones.

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

⚠️ Con el popup solo en el Home (P-6), `generate_lead` del popup va a depender
de cuánta gente pasa por el Home. Si el tráfico de anuncios entra sobre todo por
categorías y fichas, el volumen de leads puede bajar respecto de hoy aunque la
tasa de captura suba. Se mira la primera semana (design §10).

---

## 3. Scope

- [ ] Disparo **solo en el Home**, por tiempo **o** scroll, con umbrales
      distintos para celular y compu, más señales de intención e intención de
      salida en compu.
- [ ] Reglas anti-interrupción: no abrir mientras la persona escribe, busca,
      tiene el carrito u otro diálogo abierto, o acaba de agregar un producto.
- [ ] Frecuencia: 7 días si lo cerró, 30 si dejó el mail, nunca después de
      comprar, máximo una apertura automática por sesión.
- [ ] El popup se abre (solo o a mano) únicamente en el Home.
- [ ] Sacar la ventana de 10 minutos del EPICA10 que entrega el popup.
- [ ] Paso 1: solo el mail, con validación y estados de carga y error.
- [ ] Paso 2: el popup no se cierra; muestra el código activo, un selector de
      qué quiere personalizar y un CTA comercial.
- [ ] Beneficio persistente: un acceso chico y fijo que dice que el 10% está
      activo, y el descuento visible en el carrito.
- [ ] Un acceso manual en el Home para reabrir el popup a quien lo cerró.
- [ ] Interruptor para apagar el popup entero.
- [ ] Configuración de umbrales y variantes de A/B lista para prender, apagada.
- [ ] Los eventos de §11 y las marcas de usuario para analizar el funnel.
- [ ] Accesibilidad de diálogo completa.

---

## 4. Fuera de scope

- **La spec 025 (pack sorpresa).** Este pedido la reemplaza (P-1). La oferta
  queda configurable para poder probar el pack después.
- **Cambiar EPICA10**: su porcentaje, su alcance (solo calcos sueltas), su
  acumulación (sigue sumándose al 3x2 y a la transferencia, tope 20%) o hacerlo
  de un solo uso. El servidor sigue validándolo igual.
- **El popup fuera del Home** (P-6).
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
| Visitante nuevo que entra por el Home (celular) | Ve el popup a los 15 s o a mitad de página, nunca apenas entra |
| Visitante en compu, en el Home | 12 s, 30% de scroll, o al ir a cerrar la pestaña |
| Visitante que entra directo a una categoría, ficha o landing | No ve el popup mientras no pase por el Home. Si ya tiene el 10%, ve el acceso fijo |
| Quien cerró el popup | No lo vuelve a ver solo por 7 días; puede reabrirlo desde el acceso manual del Home |
| Quien dejó el mail | Ve su 10% activo mientras navega y en el carrito, y va directo a productos |
| Quien ya tenía EPICA10 guardado | Sigue funcionando igual en el checkout |
| Quien acaba de comprar | No vuelve a ver el popup. Si tenía el 10%, lo sigue teniendo para la próxima compra |
| Cliente mirando personalizados / mayorista / negocio | No ve el popup ni el acceso fijo del 10%, que ahí no aplica |
| Cliente en el checkout | *No afectado*: el popup nunca aparece ahí |
| Carritos guardados | *No afectado*: el carrito no cambia de forma |
| Mariano (operación) | Mismos leads en Notion, CRM y mail que hoy |
| Mercado Pago / servidor de precios | *No afectado*: sacar la ventana no cambia la validación (ver §9) |
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
- **US-10**: Como cliente que ya compró con el 10%, quiero que me siga valiendo
  en la próxima compra.

---

## 7. Requisitos funcionales

### Disparo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | En **compu**, estando en el **Home**, el popup se abre solo cuando se cumple lo primero de: **12 s** en el sitio durante la sesión, o **30%** de scroll del Home. | 🔴 must |
| RF-2 | En **celular**, estando en el Home, lo primero de: **15 s** en el sitio, o **50%** de scroll del Home. | 🔴 must |
| RF-3 | También se abre por **intención**, estando en el Home: 2 fichas de producto distintas vistas en la sesión, una búsqueda hecha, o una categoría abierta navegando (la página de entrada no cuenta). Las señales se juntan en cualquier página; el popup solo se abre en el Home. | 🔴 must |
| RF-4 | En **compu**, también por **intención de salida** (el mouse sale por arriba de la ventana del Home), después de 5 s en el sitio. En celular no existe este disparo. | 🟡 should |
| RF-5 | Ningún disparo abre el popup antes de **5 s** de haber llegado al Home. | 🔴 must |
| RF-6 | Todos los umbrales (tiempos, porcentajes, cantidad de productos, días de espera) se cambian desde un solo lugar de configuración. | 🔴 must |

### Anti-interrupción

| ID | Requisito | Prioridad |
|---|---|---|
| RF-7 | Si al cumplirse un disparo la persona está en alguna de estas situaciones, el popup **espera** a que termine y abre 3 s después: escribiendo en cualquier campo (incluye el buscador y el teclado abierto en celular), con el carrito abierto, con el buscador u otro diálogo abierto, con el menú del celular abierto, acaba de agregar un producto al carrito, o con la pestaña en segundo plano. | 🔴 must |
| RF-8 | Si mientras espera la persona sale del Home, el popup no se abre en otra página; se abre la próxima vez que vuelva al Home en la misma sesión. | 🟡 should |

### Dónde aparece

| ID | Requisito | Prioridad |
|---|---|---|
| RF-9 | El popup se abre **solo en el Home**, tanto solo como a mano (P-6). En ninguna otra página se abre. | 🔴 must |
| RF-10 | El acceso fijo del 10% activo (RF-33) no se muestra en carrito, checkout, pantallas de resultado del pago (éxito, transferencia, pendiente, error) ni en las secciones cuyos productos no tienen el 10%: personalizados, mayorista, negocio, polaroid, tatuajes, archivos imprimibles y arma tu pack. | 🔴 must |

### Frecuencia

| ID | Requisito | Prioridad |
|---|---|---|
| RF-11 | Máximo **una apertura automática por sesión**. Recargar la página no lo vuelve a abrir solo. | 🔴 must |
| RF-12 | Si lo cerró sin dejar el mail (o lo vio y se fue sin cerrarlo), no se abre solo por **7 días**. | 🔴 must |
| RF-13 | Si dejó el mail, no se abre solo por **30 días**, y nunca mientras tenga el 10% activo. Como el 10% ya no vence (P-2, P-3), en la práctica quien dejó el mail no lo vuelve a ver solo, salvo que borre los datos del navegador. | 🔴 must |
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
| RF-26 | Debajo del código: "Se aplica solo en el checkout. Vale para las calcos del catálogo." (P-5) | 🔴 must |
| RF-27 | "¿Qué querés personalizar?" con 4 opciones: 🧉 Mate, ☕ Termo, 💻 Notebook, 📱 Celular. Tocar una lleva directo a los productos para ese uso y cierra el popup. | 🔴 must |
| RF-28 | Destinos (P-4): Termo → landing de termo; Notebook → landing de notebook; Mate y Celular → catálogo de categorías, **sin tamaño preelegido**, para que elija tamaño y diseño. | 🔴 must |
| RF-29 | El botón principal es "Elegir mis calcos →" y lleva al catálogo de categorías (el popup solo vive en el Home). | 🔴 must |
| RF-30 | Si el carrito tiene productos, aparece además un link secundario "Ya tengo calcos en el carrito: ir a pagar" que lleva al checkout. | 🟡 should |
| RF-31 | La ✕ de cerrar sigue visible en los dos pasos, pero nunca más destacada que el botón principal. | 🔴 must |

### Beneficio activo

| ID | Requisito | Prioridad |
|---|---|---|
| RF-32 | El 10% que entrega el popup **no vence** (P-2). El checkout lo aplica solo en esa compra y en las siguientes desde ese navegador (P-3), sumado al 3x2 y a la transferencia como hoy. | 🔴 must |
| RF-33 | Con el 10% activo, en las páginas de la tienda donde aplica (RF-10) se ve un acceso chico y fijo "🎁 10% OFF activo" que no tapa contenido ni al botón de WhatsApp. Tocarlo despliega el código, el botón Copiar y "Se aplica solo en el checkout", **sin abrir el popup**. | 🔴 must |
| RF-34 | En el Home, quien cerró el popup sin dejar el mail ve el acceso "🎁 10% OFF", que reabre el paso 1. Solo abre con un toque. Fuera del Home no aparece. | 🟡 should |
| RF-35 | En el carrito lateral y en la página de carrito, con el 10% activo y productos que lo reciben, se ve "🎁 Tu 10% OFF está activo" y la línea con el monto que descuenta. El total que se muestra es el mismo que la persona va a ver al entrar al checkout pagando con Mercado Pago. | 🟡 should |
| RF-36 | Si el monto no se puede mostrar con certeza (por ejemplo, el carrito no tiene productos que lo reciban), se muestra solo el aviso, sin números. Nunca se muestra un descuento que el checkout después no aplique. | 🔴 must |

### Después de comprar

| ID | Requisito | Prioridad |
|---|---|---|
| RF-37 | Al llegar a la pantalla de compra exitosa o de pedido por transferencia, el sitio registra que esa persona compró: el popup no se vuelve a abrir solo y el acceso "🎁 10% OFF" (el que ofrece el descuento) no aparece más. Si ya tenía el 10%, el acceso "activo" sigue. | 🔴 must |
| RF-38 | Después de comprar, el código del popup **sigue guardado** y el checkout lo sigue aplicando solo (P-3). | 🔴 must |

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
| EPICA10: 10% solo sobre calcos sueltas del catálogo, acumulable con transferencia y 3x2, tope 20% | `business-rules.md` §2, §3 | no (**confirmado por Mariano el 25/9/2026**) |
| Ventana de 10 min por usuario para el EPICA10 del popup | `business-rules.md` §3.4, spec 017 | **sí** (P-2): el popup deja de arrancar la ventana |
| EPICA10 escrito a mano no vence | `business-rules.md` §2 | no |
| Experimentos solo de presentación, nunca de precio | `business-rules.md` "A/B testing" | no: se testea **cuándo** aparece el popup |

**Reglas nuevas del popup**

- Aparece **solo en el Home**, como máximo una vez por sesión, nunca antes de
  5 s, nunca después de una compra.
- Espera: 7 días si se cerró, 30 si se dejó el mail. Con el 10% activo no se
  abre solo.
- El 10% del popup no vence y sigue valiendo después de comprar (P-2, P-3). En
  la práctica, EPICA10 pasa a ser un 10% permanente para quien deja el mail,
  acumulable con el 3x2 y la transferencia hasta el tope del 20%.
- "Primer pedido" es una promesa de copy: el sistema no verifica que sea la
  primera compra (hoy tampoco).

**Espejo de precios**

- [ ] ~~Cambio espejado en los dos `pricing.js`~~: con P-2, la ventana se deja
      de arrancar desde el popup y la validación del
      servidor no cambia (un EPICA10 sin instante de emisión ya vale hoy)
- [ ] ~~Cambio espejado de envíos~~
- [x] Test nuevo: el código que devuelve el servidor al capturar el lead es el
      mismo que muestra el popup, y existe en los cupones de los dos lados

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Llega de Instagram directo a una categoría | No ve el popup ahí. Si después va al Home, se evalúa en el Home (la categoría de entrada no cuenta como intención) |
| Ve 2 fichas y vuelve al Home | Cumple la intención: abre a los 5 s de llegar al Home |
| Busca "boca" en el buscador | Mientras el campo tiene foco no abre. 3 s después de salir del campo, abre |
| Toca "+" en la grilla y se abre el carrito | No abre mientras el carrito esté abierto ni en los 3 s siguientes a cerrarlo |
| Página más corta que la pantalla | El scroll no puede disparar; quedan tiempo, intención y salida |
| Pestaña en segundo plano cuando se cumplen los 12 s | Abre 3 s después de volver a la pestaña |
| Cierra el popup y recarga | No se abre solo. Ve el acceso manual "🎁 10% OFF" |
| Cierra con Escape, con la ✕ o tocando afuera | Cuenta como cerrado (7 días) |
| Deja un mail inválido ("hola@") | "Ingresá un email válido.", sin llamar al servidor |
| Sin conexión al enviar | Mensaje de error, el popup queda abierto con el mail escrito |
| El servidor tarda más de 10 s | Se corta, mensaje de error, puede reintentar |
| Deja el mail y toca "Elegir mis calcos" | Va al catálogo de categorías |
| Elige 🧉 Mate o 📱 Celular | Va a categorías, con el tamaño que ya tenía elegido (o el de siempre) |
| Tiene el 10% activo y el carrito solo con personalizados | El carrito muestra el aviso sin monto: esos productos no reciben el 10% |
| Tiene el 10% activo y paga por transferencia | El checkout muestra la suma real (10% + 10% con tope del 20%), igual que hoy. El carrito mostró el monto de Mercado Pago, que es el medio por defecto |
| Navegador de Instagram con storage bloqueado | El popup no se abre solo; si lo abre a mano y deja el mail, el código se muestra y el checkout lo acepta si lo escribe |
| Ya tenía el popup visto antes del deploy, sin cupón | Vuelve a ser elegible 7 días después de su primera visita posterior al deploy |
| Ya tenía EPICA10 guardado con la ventana vencida | Sigue vencido, como se le prometió. Si deja el mail de nuevo en el Home, el código nuevo no vence |
| Compra con el 10% y vuelve al día siguiente | Sin popup. Sigue viendo "10% OFF activo" y el checkout se lo vuelve a aplicar |
| Compra sin haber dejado el mail | No vuelve a ver el popup ni el acceso "🎁 10% OFF" |
| Tiene el 10% activo y entra a personalizados | No ve el acceso fijo. Si en el carrito también hay calcos del catálogo, el checkout descuenta solo esas |
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
| `popup_cta_click` | toca "Elegir mis calcos" o "ir a pagar" | `popup_variant`, `destination` (`catalog` · `checkout`) | GA4 |

`popup_trigger`: `time` · `scroll` · `product_views` · `search` · `category` ·
`exit_intent` · `manual`.

### Eventos existentes que cambian

| Evento | Qué cambia | Por qué |
|---|---|---|
| `generate_lead` (`lead_source: 'welcome_popup'`) | suma `popup_variant`, `popup_trigger`, `device_type`. **Es la conversión del popup**: no se crea un `popup_conversion` aparte | es el evento recomendado de GA4 para leads y ya dispara `Lead` en Meta; duplicarlo contaría dos veces la misma conversión y cortaría la serie histórica |
| `cupon_emitido` | sin cambios | sigue siendo el denominador de la ventana |
| `cupon_vencido` | deja de dispararse desde el popup (P-2) | sin ventana no hay vencimiento |

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
sin parámetros de URL. Con P-6 va a ser siempre `/`: se manda igual para que el
evento no cambie de forma si algún día el popup se habilita en otras páginas.

⚠️ **Acción de Mariano en GA4**: registrar como dimensiones personalizadas los
parámetros de evento y las dos propiedades de usuario. Sin eso GA4 los recibe
pero no deja usarlos en informes.

---

## 12. Preguntas abiertas

Respondidas por Mariano el 25/09/2026, salvo P-1. El resumen está en §0.

- [ ] **P-1: ¿Qué pasa con la spec 025 (pack sorpresa)?** Las dos cambian el
      mismo popup en direcciones opuestas.
      *Propuesta*: esta spec **reemplaza** a la 025, que pasa a `DISCARDED` con
      el motivo escrito. La oferta queda en configuración (RF-41) para poder
      probar el pack más adelante sobre este popup.
      *Estado*: **sin respuesta; rige la propuesta.**

- [x] **P-2: ¿Se mantiene la ventana de 10 minutos del EPICA10 del popup?**
      *Decisión*: **se saca.** El popup deja de arrancar la ventana. No cambia
      ningún precio ni el servidor: un EPICA10 sin instante de emisión ya vale
      hoy. Revierte la decisión del 7/9/2026 (spec 017).

- [x] **P-3: ¿Qué pasa con el cupón guardado después de comprar?**
      *Decisión*: **sigue valiendo**, y el checkout lo sigue aplicando solo en
      las compras siguientes. "La idea es que compren al final."

- [x] **P-4: ¿A dónde lleva cada interés?**
      *Decisión*:
      | Interés | Destino |
      |---|---|
      | 🧉 Mate | `/categorias`, sin tamaño preelegido |
      | ☕ Termo | `/calcos-termo` |
      | 💻 Notebook | `/calcos-notebook` |
      | 📱 Celular | `/categorias`, sin tamaño preelegido |
      En categorías la persona elige tamaño y diseño.

- [x] **P-5: ¿Se aclara a qué productos aplica el 10%?**
      *Decisión*: **sí**. En el paso 2, debajo del código: "Se aplica solo en el
      checkout. Vale para las calcos del catálogo."

- [x] **P-6: ¿Dónde aparece el popup?**
      *Decisión*: **solo en el Home**. Se abre ahí solo o a mano. El acceso fijo
      del 10% activo sí acompaña la navegación en las páginas donde el 10%
      aplica (RF-33), porque es el recordatorio del beneficio que pidió el
      pedido original (§10) y al tocarlo no abre el popup.

- [x] **P-7: "Podés darte de baja cuando quieras".**
      *Decisión*: **se deja** el texto.
