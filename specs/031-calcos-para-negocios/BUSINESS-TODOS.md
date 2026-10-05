# BUSINESS-TODOS — Lo que tiene que definir Mariano

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Fecha** | 05/10/2026 |

Datos y decisiones comerciales que **no están en el código** y que esta spec no
puede inventar. Cada uno dice qué bloquea y qué se hace mientras tanto: nada
frena el desarrollo entero, pero ninguno de estos datos se publica sin
confirmar.

**Cómo responder:** alcanza con el número y la respuesta ("N-1: B", "N-3: 3 a 5
días para todo lo de 100+"). Las respuestas se pasan a `requirements.md` §12 y
a este archivo, con fecha.

---

## 🔴 Bloquean una fase

| # | Decisión | Por qué importa | Opciones | Recomendación | Bloquea |
|---|---|---|---|---|---|
| **N-1** | **¿Hay escalera de precios por volumen?** Hoy, desde 100, la calco cuesta $530 con 100, 250, 500 o 1.000 (AUDIT H-1) | El pedido gira alrededor de "cuantos más pedís, menos pagás". Hoy eso es verdad **hasta** 100 y falso después | **A)** Sin escalera: se comunica "suelta $2.100 → desde 100 $530 (−75 %)". **B)** Escalera nueva (ej. 250 / 500 / 1.000 con precios más bajos): spec de precios aparte, con tabla aprobada, espejo en el servidor y tests | **A ahora, B como spec 032** si querés el argumento de volumen. A es verdad hoy y ya es un argumento fuerte; B es una decisión de margen que no se toma escribiendo una landing | Sección "Escala" (RF-E*) |
| **N-2** | **¿Contra qué se calcula el ahorro?** `/negocio` muestra 59 % OFF contra un tachado de $127.999; el configurador, 75 % contra 100 × $2.100 (AUDIT H-4) | Un sitio que dice dos % distintos para el mismo producto pierde credibilidad justo con el comprador que compara | **A)** Contra la calco suelta (100 × precio por tamaño). **B)** Contra el tachado de `NEGOCIO.listPrice` | **A**: se deriva solo del precio real de la calco suelta y vale para todos los tamaños; el tachado de $127.999 no se explica por ningún precio del sitio | Ahorro en el cotizador (RF-C7) |
| **N-3** | **Plazo de producción para 100+, 500+ y 1.000+** | El FAQ dice a la vez 2–3 y 3–5 días hábiles (AUDIT H-6). Un negocio compra con fecha | Un plazo por tramo, o "2 a 3 días hábiles hasta X; más, a coordinar" | Que lo definas vos: es capacidad del taller | Copy de plazos B2B, Q-2 |
| **N-4** | **¿Hay beneficio real para el que repite?** El FAQ promete "condiciones especiales" | Sin respaldo es una promesa rota; con respaldo es el mejor argumento de recurrencia | A) Sí, cuál. B) No → se saca del FAQ | — | Sección "¿Pedís todos los meses?" (RF-N*) y Q-3 |
| **N-5** | **¿Se ajustan logos?** El FAQ dice "si no tiene fondo transparente, te ayudamos a adaptarlo" | ¿Es parte del servicio o fue copy? Define qué se promete en "Subí tu diseño" | A) Sí: qué incluye (quitar fondo, vectorizar, contorno). B) No, solo se revisa y se avisa | — | Copy del paso "Revisamos tu archivo" |
| **N-6** | **Sesión de fotos B2B** | Sin fotos reales no se montan: el hero con contexto, la galería "cómo lo usan otras marcas", las fotos de materiales y "tus calcos se hacen acá" (regla vigente: nada de mockups) | Lista mínima en la tabla de abajo | Prioridad alta: es lo que más mueve la percepción de "proveedor" | Hero visual (RF-H6), RF-G*, RF-M3, RF-P* |
| **N-7** | **Factura** | Hoy la identidad fiscal es CUIL personal (AUDIT H-11). Muchas empresas no pueden comprar sin factura | A) Se emite (qué tipo). B) No se emite → la FAQ no menciona factura y el segmento "empresas" se apunta a pymes/emprendedores | Definirlo antes de pautar a "empresas" | Pregunta de factura del FAQ B2B |
| **N-8** | **Pedidos de más de 1.000** | Hoy se pueden comprar online (10 packs = $529.990). ¿Querés que desde ahí sea **solo** presupuesto, o online + presupuesto? | A) Hasta 1.000 online, más = presupuesto. B) Todo online, presupuesto opcional | **A** (es lo que pide el pedido y deja margen para negociar) | Corte del cotizador (RF-C9) |
| **N-9** | **Reparto de cantidades con varios diseños** en el pack de 100 mezclado | El cliente con 3 logos y 300 calcos: ¿100 de cada uno? ¿Elige él? | A) Partes iguales salvo indicación en observaciones. B) El cliente reparte en el cotizador | **A** en la primera versión (un campo menos) | Cotizador con varios diseños (RF-C5) |
| **N-10** | **Combinaciones sin precio por volumen**: DTF UV en 4 o 9 cm, DTF UV con varios diseños, holográfico en 9 cm | Hoy se cobran sueltas o no existen (AUDIT §2). El cotizador no puede inventarles precio | A) Se les define precio (spec de precios). B) El cotizador las manda a "Pedir presupuesto" | **B** ahora | Opciones del cotizador |

---

## 🟡 No bloquean, pero mejoran mucho

| # | Dato | Para qué |
|---|---|---|
| N-11 | ¿Qué campos son obligatorios en el formulario de presupuesto? Propuesta: nombre, WhatsApp y cantidad aproximada; el resto opcional. ⚠️ El CRM interno hoy **descarta un lead sin mail** (`notifyCrmLead` corta con `no_email`): o el mail también es obligatorio, o hay que enseñarle al CRM (repo `epicalcos-app`) a aceptar leads con WhatsApp solo. Recomendación: mail obligatorio — un comprador de negocio lo tiene, y es un campo | Formulario corto (pedido §5) |
| N-12 | ¿A qué mail/destino van los pedidos de presupuesto? ¿El mismo que `/contacto`? ¿Una etiqueta propia en el CRM? | Que no se mezclen con consultas de "¿tienen calcos de Boca?" |
| N-13 | Testimonios de **negocios** (texto + nombre del negocio + permiso para publicarlo) | Social proof B2B; hoy hay uno solo |
| N-14 | ¿Se pueden nombrar algunas de las 35 marcas en el copy ("Trabajamos con X, Y, Z")? | Hoy aparecen como logos; nombrarlas es otro nivel de permiso |
| N-15 | Cantidad de pedidos de negocio hechos / clientes recurrentes, si existe el dato | Métrica B2B verificable para la barra de confianza |
| N-16 | ¿Lista de precios por mail (lead magnet) sí o no? | Se puede armar con el config (los precios salen solos), pero es un mail más que mantener |
| N-17 | ¿El Home B2B sale como A/B (recomendado) o reemplaza directo al actual? | Riesgo R-1 de la auditoría |
| N-18 | Horario de atención por WhatsApp, si querés publicarlo | Expectativa de respuesta en el CTA de "Hablar por WhatsApp" |

---

## 📸 Lista mínima de fotos (N-6)

Fotos **reales** de pedidos reales, con permiso del cliente cuando se vea su
marca. Celular en buena luz alcanza; lo que no sirve es un render.

| Foto | Dónde se usa | Prioridad |
|---|---|---|
| Caja de envío ecommerce cerrada con la calco de la marca | Hero, card "Packaging" | 🔴 |
| Bolsa (papel o kraft) con calco | Hero, card "Packaging" | 🔴 |
| Vaso / envase de comida con calco | Card "Gastronomía" | 🔴 |
| Pedido preparado: varios paquetes con la calco, listos para despachar | Hero, card "Pedidos" | 🔴 |
| Tirada de 100 calcos con logo (ya existe: `negocio-muestra.webp`) | Hero, materiales | ✅ |
| Mismo packaging **sin** y **con** calco (antes/después) | Galería "cómo lo usan otras marcas" | 🟡 |
| Macro de cada material: vinilo blanco, holográfico, DTF UV | Cards de materiales | 🟡 |
| Producto con la calco aplicada (frasco, botella, caja de producto) | Card "Productos" | 🟡 |
| Impresión, corte y preparación en el taller | "Tus calcos se hacen acá" (opcional) | 🟢 |

Cómo se cargan: van a `frontend/public/images/negocios/`, se corre
`node scripts/optimize-images.mjs` y se listan en el archivo de datos que define
`design.md` §4.3, con su `alt`. Una sección con su lista vacía no se monta.

---

## ❌ Lo que el pedido propone y no se hace (decisiones ya tomadas)

| Propuesta del pedido | Por qué no | Decisión de |
|---|---|---|
| Sección "¿No sabés si tu archivo sirve? / no tengo el archivo perfecto" | *"NO volver a poner"* — siembra la duda justo al subir | Mariano, 15/8 y 14/9/2026 |
| Paso "aprobación previa / muestra" en el proceso | No se manda boceto ni prueba, **y no se dice** | Mariano, 14/9/2026 |
| Fotos generadas, mockups o renders en lugar de fotos reales | Responden mal "¿cómo queda de verdad?" | Mariano, 14/9/2026 |
| Envío gratis como beneficio de un pack | Ninguna promo regala el envío: manda el umbral | Mariano, 12/8/2026 |
| Bajar tarifas de envío | Decisión tomada, no reabrir | Mariano, 11/8/2026 |
| Cambiar Inter/Montserrat o volver al hero gris | Descartado | Mariano, 3/9/2026 |
| Publicar un código de cupón en la UI | Ningún código se publica | Mariano, 3/8/2026 |
| A/B test de precios | El servidor rechaza todo precio que no sea el del config | Regla del repo |
