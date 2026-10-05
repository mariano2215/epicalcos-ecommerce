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

## ✅ Respondidas por Mariano (05/10/2026)

| # | Pregunta | Respuesta | Dónde impacta |
|---|---|---|---|
| N-1 | ¿Escala de precios por volumen? | **Sí.** *"Mientras más cantidad, más barato te sale, lo único que se mantiene es la calidad."* | Spec nueva [`032-escala-de-precios-por-volumen`](../032-escala-de-precios-por-volumen/requirements.md) con la tabla para aprobar |
| N-2 | ¿Contra qué se calcula el ahorro? | *"Poner el % de descuento según el monto que se haga por cada cantidad."* | Cada escalón muestra su %; la referencia exacta es P-2 de la 032 |
| N-3 / N-19 | Plazo de producción | **3 a 5 días hábiles desde confirmado y abonado, para todo pedido de 100 calcos o más** (cualquier producto). Con menos de 100, 2 a 3 como hoy | Barra de confianza, cómo funciona, checkout, mail y FAQ (RF-T1, RF-P1, RF-P3) |
| N-7 | Factura | **Factura C** | FAQ de negocio (RF-F2); CUIT opcional en cotizador y presupuesto. Ver N-20 |
| N-10 | Combinaciones sin precio | Cubiertas: DTF UV y vinilo blanco salen lo mismo en la escala; **se recomienda vinilo blanco** | Cotizador (RF-C4) |
| — | Escala (spec 032) | **Opción B** (−10/−20/−30 %), **sin 9 cm** en la venta por mayor, **sin descuento en 100** (va MUESTRA GRATIS), **$52.999 es el precio fijo** | Spec 032 `APPROVED` |
| — | ¿Qué es la MUESTRA GRATIS? | **Vista previa digital por WhatsApp antes de producir**, en pedidos de 100+ | RF-P2, RF-P1 paso 3, RF-F3. Cambia la regla del 14/9 solo para 100+ |
| N-11 | Obligatorios del formulario | **Nombre y apellido, razón social / empresa, mail y teléfono** (para negocios) | Presupuesto (RF-L1); razón social también al comprar desde el cotizador (RF-C16) |

---

## 🔴 Bloquean una fase

| # | Decisión | Por qué importa | Opciones | Recomendación | Bloquea |
|---|---|---|---|---|---|
| **N-4** | **¿Hay beneficio real para el que repite?** El FAQ promete "condiciones especiales" | Sin respaldo es una promesa rota; con respaldo es el mejor argumento de recurrencia | A) Sí, cuál. B) No → se saca del FAQ | — | Sección "¿Pedís todos los meses?" (RF-N*) y Q-3 |
| **N-5** | **¿Se ajustan logos?** El FAQ dice "si no tiene fondo transparente, te ayudamos a adaptarlo" | ¿Es parte del servicio o fue copy? Define qué se promete en "Subí tu diseño" | A) Sí: qué incluye (quitar fondo, vectorizar, contorno). B) No, solo se revisa y se avisa | — | Copy del paso "Revisamos tu archivo" |
| **N-6** | **Sesión de fotos B2B** | Sin fotos reales no se montan: el hero con contexto, la galería "cómo lo usan otras marcas", las fotos de materiales y "tus calcos se hacen acá" (regla vigente: nada de mockups) | Lista mínima en la tabla de abajo | Prioridad alta: es lo que más mueve la percepción de "proveedor" | Hero visual (RF-H6), RF-G*, RF-M3, RF-P* |
| **N-8** | **Pedidos de más de 1.000** | Con la escala, 1.000 tiene precio online (spec 032). ¿Querés que desde ahí sea **solo** presupuesto, o online + presupuesto? | A) Hasta 1.000 online, más = presupuesto. B) Todo online, presupuesto opcional | **A** (es lo que pide el pedido y deja margen para negociar) | Corte del cotizador (RF-C9) |
| **N-9** | **Reparto de cantidades con varios diseños** en el pack de 100 mezclado | El cliente con 3 logos y 300 calcos: ¿100 de cada uno? ¿Elige él? | A) Partes iguales salvo indicación en observaciones. B) El cliente reparte en el cotizador | **A** en la primera versión (un campo menos) | Cotizador con varios diseños (RF-C5) |

---

## 🟡 No bloquean, pero mejoran mucho

| # | Dato | Para qué |
|---|---|---|
| N-12 | ¿A qué mail/destino van los pedidos de presupuesto? ¿El mismo que `/contacto`? ¿Una etiqueta propia en el CRM? | Que no se mezclen con consultas de "¿tienen calcos de Boca?" |
| N-13 | Testimonios de **negocios** (texto + nombre del negocio + permiso para publicarlo) | Social proof B2B; hoy hay uno solo |
| N-14 | ¿Se pueden nombrar algunas de las 35 marcas en el copy ("Trabajamos con X, Y, Z")? | Hoy aparecen como logos; nombrarlas es otro nivel de permiso |
| N-15 | Cantidad de pedidos de negocio hechos / clientes recurrentes, si existe el dato | Métrica B2B verificable para la barra de confianza |
| N-16 | ¿Lista de precios por mail (lead magnet) sí o no? | Se puede armar con el config (los precios salen solos), pero es un mail más que mantener |
| N-17 | ¿El Home B2B sale como A/B (recomendado) o reemplaza directo al actual? | Riesgo R-1 de la auditoría |
| N-18 | Horario de atención por WhatsApp, si querés publicarlo | Expectativa de respuesta en el CTA de "Hablar por WhatsApp" |
| N-21 | ¿La vista previa también para pedidos de menos de 100? (asumido: no) y ¿los 3 a 5 días cuentan desde que se aprueba? (asumido: sí) | Copy del paso 3 y del plazo |
| N-20 | Factura C implica monotributo: ¿actualizamos la condición fiscal en los Términos? Hoy muestran en producción una nota "[REVISAR] … (CUIL persona humana)" | Texto legal; no lo cambio sin tu OK |

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
| ~~Paso "aprobación previa / muestra" en el proceso~~ | **Cambió el 5/10/2026:** con 100+ calcos se manda una vista previa digital gratis (MUESTRA GRATIS). Con menos de 100 sigue sin vista previa y no se dice | Mariano, 14/9/2026 → 5/10/2026 |
| Fotos generadas, mockups o renders en lugar de fotos reales | Responden mal "¿cómo queda de verdad?" | Mariano, 14/9/2026 |
| Envío gratis como beneficio de un pack | Ninguna promo regala el envío: manda el umbral | Mariano, 12/8/2026 |
| Bajar tarifas de envío | Decisión tomada, no reabrir | Mariano, 11/8/2026 |
| Cambiar Inter/Montserrat o volver al hero gris | Descartado | Mariano, 3/9/2026 |
| Publicar un código de cupón en la UI | Ningún código se publica | Mariano, 3/8/2026 |
| A/B test de precios | El servidor rechaza todo precio que no sea el del config | Regla del repo |
