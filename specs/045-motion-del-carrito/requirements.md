# Requirements — Motion del carrito

| | |
|---|---|
| **Spec** | `045-motion-del-carrito` |
| **Estado** | `READY FOR REVIEW` — ⛔ **no autoriza la implementación** |
| **Fecha** | 20/11/2026 |
| **Autor** | Claude, a partir del Plan de conversión del 20/11/2026 (sección Motion, con demos) |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

Agregar una calco no se siente. En la grilla el "+" no abre el carrito (a
propósito, para no cortar el ritmo) y la única devolución es un aviso abajo y un
número. No hay animación de agregado, ni de hito alcanzado, ni nada que haga
sentir el material (vinilo que se despega, tornasolado que cambia con la luz).

Las tiendas de referencia (Glossier, Olipop, Sticker Mule) usan movimiento corto
y con función: confirmar, mostrar progreso, anticipar el material. La evidencia
de que la animación por sí sola venda es débil (NN/g 2020), así que cada pieza
tiene que tener una función, no ser decoración.

## 2. Objetivo

Seis piezas de movimiento, cada una con una función medible, que no empeoren la
velocidad ni molesten a quien pide menos movimiento.

**Cómo se sabrá que funcionó**: agregados por sesión y "+" repetidos por sesión
en la grilla, 4 semanas contra 4; INP y CLS sin empeorar.

## 3. Scope

| Pieza | Función | Dónde |
|---|---|---|
| 1. La calco vuela al carrito + rebote del ícono | confirma el agregado sin abrir el carrito | grilla, ficha, fila del Home |
| 2. Barra con hitos y "sello" al cruzar | muestra el progreso y festeja la meta | carrito (con 043) |
| 3. Esquina que se despega | anticipa que es un vinilo | tarjetas, solo con mouse |
| 4. Brillo tornasolado que sigue el dedo | muestra el holográfico, que una foto no muestra | ficha de tornasolados |
| 5. Anillo de pack | progreso hacia 12 (con 040) | carrito |
| 6. Transición grilla → ficha | mantiene el contexto | navegador que la soporte |

## 4. Fuera de scope
- Animaciones del hero (spec 028, retirado).
- Librerías nuevas: `framer-motion` sigue encerrado en un solo archivo (regla 10).

## 7. Requisitos funcionales
- **RF-1** Cada pieza dura ≤ 600 ms y no bloquea el siguiente toque.
- **RF-2** Con `prefers-reduced-motion: reduce`, ninguna pieza se mueve: el
  resultado aparece directo (el número del carrito cambia, el sello aparece quieto).
- **RF-3** Nada se repite en loop más de 5 s sin forma de frenarlo (WCAG 2.2.2).
- **RF-4** Las piezas 2 y 5 solo existen si están vivas la 043 y la 040.

## 8. Requisitos no funcionales
- Solo `transform` y `opacity` (sin layout).
- Sin JavaScript en el camino de carga del Home (todo se dispara al tocar).
- Anda en el navegador embebido de Instagram, o no aparece, sin errores.

## 11. Analytics necesarios
- Ninguno nuevo: se mide con `add_to_cart` por sesión.

## 12. Preguntas abiertas
- [ ] **P-1** ¿Las seis o un subconjunto primero? (propuesta: 1 y 6, después el resto)
