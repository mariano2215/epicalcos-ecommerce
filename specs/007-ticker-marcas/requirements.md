# Requirements — Ticker circular de marcas que confiaron

| | |
|---|---|
| **Spec** | `007-ticker-marcas` |
| **Estado** | `DONE` |
| **Fecha** | 15/08/2026 |
| **Autor** | Claude, a pedido de Mariano |

> **Este documento define QUÉ debe suceder, no CÓMO.**

> ⚠️ **Spec escrita después de implementar.** Mariano pidió el cambio en una
> frase, con la carpeta de logos adjunta: *"en esta foto poner un ticker
> pasarela con los logos que te voy a mandar EN FORMATO CIRCULAR que vayan
> pasando y mostrandose en la parte Marcas que confiaron"*. Es un cambio
> presentacional en un componente existente, no toca el camino de precios, y se
> implementó directo. Este documento es el registro de lo que se hizo, no el
> contrato previo — queda dicho para que no parezca que el workflow se cumplió.

---

## 1. Problema

La prueba social de `/negocio` y del Home era **una sola imagen**:
`/images/marcas-clientes.webp`, 11 logos en blanco sobre gris oscuro, integrada
al fondo con `mix-blend-screen`.

Dos problemas, uno de producto y uno de operación:

1. **No escala.** Para sumar un cliente había que rehacer el archivo entero en
   un editor y volver a exportarlo. Resultado: la tira quedó congelada mientras
   la lista real de clientes seguía creciendo — hoy hay 24 marcas nuevas que
   nunca llegaron a la página.
2. **Los logos pierden identidad.** Al forzarlos a blanco sobre gris se pierde
   el color de cada marca, que es justamente lo que hace que un cliente
   reconozca "ah, estos son los de X" al pasar la vista.

Además la tira era estática: ocupaba alto de página sin llamar la atención.

---

## 2. Objetivo

Que la sección **Marcas que ya confiaron en nosotros** muestre los logos de los
clientes reales, a color, en círculos, moviéndose en una pasarela continua; y
que sumar una marca nueva sea agregar un archivo y correr un comando.

---

## 3. Scope

- Reemplazar la imagen única por una pasarela (ticker) horizontal infinita.
- Cada logo en **formato circular**.
- **35 marcas**, todas con su logo original en
  `~/Documents/Mariano/Marcas que confiaron`. Mariano pidió explícitamente no
  perder ninguna de la tira vieja: las 11 se recortaron del collage y después él
  fue consiguiendo los 11 originales a color.
- Un proceso repetible para preparar los archivos.
- La sección se ve igual en las dos páginas que la usan: Home y `/negocio`.

---

## 4. Fuera de scope

- Enlazar cada logo al Instagram o sitio de la marca.
- Cambiar el texto, el badge o la posición de la sección.
- Borrar `/images/marcas-clientes.webp`. Ya no es fuente de ningún logo y **se
  puede borrar**, pero sacarlo es una decisión aparte de esta spec: queda
  anotado, no ejecutado.

---

## 5. Usuarios afectados

| Usuario | Qué cambia |
|---|---|
| Visitante de `/negocio` | Ve 35 logos en movimiento (24 a color) en vez de 11 en blanco, estáticos. Es el público que está evaluando encargar calcos de su logo: la prueba social es el argumento principal de esa página. |
| Visitante del Home | Lo mismo, más abajo en la página. |
| Mariano | Sumar una marca pasa de "rehacer la imagen en un editor" a "poner el archivo en la carpeta y correr un comando". |
| Usuario con `prefers-reduced-motion` | No ve movimiento; puede recorrer la tira a mano. |

---

## 6. User stories

- **Como dueño de un bar que llegó a `/negocio` desde un anuncio**, quiero ver
  qué marcas ya imprimieron acá, para decidir si son confiables antes de subir
  mi logo.
- **Como visitante en celular**, quiero que la tira se lea sin tener que hacer
  nada, porque estoy con una mano y no voy a scrollear de costado.
- **Como Mariano**, quiero sumar el logo del cliente que cerró ayer sin abrir un
  editor de imágenes.
- **Como usuario que marea con el movimiento**, quiero que la tira se quede
  quieta y poder recorrerla yo.

---

## 7. Requisitos funcionales

| # | Requisito |
|---|---|
| RF-1 | La sección muestra las 35 marcas, cada una en un círculo. |
| RF-2 | Los círculos se desplazan horizontalmente en loop continuo, sin salto visible al reiniciar. |
| RF-3 | La tira ocupa el ancho completo de la pantalla y se desvanece en los dos extremos. |
| RF-4 | Cada logo conserva su color y su fondo original. |
| RF-5 | Ningún logo queda cortado por la máscara circular: el nombre de la marca se lee entero. |
| RF-6 | Al pasar el mouse por la tira, el movimiento se detiene. |
| RF-7 | Con `prefers-reduced-motion: reduce` no hay animación y la tira se puede recorrer con scroll horizontal. |
| RF-8 | Agregar una marca = agregar una fila a la tabla del script y correr un comando. |

---

## 8. Requisitos no funcionales

| # | Requisito |
|---|---|
| RNF-1 | **Mobile-first**: la tira funciona a 375 px y **no genera scroll horizontal en la página**. |
| RNF-2 | **Performance**: la sección está muy por debajo del fold en las dos páginas. No puede competir por ancho de banda durante el LCP. El peso total de los logos tiene que quedar en el orden del archivo único que reemplaza (61 KB), no en un orden de magnitud más. |
| RNF-3 | **Accesibilidad**: cada logo tiene texto alternativo con el nombre real de la marca. La duplicación técnica de la lista no puede leerse dos veces. |
| RNF-4 | **Performance de animación**: la animación es de `transform`, no de `left`/`margin`. |
| RNF-5 | El texto alternativo es el nombre real del cliente — es lo único que lee un lector de pantalla, y es prueba social, no decoración. |

---

## 9. Reglas de negocio

- **RN-1.** Solo van marcas que **realmente** compraron. La sección se llama
  "Marcas que ya confiaron en nosotros": inventar un logo es publicidad falsa.
  Mismo criterio que ya rige `data/testimonials.js`.
- **RN-2.** El logo se muestra como lo entregó la marca. No se recolorea ni se
  pasa a monocromo.

---

## 10. Edge cases

| Caso | Qué tiene que pasar |
|---|---|
| Un logo es un wordmark ancho ("Shippear.", "MANHATTAN") | Entra entero en el círculo. Es el caso que rompe un recorte cuadrado ingenuo. |
| El logo YA es un círculo (Sacro, Mentha, Trapitos, LW) | Se alinea con la máscara. No puede quedar un círculo dentro de otro círculo. |
| El logo es una foto sin fondo plano (Monchito Merlo) | Entra completo; el nombre impreso no se corta. |
| El logo trae la URL de la marca impresa abajo (Wens) | No se muestra cortada a la mitad. |
| El archivo viene con transparencia (Sacro) o es un PDF con extensión `.png` (Strive) | Se procesa igual que el resto. |
| El fondo del logo es casi negro (12 de 35) | Se sigue distinguiendo el círculo contra el fondo oscuro de la página. |
| Dos marcas del mismo color (Poly y Eunoia, los dos verdes) | No quedan pegadas: juntas se leen como una sola mancha. |
| La marca no tiene archivo propio: sólo existe adentro de una imagen más grande | Se recorta de ahí y entra al mismo pipeline que las demás. |
| Llega el logo original de una marca que estaba recortada | Se cambia `crop` por `archivo` en la tabla y se corre el script. Sin tocar código. |
| El logo nuevo cambia de claro a oscuro (o al revés) | Se reacomoda el orden para no dejar dos claros o dos oscuros pegados. |
| Falla la carga de una imagen | El resto de la tira sigue funcionando. |

---

## 11. Analytics necesarios

**Ninguno.** La sección no es un paso del funnel: no tiene CTA, no es clickeable
y no cambia el camino de compra. Sumar eventos de visibilidad acá sería ruido en
GA4 sin una pregunta de negocio que responder.

Si más adelante los logos se vuelven clickeables (ver *Preguntas abiertas*), ahí
sí hay que declarar el evento de click y pasarlo por `lib/analytics.js`.

---

## 12. Preguntas abiertas

1. ~~**Las 11 marcas de la tira vieja.**~~ **RESUELTO el 15/08/2026.** Se le
   preguntó a Mariano qué hacer con las 11 que sólo existían dentro del collage
   y eligió **recortarlas y sumarlas**. Están las 35.
2. ~~**`Balance Fit` se lee flojo.**~~ **RESUELTO el 15/08/2026.** Mariano fue
   consiguiendo los logos originales a color de las 11: primero 10, después el
   de Elles Rosario. **Ninguna marca sale ya del collage** y el soporte de
   `crop` quedó sin uso (se deja porque el caso vuelve).
3. **`/images/marcas-clientes.webp` quedó huérfano.** Ya no lo lee nadie. Se
   puede borrar —el historial de git lo conserva— pero se dejó porque sacarlo
   no era parte del pedido.
4. **¿Los logos deberían linkear al Instagram de cada marca?** Sumaría prueba
   social verificable, pero también saca gente del sitio en una página de
   conversión. No se hizo.
5. **Dos marcas quedaron representadas por su isotipo, sin el nombre**:
   `HoopShoes` (el aro) y `Elles Rosario` (la "E"), porque así llegaron los
   archivos. Se reconocen menos que el resto a 96 px. Si existe una versión con
   el wordmark, conviene esa.
