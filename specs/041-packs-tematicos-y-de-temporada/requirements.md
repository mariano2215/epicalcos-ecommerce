# Requirements — Packs por tema y de temporada

| | |
|---|---|
| **Spec** | `041-packs-tematicos-y-de-temporada` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** · 💲 **precios nuevos: necesita la tabla aprobada** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Elegir entre 3.397 diseños en el celular es la condición exacta en la que la
gente se traba: surtido grande, gustos poco definidos y ganas de no esforzarse
(Chernev et al. 2015, metaanálisis de 99 estudios). Hoy:

- No hay ningún pack armado: para llevar 24 calcos hay que tocar 24 "+".
- En /mayorista, para el x100 hay que elegir **100 diseños uno por uno**, y el
  armador abre en "Aesthetic" (primera por orden alfabético: ojo de la
  providencia, billetes, un payaso), que no representa al catálogo.
- No hay oferta para regalar en diciembre ni para Reyes, verano o vuelta a
  clases, que son las fechas que vienen.
- Es la decisión comercial #2 que quedó abierta en el plan CRO de septiembre.

## 2. Objetivo

Que se pueda comprar un pack completo de un tema en un toque, sin sacar la
compra suelta, y que el x100 se pueda completar sin elegir 100 veces.

**Cómo se sabrá que funcionó**: % de pedidos con un pack temático y calcos por
pedido, 6 semanas antes contra 6 después.

## 3. Scope

- [ ] Packs cerrados de 12 y de 24 calcos (6 cm) por tema, con los más vendidos
      de cada tema: Mate y termo, Argentina, Fútbol, Anime, Taylor Swift.
- [ ] Packs de temporada con fecha: Navidad (regalo), Reyes (infantil), Verano,
      Vuelta a clases.
- [ ] x100 armados por tema (Fútbol, Anime, Argentina) **al precio del x100 de
      hoy** ($52.999): no es precio nuevo, es una selección hecha.
- [ ] /mayorista: botón "Completar con los más elegidos" y el armador abre en
      "Más vendidos".
- [ ] Ficha de producto: bloque "Completá el pack" con el pack del tema.

## 4. Fuera de scope

- La oferta de cantidad general (spec 040).
- Cambiar el precio del x100 o del mayorista.
- Packs con diseños elegidos por el cliente a precio cerrado (eso ya lo hizo
  EPICYBER).

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Comprador indeciso | Compra un tema en un toque |
| Quien busca regalo | Tiene un pack listo con fecha |
| Comprador del x100 | Completa los 100 sin elegir 100 veces |

## 6. User stories

- Como fan de un tema, quiero un pack con lo mejor de ese tema, para no revisar
  140 diseños.
- Como comprador mayorista, quiero completar mi x100 con los más elegidos, para
  terminar en un toque.

## 7. Requisitos funcionales

- **RF-1** Tabla de precios propuesta (P-1). Packs de 6 cm:

  | Pack | Suelto hoy | Con "Llevá 12, pagá 10" (si se aprueba la 040) | **Precio del pack** | Con transferencia | Envío |
  |---|---|---|---|---|---|
  | x12 por tema | $25.200 | $21.000 | **$21.000** | $18.900 | se paga |
  | x24 por tema | $50.400 | $42.000 | **$39.900** | $35.910 | **gratis en Rosario** |
  | x24 Navidad (regalo) | $50.400 | $42.000 | **$39.900** | $35.910 | **gratis en Rosario** |
  | x12 Reyes (infantil) | $25.200 | $21.000 | **$21.000** | $18.900 | se paga |

  El x24 a $39.900 está elegido para que, con el 10 % por transferencia, cruce
  los $35.000 de Rosario: el umbral se mide después de ese descuento, así que un
  pack que quiera cruzarlo tiene que costar al menos $38.900 de lista.

- **RF-2** Un toque agrega el pack como **una línea** con sus diseños listados.
- **RF-3** El pack muestra los diseños que trae antes de agregarlo.
- **RF-4** Los packs de temporada tienen fecha de inicio y fin y desaparecen
  solos (como EPICYBER).
- **RF-5** "Completar con los más elegidos" llena lo que falta para 100 con el
  ranking de ventas (spec 038), sin repetir diseños ya elegidos.
- **RF-6** El servidor conoce cada pack y su precio y rechaza otro.

## 8. Requisitos no funcionales

- Cada pack tiene su imagen: una composición de sus calcos reales, no un render
  de una calco pegada.

## 9. Reglas de negocio

- 💲 Precio nuevo: no se publica sin la tabla aprobada en §12.
- La transferencia aplica a los packs (spec 027); cupones y N x M no.
- El pack no regala envío: cruza el umbral por su precio, como cualquier pedido.

## 10. Edge cases

- Un diseño del pack se borra del catálogo → el pack se arma con el siguiente del
  ranking del tema; nunca queda con menos calcos.
- El mismo pack dos veces en el carrito → cantidad 2 de la línea.
- Pack + calcos sueltas → las sueltas siguen con su precio y su oferta.

## 11. Analytics necesarios

- `pack_tematico_visto`, `pack_tematico_agregado` (tema, tamaño, cantidad),
  `completar_pack_click` (mayorista y ficha). Por `lib/analytics.js`.

## 12. Preguntas abiertas

- [ ] **P-1 · Tabla.** ¿Aprobás los precios de RF-1? ¿También en 4 cm?
- [ ] **P-2 · Temas.** ¿Son esos cinco? ¿Quién elige los 12 y los 24 de cada
      uno: el ranking o vos?
- [ ] **P-3 · Navidad.** ¿El pack de Navidad lleva algo físico distinto (bolsa,
      tarjeta)? Si suma costo, cambia el precio.
- [ ] **P-4 · Fotos.** ¿Podés sacar una foto real de cada pack armado?
