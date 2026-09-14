# Requirements — /personalizados: "Hacelo calco"

| | |
|---|---|
| **Spec** | `023-personalizados-hacelo-calco` |
| **Estado** | `READY FOR REVIEW` |
| **Fecha** | 14/09/2026 |
| **Autor** | Claude Code, a partir del brief de Mariano ("Rediseño y optimización de `/personalizados`") |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

> ⚠️ **Hay 12 preguntas abiertas en §12.** Varias son hechos operativos que el
> repo no sabe (qué pasa con una foto con fondo, si se manda boceto antes de
> imprimir, qué fotos reales hay). Donde falta la respuesta, la spec toma la
> opción **más conservadora** —no promete, no muestra— y lo marca.

---

## 1. Problema

`/personalizados` hoy es un **formulario de cuatro pasos**, no una página que
venda el producto. Lo que se observa:

**1.1 — La página no existe para Google.** Pedida directo por URL, devuelve
`200` con el HTML del Home: título *"EPICALCOS · Calcos premium para
personalizar lo que quieras"*, la descripción del Home, **canonical apuntando a
`https://epicalcos.com/`**, ningún H1 y ni una sola vez la palabra
"personalizados" (verificado con `curl` el 14/9/2026). Todo lo propio de la
página aparece recién cuando corre el JavaScript. Para un buscador que lee el
HTML inicial, `/personalizados` es un duplicado del Home que pide no ser
indexado por separado.

**1.2 — Subir el archivo está bloqueado.** La zona de subida no se puede usar
hasta elegir tamaño **y** corte. La acción que da sentido a la página —subir
algo tuyo— es el paso 3 de 4, detrás de dos decisiones técnicas.

**1.3 — Subir es un input, no un momento.** Un recuadro de 6 px de padding con
un emoji y una lista de archivos. No hay vista previa grande, no hay forma de
ver cómo quedaría como calco, no hay escala física del tamaño.

**1.4 — El carrito se llena solo, sin que el cliente lo decida.** Cada archivo
subido entra al carrito en el acto, sin botón. No hay un momento de "listo, lo
quiero": el cliente no ve un "✓ está en el carrito" y el `add_to_cart` se
dispara al subir, no al decidir comprar.

**1.5 — Si el cliente se va a mitad de la subida, el archivo se pierde.** La
línea entra al carrito sin link y el link se completa cuando termina la subida.
Si en el medio el cliente toca "Ir al carrito", la página se desmonta, la subida
termina en Cloudinary pero **el carrito nunca recibe el link**: el pedido llega
con "(por WhatsApp)" aunque el archivo sí se subió. Y si vuelve a
`/personalizados`, la lista de diseños aparece vacía.

**1.6 — Se mandan nombres de archivo a Google y a Meta.** El evento de archivo
cargado viaja con el nombre del archivo, y el `add_to_cart` / `begin_checkout` /
`purchase` de un personalizado llevan como nombre de producto
*"Personalizado · 6 cm · Silueta · foto-de-mi-hijo-juan.jpg"*. Un nombre de
archivo es contenido del cliente y puede ser PII.

**1.7 — El funnel documentado no se puede leer.** La documentación de analytics
dice que el funnel de personalizados arranca en `view_item`, pero la página nunca
lo dispara. El evento de precio calculado manda un parámetro `material` que ya no
existe (siempre vacío) y pierde el tamaño.

**1.8 — No hay nada que muestre el resultado.** La única prueba visual de un
personalizado es un testimonio (el logo "Pet Friendly" en la puerta de un local).
No hay ejemplos de mascota, foto o dibujo; no hay "así llegó el archivo / así
quedó".

**1.9 — La zona de subida no se puede usar con teclado.** El input de archivo
está oculto con `display: none` y el recuadro no es enfocable. Quien navega con
teclado no puede subir nada.

---

## 2. Objetivo

Que `/personalizados` funcione como **landing + configurador** de un producto
propio, organizada alrededor de una idea —**HACELO CALCO.** (ortografía en
§12, P-11)— y de una secuencia: **subís algo tuyo → ves cómo queda → elegís
tamaño y cantidad → lo agregás**. Y que Google la lea como una página propia.

**Cómo se sabrá que funcionó**

- **Métrica principal:** *purchase rate* de personalizados (sesiones con
  `purchase` que incluye un personalizado / sesiones con `personalized_view`).
- Señales intermedias: tasa de `personalized_upload_start`, tasa de
  `personalized_upload_complete` sobre `upload_start`, `add_to_cart` de
  personalizados, calcos por pedido y AOV de pedidos con personalizados.
- SEO: `curl https://epicalcos.com/personalizados` devuelve el título, la
  descripción, el canonical y el H1 propios **sin ejecutar JavaScript**.
- Menos consultas repetidas por WhatsApp sobre formato, fondo y plazos
  (cualitativa: la reporta Mariano).

**Línea de base:** GA4 desde el deploy de esta spec. Los eventos viejos
(`personalizado_*`) cubren desde el 3/8/2026 con un sesgo conocido (1.7), así
que la comparación antes/después se hace con `add_to_cart` y `purchase` de
líneas `custom`, que no cambian de forma.

---

## 3. Scope

Organizado por prioridad (la del brief).

### P0 — crítico
- [ ] `/personalizados` entrega en el HTML inicial su título, descripción,
      canonical, H1, texto principal, datos estructurados y enlaces internos
- [ ] Hero que **es** el configurador: subida protagonista + vista previa +
      tamaño + cantidad + precio + CTA, en una pantalla
- [ ] Subir **antes** de elegir nada
- [ ] Vista previa del archivo (original y "vista calco" aproximada)
- [ ] Selector de tamaño entendible (uso de cada tamaño + escala física)
- [ ] Selector de cantidad fácil, con precio dinámico
- [ ] CTA que evoluciona: SUBIR MI DISEÑO → CREAR MI CALCO → AGREGAR AL CARRITO
- [ ] Barra fija en mobile con el mismo CTA y el precio
- [ ] Alta al carrito explícita, una línea por diseño, con el link del archivo
      siempre adentro
- [ ] Los diseños no se pierden si el cliente sale y vuelve a la página
- [ ] Funnel de analytics nuevo, sin nombres de archivo
- [ ] Subida usable con teclado y lector de pantalla

### P1 — alto impacto
- [ ] Barra de confianza compacta después del hero
- [ ] "De imagen a calco" (ORIGINAL → CALCO → APLICADA) — **solo con fotos
      reales**
- [ ] "Qué podés convertir en calco" (mascota, foto, dibujo, logo) — **solo con
      fotos reales**
- [ ] Bloque editorial "Si es importante para vos, podemos convertirlo en calco"
- [ ] Beneficios en cuatro cards
- [ ] "¿Tu archivo no está perfecto?" — **pendiente de P-3**
- [ ] Galería de trabajos reales — **solo con fotos reales**
- [ ] Proceso de producción en cuatro pasos
- [ ] Calidad del producto (foto macro) — **solo con foto real**
- [ ] Precios y cantidades (precio por tamaño + beneficio real por cantidad)
- [ ] Recomendación a Negocio para cantidades altas — **pendiente de P-9**
- [ ] Testimonios de personalizados — **solo testimonios reales**
- [ ] FAQ propia de personalizados
- [ ] CTA final

### P2 — dentro de esta spec
- [ ] Vista del diseño a escala sobre la silueta de un termo (la escala física
      del P0 ya lo resuelve; esto es la versión con el diseño del cliente adentro)
- [ ] Microinteracciones sutiles (✓ Diseño cargado, precio que se actualiza,
      ✓ Tu calco está en el carrito)
- [ ] Aceptar WEBP (convirtiéndolo antes de subir)

---

## 4. Fuera de scope

- [ ] **Quitar el fondo automáticamente.** No existe. **No se simula**: donde
      el brief pide "Quitar fondo" se muestra el texto de revisión humana (RF-P5).
- [ ] **Mockups fotográficos / renders** del diseño sobre objetos. La escala
      sobre un termo es una **silueta dibujada**, declarada como aproximada.
- [ ] **Cualquier cambio de precio, promo, cupón o envío.** El precio sigue
      siendo el del catálogo por tamaño y sin mínimo. Lo que esta spec muestra
      de promos lo **lee** de las reglas vigentes; no crea ninguna.
- [ ] **El canonical del HTML inicial en el resto del sitio.** El mismo defecto
      de 1.1 afecta a **todas** las rutas (categorías, landings, Negocio,
      Polaroid…): todas arrancan con el canonical del Home. Se arregla acá solo
      para `/personalizados` y se propone una spec aparte (ver `design.md` §12).
- [ ] **El componente de subida de Polaroid y Negocio.** Comparte el defecto de
      teclado (1.9) pero es otra superficie. Hallazgo aparte.
- [ ] **El Home.** No se toca ninguna sección del Home.
- [ ] **Search Console.** Pedir la reindexación es una acción de Mariano después
      del deploy, no parte del código.
- [ ] **Tests A/B** de la página nueva. Se puede plantear después, con la línea
      de base del funnel nuevo.
- [ ] **Header, footer, carrito, drawer y checkout.** Se usan como están.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra (mobile, desde Instagram/Meta Ads) | Página nueva: sube primero, ve la vista previa, elige tamaño y cantidad, agrega al carrito con un botón |
| Cliente que vuelve (carrito guardado) | **No afectado**: las líneas de personalizados mantienen exactamente la misma forma. Un carrito armado con el configurador actual sigue pagándose igual |
| Cliente que sale a mitad de camino | Al volver a la página encuentra los diseños que ya había subido |
| Mariano (operación) | El pedido le llega igual que hoy (mismo mail, misma nota en el CRM, links de Cloudinary). Menos pedidos con "(por WhatsApp)" por subidas cortadas |
| Google | Lee una página propia con título, H1, texto y datos estructurados |
| Sistemas externos (CRM, Meta, MP) | Sin cambios de contrato. Meta deja de recibir nombres de archivo |

---

## 6. User stories

- **US-1** — Como cliente que llega desde un anuncio en el celular, quiero
  **subir mi foto apenas entro**, para ver si esto sirve para lo que tengo en
  mente antes de decidir nada.
- **US-2** — Como cliente, quiero **ver mi imagen como quedaría de calco**
  (con su borde), para imaginarme el resultado.
- **US-3** — Como cliente que no sabe cuánto es "6 cm", quiero **ver el tamaño
  sobre un objeto conocido**, para elegir sin miedo a equivocarme — un
  personalizado no se devuelve salvo falla.
- **US-4** — Como cliente, quiero **cambiar la cantidad con un toque y ver el
  total al instante**, y saber si llevando más me ahorro algo.
- **US-5** — Como cliente, quiero **un botón que diga "agregar al carrito" y un
  aviso de que quedó agregado**, para saber que mi calco está en camino.
- **US-6** — Como cliente que se fue al carrito y volvió, quiero **encontrar mis
  diseños donde los dejé**.
- **US-7** — Como cliente con un archivo "feo" (foto de WhatsApp, logo con
  fondo), quiero **saber qué pasa con mi archivo** antes de pagar.
- **US-8** — Como cliente que duda, quiero **ver trabajos reales** hechos para
  otros clientes.
- **US-9** — Como dueño de un negocio que carga 100 copias de su logo, quiero
  **enterarme si hay una opción mejor** para mi caso.
- **US-10** — Como Mariano, quiero **medir en qué paso se cae la gente**
  (entra, sube, configura, agrega, paga) sin mandar datos del cliente a Google.
- **US-11** — Como Mariano, quiero que **Google indexe `/personalizados`** como
  la página de "calcos personalizadas".

---

## 7. Requisitos funcionales

### 7.1 SEO e indexación

| ID | Requisito | Prioridad |
|---|---|---|
| RF-S1 | El HTML que el servidor devuelve para `/personalizados` (sin ejecutar JS) contiene: título propio, meta description propia, canonical `https://epicalcos.com/personalizados`, Open Graph propio | 🔴 must |
| RF-S2 | Ese HTML contiene **un solo** H1, el texto principal de la página (claim, subtítulo, qué podés convertir, tamaños y precios, proceso, FAQ) y enlaces internos a las secciones del sitio | 🔴 must |
| RF-S3 | Título: *"Stickers y Calcos Personalizados con tu Diseño \| EPICALCOS"* | 🔴 must |
| RF-S4 | Descripción: con foto, logo, mascota, ilustración o diseño + vinilo premium + resistentes al agua + plazo de producción (el plazo sale de la configuración, no escrito a mano). ≤ 160 caracteres | 🔴 must |
| RF-S5 | H1 único: *"Calcos personalizadas con tu propio diseño"*. El claim puede verse más grande pero **no** es un heading | 🔴 must |
| RF-S6 | Datos estructurados: `Product` (nombre, descripción, imagen real, marca, ofertas con rango de precios por tamaño en ARS, disponibilidad) + `BreadcrumbList` + `FAQPage`. **Sin** `AggregateRating` ni `Review` | 🔴 must |
| RF-S7 | Todo precio que aparezca en el HTML inicial sale de las reglas vigentes al momento del build | 🔴 must |
| RF-S8 | La página responde `200` por URL directa y después de refrescar; sigue en el sitemap y no la bloquea `robots.txt` | 🔴 must |
| RF-S9 | Si la generación del HTML propio falla en el build, el sitio se publica igual con el comportamiento de hoy (nunca bloquea un deploy) | 🔴 must |
| RF-S10 | Las keywords del brief aparecen donde encajan naturalmente en el copy; ningún bloque de texto SEO escrito para el buscador | 🟡 should |

### 7.2 Hero y configurador

| ID | Requisito | Prioridad |
|---|---|---|
| RF-C1 | La primera pantalla muestra el claim, el H1, una línea de propuesta, la zona de subida, tamaño, cantidad, precio y el CTA. Desktop: dos columnas (subida/vista previa a la izquierda, texto + configuración a la derecha). Mobile: una columna en ese orden de lectura | 🔴 must |
| RF-C2 | Se puede subir **sin** haber elegido tamaño ni corte | 🔴 must |
| RF-C3 | Decisiones visibles en la primera etapa: **imagen, tamaño y cantidad**. Corte e instrucciones quedan como opciones secundarias, plegadas, con un valor por defecto (P-8) | 🔴 must |
| RF-C4 | El tamaño **no** viene preseleccionado: es una decisión consciente porque un personalizado no se devuelve salvo falla. El de 6 cm lleva la marca "MÁS ELEGIDO" (P-7) | 🔴 must |
| RF-C5 | Cada tamaño muestra su precio unitario y para qué sirve ("ideal para termo, mate…"), con los mismos usos que ya usa el resto del sitio | 🔴 must |
| RF-C6 | El CTA tiene tres estados: **SUBIR MI DISEÑO** (sin archivo: abre el selector) → **CREAR MI CALCO** (con archivo y sin tamaño: lleva al selector de tamaño) → **AGREGAR AL CARRITO · $total** (con archivo subido y tamaño elegido) | 🔴 must |
| RF-C7 | "Agregar al carrito" crea **una línea por diseño**, cada una con su tamaño, corte, copias, instrucciones y el link de su archivo. Nunca N diseños en una línea | 🔴 must |
| RF-C8 | "Agregar al carrito" no se habilita mientras un diseño se está subiendo: muestra el progreso. Así ninguna línea entra al carrito sin su link | 🔴 must |
| RF-C9 | Después de agregar: confirmación visible *"✓ Tu calco está en el carrito"*, se abre el carrito lateral (igual que en el resto del sitio) y el configurador queda listo para crear otra | 🔴 must |
| RF-C10 | Se pueden cargar varios diseños a la vez (hasta el tope vigente de archivos por pedido); tamaño, corte, copias e instrucciones se aplican a todos los de esa tanda | 🔴 must |
| RF-C11 | Si ya hay personalizados en el carrito, la página lo dice ("Ya tenés N en el carrito · Ver carrito") | 🟡 should |
| RF-C12 | CTA secundario *"Ver cómo funciona"* que baja a la explicación del proceso | 🟢 could |

### 7.3 Subida

| ID | Requisito | Prioridad |
|---|---|---|
| RF-U1 | La zona de subida es grande y protagonista: *"Subí tu diseño · Arrastrá tu imagen acá · o · ELEGIR ARCHIVO"* + formatos aceptados + *"No hace falta que tu archivo esté perfecto. Lo revisamos antes de producirlo."* (esta frase ya es política publicada) | 🔴 must |
| RF-U2 | Los formatos que se nombran son **exactamente** los que se aceptan, escritos desde la misma lista que valida | 🔴 must |
| RF-U3 | Valida formato y peso máximo por archivo; comprime las fotos pesadas antes de subir (como hoy) | 🔴 must |
| RF-U4 | Muestra progreso por archivo | 🔴 must |
| RF-U5 | Permite quitar un diseño y **reemplazarlo** por otro (conservando su lugar) | 🔴 must |
| RF-U6 | Ignora un archivo idéntico a uno ya cargado, con aviso | 🟡 should |
| RF-U7 | Ningún error técnico llega al cliente. Formato: *"No pudimos subir esta imagen. Probá con {formatos} de hasta {peso} MB."* Peso: *"Esta imagen es demasiado pesada…"* Red: *"Se cortó la subida"* + **Reintentar** + opción de agregar igual y mandarlo por WhatsApp | 🔴 must |
| RF-U8 | Si la subida no está configurada (falta la cuenta), la página sigue vendiendo: el diseño se agrega sin link y se manda por WhatsApp después de pagar (comportamiento de hoy) | 🔴 must |
| RF-U9 | Los diseños ya subidos y no agregados, con su configuración, **sobreviven** a navegar a otra página del sitio y volver, y a un refresh | 🔴 must |
| RF-U10 | Una subida en curso sigue corriendo si el cliente navega dentro del sitio, y el diseño aparece terminado al volver | 🟡 should |
| RF-U11 | Usable con teclado (foco visible, Enter/Espacio abre el selector) y anuncia a lectores de pantalla "diseño cargado" y los errores | 🔴 must |
| RF-U12 | Acepta WEBP además de los formatos de hoy | 🟢 could |
| RF-U13 | Aviso de resolución baja **sin bloquear** (como hoy), en lenguaje de cliente | 🔴 must |

### 7.4 Vista previa

| ID | Requisito | Prioridad |
|---|---|---|
| RF-P1 | Al elegir una imagen, el estado vacío se reemplaza por la vista previa **local** inmediata, antes de que termine la subida | 🔴 must |
| RF-P2 | Selector de vista **ORIGINAL \| VISTA CALCO**. La vista calco dibuja el borde según el corte elegido (silueta, cuadrado, círculo) | 🔴 must |
| RF-P3 | La vista calco se rotula como **aproximada**. Con una imagen sin transparencia y corte silueta no se inventa un contorno: se muestra el recuadro y *"El contorno lo prepara nuestro equipo"* | 🔴 must |
| RF-P4 | Al elegir el tamaño por primera vez la vista pasa sola a VISTA CALCO (el momento de "creación") | 🟡 should |
| RF-P5 | En lugar de "Quitar fondo": *"¿Necesita fondo transparente? Nuestro equipo revisa el archivo antes de imprimir."* | 🔴 must |
| RF-P6 | Tercera vista **EN UN TERMO**: el diseño sobre la silueta de un termo, con la escala proporcional al tamaño elegido; cambia al cambiar el tamaño | 🟢 could |
| RF-P7 | Archivos que no se pueden previsualizar (PDF, AI) muestran un ícono y el nombre, sin vista calco | 🔴 must |

### 7.5 Cantidad y precio

| ID | Requisito | Prioridad |
|---|---|---|
| RF-Q1 | *"¿Cuántas querés?"* con − / + y atajos 1 · 5 · 10 · 25 · 50 · 100. Sin mínimo | 🔴 must |
| RF-Q2 | Total visible y actualizado al instante al cambiar tamaño, cantidad o diseños | 🔴 must |
| RF-Q3 | Si hay un beneficio **real y vigente** por cantidad para personalizados, se muestra el precio por unidad y el % de ahorro, **calculados con la misma regla que cobra el servidor**. Hoy ese beneficio es el 3x2 | 🔴 must |
| RF-Q4 | Sin beneficio vigente, no se muestra ningún "ahorrás": solo unitario × cantidad | 🔴 must |
| RF-Q5 | Si faltan unidades para que una salga gratis, un aviso corto ("Sumá 1 y una te sale gratis") | 🟡 should |
| RF-Q6 | Ningún precio escrito a mano en el copy | 🔴 must |
| RF-Q7 | El total que muestra el configurador es el mismo que muestra el carrito para un carrito con solo esos diseños | 🔴 must |

### 7.6 Secciones de la landing

Orden (el del brief, sin la 5 —ver RF-L3—): hero → confianza → de imagen a
calco → qué podés convertir → editorial → beneficios → archivo imperfecto →
galería → proceso → calidad → precios → testimonios → FAQ → CTA final.

| ID | Requisito | Prioridad |
|---|---|---|
| RF-L1 | **Barra de confianza**: calcos vendidas, clientes, plazo de producción, vinilo premium, resistente al agua — todos desde la configuración. Mobile: grilla 2×2 o carrusel, sin ocupar más de ~1 pantalla de alto a 375 px | 🟡 should |
| RF-L2 | **Toda sección que depende de fotos** (de imagen a calco, qué podés convertir, galería, calidad, fotos del proceso) **no se muestra** mientras no haya fotos reales cargadas para ella. Ni un placeholder, ni un render | 🔴 must |
| RF-L3 | El "selector visual de tamaño" vive **dentro del hero** (usos + escala), no como una segunda sección con otro selector del mismo dato | 🔴 must |
| RF-L4 | **De imagen a calco**: tríos ORIGINAL → CALCO → APLICADA; horizontal en desktop, vertical en mobile | 🟡 should |
| RF-L5 | **Qué podés convertir**: cuatro cards (mascota, foto, dibujo, logo) con foto real; una card sin foto no se muestra | 🟡 should |
| RF-L6 | **Editorial**: *"Si es importante para vos, podemos convertirlo en calco."* + lista (tu mascota, una foto, tu emprendimiento, un dibujo, una frase, un recuerdo, tu logo, una idea) + claim + CTA SUBIR MI DISEÑO. Solo texto | 🟡 should |
| RF-L7 | **Beneficios**: cuatro cards — corte prolijo, vinilo premium, resistentes al agua, resistentes al sol — con el mismo alcance que ya declara el sitio | 🟡 should |
| RF-L8 | **¿Tu archivo no está perfecto?** — solo si Mariano revierte la decisión del 15/8/2026 (P-3) | 🟡 should |
| RF-L9 | **Galería**: *"Así quedaron los de ellos."* + *"Fotos de clientes y de nuestros pedidos. Ni un render."*; grilla tipo masonry; rótulos FOTO → CALCO / LOGO → CALCO en algunas fotos, no en todas | 🟡 should |
| RF-L10 | **Proceso**: SUBÍ → REVISAMOS → PRODUCIMOS → RECIBÍS, con los plazos de la configuración. Con foto real por paso si la hay; si no, ícono | 🟡 should |
| RF-L11 | **Calidad**: 50/50 foto macro + *"No imprimimos simplemente una imagen. Hacemos una calco."* + bullets confirmados | 🟡 should |
| RF-L12 | **Precios**: precio por tamaño, "sin mínimo", y —si hay beneficio vigente— precio por unidad en 10 · 25 · 50 · 100, calculado | 🟡 should |
| RF-L13 | **Recomendación Negocio**: con cantidades altas, un link discreto *"¿Son para tu negocio? Ver opciones para empresas →"* con la oferta real de Negocio. No interrumpe el flujo (P-9) | 🟡 should |
| RF-L14 | **Testimonios**: solo testimonios reales **de personalizados**. Con uno solo, se muestra uno solo; con ninguno, la sección no está | 🟡 should |
| RF-L15 | **FAQ propia** (§9.2) con respuestas que salen de reglas vigentes; las que dependen de P-4/P-5/P-6 se publican solo con la respuesta confirmada | 🟡 should |
| RF-L16 | **CTA final**: *"Eso que tenés guardado en el celular puede convertirse en calco."* + *"Subí tu imagen y hacela parte de tus cosas."* + **HACER MI CALCO** (sube al hero y abre el selector) + plazo de producción de la configuración | 🟡 should |
| RF-L17 | El claim aparece como mucho **tres** veces en la página (hero, editorial, CTA final) | 🟡 should |

### 7.7 Barra fija en mobile

| ID | Requisito | Prioridad |
|---|---|---|
| RF-M1 | Debajo de 1024 px, una barra fija inferior con el mismo CTA de tres estados; en el tercero, con el total (*AGREGAR AL CARRITO · $XX.XXX*) | 🔴 must |
| RF-M2 | Aparece cuando el CTA del hero salió de pantalla y se oculta al llegar al CTA final | 🔴 must |
| RF-M3 | Respeta el safe-area de iPhone, no tapa contenido y no queda debajo del botón de WhatsApp (ni el botón debajo de ella) | 🔴 must |

### 7.8 Microinteracciones

| ID | Requisito | Prioridad |
|---|---|---|
| RF-I1 | ✓ Diseño cargado · la vista cambia al elegir tamaño · el precio se actualiza sin salto · ✓ Tu calco está en el carrito | 🟢 could |
| RF-I2 | Nada de animaciones largas ni en loop; con *reduced motion*, ninguna | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | a 375 px: sin scroll horizontal, sin pinch zoom, sin modales, targets ≥ 44 px, CTA y precio siempre a mano |
| RNF-2 | **Performance** | la ruta sigue siendo `lazy`; ninguna imagen de sección arriba del fold; todas las fotos en WebP con ancho/alto declarados y `loading="lazy"`; el trabajo de la vista calco no bloquea la interacción; LCP de `/personalizados` no peor que hoy (medido antes/después) |
| RNF-3 | **Accesibilidad** | `aria-label` en controles sin texto propio, foco visible, subida por teclado, estados anunciados, textos alternativos que describen la foto |
| RNF-4 | **Compatibilidad** | un carrito guardado con personalizados del configurador actual se paga igual; ninguna línea cambia de forma |
| RNF-5 | **Seguridad** | ningún secreto nuevo en el bundle; subida sigue siendo "unsigned" como hoy; ningún nombre de archivo en analytics |
| RNF-6 | **Sin dependencias nuevas** | ni prerender, ni canvas, ni carruseles de terceros |
| RNF-7 | **Identidad visual** | header, footer, paleta, tipografía (títulos en mayúscula), botones, radios y sombras actuales. No es un micrositio |
| RNF-8 | **Navegadores** | Safari iOS, Chrome Android, navegador embebido de Instagram y desktop |
| RNF-9 | **El tracking nunca rompe la compra** | todo evento va protegido; si falla, la página sigue |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Un personalizado vale lo mismo que un calco de catálogo del mismo tamaño | `business-rules.md` §1 "Calcos personalizados" | no |
| Sin mínimo de compra | ídem | no |
| Cortes (silueta, cuadrado, círculo) no cambian el precio | ídem | no |
| Una línea del carrito = un diseño | `business-rules.md` §7 "Configurador" | no |
| Formatos, 10 MB por archivo, 150 DPI recomendados, hasta 100 archivos | `business-rules.md` §7 | no (WEBP se convierte antes de subir: el formato que llega a producción sigue en la lista) |
| Promo 3x2: catálogo + personalizados, cada 3 la más barata gratis, sin fecha de fin | `business-rules.md` "Promo 3x2" | no — se **muestra** |
| El 10 % por transferencia cuenta solo calcos de catálogo | `business-rules.md` §2 | no — por eso **no** se promete en esta página |
| Promo Negocio: 100 de un diseño en 6 cm a precio fijo | `business-rules.md` "Promo Negocio" | no — se **recomienda** |
| Devolución: lo hecho con el archivo del cliente, solo por falla | `business-rules.md` D-4 | no — la FAQ lo dice |
| Revisamos cada archivo antes de producir y avisamos si hay un problema | FAQ publicada del Home | no |
| Ni un render en la prueba visual | regla vigente de galerías y testimonios | no — se extiende a esta página |

⚠️ **Precios, promos, cupones o envíos:**

- [x] **No** requiere cambio en las reglas de precio del cliente ni del servidor
- [x] **No** requiere cambio en las reglas de envío
- [x] **Sí** requiere test de paridad nuevo: el precio por unidad que muestra el
      configurador con el beneficio por cantidad tiene que ser el mismo que
      calcula el servidor (RF-Q3, RF-Q7)

### 9.1 Copy: qué está confirmado y qué no

| Afirmación del brief | Estado |
|---|---|
| +120.000 calcos vendidas, +5.000 clientes | ✅ dato de marca declarado en la configuración |
| Producción en 2 a 3 días hábiles | ✅ configuración (vale para personalizados hoy); ⚠️ cantidades altas, P-10 |
| Vinilo premium, resistentes al agua y al sol, buena adherencia, corte prolijo | ✅ ya publicado |
| "Lo revisamos antes de producirlo" / "te contactamos si hay un problema" | ✅ ya publicado en la FAQ |
| "Fondo común → fondo preparado", "Foto → recorte" | ❓ P-4 |
| "¿Me muestran cómo queda antes de imprimir?" | ❓ P-5 |
| "La medida corresponde al lado mayor del diseño" | ❓ P-6 |
| "6 cm · MÁS ELEGIDO" | ✅ para el catálogo (ya publicado); ❓ para personalizados, P-7 |
| "Quitar fondo" automático | ❌ no existe — no se muestra |
| JPG · PNG · WEBP | ⚠️ hoy WEBP no se acepta; RF-U12 lo agrega convirtiéndolo |
| Descuento por cantidad | ✅ el 3x2 vigente; ❌ ningún otro para personalizados |
| Testimonio "Mandé una foto de mi perro y quedó increíble" | ❌ no existe — ejemplo del brief, no se publica |

### 9.2 FAQ propia

| Pregunta | Fuente de la respuesta | Estado |
|---|---|---|
| ¿Tengo que quitar el fondo de la imagen? | "si no, te ayudamos a adaptarlo" (FAQ mayorista) | ⚠️ confirmar alcance para fotos (P-4) |
| ¿Qué formatos aceptan? | lista de formatos | ✅ |
| ¿Qué pasa si mi imagen tiene baja calidad? | FAQ publicada | ✅ |
| ¿Puedo mandar una foto de WhatsApp? | resolución de WhatsApp vs. 150 DPI | ✅ |
| ¿Pueden hacer una calco de mi mascota? | depende de P-4 | ⚠️ |
| ¿Pueden imprimir mi logo? | testimonio real + Negocio | ✅ |
| ¿Puedo pedir varios diseños diferentes? | tope de archivos | ✅ |
| ¿Cómo elijo el tamaño? | usos por tamaño | ✅ (+P-6) |
| ¿Me muestran cómo queda antes de imprimir? | — | ❓ P-5 — **no se publica sin respuesta** |
| ¿Son resistentes al agua? / ¿Resisten el sol? | FAQ publicada | ✅ |
| ¿Cuánto tarda la producción? | configuración | ✅ (+P-10) |
| ¿Puedo pedir muchas unidades? | tope por línea + Negocio | ✅ |
| ¿Qué pasa después de comprar? | proceso publicado | ✅ |
| ¿Puedo devolverlo? | política de devoluciones | ✅ (no la pide el brief; evita la pregunta más cara) |

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Carrito con personalizados del configurador actual | Se pagan igual; la página muestra "Ya tenés N en el carrito" |
| Sale a `/carrito` con una subida al 40 % y vuelve | La subida siguió; al volver el diseño está subido y configurado |
| Refresca con diseños subidos y sin agregar | Vuelven, con su configuración (la vista previa sale del link subido) |
| Refresca a mitad de una subida | Ese diseño se pierde (el navegador cortó la subida); los terminados vuelven. Aviso si corresponde |
| Cloudinary no responde / se corta la red | Error por diseño + Reintentar + "Agregar igual y mandarlo por WhatsApp" |
| La subida no está configurada | Se agrega sin link; se manda por WhatsApp después de pagar (hoy) |
| Formato no aceptado (HEIC en desktop, GIF, video) | Mensaje con los formatos aceptados; nada técnico |
| Archivo > 10 MB después de comprimir | Mensaje de peso + sugerencia de WhatsApp |
| El mismo archivo dos veces | Se ignora el segundo, con aviso |
| 100 diseños (tope) | El resto no se toma, con aviso (hoy) |
| PNG con fondo transparente + silueta | Vista calco con borde que sigue la forma |
| JPG + silueta | Recuadro + "El contorno lo prepara nuestro equipo" |
| PDF o AI | Sin vista previa; ícono + nombre |
| SVG | Vista previa como imagen (sin ejecutar nada del archivo) |
| Imagen de muy baja resolución | Aviso sin bloquear |
| El 3x2 se apaga con la página abierta | Desaparece el "ahorrás" sin recargar |
| Cantidad > 1.000 | Se limita a 1.000 (tope del servidor) |
| Navegador embebido de Instagram (iOS/Android) | Se puede elegir de la galería; sin drag & drop; el tracking no rompe nada |
| Sin JavaScript / crawler | Ve el HTML propio con el contenido principal |
| Promo o precio cambia entre el build y la visita | El HTML inicial puede quedar viejo hasta el próximo deploy; al cargar el JS manda el precio vigente (el servidor valida siempre) |
| WhatsApp flotante + barra fija | Nunca se superponen |

---

## 11. Analytics necesarios

### Eventos nuevos (GA4)
| Evento | Cuándo se dispara | Parámetros | Destino |
|---|---|---|---|
| `personalized_view` | una vez por visita a la página | — | GA4 (+ Meta, P-12) |
| `view_item` | una vez por visita, con el producto "personalizados" y su SKU del catálogo de Meta | ecommerce estándar | GA4 + Meta `ViewContent` |
| `personalized_upload_start` | el cliente abre el selector o suelta archivos | `origen` (hero / sticky / editorial / cta_final) | GA4 |
| `personalized_upload_complete` | cada archivo subido con éxito (o aceptado, si la subida no está configurada) | `file_type` (extensión), `file_size_range` (`<1MB`, `1-5MB`, `5-10MB`) | GA4 (+ Meta, P-12) |
| `personalized_upload_error` | un archivo no pasa o falla la subida | `reason` (formato / peso / red / duplicado / tope) | GA4 |
| `personalized_preview` | cambia de vista | `view` (original / calco / termo) | GA4 |
| `personalized_size_selected` | elige tamaño | `size` | GA4 (+ Meta, P-12) |
| `personalized_quantity_selected` | elige cantidad (atajo al toque; −/+ y tipeo, al asentarse) | `quantity` | GA4 |
| `personalized_configuration_complete` | primera vez que hay diseño subido + tamaño, por tanda | `size`, `quantity`, `designs`, `value` | GA4 (+ Meta, P-12) |
| `personalized_add_to_cart` | toca "Agregar al carrito" | `size`, `designs`, `units`, `value` + ecommerce | GA4 |

### Eventos existentes que cambian
| Evento | Qué cambia | Por qué |
|---|---|---|
| `add_to_cart` / `begin_checkout` / `purchase` / `remove_from_cart` / `view_cart` | El nombre de producto de un personalizado deja de incluir el nombre del archivo (queda "Personalizado · tamaño · corte") | 1.6: PII |
| `add_to_cart` de personalizados | Se dispara al tocar "Agregar", no al subir | 1.4: medía subidas, no intención |
| `personalizado_inicio`, `personalizado_paso`, `personalizado_archivo_cargado`, `personalizado_precio_calculado` | Se retiran de GA4 (reemplazados arriba). El de archivo mandaba el nombre; el de precio, un parámetro muerto | 1.6, 1.7 |
| `wholesale_click` | Se reusa con `origen: 'personalizados'` para el link a Negocio | ya existe para esto |

### Funnel
```
personalized_view → personalized_upload_start → personalized_upload_complete
  → personalized_configuration_complete → add_to_cart → begin_checkout → purchase
```

### Qué se quiere poder responder
- ¿Cuántos de los que entran intentan subir? ¿Cuántos lo logran? ¿Por qué fallan?
- ¿Desde qué CTA arranca la subida (hero, barra fija, CTA final)?
- ¿Cuánto mira la vista calco / el termo, y compran más los que la miran?
- ¿Qué tamaño y qué cantidad eligen? ¿Mueve la cantidad el aviso del 3x2?
- ¿Cuántos toman la recomendación de Negocio?

**Recordatorios**
- Todo por el módulo único de analytics; nada directo desde un componente.
- Todo protegido: el tracking no rompe la compra.
- **Nunca** nombre de archivo, ni URL del archivo, ni instrucciones del
  cliente en ningún evento.

---

## 12. Preguntas abiertas

Todas son de Mariano. Las marcadas **bloquea** frenan una parte concreta; el
resto tiene un default seguro que la spec ya aplica.

- [ ] **P-1 — Fotos reales** *(bloquea las secciones con foto, RF-L2)*. ¿Qué hay
      o qué se puede sacar, con permiso del cliente? Lo que haría falta está en
      `design.md` §3.4 (lista de tomas). Sin fotos, esas secciones no se publican
      y la página sale con el resto.
- [ ] **P-2 — Testimonios de personalizados.** Hoy hay uno que sirve (Sofía M.,
      logo "Pet Friendly"). El de Giuliana S. dice "Termo personalizado" pero la
      foto muestra calcos de catálogo: en esta página sería engañoso. ¿Hay más,
      con permiso?
- [ ] **P-3 — "¿Tu archivo no está perfecto?"** El 15/8/2026 sacaste esa card
      porque *sembraba la duda de que el archivo podía no servir justo cuando el
      cliente está por subirlo* (queda escrito en el código). El brief la vuelve
      "sección fundamental". **Recomendación:** volverla, pero lejos de la zona
      de subida (después de la galería), en positivo ("Subilo igual") y sin la
      frase "si detectamos un problema". ¿Va?
- [ ] **P-4 — Fotos con fondo.** Con una foto de una mascota y corte silueta,
      ¿recortan el fondo a mano? ¿Siempre, está incluido en el precio? Define
      "Foto → recorte" y la FAQ del fondo. **Default:** no se promete recorte.
- [ ] **P-5 — ¿Se manda boceto antes de imprimir?** ¿A todos, o solo se avisa si
      hay un problema? **Default:** la pregunta no se publica.
- [ ] **P-6 — ¿La medida es el lado mayor del diseño?** **Default:** no se dice.
- [ ] **P-7 — ¿6 cm es también el más elegido en personalizados?** El sitio ya
      lo dice para el catálogo. **Default:** se usa la marca "MÁS ELEGIDO".
- [ ] **P-8 — Corte por defecto.** **Default:** silueta (el que coincide con
      "seguimos la forma del diseño").
- [ ] **P-9 — Recomendar Negocio.** Con la Promo Negocio (100 de un diseño en
      6 cm a precio fijo), a partir de ~38 copias de un mismo diseño en 6 cm
      Negocio sale **más barato y con más calcos** que el configurador con 3x2.
      Recomendarlo le ahorra plata al cliente y **baja el ticket** de ese
      pedido. ¿Se muestra? ¿Desde cuántas? **Default:** se muestra cuando
      Negocio es objetivamente mejor para esa tanda (el número sale de las
      reglas, no se escribe).
- [ ] **P-10 — Plazo con cantidades altas.** La FAQ mayorista dice 3 a 5 días
      para 100 calcos. ¿Aplica a personalizados? **Default:** se muestra el plazo
      general y la FAQ aclara que para cantidades grandes se coordina.
- [ ] **P-11 — Ortografía del claim.** El brief escribe "HACÉLO", "convertíla",
      "llevála". Con pronombre pegado la tilde se va (RAE): **hacelo**,
      **convertila**, **llevala** (sí "subí", "hacé"). **Default:** sin tilde. El
      claim vive en un solo lugar: cambiarlo es una línea.
- [ ] **P-12 — Audiencias de Meta.** ¿Hay audiencias o conversiones
      personalizadas armadas sobre `PersonalizadoInicio` / `PersonalizadoArchivo`?
      **Default:** Meta sigue recibiendo esos nombres (sin el nombre de archivo) y
      GA4 recibe los nuevos, para no romper nada que exista.
