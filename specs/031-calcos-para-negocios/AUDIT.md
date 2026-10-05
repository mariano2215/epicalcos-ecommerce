# AUDIT — EPICALCOS hacia "calcos para negocios"

| | |
|---|---|
| **Spec** | `031-calcos-para-negocios` |
| **Fecha** | 05/10/2026 |
| **Base** | `main` en `a227dc10`, con la spec 030 a medio implementar en el árbol (no se tocó) |
| **Pedido** | "Prompt maestro" de Mariano del 5/10/2026: pasar el core comercial a calcos personalizados para negocios, desde 100 unidades |

Auditoría del repositorio **antes** de escribir código, como pide el punto 33
del pedido y la regla 3 del `CLAUDE.md`. Todo lo que dice este documento está
leído del código; lo que no se pudo verificar está marcado como tal.

---

## 0. Resumen — lo que cambia el plan

Seis hallazgos que hay que conocer antes de aprobar nada. Ninguno frena el
reposicionamiento; todos cambian **cómo** se hace.

1. **Hoy no hay economía de escala después de 100.** Desde 100 unidades, cada
   calco cuesta lo mismo con 100, 250, 500 o 1.000: **$530** (Promo Negocio o
   promo x100, $52.999 cada 100). La sección "Cuantos más pedís, menos pagás"
   mostraría cuatro filas con el mismo precio. Lo que **sí** es real y es
   fuerte: **suelta, la calco de 6 cm vale $2.100; desde 100, $530 (−75 %)**, y
   $424 pagando por transferencia. Una escalera 250/500/1.000 es una decisión de
   precios (spec aparte, espejo en el servidor) — ver `BUSINESS-TODOS.md` N-1.
   **→ 5/10/2026: Mariano eligió la escala.** Tabla para aprobar en la spec
   [`032-escala-de-precios-por-volumen`](../032-escala-de-precios-por-volumen/requirements.md).

2. **El configurador de `/personalizados` le cobra de más al cliente de negocio
   que trae varios diseños.** El tope automático a la Promo Negocio corre solo
   con **un** diseño (`lib/precioPersonalizados.js:226`). Tres logos × 100
   copias en 6 cm se cotizan como 300 calcos sueltas: **$630.000**, cuando la
   misma tienda los vende a **$158.997** (tres packs). El cliente B2B típico
   —varios diseños, cantidades altas— es justo el que cae en ese agujero. El
   cotizador de esta spec lo resuelve sin precios nuevos (§3, H-2).

3. **No hay fotos reales de calcos aplicadas en negocios.** Las únicas son
   `/images/negocio-muestra.webp` (una tirada de calcos con logo) y
   `/testimonials/logo-1.webp` (la calco "Pet Friendly" en la puerta de un
   local). La regla vigente de Mariano es: sin fotos reales, la sección **no se
   monta** — nada de mockups, renders ni "próximamente"
   (`data/personalizadosFotos.js`). El hero con packaging, vasos y bolsas, la
   galería antes/después, las fotos de materiales y "Tus calcos se hacen acá"
   **dependen de una sesión de fotos** (`BUSINESS-TODOS.md` N-6).

4. **Tres puntos del pedido chocan con decisiones ya tomadas por Mariano.**
   - Sección 11, "¿No tenés el archivo perfecto?": Mariano lo sacó el 15/8 y
     ratificó el 14/9/2026 *"NO volver a poner"*. No se hace.
   - "Aprobación previa / muestra / boceto": **no existe y no se dice** (ni
     siquiera como "no mandamos boceto"). Lo publicable es: *revisamos cada
     archivo antes de producir y te escribimos por WhatsApp si hay algo para
     ajustar.*
     **→ Cambió el 5/10/2026:** con 100 calcos o más se manda una vista previa
     digital gratis por WhatsApp ("MUESTRA GRATIS"). Con menos de 100, sigue
     sin vista previa y no se menciona.
   - Popup "10 % OFF" → popup B2B: el popup de la spec 026 está `IN PROGRESS`
     (falta QA en dispositivos). Esta spec no lo toca; la captura B2B va
     **inline** en las páginas de negocio (§8).

5. **Hay cuatro specs abiertas sobre las mismas superficies.** La 030 (scroll
   fluido) está **implementándose ahora** sobre `index.css` y `Reveal.jsx` —
   los dos archivos que usa cualquier sección nueva del Home—; la 023
   (`/personalizados`), la 026 (popup) y la 028 (hero del termo) esperan QA. El
   Home B2B no puede arrancar hasta que cierre la 030 (§6).

6. **El sitio no le habla a Google como B2B ni podría, tal como está.** Salvo
   `/personalizados`, todas las rutas sirven en el HTML inicial el `<title>` y
   el canonical **del Home** (es un SPA con `index.html` de fallback). Crear
   seis landings SEO sin prerender sería crear seis páginas que Google ve como
   el Home. La infraestructura existe (`lib/prerender.js`, genérica): hay que
   extenderla (§3, H-9).

---

## 1. Arquitectura actual

| Pieza | Qué hay | Dónde |
|---|---|---|
| Framework | React 18 + React Router 6 (SPA) + Vite 5 + Tailwind 3 | `frontend/` |
| Servidor | Netlify Functions (Node 20), sin servidor propio | `netlify/functions/` |
| Rutas | 26 páginas; Home eager (LCP), el resto `lazy()` | `frontend/src/App.jsx` |
| Estado | Un solo `CartContext` (`useReducer`), persistido en `localStorage` `epicalcos.cart.v2` | `context/CartContext.jsx` |
| Catálogo | 61 categorías, 3.397 diseños en JSON estático | `public/data/` |
| Precios | Reglas escritas dos veces a propósito: cliente muestra, servidor revalida y rechaza (`price_mismatch`) | `config/pricing.js` ↔ `netlify/functions/lib/pricing.js` |
| Checkout | Mercado Pago (preferencia + webhook firmado) y transferencia (20 % OFF) | `create-preference.js`, `create-order-transfer.js` |
| Subida de archivos | Directo a Cloudinary (unsigned, un preset por carpeta), hasta 100 archivos de 10 MB | `services/uploadService.js`, `components/personalizados/SubidaArchivo.jsx` |
| Leads | Popup (cupón `EPICA10`) → `capture-lead.js`; formulario de `/contacto` → `contacto.js` (mail Resend + CRM, falla cerrado) | `netlify/functions/` |
| CRM | Notion (pedidos) + CRM interno `app.epicalcos.com` por webhook HMAC (`lead.created`, `order.*`) | `_notion.js`, `lib/crmWebhook.js` |
| Analytics | GA4 inline (gtag) + Meta Pixel + CAPI server-side del Purchase. **Sin GTM activo.** Todo sale por `lib/analytics.js` | `index.html`, `lib/analytics.js` |
| A/B | Propio, síncrono, sin parpadeo. **Solo de presentación, nunca de precio** | `lib/experiments.js` |
| SEO | `useSeo()` por página, JSON-LD (Organization, Product, Breadcrumb, FAQPage), sitemap en prebuild, prerender **solo** de `/personalizados` | `lib/seo.js`, `scripts/` |
| WhatsApp | Un botón flotante en todo el sitio, siempre al mismo número, **sin mensaje precargado** (salvo `/contacto` y `/pago-exitoso`) | `components/WhatsAppButton.jsx` |
| Diseño | Fondo oscuro, `card-glass`, degradado fucsia→naranja, Inter + Montserrat, títulos en mayúscula | `styles/index.css`, `tailwind.config.js` |
| Animación | CSS, salvo `framer-motion` encerrado en el hero del Home (spec 028) | `components/hero/HeroCalcos.jsx` |
| Tests | Vitest, unitarios de `lib/` y del servidor; 682 al 25/9/2026. Son barrera del deploy | `npm test` |
| Deploy | Push a `main` = producción. Sin staging | `netlify.toml` |
| Variables | Públicas: `VITE_META_PIXEL_ID`, `VITE_GTM_ID` (vacía), `VITE_CLOUDINARY_*`. Secretas solo en Netlify: MP, Resend, Notion, CRM, CAPI | `docs/integrations.md` |

Lo que **no** existe: base de datos relacional, cuentas de usuario, login,
panel admin en este repo, facturación, stock real, GTM, Google Ads, tests de
componentes o E2E.

---

## 2. Lo que EPICALCOS ya vende a negocios (inventario real)

Precios de Mercado Pago al 5/10/2026 (spec 029). **Leer siempre el config: estos
números cambian.**

### Productos con precio por volumen

| Producto | Qué es | Tamaños | Material | Precio | Por calco | Dónde |
|---|---|---|---|---|---|---|
| **Promo Negocio** | 100 calcos de **un** diseño (el logo) | 6 cm | Vinilo blanco o DTF UV | $52.999 | **$530** | `/negocio` y, automático, `/personalizados` |
| **Promo x100** | **Exactamente** 100 calcos, diseños mezclados (catálogo y/o propios) | 4 y 6 cm | Vinilo | $52.999 | **$530** | `/mayorista` |
| **Pack mayorista** | Desde 100, sin tope, 50 % OFF | 4 / 6 / 9 cm | Vinilo | $800 / $1.050 / $1.325 c/u | ídem | `/mayorista` (con la promo viva, solo se usa en 9 cm) |
| **Pack holográfico** | 100 en total, repartidas entre los diseños | 4 y 6 cm | Vinilo holográfico | $52.999 + $20.000 | **$730** | `/personalizados` |

- **Suelta**, la misma calco personalizada vale $1.600 / $2.100 / $2.650 (4 / 6 / 9 cm).
- **Transferencia: 20 % OFF en todo**, desde 1 unidad (Negocio queda en $42.399, $424 por calco).
- **Más de 100 de un diseño en 6 cm**: cada 100 es un pack; lo que sobra va suelto, salvo que ya cueste lo mismo que otro pack — entonces es otro pack. 250 copias → 3 packs, 300 calcos, $158.997.
- **No hay precio para**: 100+ en DTF UV de 4 o 9 cm, varios diseños en DTF UV, holográfico de 9 cm. Hoy se cobran como sueltas o no se pueden pedir.

### Reglas que rodean la venta

| Tema | Valor real | Fuente |
|---|---|---|
| Pedido mínimo | **Ninguno** (desde 1 calco) | `config/site.js → order` |
| Cortes | Silueta, cuadrado, círculo (no cambian el precio) | `config/personalizados.js` |
| Formatos | PNG, JPG, PDF, SVG, AI (+ WEBP convertido en el navegador), 10 MB, 150 DPI recomendados | ídem |
| Producción | **2 a 3 días hábiles** desde el pago | `config/site.js → shipping.production` |
| Entrega | Rosario 2–3 días hábiles; interior 5–7 | ídem |
| Envío | Rosario $4.500 (gratis desde $35.000) · ciudades próximas $6.500 · interior $8.500 · **gratis a todo el país desde $55.000** · retiro gratis en Ov. Lagos y Bv. Seguí | ídem |
| Garantía | 30 días; lo hecho con el archivo del cliente, solo por falla | `devoluciones` |
| Revisión de archivo | Se revisa cada archivo antes de producir y se avisa por WhatsApp si hay un problema (política publicada) | FAQ, memoria de decisiones |
| Pagos | Mercado Pago y transferencia | `order.paymentMethods` |
| Identidad fiscal | **CUIL personal**, sin monotributo ni SRL | `site.taxIdType` |

### Prueba social real

| Activo | Estado |
|---|---|
| 35 logos de marcas clientas, a color | ✅ `data/marcas.js`, ticker `MarcasConfiaron` (Home y `/negocio`) |
| "+120.000 calcos vendidas", "+5.000 clientes" | ✅ `config/brandStats.js` (marcados como datos reales) |
| 3 testimonios con nombre | ✅ `data/testimonials.js` — uno solo habla de un negocio (logo "Pet Friendly") |
| Foto de una tirada de calcos con logo | ✅ `/images/negocio-muestra.webp` |
| Fotos de calcos aplicadas en packaging, bolsas, vasos, cajas | ❌ no hay |
| Fotos del taller (impresión, corte, preparación) | ❌ no hay |
| Fotos de los materiales (macro del vinilo, holográfico, DTF UV) | ❌ no hay |
| Reseñas de Google / métricas de pedidos B2B | ❌ no hay en el repo |

---

## 3. Hallazgos

| # | Hallazgo | Evidencia | Impacto en esta spec |
|---|---|---|---|
| H-1 | Desde 100, el precio por calco es plano: no baja con 250, 500 ni 1.000 | `NEGOCIO`, `PROMO_MAYORISTA_100`, `WHOLESALE_DISCOUNT` en `config/pricing.js` | La sección de escala se reformula como **suelta vs. desde 100** hasta que Mariano defina otra cosa (N-1) |
| H-2 | Con varios diseños, el configurador no aplica ningún pack: 3 logos × 100 en 6 cm = $630.000 en vez de $158.997 | `lib/precioPersonalizados.js:226` (`n === 1 ? repartoNegocio(...)`) | El cotizador elige la combinación más barata **entre productos que ya existen** y que el servidor ya acepta |
| H-3 | La Promo x100 tiene cantidad **exacta**: para 300 calcos hay que armar el pack tres veces | `PackBuilder.jsx` (`effTarget = promo.qty`) | El cotizador arma los packs solo |
| H-4 | Dos referencias de "ahorro" distintas para el mismo producto: `/negocio` muestra 59 % OFF contra un tachado de $127.999; el configurador calcula 75 % contra 100 × $2.100 | `NegocioForm.jsx:15` vs. `precioEfectivoTanda()` | Hay que elegir **una** antes de mostrar ahorro en el cotizador (N-2) |
| H-5 | El FAQ del Home publica la frase que Mariano prohibió: *"No hace falta que nos mandes el archivo perfecto."* | `components/FAQ.jsx:75` | Quick win (Q-1). Fuera del scope de código de esta spec |
| H-6 | El FAQ se contradice en plazos: general "2 a 3 días hábiles", mayorista "100 calcos: entre 3 y 5 días hábiles" | `FAQ.jsx:84` vs. `FAQ.jsx:131` | El copy B2B no puede prometer plazo hasta que Mariano confirme (N-3) |
| H-7 | El FAQ promete cosas no verificadas: "condiciones especiales por recompra", "te ayudamos a adaptarlo (el logo)" | `FAQ.jsx:126`, `FAQ.jsx:136` | No se reutilizan hasta confirmar (N-4, N-5) |
| H-8 | El botón de WhatsApp no precarga mensaje: el que escribe desde `/negocio` y el que escribe desde una categoría llegan iguales | `WhatsAppButton.jsx` | WhatsApp contextual (RF-W*) |
| H-9 | Toda ruta salvo `/personalizados` arranca con el título y el canonical del Home | `docs/architecture.md` §4 | Prerender de `/negocio`, `/mayorista` y cada landing nueva (Fase 4) |
| H-10 | `/calcos-para-negocios` ya existe como 301 → `/negocio`; `/calcos-personalizadas` → `/personalizados` | `netlify.toml` | La arquitectura nueva **no** cambia URLs indexadas: suma alias y landings con intención propia |
| H-11 | La identidad fiscal es CUIL personal | `config/site.js:16` | "¿Puedo pedir factura?" no se puede responder; para empresas medianas suele ser condición de compra (N-7) |
| H-12 | El Home tiene un ancla `#categorias-destacadas` que, según su comentario, usa el popup para dispararse | `routes/Home.jsx` | Si la variante B2B saca esa sección, verificar el disparo del popup (spec 026) |
| H-13 | `IntentSelector` del Home ya separa "para mí / mi diseño / mi negocio", pero aparece **después** del hero B2C del termo | `components/IntentSelector.jsx` | Base del "Camino A / Camino B" del pedido |
| H-14 | El banner del header con el 3x2 apagado ya anuncia "100 CALCOS A $52.999" y lleva a `/mayorista` | `Header.jsx` | El header ya empuja B2B; hay que decidir a dónde apunta |

---

## 4. Qué conservar, modificar y eliminar

### Conservar (sin tocar)
- **Todo el camino de precios y checkout.** El cotizador emite líneas con ids
  que el servidor ya conoce (`negocio:…`, `pack:mayorista100:…`,
  `pack:mayorista:…`). **No se cambia ningún precio ni el servidor.**
- La tienda B2C completa: catálogo, categorías, fichas, buscador, landings de
  uso, Polaroid, tatuajes.
- URLs indexadas: `/negocio`, `/mayorista`, `/personalizados`, `/categorias` y
  los 301 existentes.
- Tracking existente: ningún evento se renombra ni se borra.
- El popup B2C (spec 026), el hero del termo (spec 028, como variante de
  control del A/B del Home).

### Modificar
- `/negocio`: de formulario de una promo a **landing B2B** con cotizador.
- `/mayorista`: queda como "grandes pedidos / armá tu pack de 100" con el
  cotizador para cantidades grandes y el pedido de presupuesto.
- Home: variante B2B detrás de un A/B (§8), con la tienda como camino B.
- Navegación, footer, tira de anuncios: jerarquía B2B.
- `WhatsAppButton`: mensaje precargado según la página.
- SEO del Home, `/negocio`, `/mayorista`: títulos, descripciones, prerender.

### Eliminar
**Nada.** Criterio del proyecto (Mariano, 11/8/2026): no se borra código salvo
que estorbe. Lo que baja de jerarquía se mueve, no se borra.

---

## 5. Riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-1 | **Dar vuelta el Home baja las ventas B2C**, que hoy son las que se miden y se pautan (el hero del termo salió el 28/9) | Media | 🔴 Alto | Home B2B como **A/B 50/50** con métrica principal = facturación por sesión, no clicks. El control es el Home de hoy. Rollback = apagar el experimento |
| R-2 | Un cotizador que calcula distinto que el servidor → checkout rechazado | Baja | 🔴 Alto | El cotizador **solo** combina productos existentes y se testea contra `validateAndPriceOrder()` real (precedente: `precioPersonalizados.test.js`) |
| R-3 | Copy que promete lo que no existe (plazos, factura, beneficios por recompra, boceto) | Alta sin control | 🟠 Medio | Todo dato comercial sale del config o de `BUSINESS-TODOS.md` confirmado. Test que frena las frases prohibidas |
| R-4 | Secciones vacías o con fotos falsas por falta de assets | Alta | 🟠 Medio | Patrón ya probado: la sección lee una lista de fotos y no se monta si está vacía |
| R-5 | Choque con la spec 030 en `index.css`/`Reveal.jsx` | Alta si se arranca ya | 🟠 Medio | Fase 3 (Home) arranca recién con la 030 cerrada |
| R-6 | Landings SEO que Google ve como el Home | Alta sin prerender | 🟡 Bajo | Fase 4 extiende el prerender antes de publicar landings |
| R-7 | El formulario de presupuesto se pierde en silencio | Baja | 🟠 Medio | Mismo patrón que `/contacto`: falla cerrado (502) y ofrece WhatsApp con el pedido precargado |
| R-8 | PII en analytics (nombre de archivo, mail, negocio) | Media | 🟠 Medio | Eventos sin datos del formulario; precedente de `nombreParaAnalytics()` |
| R-9 | El nav no entra a 1024 px con más links | Alta | 🟢 Bajo | Nav B2B de 5 links + CTA; "Buscar" se mantiene (tienda) |

---

## 6. Dependencias

| Depende de | Estado | Bloquea |
|---|---|---|
| Spec 030 — scroll fluido | `IMPLEMENTATION`, WIP en el árbol (`index.css`, `Reveal.jsx`, `netlify.toml`) | Fase 3 (Home B2B) y cualquier cambio en `index.css` |
| Spec 023 — `/personalizados` | `IN PROGRESS` | El link del cotizador a `/personalizados` con datos precargados toca su configurador |
| Spec 026 — popup | `IN PROGRESS` (QA) | Cualquier cambio de estrategia del popup (fuera de scope acá) |
| Spec 028 — hero del termo | `IN PROGRESS` (QA) | Es el control del A/B del Home |
| Decisiones de `BUSINESS-TODOS.md` | abiertas | Ver la columna "bloquea" de cada una |
| Sesión de fotos B2B | no existe | Hero con contexto, galería, materiales, proceso |

---

## 7. Quick wins

No necesitan spec (son textos o valores ya declarados), pero **sí** la
confirmación de Mariano porque publican algo:

| # | Qué | Por qué | Esfuerzo |
|---|---|---|---|
| Q-1 | Sacar *"No hace falta que nos mandes el archivo perfecto."* del FAQ | Es la frase que Mariano prohibió (H-5) | 1 línea |
| Q-2 | Unificar el plazo de producción del FAQ mayorista con `shipping.production` | Hoy dice 2–3 y 3–5 a la vez (H-6) | 1 línea, tras confirmar N-3 |
| Q-3 | Sacar "condiciones especiales por recompra" si no existen | Promesa sin respaldo (H-7) | 1 línea, tras N-4 |
| Q-4 | Mensaje precargado en el botón de WhatsApp de `/negocio` y `/mayorista` | Mariano sabe desde el primer mensaje que es un negocio | Chico, pero es código → va en esta spec (Fase 2) |

---

## 8. Arquitectura propuesta (resumen)

El detalle técnico está en [`design.md`](design.md). En una línea:
**se construye un solo motor de cotización sobre los productos existentes, se
monta primero en `/negocio` (donde no arriesga ventas B2C), y el Home B2B sale
como A/B contra el Home actual.**

### Sitemap nuevo

```
/                         Home — A/B: control (hoy) vs. variante B2B
/negocio                  ★ Calcos para negocios: landing B2B + cotizador + presupuesto
/mayorista                Grandes pedidos y armado de packs de 100 (se mantiene)
/personalizados           Calcos con tu diseño, desde 1 unidad (se mantiene, spec 023)
/categorias               Tienda (B2C) — "Tienda" en el nav
/categoria/:slug          (sin cambios)
/producto/:slug/:num      (sin cambios)
/calcos-para-packaging    NUEVA landing de uso (Fase 4) — intención propia
/preguntas-frecuentes     NUEVA página de FAQ con FAQPage schema (Fase 4, opcional)

Alias 301 (URLs lindas para anuncios, sin contenido duplicado):
/para-negocios, /calcos-para-empresas, /calcos-con-logo,
/stickers-para-emprendedores                → /negocio
/calcos-mayoristas, /stickers-personalizados-mayoristas → /mayorista
/cotizar                                    → /negocio#cotizador
/tienda                                     → /categorias
/calcos-personalizados                      → /personalizados
/como-comprar                               → /negocio#como-funciona
```

Por qué no son páginas nuevas: `/calcos-con-logo`, `/calcos-para-empresas` y
`/stickers-para-emprendedores` responden **la misma intención** que `/negocio`
("calcos con mi marca, por cantidad"). Tres páginas gemelas son contenido
duplicado y tres cosas que mantener — es la misma decisión que ya se tomó con
`/calcos-para-negocios` (`config/landings.js`). `/calcos-para-packaging` sí es
otra intención (un uso concreto con sus dudas propias: tamaño por tipo de
caja, superficie, cantidad por pedido), igual que `/calcos-termo`.

### Navegación

```
Desktop:  [logo]  Para negocios · Precios · Cómo funciona · Preguntas · Tienda   [Buscar] [🛒] [Cotizar]
Mobile:   [logo]                                                     [Buscar] [🛒] [☰]
          + barra inferior "Desde 100 unidades · [Cotizar]" en el Home B2B, después del hero
```

### Funnels

```
1 SELF-SERVICE   anuncio → /negocio → cotizador → sube diseño → carrito → checkout → compra
2 B2B            anuncio → /negocio → clientes/usos → cotizador → presupuesto o WhatsApp → venta
3 VOLUMEN        Google/referido → /mayorista → +1.000 → presupuesto → cotización a medida
B2C              Home/anuncio → tienda → categoría → carrito → compra   (sin cambios)
```

---

## 9. El sitio de hoy contra el criterio del pedido (§38)

| Pregunta | Hoy | Con la spec 031 |
|---|---|---|
| ¿Se entiende qué venden en 5 s? | Sí, pero como tienda B2C ("Tu termo está pidiendo calcos") | En `/negocio` y en la variante B2B del Home: "Calcos con tu logo para tu negocio" |
| ¿Es evidente que trabajan con negocios? | No en el Home: aparece en la 4.ª sección | Sí: eyebrow, H1, nav y CTA |
| ¿Sé que puedo mandar mi logo? | Sí en `/personalizados` y `/negocio` | Sí en el hero |
| ¿Sé que puedo empezar desde 100? | Solo en el banner del header | En el hero, la tira y la barra móvil |
| ¿Entiendo cuánto voy a pagar? | En `/negocio`, solo para un diseño en 6 cm | Cotizador con total y precio por calco |
| ¿Entiendo que comprar más mejora el precio? | Parcial: hoy mejora **hasta** 100, no después (H-1) | Honesto: "suelta $2.100 → desde 100 $530"; la escalera depende de N-1 |
| ¿Hay elementos para confiar? | Sí: 35 marcas, +5.000 clientes, garantía | Sí, más visibles; faltan fotos de uso (N-6) |
| ¿Puedo iniciar un pedido rápido? | Para un diseño, sí; con varios, no (H-2, H-3) | Sí: cantidad → tamaño → material → diseño → carrito |
| ¿Funciona en el teléfono? | Sí | Sí: diseño a 375 px, CTA sin scroll |
| ¿Una empresa de 5.000 sabe qué hacer? | Solo "cotizamos por WhatsApp" en el FAQ | Formulario de presupuesto + WhatsApp precargado |
| ¿Un cliente recurrente tiene camino? | No | Documentado para después (`design.md` §9); sin cuentas no hay "Mis pedidos" |
| ¿Google entiende que venden B2B? | No (H-9) | Sí, con prerender + títulos + landing de packaging |
| ¿Se puede medir todo el funnel? | El de compra sí; el de cotización no existe | Sí (`requirements.md` §10) |
