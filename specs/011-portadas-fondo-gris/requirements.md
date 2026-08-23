# Requirements — Portadas de categoría con fondo gris uniforme

| | |
|---|---|
| **Spec** | `011-portadas-fondo-gris` |
| **Estado** | `DONE` |
| **Fecha** | 23/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

---

## 1. Problema

La grilla de categorías (`/categorias` y las 10 destacadas del Home) se ve
despareja: cada card muestra un diseño distinto de su carpeta y esos diseños
vienen en **dos presentaciones incompatibles**.

El catálogo fuente ("Stickers CATALOGO") mezcla dos tipos de archivo:

| Origen | Cómo se ve | Cuántos |
|---|---|---|
| `.jpg` | el calco **fotografiado sobre un fondo gris parejo** (`#F8F8F8`), cuadrado, con margen | 1.129 de 3.397 |
| `.png` | el calco **recortado, con fondo transparente** y encuadre justo al borde | el resto |

Sobre el fondo oscuro de la card, el recorte transparente queda flotando —y como
casi todos los calcos tienen borde blanco de troquel, el borde se pierde contra
el violeta y el dibujo se lee peor. Al lado, la foto con fondo gris se ve como
un producto. Dos cards vecinas no parecen del mismo catálogo.

Además la presentación **cambia sola**: la portada rota (por scroll en el Home,
por visita en `/categorias`), así que la misma categoría a veces sale como foto
y a veces como recorte.

---

## 2. Objetivo

Que la portada de **todas** las categorías se vea igual: el diseño centrado
sobre un fondo gris claro y parejo, sea cual sea la rotación que le toque.

**Cómo se sabrá que funcionó**: entrar a `/categorias`, recargar cinco veces y
que en ninguna de las cinco aparezca una card con el calco flotando sobre el
fondo oscuro.

---

## 3. Scope

- [x] La portada de una categoría se elige **solo** entre sus diseños con fondo
      claro y uniforme.
- [x] Si la categoría no tiene **ninguno**, la card igual muestra el diseño
      sobre gris (el fondo lo pone la card, no el archivo).
- [x] La rotación sigue funcionando: la portada cambia entre visitas, pero
      siempre dentro del conjunto permitido.
- [x] Se mantiene la garantía de que dos categorías no muestran el mismo dibujo
      en la misma grilla.

---

## 4. Fuera de scope

- [ ] La grilla de diseños **adentro** de una categoría (`/categoria/<slug>`) y
      la ficha de producto: ahí el recorte transparente sobre oscuro está bien y
      no se toca.
- [ ] Las cards de las secciones especiales (Personalizados, Mayorista,
      Negocio…): no usan portada de catálogo, son gradientes propios.
- [ ] Reprocesar, recortar o regenerar los `.webp` del catálogo.
- [ ] Cambiar qué diseños tiene cada categoría.

---

## 5. Usuarios afectados

| Usuario | Cómo lo afecta |
|---|---|
| Cliente que compra | ve una vidriera pareja; el calco se lee mejor sobre gris |
| Cliente que vuelve | no afectado (no toca carrito ni precios) |
| Mariano (operación) | al reemplazar el catálogo tiene que correr un script más |
| Sistemas externos (CRM, Meta, MP) | no afectados |

---

## 6. User stories

- **US-1** — Como cliente que entra por un anuncio, quiero ver una grilla de
  categorías pareja, para entender de un vistazo que es un catálogo y no una
  bolsa de imágenes sueltas.
- **US-2** — Como cliente que vuelve, quiero que la portada siga cambiando entre
  visitas, para descubrir diseños que no había visto.

---

## 7. Requisitos funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-1 | La portada de una categoría se elige solo entre sus diseños con fondo claro y uniforme | 🔴 must |
| RF-2 | El recuadro de la portada en la card tiene fondo gris claro, del mismo tono que el de esos diseños | 🔴 must |
| RF-3 | Una categoría sin ningún diseño con fondo gris muestra igual su portada, apoyada sobre el gris de la card | 🔴 must |
| RF-4 | El diseño se ve completo y centrado, sin recortes | 🔴 must |
| RF-5 | La rotación sigue moviendo la portada dentro del conjunto permitido | 🔴 must |
| RF-6 | Dos categorías de la misma grilla no muestran el mismo dibujo | 🔴 must |
| RF-7 | El contador de diseños de la card se sigue leyendo sobre el fondo claro | 🟡 should |
| RF-8 | Si el dato de qué diseños son elegibles no llega, la grilla funciona igual | 🟡 should |

---

## 8. Requisitos no funcionales

| ID | Requisito | Criterio |
|---|---|---|
| RNF-1 | **Mobile-first** | la grilla de 2 columnas a 375 px no cambia de alto ni salta |
| RNF-2 | **Performance** | no agrega imágenes ni scripts; el dato extra pesa < 10 KB y viaja en paralelo con el catálogo |
| RNF-3 | **Accesibilidad** | el contador sigue contrastando sobre el nuevo fondo |
| RNF-4 | **Compatibilidad** | no toca carrito, precios ni `localStorage` |
| RNF-5 | **Sin dependencias nuevas** | la detección corre en un script de build con `magick`, que el repo ya usa |
| RNF-6 | **Sin CLS** | el recuadro sigue reservando su alto antes de que baje la imagen |

---

## 9. Reglas de negocio

Ninguna. Esta feature es de vidriera: no toca precios, promos, cupones ni envíos.

- [ ] ~~Requiere cambio espejado en `pricing.js`~~ — no
- [ ] ~~Requiere cambio espejado en `site.js`~~ — no
- [ ] ~~Requiere test de paridad~~ — no

---

## 10. Edge cases

| Caso | Comportamiento esperado |
|---|---|
| La categoría no tiene ningún diseño con fondo gris | usa cualquiera de los suyos; el gris lo pone la card |
| La categoría tiene un solo diseño elegible | esa es siempre su portada, sin rotar |
| El dato de elegibles no llega (404, red caída) | se elige como hoy, entre todos los diseños |
| Todos los elegibles ya los tomó otra categoría de la grilla | se repite antes que quedar sin portada (comportamiento actual) |
| El diseño elegido no existe en el servidor | la card cae a la portada de `catalog.json` (comportamiento actual) |
| Se reemplaza el catálogo entero | hay que volver a correr la detección; si no se corre, quedan índices viejos apuntando a otros dibujos |

---

## 11. Analytics necesarios

Ninguno. No hay una acción comercial nueva: es la misma card, con otra imagen
adentro. No se agregan ni cambian eventos.

---

## 12. Preguntas abiertas

Ninguna. Las dos decisiones que faltaban las tomó Mariano antes de implementar:

1. Escribir la spec e implementar en el mismo turno.
2. Para las 7 categorías sin ningún diseño con fondo gris, poner el gris en la
   card en vez de generar archivos nuevos.
