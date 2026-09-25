# Acceptance — Popup CRO: del mail a la compra

| | |
|---|---|
| **Spec** | `026-popup-embudo-de-compra` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 25/09/2026 (Chromium automatizado contra `vite preview`) |
| **Resultado** | ⚠️ implementada; falta QA en dispositivos reales y AC-42 no se cumple por un bug anterior |

> Se recorre punto por punto al terminar (`CLAUDE.md` regla 15). No se marca ✅
> nada que no se haya verificado; lo que no se pudo probar se dice.

## Cómo se valida

Para arrancar de cero, en la consola del navegador:

```js
['epicalcos.popup.v1', 'epicalcos.welcomePopup.seen', 'epicalcos.welcomeCoupon']
  .forEach((k) => localStorage.removeItem(k));
sessionStorage.removeItem('epicalcos.popup.sesion.v1');
```

Para simular "cerró hace 8 días":

```js
localStorage.setItem('epicalcos.popup.v1', JSON.stringify({
  primeraVisitaEn: Date.now() - 9 * 864e5, vistoEn: Date.now() - 8 * 864e5,
  cerradoEn: Date.now() - 8 * 864e5, convertidoEn: null, compradoEn: null
}));
```

Celular: DevTools a 375 px **y** un iPhone real (Safari y el navegador de
Instagram) y un Android real (Chrome). Escritorio: Chrome y Safari.

---

## 1. Criterios funcionales

### Disparo
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-1 *(RF-1)* | En compu, en el Home, sin tocar nada, abre a los 12 s (±1 s) | Estado limpio, cronómetro | ✅ abre a los 12 s, no a los 11 |
| AC-2 *(RF-1)* | En compu, al 30% de scroll del Home, abre antes de los 12 s (y después de los 5 s) | Scrollear a los 6 s | ✅ 25 % no, 32 % sí (trigger `scroll`) |
| AC-3 *(RF-2)* | En celular, en el Home, abre a los 15 s, o al 50% de scroll | Dos pruebas | ✅ 13 s no, 15 s sí; 40 % no, 52 % sí |
| AC-4 *(RF-3)* | Ver 2 fichas distintas y volver al Home: abre a los 5 s de llegar, aunque no se cumplan los 12/15 s | Entrar por el Home, ficha A, ficha B, volver | ✅ trigger `product_views` |
| AC-5 *(RF-3)* | Abre después de una búsqueda en el Home, al salir del campo (+3 s) | Buscar "boca" a los 6 s | ✅ trigger `search` |
| AC-6 *(RF-3)* | Entrar directo a `/categoria/x` y volver al Home **no** cuenta como intención; entrar por el Home, abrir una categoría y volver, sí | Dos pruebas | ✅ las dos pruebas |
| AC-7 *(RF-4)* | En compu, en el Home, sacar el mouse por arriba de la ventana a los 6 s lo abre; a los 3 s no | Dos pruebas | ✅ con `mouseout` sintético (3 s no, 7 s sí) |
| AC-8 *(RF-5)* | Ningún disparo abre antes de 5 s de llegar al Home | Ver 2 fichas, volver al Home y scrollear al 60% enseguida | ✅ |
| AC-9 *(RF-6)* | Cambiar `POPUP_CONFIG.escritorio.demoraMs` a 3000 (en dev) cambia el disparo sin tocar otro archivo | `npm run dev` | ✅ por lectura y test: las variantes leen `POPUP_CONFIG` (no se probó en `npm run dev`) |

### Anti-interrupción
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-10 *(RF-7)* | Con el foco en un campo al cumplirse el tiempo, no abre; abre 3 s después de salir del campo | Escribir en el buscador del Home a los 10 s | ✅ |
| AC-11 *(RF-7)* | Con el carrito lateral abierto no abre; abre 3 s después de cerrarlo | Agregar un calco a los 10 s y esperar | ✅ incluida la gracia de 3 s |
| AC-12 *(RF-7)* | Con el buscador modal o el menú del celular abiertos no abre | Abrirlos a los 10 s | ✅ buscador modal y menú del celular |
| AC-13 *(RF-7)* | Con la pestaña en segundo plano no abre; abre 3 s después de volver | Cambiar de pestaña 20 s | ✅ con `visibilityState` simulado |
| AC-14 *(RF-8)* | Si el disparo se cumple con el carrito abierto y la persona va al checkout, no abre fuera del Home; al volver al Home en la misma sesión, abre | Prueba | ✅ mismo mecanismo probado con catálogo y ficha → Home |

### Dónde aparece
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-15 *(RF-9)* | En `/categorias`, `/categoria/x`, `/producto/x/1`, `/calcos-termo`, `/contacto` y `/checkout`, con estado limpio, 30 s y scroll al 80%: el popup **no** abre | Recorrerlas | ✅ `/categorias` y ficha con 30 s + 80 % de scroll; checkout y landing sin popup |
| AC-16 *(RF-10)* | Con el 10% activo, el acceso fijo **no** se ve en `/carrito`, `/checkout`, `/pago-*`, `/personalizados`, `/mayorista`, `/negocio`, `/polaroid`, `/tatuajes` | Recorrerlas | ✅ checkout y personalizados en navegador; el resto por test de `accesoVisible` |

### Frecuencia
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-17 *(RF-11)* | Abre una vez; al recargar sin cerrarlo, no vuelve a abrir solo | Recargar con el popup abierto | ✅ |
| AC-18 *(RF-12)* | Cerrado hace 6 días: no abre. Hace 8 días: abre | Simular con el snippet | ✅ test unitario |
| AC-19 *(RF-13)* | Con el 10% activo no abre solo aunque hayan pasado 31 días desde `convertidoEn` | Simular | ✅ test unitario |
| AC-20 *(RF-14)* | Con `compradoEn` no abre nunca | Simular | ✅ test unitario + AC-44 |
| AC-21 *(RF-15)* | Con storage bloqueado no abre solo y no hay errores que corten la app | DevTools → bloquear storage; navegador de Instagram | ⚠️ Chromium con `setItem` que tira: no abre solo y sin errores. **No probado en el navegador de Instagram real** |
| AC-22 *(RF-16)* | `welcomePopup.seen = '1'` sin cupón → se crea `cerradoEn` y no abre por 7 días; con cupón → `convertidoEn`. La clave vieja sigue ahí | Dos pruebas | ✅ en navegador y test |

### Paso 1
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-23 *(RF-17, RF-18)* | Solo hay un campo (mail) y el copy es el de RF-18 | Leer | ✅ |
| AC-24 *(RF-19)* | El % y el código del copy salen de `POPUP_OFERTA` + `COUPONS`: el test de paridad lo cubre y `grep -rn "10%\|EPICA10" frontend/src/components/popup/` no encuentra ninguno escrito a mano | test + grep | ✅ test de paridad; el grep solo encuentra comentarios |
| AC-25 *(RF-20)* | "hola@" → "Ingresá un email válido." y **ninguna** petición a `/api/capture-lead` | Pestaña Network | ✅ sin pedido al endpoint |
| AC-26 *(RF-21)* | Sin red → "No pudimos activar el descuento. Intentá nuevamente."; el popup sigue abierto con el mail escrito | DevTools offline | ✅ |
| AC-27 *(RF-21)* | Respuesta de más de 10 s → mismo mensaje | DevTools → throttling o bloquear la URL | ✅ corta a los 10 s y deja reintentar |
| AC-28 *(RF-22)* | Doble toque rápido en el botón → una sola petición | Network | ✅ un solo pedido |
| AC-29 *(RF-23)* | El lead llega a Notion, al CRM, el aviso interno y el mail con el código | Un envío real con un mail de prueba | ⬜ **no verificado**: requiere el endpoint real (Notion, CRM, Resend). `capture-lead.js` solo cambió por el `export` |

### Paso 2
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-30 *(RF-24)* | Al enviar, el popup no se cierra y muestra "🎉 ¡Listo! Tu 10% OFF ya está activo" con el código | Prueba | ✅ |
| AC-31 *(RF-25)* | "Copiar" pone el código en el portapapeles; donde no se puede, lo deja seleccionado | Chrome + navegador de Instagram | ✅ Chromium: con permiso copia; sin portapapeles queda seleccionado. **No probado en Instagram** |
| AC-32 *(RF-26)* | Se ve la línea "Se aplica solo en el checkout. Vale para las calcos del catálogo." | Leer | ✅ |
| AC-33 *(RF-27, RF-28)* | Mate → `/categorias`; Termo → `/calcos-termo`; Notebook → `/calcos-notebook`; Celular → `/categorias`. El tamaño elegido de la grilla no cambia. Las 4 cierran el popup | 4 pruebas | ✅ Termo y Celular en navegador; Mate y Notebook por test de `destinoInteres` |
| AC-34 *(RF-29)* | "Elegir mis calcos" va a `/categorias` y cierra el popup | Prueba | ✅ |
| AC-35 *(RF-30)* | Con productos en el carrito aparece "ir a pagar" y lleva a `/checkout`; con el carrito vacío no aparece | Dos pruebas | ✅ |
| AC-36 *(RF-31)* | La ✕ está en los dos pasos y el botón principal es visualmente más fuerte | Captura de pantalla | ✅ capturas a 375 px y 1280 px |

### Beneficio activo
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-37 *(RF-32)* | Con el 10% activo, el checkout lo aplica solo y **sin contador**, también 20 minutos después de dejar el mail | Esperar 20 min, entrar al checkout con 3 calcos | ✅ checkout sin contador; el cupón sin `emitidoEn` no vence (test a 365 días) |
| AC-59 *(RF-32)* | Con 10 calcos, el 3x2 corriendo y transferencia, el descuento es el 3x2 + 10% por transferencia + 10% de EPICA10 con tope del 20%, **igual que hoy en `main`** | Mismo carrito en `main` y en la rama, comparar totales | ✅ checkout con 10 calcos: "3x2 + EPICA10", $16.000 → $8.960 por transferencia (tope 20 %). Ningún `pricing.js` cambió |
| AC-38 *(RF-33)* | El acceso "🎁 10% OFF activo" se ve en Home, catálogo, ficha y landing; tocarlo despliega el código y Copiar, **sin** abrir el popup | Recorrer | ✅ |
| AC-39 *(RF-33)* | A 375 px, el acceso no tapa el botón de WhatsApp ni la barra fija de la ficha | Captura en `/producto/*` | ✅ sin solaparse en `/producto/*` a 375 px |
| AC-40 *(RF-34)* | Después de cerrar sin mail, en el Home aparece "🎁 10% OFF" y abre el paso 1 solo al tocarlo; en `/categorias` no aparece | Prueba | ✅ |
| AC-41 *(RF-35)* | Con 3 calcos del catálogo y el 10% activo, el carrito lateral y `/carrito` muestran "🎁 Tu 10% OFF está activo" y la línea con el monto; el Total es **igual** al del checkout con Mercado Pago | Comparar los dos números | ✅ 3 calcos: carrito lateral y `/carrito` $ 2.880 = checkout con Mercado Pago |
| AC-42 *(RF-35)* | Con 10 calcos, "Con transferencia" en `/carrito` es igual al total del checkout por transferencia | Comparar | ❌ **no se cumple, por un bug anterior**: con 10 calcos, "Con transferencia" en `/carrito` ya mostraba $9.600 contra $10.080 del checkout **sin cupón**. La guardia lo detecta y muestra el 10 % sin números (RF-36). Ver hallazgo en `tasks.md` |
| AC-43 *(RF-36)* | Con el carrito solo de personalizados, se ve el aviso sin monto | Prueba | ⚠️ por lectura de código (sin calcos elegibles `conCupon === totalActual` → aviso sin monto); no se armó un carrito solo de personalizados en el navegador |

### Después de comprar
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-44 *(RF-37)* | Después de un pedido por transferencia de prueba **sin** haber dejado el mail: no hay popup ni acceso "🎁 10% OFF" | Pedido real de prueba, cancelarlo después | ✅ |
| AC-45 *(RF-37, RF-38)* | Con el 10% activo, después de un pedido de prueba el acceso "10% OFF activo" sigue y el checkout vuelve a aplicar EPICA10 solo | Pedido real de prueba, cancelarlo después | ✅ el acceso "activo" y el cupón siguen después del pedido por transferencia |

### Interruptor y A/B
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-46 *(RF-39)* | `POPUP_CONFIG.activo = false` (en dev): sin popup ni acceso; un EPICA10 ya guardado sigue aplicándose en el checkout y en el carrito | `npm run dev` | ⚠️ por lectura y test (`puedeAbrirSolo` con `activo: false`); no se probó con el interruptor en `npm run dev` |
| AC-47 *(RF-40)* | Con `popup_disparo.active: false`, `popup_variant` es `b_12s` para todos; `?exp_popup_disparo=a_8s` **no** cambia nada (kill switch) | DebugView | ✅ |
| AC-48 *(RF-40)* | Con `active: true` en dev y `?exp_popup_disparo=c_scroll`, el popup no abre por tiempo, sí por scroll | `npm run dev` | ⚠️ por test (`c_scroll` no dispara por tiempo); no se prendió el experimento en `npm run dev` |

### Accesibilidad
| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-49 *(RF-42, RF-43)* | VoiceOver anuncia "diálogo" y el título al abrir; en celular **no** se abre el teclado solo | VoiceOver en iPhone | ⚠️ foco al título y sin teclado verificados en Chromium. **VoiceOver no probado** |
| AC-50 *(RF-44)* | Tab y Shift+Tab no salen del popup; Escape cierra; el foco vuelve al elemento anterior | Teclado en escritorio | ✅ |
| AC-51 *(RF-45)* | Al pasar al paso 2, el lector anuncia el éxito | VoiceOver | ⚠️ el foco pasa al título del éxito (Chromium). **Lector de pantalla no probado** |

---

## 2. Criterios no funcionales

| ID | Criterio | Cómo se verifica | Resultado |
|---|---|---|---|
| AC-52 *(RNF-1)* | A 375 px: sin scroll horizontal, margen lateral, campo y botón de 48 px, letra del campo de 16 px, **sin zoom al tocar el campo en iPhone** | iPhone real | ⚠️ en emulación de 375 px: letra 16 px, 48 px, sin scroll horizontal. **El zoom en iPhone real no se probó** |
| AC-53 *(RNF-2)* | Con el teclado abierto, el botón "Activar mi 10% OFF" se ve sin scrollear | iPhone SE/13 y un Android | ⬜ **no verificado**: requiere teclado real de iPhone y Android |
| AC-54 *(RNF-3)* | El diálogo es un chunk aparte y no se pide antes de los 5 s; el bundle principal no crece más de 3 KB gzip | `npm run build`, Network | ✅ el chunk se pide a los 5 s; bundle principal +2,9 KB gzip (94,74 → 97,65) |
| AC-55 *(RNF-3)* | LCP del Home en Lighthouse móvil igual al de antes (±5%) | Lighthouse antes y después | ⬜ **no verificado**: no hay Lighthouse en el entorno. El Home sigue eager y el popup no carga nada antes de 5 s |
| AC-56 *(RNF-4)* | Convertir y navegar no genera CLS atribuible al acceso fijo | Performance panel | ✅ CLS 0 al convertir y mostrar el acceso |
| AC-57 *(RNF-5)* | Todos los controles del popup y el acceso miden ≥ 44 px; foco visible; sin animación con `prefers-reduced-motion` | Inspección | ✅ ✕ 44 px, acceso 44 px, intereses 52 px, botones 48 px; el popup no agrega animaciones |
| AC-58 *(RNF-6)* | Con `fbq` que tira y storage bloqueado, se puede agregar al carrito y pagar | Simular en consola | ⚠️ storage bloqueado sin errores en Chromium; `fbq` que tira no se simuló (el `Lead` sale por `pixel()`, que ya va en `try/catch`) |

---

## 3. Edge cases

| Caso | Resultado |
|---|---|
| Página más corta que la pantalla: abre por tiempo | ✅ test (`porcentajeScroll` → null) |
| Mail inválido del lado del servidor (400) → mensaje de mail inválido | ✅ |
| Chunk del diálogo bloqueado (DevTools → bloquear la URL): no abre y **no** queda marcado como visto | ✅ y la app sigue andando |
| EPICA10 guardado con ventana vencida de antes del deploy: sigue vencido; dejar el mail de nuevo en el Home entrega uno sin ventana | ✅ test |
| Bundle viejo abierto al deployar: el popup viejo sigue funcionando contra el endpoint | ✅ por lectura: el contrato de `/api/capture-lead` no cambió |

---

## 4. Regresión: lo que NO se puede haber roto

| Criterio | Resultado |
|---|---|
| `npm test` en verde (623 + nuevos) | ✅ 682 / 682 |
| Un cupón escrito a mano (EPICA10, EPI50) se aplica igual en el checkout | ✅ por lectura: `Checkout.jsx` no cambió |
| `?cupon=EPICA10` en la URL del checkout sigue funcionando | ✅ por lectura: `Checkout.jsx` no cambió |
| El 3x2 y el 10% por transferencia calculan igual en carrito y checkout | ⚠️ ningún cálculo cambió, pero **ya no coincidían** en la caja "Con transferencia" de `/carrito` (AC-42) |
| Un pedido por Mercado Pago y uno por transferencia con EPICA10 pasan sin `price_mismatch` | ⚠️ `promoPricing.test.js` en verde y el servidor no cambió; **no se hizo un pedido real** (no hay functions en este entorno) |
| El formulario de contacto sigue mandando `generate_lead` con `lead_source: 'contacto_form'` y nada más | ✅ por lectura: no pasa el 2º parámetro |
| El buscador y el menú del celular funcionan igual | ✅ usados en las pruebas |
| Carrito guardado de antes del deploy se carga igual | ✅ la forma del carrito no cambió |

---

## 5. Analytics

| Evento | Parámetros esperados | GA4 DebugView | Sin PII |
|---|---|---|---|
| `popup_view` | `popup_variant`, `popup_trigger`, `page_path`, `device_type`, `new_vs_returning` | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| `popup_close` | `popup_variant`, `popup_step`, `close_method` | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| `popup_email_submit` | `popup_variant`, `discount_type`, `page_path`, `device_type` | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| `generate_lead` | `lead_source: 'welcome_popup'` + `popup_variant`, `popup_trigger`, `device_type` | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| `popup_interest_selected` | `popup_variant`, `interest`, `destination` | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| `popup_cta_click` | `popup_variant`, `destination` | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| `cupon_emitido` | sin cambios | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| Propiedades `popup_exposed`, `popup_converted` | aparecen en el usuario en DebugView | ⚠️ en el `dataLayer` sí; DebugView no (sin acceso a GA4) | ✅ |
| Meta `Lead` | sale una vez por conversión | ⚠️ por lectura: `trackLeadCapture` una vez por conversión | ✅ |
| Un solo `popup_view` por apertura (StrictMode en dev) | — | ✅ se dispara en la promesa de apertura, no en un efecto | — |

---

## 6. Paridad de precios

La spec **no toca** ningún `pricing.js`. Se verifica igual:

| Criterio | Resultado |
|---|---|
| `git diff` no incluye `frontend/src/config/pricing.js` ni `netlify/functions/lib/pricing.js` | ✅ |
| Test de paridad: el código del popup = `WELCOME_COUPON_CODE` = existe en `COUPONS` de los dos lados | ✅ |
| `promoPricing.test.js`, `envio.test.js`, `precioPersonalizados.test.js` en verde | ✅ |

---

## Definition of Done

### Código
- [ ] Todos los criterios de §1, §2 y §3 en ✅ (o explicados si no se pudieron probar)
- [ ] Todos los criterios de regresión (§4) en ✅
- [ ] `npm test` en verde
- [ ] Sin dependencias nuevas
- [ ] Sin refactors fuera de scope en el diff
- [ ] Los comentarios explican el **por qué**, con la densidad del repo

### Seguridad
- [ ] Ningún secreto en el frontend
- [ ] Sin PII en logs, URLs ni `dataLayer`

### Documentación
- [ ] `docs/business-rules.md`, `docs/analytics.md`, `docs/database.md` actualizados
- [ ] Estado de la spec 025 actualizado según P-1

### Proceso
- [ ] `tasks.md` con todos los pasos marcados
- [ ] Hallazgos fuera de scope reportados
- [ ] Este documento recorrido punto por punto, con resultados reales
- [ ] Dimensiones de GA4 registradas por Mariano (o anotado que falta)
- [ ] Estado de la spec en `DONE`

---

## Resultado de la validación

### Resumen

- **Tests**: 682/682 (623 antes + 59 nuevos en `popupReglas.test.js` y `popupEstado.test.js`).
- **Navegador**: 118 chequeos automatizados con Chromium contra el build de
  producción (`vite preview`), con reloj simulado: 81 del recorrido principal
  (escritorio y 375 px), 28 de bordes y 9 de scroll, errores y carrito. Todos
  en verde.
- **Build**: bundle principal +2,9 KB gzip; el diálogo (3,6 KB) y el acceso fijo
  (1,2 KB) bajan aparte.

### Criterios no cumplidos

- **AC-42**: la caja "Con transferencia" de `/carrito` ya calculaba mal antes
  de esta spec (resta el 10 % sobre el precio de lista). Con el 10 % del popup
  activo y 10+ calcos, la guardia muestra el aviso sin monto en vez de un número
  equivocado. El arreglo es otra spec (hallazgo en `tasks.md`).

### Pendiente de verificar (no se pudo desde este entorno)

- En dispositivos reales: iPhone Safari, Android Chrome y el navegador de
  Instagram (zoom del campo, teclado abierto con el botón a la vista, storage
  bloqueado de verdad, Copiar).
- VoiceOver / TalkBack.
- Un lead real (Notion, CRM, mails) y un pedido real con EPICA10 por los dos
  medios de pago, en un deploy preview.
- GA4 DebugView, y registrar las dimensiones personalizadas (tarea 9.3, de Mariano).
- Lighthouse móvil del Home.

### Notas

- Las capturas de 375 px y escritorio quedaron en la sesión de trabajo (no se
  commitean).
- Mientras no se cierre lo pendiente, la spec queda `IN PROGRESS`.
