# Auditoría EPICALCOS — 17/10/2026

| | |
|---|---|
| **Pedido** | "Auditar, optimizar y priorizar los pedidos mayoristas desde 100 unidades sin perjudicar la venta minorista" (14 fases) |
| **Rama** | `feat/034-b2b-conversion` (worktree `.claude/worktrees/feat-034-b2b-conversion`) — **sin push, sin deploy** |
| **Base** | `main` en `548ae092` |
| **Spec** | [`specs/034-b2b-cotizador-y-mayorista/`](specs/034-b2b-cotizador-y-mayorista/requirements.md) + fases pendientes de la 031 y la 032 |
| **Decisiones de Mariano (17/10)** | Implementar en rama aparte sin push · Home B2B como A/B **apagado** · mantener el menú de la spec 033 |

Todo lo que dice este documento sale del código o de pruebas corridas hoy. Lo
que no se pudo verificar está marcado así.

---

## 0. Diagnóstico breve (fase 1)

El pedido del 17/10 es casi el mismo "prompt maestro" del 5/10, que ya produjo
las specs **031** (calcos para negocios), **032** (escala por volumen) y
**033** (menú). De ese plan estaba publicado: el posicionamiento de `/negocio`,
el selector POR MENOR / POR MAYOR del Home, la escala en el config y el
servidor, y el menú nuevo. Lo que el pedido vuelve a pedir en las fases 4 a 7
**estaba especificado y sin hacer**.

### Problemas confirmados

| Prioridad | Problema | Evidencia |
|---|---|---|
| **P0** | **La escala por volumen aprobada no se podía comprar.** 250 / 500 / 1.000 calcos tienen precio desde el 5/10 en el servidor, pero ningún componente emitía la línea `volumen:`. Un negocio solo podía comprar "un logo, 100, 6 cm" | `grep "volumen:" frontend/src/components` vacío en `main` |
| **P0** | **`/mayorista` obligaba a armar exactamente 100** (para 300 había que repetir el armado tres veces) y anunciaba una "promo por tiempo limitado" que no tiene fecha de fin desde la spec 017 | `PackBuilder` (`effTarget = promo.qty`), `Mayorista.jsx` |
| **P0** | **No hay "Botón de arrepentimiento"** en ninguna página. La Resolución 424/2020 (Secretaría de Comercio Interior) lo exige a quien vende online en Argentina, con acceso desde la primera pantalla. ⚠️ Es una obligación legal: **no se implementó** porque necesita definir el procedimiento (a quién llega, en qué plazo se responde, qué productos aplican); hay que verlo con el contador o un abogado | `grep -ri arrepentimiento` vacío |
| **P0** (medición) | **La vuelta de Mercado Pago puede atribuir la compra a "referral / mercadopago"**: no hay evidencia en el repo de que `mercadopago.com(.ar)` esté en las referencias no deseadas de GA4. ⚠️ No verificable desde el repo (es configuración del panel) | `docs/analytics.md` §4 |
| P1 | El FAQ del Home publicaba la frase que Mariano prohibió ("No hace falta que nos mandes el archivo perfecto") y dos promesas sin confirmar: "condiciones especiales" por recompra (N-4) y "te ayudamos a adaptarlo" (N-5). Además decía "pack mayorista con 50 % de descuento", que con la escala deja de ser la regla | `components/FAQ.jsx` |
| P1 | El `fbclid` del anuncio se perdía al navegar: el checkout solo lo leía de **su propia** URL. Con el Píxel caído o bloqueado, la compra le llegaba a la API de conversiones de Meta sin el click | `services/paymentService.js` |
| P1 | `/negocio` y `/mayorista` le llegaban a Google con el título y el canonical **del Home** (SPA con `index.html` de fallback). Lo mismo pasa todavía con categorías, fichas y landings de uso | spec 031 AUDIT H-9 |
| P1 | No había forma de ver una variante del Home sin prenderla: con un experimento apagado, el override por URL también se apagaba | `lib/experiments.js` |
| P2 | El Home no tiene `og:image`: compartido por WhatsApp o Instagram, sale sin imagen | `frontend/index.html` |
| P2 | La descripción del Home dice "vinilos decorativos", que no aparece en el catálogo. ⚠️ Confirmar si se venden | `index.html`, `config/site.js` |
| P2 | El checkout muestra "x1" en las líneas de pack (Negocio, escala): el carrito dice "250 calcos", el resumen del checkout "x1" | `routes/Checkout.jsx` |
| P2 | `frontend/public/sitemap.xml` commiteado está viejo (le faltan 11 categorías). Sin impacto: el build lo regenera antes de publicar | `npm run build` |

### Oportunidades (lo que más mueve, como hipótesis)

1. **Vender la escala** donde llega el tráfico B2B (`/negocio`, `/mayorista`): hoy el ticket de negocio está topeado en $52.999 por pedido salvo que el cliente escriba.
2. **Mostrar el precio antes que el WhatsApp**: el botón Cotizar mandaba a todos a WhatsApp o a un formulario.
3. **Medir el embudo B2B**: no existía (`cotizador_*`).
4. **Probar un Home B2B con datos**, no a ciegas (A/B listo, apagado).

---

## 1. Stack detectado

| Pieza | Qué hay |
|---|---|
| Frontend | React 18 + React Router 6 (SPA) + Vite 5 + Tailwind 3. Home eager; el resto de las rutas `lazy()` |
| Servidor | Netlify Functions (Node 20): `create-preference`, `create-order-transfer`, `mercadopago-webhook`, `contacto`, `capture-lead`, `track-cart`, `abandoned-cart`, `entregar-digital`, `unsubscribe`, `canario-blobs` |
| Pagos | Mercado Pago (preferencia + webhook firmado) y transferencia (10 % OFF en todo) |
| Precios | Reglas escritas dos veces: `frontend/src/config/pricing.js` muestra, `netlify/functions/lib/pricing.js` revalida y rechaza (`price_mismatch`) |
| Datos | Catálogo JSON estático (72 categorías); pedidos en Netlify Blobs; CRM Notion + CRM interno por webhook HMAC |
| Archivos | Subida directa a Cloudinary (unsigned, un preset por carpeta), PNG/JPG/PDF/SVG/AI (+WEBP convertido), 10 MB, hasta 100 archivos |
| Mails | Resend |
| Analytics | GA4 inline (gtag) + Meta Pixel + Conversions API del Purchase desde el webhook. **Sin GTM activo.** Todo sale por `lib/analytics.js` |
| A/B | Propio, sincrónico, solo de presentación (`lib/experiments.js`) |
| SEO | `useSeo()` por página, JSON-LD, sitemap en el prebuild, prerender de `/personalizados` (y desde esta rama, `/negocio` y `/mayorista`) |
| Tests | Vitest (unitarios de `lib/` y del servidor) — **barrera del deploy**: el build de Netlify no publica con la suite en rojo |
| Deploy | Push a `main` = producción. Sin staging |
| Dependencias | `react`, `react-dom`, `react-router-dom`, `framer-motion` (encerrado en el hero del termo, hoy sin montar), `mercadopago`, `@netlify/blobs`. Dev: `vite`, `vitest`, `tailwindcss`, `postcss`, `autoprefixer` |

---

## 2. Problemas identificados

Ver §0. Además, del discovery de la 031 que **siguen abiertos** y esta rama no toca:
- No hay fotos reales de calcos aplicadas en negocios (N-6): usos, galería y materiales van sin foto.
- Testimonios: 3, uno solo de un negocio (N-13).
- Si el cliente navega a mitad de una subida, la línea queda sin link de Cloudinary y el pedido dice "por WhatsApp" (defecto de `SubidaArchivo`, anotado en la spec 023).
- El configurador de `/personalizados` cobra como sueltas los pedidos de 100+ con varios diseños (031 AUDIT H-2). Lo arregla la 032 tarea 2.3, que toca código de la 023 en curso.

---

## 3. Mejoras implementadas

### Cotizador en `/negocio` (031 Fase 2, 032 tarea 2.1)
- Cantidad (100 · 250 · 500 · 1.000 · Más de 1.000) → tamaño (4 y 6 cm, con uso sugerido) → material (vinilo blanco **Recomendado**, DTF UV, holográfico con su diferencia en pesos) → uno o varios diseños.
- Total, precio por calco, % del escalón contra el de 100, total por transferencia, muestra gratis, plazo. Todo de `precioVolumen()`.
- Arranca en 100 · 6 cm · vinilo blanco = **$52.999, lo mismo que la Promo Negocio**; holográfico 100 = Negocio + tornasolado (spec 033). Nadie paga distinto que ayer.
- "Continuar" pide razón social (obligatoria, para la factura C), CUIT (opcional, validado), indicaciones de reparto si hay varios diseños, y la subida de archivos (la misma de siempre). "Agregar al carrito" deja **una** línea `volumen:` y lleva al carrito.
- "Más de 1.000": sin precio; **Pedir presupuesto** abre `/contacto` con la consulta armada (cantidad, tamaño, material, diseños) y WhatsApp con la configuración.
- Interruptor de vuelta atrás: `COTIZADOR_ACTIVO` en `config/negociosBase.js` → vuelve el formulario de la Promo Negocio (probado).

### `/negocio` completa (031 Fase 3)
Hero → confianza → marcas → **cotizador** → escala ("Mientras más cantidad, más barato te sale") → usos por rubro (gastronomía, tiendas, ecommerce, gimnasios, eventos, emprendimientos; sin fotos falsas) → cómo funciona → materiales → 14 preguntas de negocio con datos verificables → pedidos grandes → cierre. Los CTA del hero y del cierre bajan al cotizador.

### `/mayorista` por escala (032 tarea 2.2)
- El armador vende de **100 a 1.000** calcos en 4 y 6 cm (catálogo, propias o mezcla) con el precio de la escala; el precio por calco baja solo en cada escalón y se ve la escalera.
- "Con 240 pagás lo mismo que con 250": no deja agregar 240 (el servidor lo rechazaría) y ofrece **Completar 10**. Tope en 1.000 con aviso de presupuesto.
- La página dice antes del armador: cantidad, tamaños (9 cm va suelto), diseños, muestra gratis, producción, envío por umbral y pago. Sale "Promo por tiempo limitado". Link a `/negocio` para el que quiere su logo.

### Botón Cotizar con tres salidas
"Ver el precio ahora" (al cotizador) va primera; siguen WhatsApp y "Dejar mis datos" (enmienda E-1).

### Home B2B — A/B apagado
Variante con el copy del pedido ("Tu marca merece calcos que se destaquen."), precio de 100 **y** de 1.000 cada uno con su cantidad, cotizador, escala, usos, testimonios, cómo funciona, pedidos grandes, **camino a la tienda** y preguntas. Chunk aparte (1,9 kB). Se ve con `?exp_home_b2b=b2b`, sin guardarse ni contar exposición. Producción sigue con el Home de hoy.

### SEO
- `dist/negocio.html` y `dist/mayorista.html` con título, descripción, canonical, Open Graph, contenido y JSON-LD (Product con `AggregateOffer` de precios reales de la escala, BreadcrumbList, FAQPage). **Sin `AggregateRating` ni reseñas inventadas.**
- Alias 301 para anuncios: `/para-negocios`, `/calcos-para-empresas`, `/calcos-con-logo`, `/stickers-para-emprendedores`, `/cotizar` → `/negocio`; `/calcos-por-mayor`, `/calcos-mayoristas`, `/stickers-personalizados-mayoristas` → `/mayorista`; `/tienda` → `/categorias`; `/calcos-personalizados` → `/personalizados`. En `netlify.toml` y `_redirects`.

### Analytics y atribución
- Eventos nuevos: `cotizador_start`, `cotizador_complete`, `faq_open`; `cotizar_click` con `via: 'precio'`; `generate_lead` con `origen: 'cotizador'`. Sin PII.
- El `fbclid` de la URL de llegada se guarda en la sesión y el checkout arma el `fbc` con él si no hay cookie `_fbc`.
- WhatsApp flotante con mensaje precargado en `/negocio` y `/mayorista`.

### Copy
FAQ del Home: fuera "archivo perfecto", "condiciones especiales" y "te ayudamos a adaptarlo"; el mínimo mayorista y el descuento por cantidad salen de la escala.

---

## 4. Archivos modificados

**Nuevos**
- `specs/034-b2b-cotizador-y-mayorista/{requirements,design,tasks,acceptance}.md`
- `frontend/src/lib/cotizadorNegocio.js` (+ test), `lib/negociosEstatico.js` (+ test), `lib/atribucion.js` (+ test)
- `frontend/src/config/negociosBase.js`
- `frontend/src/components/negocios/{Cotizador,GrupoOpciones,EscalaVolumen,PedidosGrandes,UsosNegocio,Materiales,PreguntasNegocio,CaminoTienda}.jsx`
- `frontend/src/routes/HomeB2B.jsx`
- `AUDITORIA_EPICALCOS.md`

**Modificados**
- `frontend/src/config/negocios.js` — copy de todo lo nuevo (ningún número escrito a mano)
- `frontend/src/routes/{Negocio,Mayorista,Home}.jsx`
- `frontend/src/components/{PackBuilder,BotonCotizar,WhatsAppButton,FAQ}.jsx`, `contacto/FormularioContacto.jsx`, `negocios/{HeroNegocio,CtaFinalNegocio}.jsx`
- `frontend/src/lib/{resumenPedido,experiments,analytics,whatsapp}.js` (+ tests de resumen y experimentos), `services/paymentService.js`, `main.jsx`
- `scripts/prerender.mjs`, `netlify.toml`, `frontend/public/_redirects`
- `docs/business-rules.md` (escala: tarea 1.7 de la 032, que había quedado pendiente), `docs/analytics.md`

**No se tocaron**: `config/pricing.js`, `netlify/functions/**` (todo el servidor de pagos), `context/CartContext.jsx`, `config/site.js`, el menú (spec 033), `backend/`.

---

## 5. Funcionalidades preservadas

| Qué | Cómo se verificó |
|---|---|
| Precios, promos, cupones y umbrales | `pricing.js` de los dos lados sin cambios; suite de paridad en verde |
| Carritos guardados (`epicalcos.cart.v2`) | Ninguna línea cambió de forma; el servidor sigue aceptando `negocio:`, `pack:mayorista100:`, `pack:mayorista:` |
| Checkout MP y transferencia | Mismas líneas que el servidor ya validaba; `validateAndPriceOrder()` real acepta cada línea nueva con los dos medios |
| Promo Negocio y tornasolado (033) | Mismo total desde el cotizador (test); formulario viejo detrás del interruptor (probado) |
| Home de hoy | Intacto como control; el chunk principal pasó de 100,90 a 101,35 kB gzip |
| `/personalizados`, catálogo, buscador, Polaroid, tatuajes | Sin cambios; `/personalizados` cargada sin errores de consola |
| Menú de la 033 | Sin cambios |
| `/armar-pack` | Sin cambios (y sigue oculta por `HIDDEN_SECTIONS`) |

---

## 6. Dependencias agregadas

**Ninguna.** El A/B, el formulario, la validación y el movimiento son código propio, como manda la regla 10 del `CLAUDE.md`.

---

## 7. Resultados de las pruebas

| Prueba | Resultado |
|---|---|
| `npm test` (raíz) | ✅ **886 pasan**, 17 omitidos (base: 839). 47 nuevos, entre ellos la **paridad del cotizador contra el servidor** en 24 combinaciones × MP y transferencia |
| `npm run build` (sitemap + Vite + prerender) | ✅ sin errores; `negocio.html`, `mayorista.html` y `personalizados.html` generados |
| Peso | Chunk principal 101,35 kB gzip (base 100,90). Variante B2B: 1,9 kB aparte. Se detectó y corrigió un primer intento que sumaba +5 kB al chunk principal |
| Navegador, 375 px | `/negocio`: hero sin scroll, CTA baja al cotizador, 250 calcos = $118.999 / $476 / −10 % / $107.099 por transferencia, sin razón social no agrega, CUIT inválido frena, agrega una línea `volumen:` y el carrito dice "250 calcos". `/mayorista`: 240 → "pagás lo mismo que con 250" + Completar 10 → agrega; 1.500 → se topea en 1.000. Home sin parámetro = Home de hoy; con `?exp_home_b2b=b2b` = variante; sin guardarse. Menú → Cotizar con tres salidas; "Ver el precio ahora" llega al cotizador. Presupuesto → `/contacto` con la consulta armada. Sin scroll horizontal |
| Navegador, escritorio | Cotizador en dos columnas con el precio fijo al costado; JSON-LD de `/negocio` una sola vez |
| Teclado | Flechas mueven la opción del grupo; un solo tab por grupo; anillo de foco compilado |
| Consola | Sin errores en `/`, `/negocio`, `/mayorista`, `/carrito`, `/checkout`, `/contacto`, `/personalizados` |
| Checkout | Llega con la línea, el plazo de 3 a 5 días hábiles para 100+ y el total correcto. **No se pagó nada** |
| ⚠️ No probado | El formulario de contacto no se envió (mandaría un mail real). Las Netlify Functions no corren en local (`netlify dev` da EMFILE en este equipo): la aceptación de las líneas por el servidor está cubierta por el test de paridad, no por un checkout real. Subida real a Cloudinary no probada en esta sesión |
| Secretos | Ningún secreto nuevo; solo se lee `VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO`, que ya existía |

El detalle criterio por criterio está en [`specs/034-b2b-cotizador-y-mayorista/acceptance.md`](specs/034-b2b-cotizador-y-mayorista/acceptance.md).

---

## 8. Problemas pendientes

| Prioridad | Pendiente | Quién |
|---|---|---|
| **P0** | Botón de arrepentimiento (Res. 424/2020) | Mariano + asesor; después, spec |
| **P0** | GA4: `mercadopago.com.ar` y `mercadopago.com` como referencias no deseadas; `generate_lead` como evento clave | Mariano (panel) — paso a paso en `docs/analytics.md` §4 |
| P1 | Decidir si se prende el A/B del Home (`home_b2b`) | Mariano |
| P1 | Configurador de `/personalizados` con la escala (032 tarea 2.3) | Spec 023/032 |
| P1 | Prerender de categorías, fichas y landings de uso (siguen con el canonical del Home en el HTML inicial) | Spec nueva |
| P1 | N-4 (recompra), N-5 (ajuste de logos), N-8 (más de 1.000 online o solo presupuesto), N-9 (reparto por defecto), N-13 (testimonios de negocios) | Mariano |
| P1 | Fotos reales: packaging, bolsas, vasos, materiales (N-6) | Mariano |
| P2 | `og:image` del Home (elegir una foto real) y revisar "vinilos decorativos" en la descripción | Mariano decide la imagen |
| P2 | Checkout: "250 calcos" en vez de "x1" en líneas de pack | Cambio chico, fuera de esta rama |
| P2 | UTMs al pedido guardado y al CRM (hoy solo quedan en la sesión) | Spec: toca el servidor de pagos |
| P2 | Barra fija móvil "Desde 100 · Cotizar" (031 RF-B1), landing `/calcos-para-packaging` (RF-SEO5) | Con datos de scroll del cotizador |
| P2 | Endpoint propio de presupuesto (si hace falta adjuntar archivos al presupuesto) | Hoy se usa `/contacto` (design D-1) |

---

## 9. Recomendaciones de evolución

1. **Publicar la rama y medir 2 semanas** antes de tocar nada más: `cotizador_start → cotizador_complete → add_to_cart (volumen:) → purchase` y los presupuestos por semana. Si mucha gente llega a `cotizador_complete` y no agrega, el problema está en los datos o la subida.
2. **Prender el A/B del Home** recién con eso medido, 50/50, mínimo 14 días, métrica **facturación por sesión** (no clicks). El B2C es la mayoría del tráfico de Instagram.
3. **Anuncios**: B2B → `/negocio` (o `/calcos-con-logo`), revendedores → `/mayorista` (o `/calcos-por-mayor`), diseño propio desde 1 → `/personalizados`. Mismo mensaje del anuncio en el H1 de la landing. UTMs siempre (`utm_source=meta&utm_medium=paid&utm_campaign=negocio_…`).
4. **Sesión de fotos B2B** (lista en `specs/031-calcos-para-negocios/BUSINESS-TODOS.md` N-6): es lo que más mueve la percepción de "proveedor".
5. **Prerender genérico** de categorías y fichas: es el siguiente salto de SEO.
6. **Repetir pedido sin cuentas** (diseño en `specs/031-calcos-para-negocios/design.md` §9) cuando haya clientes B2B que repitan.

### Hipótesis de impacto (no son resultados)
- Más pedidos de 250–1.000 calcos al poder comprarlos sin escribir → sube el ticket promedio B2B.
- Menos consultas de WhatsApp de "¿cuánto sale X?" y más consultas con la configuración armada.
- Mejor atribución de Meta en compras con el Píxel caído.
- `/negocio` y `/mayorista` indexables con su propio título y precios (4–8 semanas en Search Console).

---

## 10. Pasos para publicar en Netlify

⚠️ **Un push a `main` es un deploy a producción.** Nada de esto se hizo.

1. **Revisar** la rama `feat/034-b2b-conversion` (o abrir un PR para verla en GitHub).
2. **Cuidado con el WIP de la spec 030**: la carpeta principal tiene cambios sin commitear en `netlify.toml`, `docs/analytics.md`, `Reveal.jsx`, `index.css` y la spec 030. Esta rama toca `netlify.toml` (alias, otra sección) y `docs/analytics.md` (otra sección): al mergear puede haber conflicto. Commitear o apartar ese WIP antes.
3. Mergear a `main` desde la carpeta principal y resolver conflictos conservando las dos partes.
4. `npm test` (el hook de `pre-push` lo corre si está activo: `git config core.hooksPath .githooks`).
5. `git push` → Netlify corre `npm test` y el build; si algo falla, no publica.
6. Después del deploy:
   - `curl -sI https://epicalcos.com/calcos-con-logo` → `301` a `/negocio`.
   - `curl -s https://epicalcos.com/negocio | grep -o "<title>[^<]*"` → título propio.
   - Comprar con transferencia un pedido de 100 desde el cotizador **hasta la pantalla de pago** (sin pagar) y confirmar que no aparece `price_mismatch`.
   - Configurar GA4 (§8, P0).
7. Para prender el Home B2B: `home_b2b.active = true` en `lib/experiments.js`, en un commit propio, anotando la fecha en `docs/CRO-EXPERIMENTS.md`.

**Vuelta atrás**: cotizador → `COTIZADOR_ACTIVO = false`; Home B2B → ya apagado; `/mayorista`, FAQ, alias → revert del commit correspondiente. Los carritos guardados no se rompen en ningún caso.
