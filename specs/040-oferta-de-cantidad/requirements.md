# Requirements — Oferta de cantidad permanente ("Llevá 12, pagá 10")

| | |
|---|---|
| **Spec** | `040-oferta-de-cantidad` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** · 💲 **cambia precios: necesita la tabla aprobada** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Desde el 1/10/2026 no hay ningún motivo para llevar una calco más. Ese día se
apagaron el 3x2 y el 2x1 y los precios subieron (+20 % el 26/9 y +10 % el 1/10).

| | Septiembre | Octubre | 1–20 noviembre |
|---|---|---|---|
| Pedidos web pagos | 25 (~6 por semana en la 2.ª quincena) | 4 | 3 |
| Pedidos por lead | 0,30 | 0,13 | 0,13 |

Fuente: CRM EPICALCOS (Notion), pedidos "EPI-", consultado el 20/11/2026.

La caída coincide con otros cambios (transferencia 20 → 10 %, Home nuevo, menú
nuevo) y con menos leads, así que **no es solo la oferta**. Pero el 3x2 era el
único empuje de cantidad y nada lo reemplazó.

Evidencia externa: a igual valor, más producto gana al descuento en compras sin
culpa (76 % contra 54 %, Mishra y Mishra 2011), y en el CyberMonday 2026 la gente
llevó 2,25 unidades por orden, contra 1,75 el año anterior.

## 2. Objetivo

Una oferta de cantidad permanente, más barata en margen que el 3x2, que se
explique en tres palabras y no toque el envío.

**Cómo se sabrá que funcionó**: suben las **calcos por pedido** y los pedidos
por semana en las 6 semanas siguientes, contra las 6 anteriores, sin que baje
el margen por pedido por debajo del que apruebe Mariano (P-1).

## 3. Scope

- [ ] Una mecánica de cantidad para calcos de catálogo y personalizados
      (las mismas líneas que tenía el 3x2).
- [ ] Banner, aviso en el carrito ("te faltan 3 para 2 gratis") y textos.
- [ ] Interruptor para prenderla y apagarla sin tocar código de lógica.

## 4. Fuera de scope

- Packs, x100, mayorista, Negocio, polaroid, tatuajes: siguen con su precio.
- Envío: no cambia ni el costo ni el umbral.
- Packs temáticos cerrados: spec 041.

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Comprador suelto | Recibe 2 gratis cada 12 |
| Quien armaba 30+ calcos sueltas | Le conviene igual el x100 (ver §10) |
| Mariano | Margen por calco más bajo en pedidos de 12+ |

## 6. User stories

- Como comprador, quiero que llevar más me convenga, para armar un pedido
  grande sin sentir que pago de más.

## 7. Requisitos funcionales

- **RF-1** Opción elegida por Mariano (P-2). Recomendada: **A**.

  **Opción A · Llevá 12, pagá 10** (cada 12 calcos, las 2 más baratas sin cargo;
  cruza diseños, categorías y tamaños):

  | Pedido | Hoy (lista) | Con la oferta | Ahorro | Con transferencia (10 %) |
  |---|---|---|---|---|
  | 12 × 4 cm | $19.200 | **$16.000** | 16,7 % | $14.400 |
  | 12 × 6 cm | $25.200 | **$21.000** | 16,7 % | $18.900 |
  | 12 × 9 cm | $31.800 | **$26.500** | 16,7 % | $23.850 |
  | 24 × 6 cm | $50.400 | **$42.000** | 16,7 % | $37.800 → envío gratis en Rosario |
  | 36 × 6 cm | $75.600 | **$63.000** | 16,7 % | $56.700 → envío gratis a todo el país |
  | 11 × 6 cm | $23.100 | $23.100 | 0 % | $20.790 |

  **Opción B · Escalones** (4 o más: −10 %; 10 o más: −20 %, sobre todas las
  unidades):

  | Pedido | Hoy | Con la oferta | Ahorro |
  |---|---|---|---|
  | 4 × 6 cm | $8.400 | $7.560 | 10 % |
  | 12 × 6 cm | $25.200 | $20.160 | 20 % |
  | 24 × 6 cm | $50.400 | $40.320 | 20 % |

  B empuja desde 4 calcos pero cuesta más margen (20 % contra 16,7 %) y **no
  existe en el motor**: hay que escribirla en los dos lados del espejo. A reusa
  el motor del 3x2, que ya está probado.

  **Opción C · Nada**: seguir sin oferta de cantidad.

- **RF-2** La mecánica acumula con el 10 % por transferencia y con EPICA10,
  dentro del tope de descuento porcentual vigente (30 %). EPI50 la anula, como
  anulaba el 3x2 (P-3).
- **RF-3** Carrito: "Llevás 9 · te faltan 3 para que 2 te salgan gratis".
- **RF-4** Banner del header: "LLEVÁ 12, PAGÁ 10" sin fecha de fin ni cuenta
  regresiva (no es por tiempo limitado).
- **RF-5** El servidor revalida igual que el 3x2: un precio que no coincide se
  rechaza.

## 8. Requisitos no funcionales

- Ningún texto dice "por tiempo limitado".
- El cálculo es el mismo en carrito, checkout y servidor, al peso.

## 9. Reglas de negocio

- 💲 Esta spec **cambia precios efectivos**: no se implementa sin la tabla de
  RF-1 aprobada por escrito en §12.
- No se prueba con A/B: el servidor rechaza lo que no coincide.
- La oferta no regala envío: el umbral se mide como hoy, después de los
  descuentos.

## 10. Edge cases

- **Desde 30 calcos de 6 cm (40 de 4 cm), el x100 ($52.999) sale más barato**
  que pagarlas sueltas con la oferta: 29 × 6 cm se cobran 25 = $52.500; 30 × 6 cm
  se cobran 26 = $54.600. Hoy, sin oferta, el cruce está en 26 calcos de 6 cm.
  El carrito tendría que sugerir el x100 desde ahí: se anota como hallazgo
  (puede existir ya por la spec 013).
- Carrito con 12 calcos de 9 cm y 1 de 4 cm: las gratis son la de 4 cm y una de
  9 cm (las 2 más baratas del grupo de 12, según el orden del motor).
- Carritos guardados con el 3x2: el precio se recalcula al abrir, como hoy.

## 11. Analytics necesarios

- `promo_progreso_visto` (el aviso "te faltan N"), `promo_alcanzada` (cruza un
  múltiplo de 12). Por `lib/analytics.js`, con `try/catch`.
- Calcos por pedido en `purchase` (ya sale de `items`).

## 12. Preguntas abiertas

- [ ] **P-1 · Costo y margen.** ¿Cuánto cuesta producir una calco de 4, 6 y 9 cm
      (vinilo, tinta, corte, bolsa)? Sin ese dato no se puede decir cuánto margen
      se resigna.
- [ ] **P-2 · Opción.** ¿A, B o C? ¿Aprobás la tabla tal cual?
- [ ] **P-3 · Acumulación.** ¿Acumula con transferencia y con EPICA10 (como el
      3x2), o solo con transferencia?
