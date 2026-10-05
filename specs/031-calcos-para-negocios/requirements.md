# Requirements — Calcos para negocios

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Estado** | `READY FOR REVIEW` — espera respuestas de `BUSINESS-TODOS.md` y el "Implementá la spec 031 — Fase N" |
| **Fecha** | 05/10/2026 |
| **Autor** | Claude Code, a partir del "prompt maestro" de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**
> Nada de nombres de archivo, funciones ni librerías — eso va en `design.md`.

**Documentos de esta spec**

| Documento | Para qué |
|---|---|
| [`AUDIT.md`](AUDIT.md) | Estado actual, hallazgos, riesgos, quick wins |
| [`BUSINESS-TODOS.md`](BUSINESS-TODOS.md) | Decisiones y datos comerciales pendientes (N-1…N-18) |
| [`WHOLESALE-MIGRATION.md`](WHOLESALE-MIGRATION.md) | Plan por fases, gates y rollback |
| `requirements.md` · [`design.md`](design.md) · [`tasks.md`](tasks.md) · [`acceptance.md`](acceptance.md) | La spec SDD |

> **Pedido de Mariano (5/10/2026)**, resumido: *"Evolucionar EPICALCOS desde un
> ecommerce orientado a consumidores finales hacia una plataforma donde el core
> comercial sea calcos personalizados para negocios y marcas, desde 100
> unidades. La tienda sigue existiendo, pero pasa a segundo plano."* Y sobre el
> nombre: *"Mayorista queda como keyword, sección y argumento de precio"* — la
> marca se apropia de **calcos para negocios**, **calcos personalizados** y
> **precios por cantidad**.

---

## 1. Problema

EPICALCOS ya vende a negocios —35 marcas en el ticker, una Promo Negocio de
100 calcos con logo, un pack de 100 con diseños propios— pero el sitio no lo
dice donde importa:

- El Home abre con "Tu termo está pidiendo calcos": quien llega buscando
  calcos para su marca tiene que bajar cuatro secciones para enterarse de que
  hay algo para él.
- **No hay forma de saber cuánto sale un pedido de negocio** salvo el caso
  exacto "un logo, 100, 6 cm". Con varios diseños o más de 100, el sitio cotiza
  como si fueran calcos sueltas: tres logos × 100 copias se muestran a $630.000
  cuando la misma tienda los vende a $158.997 (AUDIT H-2).
- Para más de 100 en el pack mezclado hay que armar el pack de a 100, a mano
  (AUDIT H-3).
- El que necesita 5.000 calcos no tiene un camino: solo una línea del FAQ que
  dice "cotizamos por WhatsApp".
- Mariano recibe por WhatsApp el mismo "Hola" del que pregunta por un calco de
  Boca que del que quiere 2.000 calcos para su packaging (AUDIT H-8).
- Google ve todas las páginas como el Home (AUDIT H-9): no hay ninguna que le
  diga "calcos personalizados para negocios".

---

## 2. Objetivo

Que quien entra a EPICALCOS por un anuncio o una búsqueda de negocio entienda
en menos de cinco segundos que **acá se hacen calcos con su logo, desde 100
unidades, y cuánto le van a costar**, y que pueda **comprar o pedir
presupuesto** sin hablar con nadie — sin bajarle las ventas a la tienda B2C.

**Cómo se sabrá que funcionó**
- Sube la cantidad de pedidos con líneas de negocio (Promo Negocio, pack x100,
  pack holográfico, pack mayorista) y su facturación, contra las 4 semanas
  previas al lanzamiento.
- Aparecen pedidos de presupuesto (+1.000 o combinaciones sin precio online)
  medibles por fuente.
- En el A/B del Home, la variante B2B **no** pierde facturación por sesión
  contra el control (si pierde, se queda el control y el B2B vive en `/negocio`).

---

## 3. Scope

Lo que **sí** entra, repartido en fases (detalle en `WHOLESALE-MIGRATION.md`):

- [ ] **Posicionamiento**: jerarquía B2B en navegación, footer, tira de
      anuncios y CTA "Cotizar"; la tienda sigue a un click
- [ ] **Cotizador** de pedidos de negocio: cantidad → tamaño → material →
      diseños → precio total y por calco, con la combinación más barata entre
      los productos que ya se venden
- [ ] **Del cotizador al carrito**: subir los diseños y agregar el pedido sin
      pasar por otra página
- [ ] **Pedido de presupuesto** (lead B2B) para +1.000 y para combinaciones sin
      precio online, con archivo opcional
- [ ] **WhatsApp contextual**: mensaje precargado según la página y el estado
      del cotizador; un solo botón flotante
- [ ] **`/negocio` como landing B2B**: hero, clientes, usos, precios, proceso,
      materiales, FAQ de negocio, presupuesto
- [ ] **`/mayorista`** reposicionado como "grandes pedidos"
- [ ] **Home B2B** como variante de un A/B contra el Home actual, con un camino
      claro a la tienda
- [ ] **Barra fija móvil** "Desde 100 unidades · Cotizar" en las páginas B2B
- [ ] **SEO técnico** de las páginas B2B: títulos, descripciones, HTML
      prerenderizado, Open Graph, JSON-LD, sitemap, alias 301
- [ ] **Landing de uso `/calcos-para-packaging`** (intención propia)
- [ ] **Medición** del funnel de cotización y presupuesto

---

## 4. Fuera de scope

- [ ] **Cualquier cambio de precio, promo, cupón o umbral de envío.** Si
      Mariano decide una escalera por volumen (N-1), es otra spec.
- [ ] **Cambios en el servidor de pagos** (`price_mismatch`, líneas,
      webhook). El cotizador usa líneas que el servidor ya acepta.
- [ ] **Cuentas de usuario, "Mis pedidos" y "Repetir pedido"**: se documenta
      cómo se haría (`design.md` §9), no se implementa.
- [ ] **El popup de bienvenida** (spec 026, en QA): no cambia de estrategia acá.
- [ ] **Lead magnet / lista de precios por mail**: queda propuesto (N-16).
- [ ] **Secciones que necesitan fotos que no existen** (galería antes/después,
      fotos de materiales, taller): se dejan listas para encenderse con las
      fotos, sin montarse vacías.
- [ ] **Rebrand**: colores, tipografías y logo no cambian.
- [ ] **El configurador de `/personalizados`** (spec 023): no se toca, salvo
      que Mariano decida que también arme packs con varios diseños (hallazgo
      anotado para la 023).
- [ ] **Corregir el FAQ existente** (AUDIT Q-1…Q-3): son textos, no necesitan
      spec, y van aparte con la confirmación de Mariano.
- [ ] **Landings gemelas** (`/calcos-con-logo`, `/calcos-para-empresas`,
      `/stickers-para-emprendedores`, `/calcos-mayoristas`…): son alias 301,
      no páginas.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Negocio / marca que compra (nuevo foco) | Ve precio, arma el pedido con sus diseños y compra, o pide presupuesto |
| Cliente B2C | En el Home B2B, la tienda pasa a segundo plano (a un click). Fuera del A/B, no cambia nada |
| Cliente que vuelve (carrito guardado) | No afectado: no cambia la forma de ninguna línea |
| Mariano (operación) | Recibe pedidos de presupuesto por mail + CRM con todos los datos, y WhatsApps que ya dicen de dónde vienen |
| Sistemas externos | CRM interno: un tipo de lead nuevo. Meta y GA4: eventos nuevos. Mercado Pago: no afectado |

---

## 6. User stories

- **US-1** — Como dueña de un emprendimiento que manda pedidos todos los días,
  quiero saber cuánto me salen 250 calcos con mi logo sin escribirle a nadie,
  para decidir si me conviene.
- **US-2** — Como marca con tres diseños, quiero pedir 300 calcos repartidas
  entre los tres en un solo pedido, al precio de pack, sin armar tres packs a
  mano.
- **US-3** — Como empresa que necesita 5.000 calcos para un evento, quiero
  dejar mis datos y lo que necesito en un formulario corto, para recibir una
  propuesta.
- **US-4** — Como cliente que no sabe qué tamaño o material elegir, quiero
  escribir por WhatsApp desde el cotizador y que el mensaje ya diga lo que
  estaba mirando.
- **US-5** — Como comprador desde el celular que llegó por un anuncio de
  Instagram, quiero ver el precio y el botón de cotizar sin scrollear de más.
- **US-6** — Como alguien que quería stickers para su termo, quiero llegar a la
  tienda en un click aunque el Home hable de negocios.
- **US-7** — Como Mariano, quiero saber cuántos pedidos de negocio y cuántos
  presupuestos genera cada página y cada anuncio.
- **US-8** — Como Mariano, quiero poder apagar el Home B2B en un minuto si baja
  las ventas.

---

## 7. Requisitos funcionales

### 7.1 Sistema de CTAs (rige todo el resto)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-CTA1 | Hay **cinco** CTAs con nombre fijo en todo el sitio B2B: **Cotizar mis calcos** (primario), **Ver precios** (secundario), **Pedir presupuesto** (pedidos grandes), **Hablar por WhatsApp** (asistencia), **Ver tienda** (B2C). En el header el primario se abrevia **Cotizar** | 🔴 must |
| RF-CTA2 | En una misma pantalla no compiten dos CTAs primarios | 🔴 must |

### 7.2 Navegación y jerarquía

| ID | Requisito | Prioridad |
|---|---|---|
| RF-N1 | El menú principal ordena: **Para negocios · Precios · Con tu diseño · Tienda · Preguntas**, más el botón destacado **Cotizar**. ("Con tu diseño" = calcos personalizadas desde 1 unidad: es el camino del negocio que necesita menos de 100. "Cómo funciona" queda en la página y en el footer; ver `design.md` D-6) | 🔴 must |
| RF-N2 | "Tienda" lleva al catálogo actual; el buscador y el carrito siguen en el header | 🔴 must |
| RF-N3 | El menú entra en una línea desde el ancho donde deja de haber hamburguesa; en celular, "Cotizar" está dentro del menú y en la barra fija (RF-B1) | 🔴 must |
| RF-N4 | El footer se agrupa en **Productos** (calcos para negocios, grandes pedidos, calcos con tu diseño, tienda, tatuajes, Polaroid), **Ayuda** (cómo funciona, preguntas, envíos, cambios), **EPICALCOS** (contacto, Instagram, WhatsApp) y **Legal** (términos, privacidad) | 🟡 should |
| RF-N5 | La tira de anuncios suma "Calcos con tu logo desde 100 unidades" en las páginas B2B, sin perder el envío gratis, la garantía ni la transferencia | 🟡 should |
| RF-N6 | Una sección despublicada sigue desapareciendo de nav, footer y Home como hoy | 🔴 must |

### 7.3 Hero B2B (en `/negocio` y en la variante B2B del Home)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-H1 | Eyebrow **PARA MARCAS Y NEGOCIOS** | 🔴 must |
| RF-H2 | H1 corto que diga producto + negocio. Propuesta: **"Calcos con tu logo para tu negocio."** (alternativa para A/B: "Calcos personalizados para negocios, desde 100 unidades.") | 🔴 must |
| RF-H3 | Una línea que diga: desde 100 unidades, mandás tu logo o diseño y te llegan las calcos listas para usar | 🔴 must |
| RF-H4 | Muestra el **precio por calco desde 100** del producto más barato vigente (hoy $530) y el de la calco suelta como referencia, ambos leídos de las reglas de precio — nunca escritos a mano | 🔴 must |
| RF-H5 | CTAs: **Cotizar mis calcos** (lleva al cotizador) y **Ver precios** (lleva a la sección de precios) | 🔴 must |
| RF-H6 | Imagen: **solo fotos reales**. Mientras no haya fotos de calcos aplicadas en negocios, va la foto real de la tirada de calcos con logo. Etiquetas flotantes (PACKAGING, PEDIDOS…) solo si la foto las muestra | 🔴 must |
| RF-H7 | En un celular de 375 × 667, el H1, el precio y el CTA primario se ven sin scrollear | 🔴 must |

### 7.4 Barra de confianza

| ID | Requisito | Prioridad |
|---|---|---|
| RF-T1 | Cuatro datos debajo del hero, todos verificables: desde 100 unidades · +120.000 calcos vendidas · 35 marcas que ya confiaron (el número sale de la lista de logos) · producción en 2 a 3 días hábiles (sale de la configuración de envíos; ver N-3) | 🔴 must |

### 7.5 Cotizador

| ID | Requisito | Prioridad |
|---|---|---|
| RF-C1 | Título "¿Cuántas calcos necesitás?" y subtexto que no prometa escala inexistente (N-1) | 🔴 must |
| RF-C2 | Paso 1, cantidad: **100 · 250 · 500 · 1.000 · Más de 1.000** | 🔴 must |
| RF-C3 | Paso 2, tamaño: solo los que se venden (4, 6 y 9 cm), con su uso típico | 🔴 must |
| RF-C4 | Paso 3, material: solo los que se venden (vinilo blanco, DTF UV, vinilo holográfico). Una combinación que no se vende (holográfico en 9 cm) no se puede elegir | 🔴 must |
| RF-C5 | Paso 4, diseños: **uno** o **varios** (con la cantidad de diseños). Con varios, las calcos se reparten según N-9 | 🔴 must |
| RF-C6 | Muestra **total** y **precio por calco**, en vivo, con el precio de Mercado Pago y debajo el de transferencia | 🔴 must |
| RF-C7 | Muestra el ahorro contra la referencia que decida Mariano (N-2), solo si es positivo | 🟡 should |
| RF-C8 | **El precio es el más barato posible con los productos que ya existen**, y es exactamente lo que se cobra en el checkout. Si la cantidad redondea a packs de 100, lo dice ("pedís 250, te llevás 300 por el mismo precio que…") | 🔴 must |
| RF-C9 | "Más de 1.000" (N-8) y toda combinación sin precio online (N-10) muestran **Pedir presupuesto** en lugar de un precio | 🔴 must |
| RF-C10 | El CTA **Subir diseño y continuar** abre la subida de archivos ahí mismo; con los archivos subidos, **Agregar al carrito** suma el pedido con sus archivos adentro | 🔴 must |
| RF-C11 | La subida acepta exactamente los formatos, pesos y cantidades que acepta hoy la subida de `/personalizados`; muestra "✓ archivo cargado", el nombre y "Cambiar archivo" | 🔴 must |
| RF-C12 | Se puede seguir sin subir: el diseño se manda por WhatsApp después de pagar, como hoy en `/negocio` | 🟡 should |
| RF-C13 | Debajo del precio: **Hablar por WhatsApp** con la configuración en el mensaje | 🟡 should |
| RF-C14 | El cotizador funciona con teclado y lector de pantalla (grupos de opciones con nombre, precio anunciado al cambiar) | 🔴 must |
| RF-C15 | Si una promo de la que depende el precio se apaga, el cotizador recalcula solo con lo que queda vigente | 🔴 must |

### 7.6 Precios y escala

| ID | Requisito | Prioridad |
|---|---|---|
| RF-E1 | Sección **"Suelta vs. desde 100"**: precio de la calco suelta y precio por calco desde 100, por tamaño, más el de transferencia. Todo leído de las reglas de precio | 🔴 must |
| RF-E2 | La sección "Cuantos más pedís, menos pagás" con filas 100/250/500/1.000 **solo** se muestra si existe una escalera real (N-1 = B). Con precios planos no se muestra | 🔴 must |
| RF-E3 | Ninguna etiqueta "MÁS ELEGIDO" sin dato que la respalde | 🔴 must |

### 7.7 Contenido de las páginas B2B

| ID | Requisito | Prioridad |
|---|---|---|
| RF-U1 | **Para qué los usan los negocios**: seis usos (packaging, pedidos, productos, gastronomía, merchandising, promociones) con una línea concreta cada uno. Sin foto real, la card va sin foto (icono), nunca con una imagen de stock | 🟡 should |
| RF-G1 | **Cómo lo usan otras marcas** (galería, antes/después): se monta **solo** con fotos reales cargadas; sin fotos no existe en la página ni en el HTML | 🟡 should |
| RF-M1 | **Materiales**: una card por material que se vende, con beneficio, usos y en qué tamaños existe | 🟡 should |
| RF-M2 | El holográfico dice que va en packs de 100 en 4 y 6 cm | 🔴 must |
| RF-M3 | La foto de cada material se muestra solo si existe | 🟡 should |
| RF-P1 | **Cómo funciona**, 4 pasos: elegí cantidad y tamaño → subí tu diseño → revisamos tu archivo y te escribimos si hay algo para ajustar → producimos y te lo enviamos (o lo retirás). Plazo leído de la configuración | 🔴 must |
| RF-P2 | Ningún texto menciona boceto, muestra, prueba ni aprobación previa — ni para decir que no hay | 🔴 must |
| RF-R1 | **¿Pedís calcos todos los meses?** con CTA de WhatsApp precargado. Solo enumera beneficios confirmados (N-4) | 🟡 should |
| RF-S1 | **Social proof**: logos reales de clientes, cifras de marca reales, testimonios reales (preferir los de negocios). Un componente sin datos no se monta | 🔴 must |
| RF-K1 | **Pedidos grandes**: "¿Necesitás 1.000, 5.000 o más?" con **Pedir presupuesto** y **Hablar por WhatsApp** | 🔴 must |
| RF-F1 | **Preguntas de negocio**: pedido mínimo, varios diseños, tamaños, materiales, agua y sol, cómo mandar el diseño, calidad del archivo, más de 1.000, plazo, envíos, retiro, precio para empresas, volver a pedir el mismo diseño. Cada respuesta sale de un dato verificable; las que dependen de un TODO **no se publican** hasta confirmarlo | 🔴 must |
| RF-F2 | "¿Puedo pedir factura?" solo se publica con N-7 resuelto | 🔴 must |
| RF-Z1 | **CTA final**: "Tu marca también puede ser calco." + Cotizar mis calcos + Hablar por WhatsApp | 🟡 should |

### 7.8 Pedido de presupuesto (lead B2B)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-L1 | Formulario corto. **Obligatorios**: nombre, WhatsApp, cantidad aproximada. **Opcionales**: negocio, email, tamaño, material, cantidad de diseños, observaciones, archivo (N-11) | 🔴 must |
| RF-L2 | Si se abre desde el cotizador, llega **precargado** con lo que el cliente ya eligió | 🔴 must |
| RF-L3 | Al enviar, Mariano recibe un mail con todo y el lead queda en el CRM marcado como presupuesto de negocio, con el link al archivo si lo hay | 🔴 must |
| RF-L4 | Si el pedido no se pudo registrar, el cliente **no** ve un "listo": ve el error y un botón de WhatsApp con su pedido escrito | 🔴 must |
| RF-L5 | Protección anti-spam sin captcha (mismo criterio que `/contacto`) y sin doble envío por doble tap | 🔴 must |
| RF-L6 | Confirmación: "Recibimos tu pedido. Te escribimos por WhatsApp." + plazo de respuesta solo si Mariano lo define (N-18) | 🟡 should |

### 7.9 WhatsApp

| ID | Requisito | Prioridad |
|---|---|---|
| RF-W1 | Sigue habiendo **un solo** botón flotante | 🔴 must |
| RF-W2 | El mensaje precargado depende de la página: Home B2B y `/negocio` → "Hola EPICALCOS. Estoy buscando calcos personalizados para mi negocio."; pedidos grandes → "…Necesito cotizar un pedido de más de 1.000 calcos."; cotizador → incluye cantidad, tamaño, material y diseños; ficha de producto → incluye el producto. El resto del sitio sigue como hoy | 🟡 should |
| RF-W3 | El botón no tapa la barra fija móvil ni la del cotizador | 🔴 must |

### 7.10 Barra fija móvil

| ID | Requisito | Prioridad |
|---|---|---|
| RF-B1 | En celular, en las páginas B2B, aparece una barra "Desde 100 unidades · **Cotizar**" **recién después del hero** y desaparece cuando el cotizador está a la vista | 🟡 should |
| RF-B2 | No tapa contenido (la página reserva su alto) ni aparece con el carrito, el menú o un modal abiertos | 🔴 must |

### 7.11 Home

| ID | Requisito | Prioridad |
|---|---|---|
| RF-HO1 | El Home tiene dos variantes: **control** (el de hoy) y **B2B**. Cuál ve cada persona lo decide un A/B de presentación, estable por visitante | 🔴 must |
| RF-HO2 | La variante B2B ordena: hero B2B → confianza → cotizador → suelta vs. desde 100 → usos → marcas y testimonios → cómo funciona → pedidos grandes → **"¿Buscás calcos para vos? Ver tienda"** con algunas categorías → preguntas → CTA final | 🔴 must |
| RF-HO3 | Se puede forzar una variante y apagar el experimento desde la configuración, sin deploy de código nuevo más que ese valor | 🔴 must |
| RF-HO4 | El popup de bienvenida se comporta igual en las dos variantes | 🔴 must |

### 7.12 `/negocio` y `/mayorista`

| ID | Requisito | Prioridad |
|---|---|---|
| RF-NE1 | `/negocio` pasa a ser la landing B2B: hero → clientes → usos → cotizador → precios → proceso → materiales → preguntas → presupuesto → CTA. La URL no cambia | 🔴 must |
| RF-NE2 | La Promo Negocio (un logo, 100, 6 cm) sigue comprable en `/negocio`, ahora como una configuración más del cotizador | 🔴 must |
| RF-MA1 | `/mayorista` mantiene el armador de packs (catálogo y diseños propios) y suma arriba la banda de pedidos grandes y el presupuesto | 🟡 should |

### 7.13 SEO

| ID | Requisito | Prioridad |
|---|---|---|
| RF-SEO1 | `/negocio`, `/mayorista`, el Home B2B y cada landing nueva tienen título, descripción, canonical, Open Graph y Twitter propios **en el HTML inicial**, legibles sin JavaScript | 🔴 must |
| RF-SEO2 | Título de `/negocio`: "Calcos personalizados para negocios, desde 100 \| EPICALCOS" (o equivalente sin keyword stuffing) | 🔴 must |
| RF-SEO3 | JSON-LD: Organization (una sola vez), BreadcrumbList, Product con oferta solo donde hay precio real, FAQPage solo con preguntas visibles en la página | 🔴 must |
| RF-SEO4 | Alias 301: `/para-negocios`, `/calcos-para-empresas`, `/calcos-con-logo`, `/stickers-para-emprendedores` → `/negocio`; `/calcos-mayoristas`, `/stickers-personalizados-mayoristas` → `/mayorista`; `/cotizar` → cotizador; `/tienda` → catálogo; `/calcos-personalizados` → `/personalizados` | 🟡 should |
| RF-SEO5 | Landing `/calcos-para-packaging` con contenido propio: tamaño por tipo de packaging, superficies, cantidad por pedido, cotizador | 🟢 could |
| RF-SEO6 | Ninguna URL indexada cambia ni deja de responder | 🔴 must |
| RF-SEO7 | El título del Home sigue siendo el actual mientras el A/B no tenga ganador (el HTML inicial es uno solo para las dos variantes) | 🔴 must |

### 7.14 Copy

| ID | Requisito | Prioridad |
|---|---|---|
| RF-CO1 | Tono argentino, directo y concreto. Prohibidas las frases genéricas que lista el pedido ("llevá tu marca al siguiente nivel", "potenciá tu identidad"…) | 🔴 must |
| RF-CO2 | Prohibidas también: "archivo perfecto", "boceto", "muestra previa", "aprobación previa", "envío gratis" como beneficio de un pack, cualquier código de cupón | 🔴 must |
| RF-CO3 | Ningún monto, porcentaje, plazo ni cifra escrito a mano: todo sale de la configuración o de un dato confirmado en `BUSINESS-TODOS.md` | 🔴 must |
| RF-CO4 | "Mayorista" aparece como argumento de precio, keyword y sección; el nombre del camino principal es **calcos para negocios** | 🟡 should |
| RF-CO5 | Ortografía RAE ("hacelo", "mandalo", sin tilde) | 🔴 must |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | todo funciona a 375 px sin scroll horizontal; targets de 44 px |
| RNF-2 | **Performance** | el LCP de `/negocio` y del Home B2B ≤ al del Home de hoy en las mismas condiciones; el cotizador no agrega peso al chunk del Home control; ningún script bloqueante |
| RNF-3 | **Accesibilidad** | `aria-label` en controles sin texto propio, foco visible, contraste AA, `prefers-reduced-motion` respetado |
| RNF-4 | **Compatibilidad** | los carritos guardados siguen funcionando; no hay forma de línea nueva |
| RNF-5 | **Seguridad** | ningún secreto en el bundle; el endpoint de presupuesto revalida todo y tiene topes de tamaño |
| RNF-6 | **Sin dependencias nuevas** | ni librería de formularios, ni de animación, ni de A/B |
| RNF-7 | **Rollback** | cada fase se apaga sin revertir código: experimento del Home, `HIDDEN_SECTIONS`, alias 301 |
| RNF-8 | **Paridad de precios** | todo precio que muestra el cotizador lo verifica un test contra el servidor real |

---

## 9. Reglas de negocio

| Regla | Ref. | ¿Se modifica? |
|---|---|---|
| Precios por tamaño de la calco suelta | `business-rules.md` §1 | no |
| Promo Negocio (100 de un diseño, 6 cm) | §4 | no |
| Promo x100 (exactamente 100, 4 y 6 cm, diseños mezclados) | §3.2 | no |
| Pack mayorista (desde 100, 50 % OFF) | §4 | no |
| Pack holográfico (100 en total, 4 y 6 cm, + recargo) | §1 | no |
| 20 % OFF por transferencia en todo | §2 | no |
| Ninguna promo regala el envío | §5 | no |
| Sin pedido mínimo | §6 | no — "desde 100" es el mínimo **del precio de negocio**, no de la tienda |
| Revisión de cada archivo antes de producir | memoria de decisiones de copy | no |
| Experimentos solo de presentación | §7 | no |

- [ ] ~~Requiere cambio espejado en `pricing.js`~~ — **no**
- [ ] ~~Requiere cambio espejado en `site.js` y el servidor~~ — **no**
- [x] Requiere test de paridad **nuevo**: el cotizador contra el servidor

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| Pide 250 de un diseño en 6 cm | Precio de 3 packs, avisando "te llevás 300" (la regla vigente de Negocio) |
| Pide 100 con 3 diseños en 4 cm | Un pack x100 mezclado; reparto según N-9 |
| Pide 100 con 3 diseños en DTF UV | Sin precio online hoy (N-10) → Pedir presupuesto |
| Pide 9 cm | Pack mayorista 50 % OFF (precio por calco de 9 cm) |
| Holográfico + 9 cm | La opción 9 cm no se puede elegir con holográfico |
| Se apaga la promo x100 mientras cotiza | Recalcula con el pack mayorista 50 % (precio por calco más alto) y lo muestra |
| Sube 40 archivos para un pedido de 100 | Se acepta (tope 100 archivos); reparto según N-9 |
| Agrega al carrito y vuelve a cambiar la cantidad | No duplica: reemplaza su pedido del cotizador o avisa que ya está en el carrito |
| Falla Cloudinary al subir | Puede seguir sin archivo (lo manda por WhatsApp) o reintentar |
| Falla el endpoint de presupuesto | Error visible + WhatsApp con el pedido escrito; nada de "listo" falso |
| Navegador embebido de Instagram sin storage | El cotizador y el formulario funcionan; el A/B cae en el control |
| Carrito guardado de antes | Funciona igual |
| Pedido que supera 130 líneas | No puede pasar con estos productos (1.000 calcos = 10 líneas); el corte de +1.000 lo previene |

---

## 11. Analytics necesarios

Mapeo de los eventos que pide el pedido contra lo que ya existe — **no se
duplica nada**:

| Pedido | Evento real | ¿Nuevo? |
|---|---|---|
| `hero_cta_click` | `hero_cta_click` { pagina, cta } | nuevo |
| `calculator_started` | `cotizador_start` { pagina } (primera interacción) | nuevo |
| `calculator_completed` | `cotizador_complete` { cantidad, tamano, material, disenos, value, producto } (precio visible con todo elegido) | nuevo |
| `file_upload_started` / `completed` | `personalized_upload_start` / `personalized_upload_complete` con `origen: 'cotizador'` | existente, parámetro nuevo |
| `add_to_cart` | `add_to_cart` con `item_list_name: 'cotizador_negocio'` | existente |
| `quote_started` | `presupuesto_start` { origen } (primer campo tocado) | nuevo |
| `quote_completed` / `business_lead` / `bulk_quote_request` | **`generate_lead`** { lead_source: 'presupuesto_negocio', rango_cantidad } + Pixel `Lead` | existente — es LA conversión de lead; un evento aparte la contaría dos veces |
| `whatsapp_click` | `whatsapp_click` { whatsapp_context } con contextos nuevos (`negocio`, `cotizador`, `pedidos_grandes`, `recurrentes`) | existente |
| `product_view` | `view_item` | existente |
| `begin_checkout`, `purchase` | sin cambios | existente |
| FAQ | `faq_open` { pregunta_id, pagina } | nuevo |
| A/B del Home | `experiment_view` { id: 'home_b2b', variant } | existente |

**Qué se quiere poder responder**
- ¿Qué % de visitantes de `/negocio` usa el cotizador, y qué % de esos agrega
  al carrito o pide presupuesto?
- ¿Qué combinación (cantidad × tamaño × material) se cotiza más, y cuál se
  abandona?
- ¿La variante B2B del Home gana o pierde facturación por sesión contra el
  control? ¿Y leads?
- ¿Cuántos presupuestos de +1.000 entran por semana y de qué fuente?

**Recordatorios**: todo por `lib/analytics.js`, en `try/catch`, **sin PII**
(ni nombre, ni negocio, ni mail, ni nombre de archivo, ni texto de
observaciones). La cantidad viaja en rangos para el lead.

---

## 12. Preguntas abiertas

Todas están en [`BUSINESS-TODOS.md`](BUSINESS-TODOS.md) con opciones y
recomendación. Las que bloquean una fase:

- [ ] **N-1** escalera de precios por volumen → sección de escala
- [ ] **N-2** referencia del ahorro → ahorro en el cotizador
- [ ] **N-3** plazo de producción B2B → copy de plazos
- [ ] **N-4** beneficio por recompra → sección de recurrentes
- [ ] **N-6** fotos reales → hero con contexto, galería, materiales
- [ ] **N-7** factura → FAQ de factura
- [ ] **N-8** corte de +1.000 → cotizador
- [ ] **N-9** reparto con varios diseños → cotizador
- [ ] **N-10** combinaciones sin precio → cotizador
- [ ] **N-17** Home como A/B o reemplazo directo
