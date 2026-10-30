# Acceptance — Cotizador B2B, mayorista por escala y Home B2B a prueba

| | |
|---|---|
| **Spec** | `034-b2b-cotizador-y-mayorista` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Validado el** | 17/10/2026, en la rama `feat/034-b2b-conversion` (servidor de desarrollo local, 375 px y escritorio) |
| **Resultado** | ✅ aceptada **en la rama** — falta la revisión de Mariano y la publicación |

> Si un criterio no está acá, no es parte de "terminado". Si está, la feature no
> se cierra hasta cumplirlo.

- ✅ Cumple — verificado, con evidencia · ❌ No cumple · ⏭️ No aplica

---

## 1. Criterios funcionales

### Cotizador (`/negocio`)
| # | Criterio | Resultado |
|---|---|---|
| AC-1 | Sin tocar nada, `/negocio` muestra 100 · 6 cm · vinilo blanco · 1 diseño con el total de la Promo Negocio | ✅ Navegador: "100 calcos · 6 cm · Vinilo Blanco · $ 52.999 · $ 530 por calco" |
| AC-2 | Cambiar a 250 / 500 / 1.000 muestra el total de la escala, el precio por calco, el % (10/20/30) y el de transferencia; en 100 dice MUESTRA GRATIS con la aclaración digital | ✅ Navegador (250: $118.999 · $476 · −10 % · $107.099); test (`pct` 0/10/20/30); la muestra gratis con "vista previa digital antes de producir" en el panel |
| AC-3 | Holográfico 100 = Negocio + tornasolado (mismo total) | ✅ Test `cotizadorNegocio.test.js` |
| AC-4 | "Más de 1.000" no muestra precio: muestra Pedir presupuesto y WhatsApp | ✅ Navegador: panel sin ningún monto, con los dos botones |
| AC-5 | Sin razón social no agrega; con razón social agrega **una** línea y lleva al carrito, que dice la cantidad de calcos | ✅ Navegador: error en el campo y foco; con datos → `/carrito` con `volumen:6cm:vinilo-blanco:250` y "250 calcos" |
| AC-6 | La línea pasa por `validateAndPriceOrder()` con MP y transferencia (test) | ✅ 24 combinaciones × 2 medios de pago |
| AC-7 | Pedir presupuesto abre `/contacto` con la consulta armada con la configuración | ✅ Navegador: "Cantidad aproximada: más de 1.000… Tamaño: 6 cm · Material: Vinilo Blanco · Cantidad de diseños: 1 · Empresa / razón social:" |
| AC-8 | `COTIZADOR.activo = false` vuelve a mostrar el formulario de la Promo Negocio | ✅ Navegador con `COTIZADOR_ACTIVO = false`: vuelve "Promo Negocio" y el CTA del hero despliega las salidas de E-1. Se volvió a `true` |

### `/mayorista`
| # | Criterio | Resultado |
|---|---|---|
| AC-9 | Solo 4 y 6 cm; dice que el 9 cm va suelto en la tienda | ✅ Navegador |
| AC-10 | 100 calcos = $52.999 (escalón de 100); 250 = escalón de 250 | ✅ Tabla y armador; 250 → $118.999 |
| AC-11 | 240 calcos: no deja agregar y ofrece completar 10 | ✅ "Sumá 10: pagás lo mismo" (deshabilitado) + "Completar 10" → agrega `volumen:4cm:vinilo-blanco:250` |
| AC-12 | No deja pasar de 1.000 y muestra pedidos grandes | ✅ 1.500 escrito → 1.000, $370.999, aviso de presupuesto |
| AC-13 | La página dice oferta, tamaños, elección de diseños, tabla, plazo, muestra gratis, envío y pagos antes del armador; no dice "por tiempo limitado" | ✅ Navegador y `negociosEstatico.test.js` |
| AC-14 | `/armar-pack` sigue igual | ⏭️ La ruta está oculta (`HIDDEN_SECTIONS`). El código del armador sin la prop `escala` no cambió de comportamiento |

### Cotizar, WhatsApp, FAQ
| # | Criterio | Resultado |
|---|---|---|
| AC-15 | El botón Cotizar del header despliega Ver el precio ahora · WhatsApp · Dejar mis datos | ✅ Menú del celular; "Ver el precio ahora" lleva a `/negocio#cotizador` |
| AC-16 | El WhatsApp flotante de `/negocio` y `/mayorista` sale con mensaje precargado; el del resto, como hoy | ✅ Navegador (`/negocio`, `/personalizados` sin texto) + test por ruta |
| AC-17 | El FAQ del Home ya no dice "archivo perfecto", ni "condiciones especiales", ni "te ayudamos a adaptarlo"; el mínimo mayorista sale del config | ✅ Código revisado; las cifras salen de `pctEscalon()` |

### Home B2B
| # | Criterio | Resultado |
|---|---|---|
| AC-18 | Sin parámetro, el Home es el de hoy | ✅ H1 "Calcos para vos o para tu negocio.", sin cotizador |
| AC-19 | Con `?exp_home_b2b=b2b` se ve la variante con el copy de RF-10, precio de 100 y de 1.000, cotizador, camino a la tienda | ✅ Navegador (captura del hero a 375 px) |
| AC-20 | Al volver sin el parámetro, otra vez el de hoy (no quedó guardada) | ✅ `epicalcos.exp.v1` sigue vacío + test |

### SEO y atribución
| # | Criterio | Resultado |
|---|---|---|
| AC-21 | `dist/negocio.html` y `dist/mayorista.html` tienen título, descripción, canonical, OG y JSON-LD propios y el H1 sin JS | ✅ Build + `negociosEstatico.test.js` |
| AC-22 | Los alias 301 están en `netlify.toml` y `_redirects` (test) | ✅ `redirects.test.js`. ⚠️ El 301 real se verifica con `curl -I` después del deploy |
| AC-23 | Con `fbclid` en la URL de llegada y sin cookie `_fbc`, el checkout manda `fbc` (test) | ✅ `atribucion.test.js` cubre la captura y el formato; el cableado en `paymentService.metaTracking()` se verificó leyendo el código (es una función interna sin test) |

## 2. Criterios no funcionales
| # | Criterio | Resultado |
|---|---|---|
| ANF-1 | 375 px sin scroll horizontal en `/negocio`, `/mayorista` y Home B2B | ✅ `scrollWidth ≤ innerWidth` en las tres |
| ANF-2 | Opciones del cotizador navegables con teclado; el precio con `aria-live` | ✅ Flechas + un tab por grupo; `aria-live="polite"` |
| ANF-3 | Sin dependencias nuevas | ✅ `package.json` sin cambios |
| ANF-4 | Analytics sin PII | ✅ Revisado: solo configuración, escalón y contexto |
| ANF-5 | El chunk del Home no suma el código de la variante B2B | ✅ `HomeB2B` 1,9 kB aparte; chunk principal 101,35 kB gzip vs 100,90 de la base |

## 3. Regresión
| # | Criterio | Resultado |
|---|---|---|
| AR-1 | `npm test` verde, con los tests de paridad | ✅ 886 pasan, 17 omitidos (base 839) |
| AR-2 | `vite build` sin errores | ✅ `npm run build` completo (sitemap + Vite + prerender) |
| AR-3 | Carrito, checkout (sin pagar), `/armar-pack`, `/personalizados` sin errores de consola | ✅ Sin errores. `/armar-pack` redirige (oculta) |

## Definition of Done
- [x] Todos los criterios ✅ o ⏭️ con motivo
- [x] `AUDITORIA_EPICALCOS.md` con resultados reales
- [x] Commits en la rama, sin push
- [ ] Mariano revisa y decide el merge
