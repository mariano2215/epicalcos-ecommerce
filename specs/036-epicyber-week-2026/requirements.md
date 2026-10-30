# Requirements — EPICYBER WEEK 2026

| | |
|---|---|
| **Spec** | `036-epicyber-week-2026` |
| **Estado** | `IN PROGRESS` — implementada en rama sin publicar, con los precios **sin aprobar** |
| **Fecha** | 30/10/2026 |
| **Autor** | Mariano (pedido) · Claude (spec) |

> Mismo criterio que la spec 034: el pedido exige implementar y `CLAUDE.md` exige
> la frase "Implementá la spec XXX". Se resuelve con **rama aparte, sin push y
> con la campaña apagada**. Nada de esto llega a producción sin que Mariano
> apruebe los precios y mergee.

---

## 1. Problema

La campaña va del lunes 2 al domingo 8 de noviembre de 2026 y hoy el sitio no
puede venderla:

- **Los packs chicos no tienen precio propio ni puerta de entrada.** x10/x20/x50
  son calcos sueltas a precio de lista y su sección está despublicada desde el
  26/8/2026. Un pack de 10 cuesta $16.000 en 4 cm y $21.000 en 6 cm.
- **No hay forma de vender 15, 25, 30 ni 40 calcos a un precio cerrado**, ni
  200, 300 y 500 a precio de campaña.
- **El precio de referencia del brief ($479 por calco) no existe en el sitio.**
  La lista real es $1.600 / $2.100 / $2.650 por calco; lo más parecido son 100
  calcos a $52.999 ($530 c/u).

## 2. Objetivo

Que el 2/11 a las 00:00 la campaña se prenda sola, que los precios aprobados se
cobren en el checkout de siempre validados por el servidor, y que el 8/11 a las
23:59 todo vuelva a la normalidad sin tocar nada.

## 3. Scope

**Adentro:** barra, banner, packs chicos, packs mayoristas, contador, upsell,
vista previa, activación por fecha, tracking con `epicyber_2026`.

**Afuera:** rediseño, cambios de envío, de mínimo de compra o de medios de pago;
panel administrativo; productos nuevos; publicar `/armar-pack`.

**Pendiente de costos (ver §9):** holográficos, DTF UV, Polaroid y tatuajes. Se
listan en la vista previa y no se publican ni se cobran.

## 4. Usuarios

- Comprador por menor que llega desde un anuncio de Instagram, en celular.
- Emprendedor o negocio que busca 100 a 500 calcos para packaging, branding o
  merchandising.
- Mariano, que revisa y aprueba antes de publicar.

## 5. User stories

- Como comprador quiero elegir 10, 20, 30 o 50 calcos y ver el precio final sin
  hacer cuentas.
- Como comprador quiero saber cuánto más pago por llevar el pack siguiente, y
  poder quedarme con el mío.
- Como negocio quiero pedir 100 a 500 calcos con mis diseños al precio de campaña.
- Como Mariano quiero aprobar precio por precio y ver todo antes de publicar.

## 6. Requisitos funcionales

### Campaña

- **RF-1** Ventana: 2/11/2026 00:00:00 a 8/11/2026 23:59:59, hora Argentina.
- **RF-2** Se prende y se apaga sola por fecha, sin deploy ni cron.
- **RF-3** Interruptor general y aprobación **por pack**. Un pack sin aprobar no
  se muestra ni se cobra a precio de campaña, aunque la campaña esté prendida.
- **RF-4** Sin ningún pack aprobado no hay campaña: ni barra ni banner.
- **RF-5** Vista previa por URL para revisar todo con la campaña apagada, con un
  aviso permanente. En vista previa los packs de campaña no se pueden pagar.
- **RF-6** Al vencer, los precios y mensajes vuelven solos, también en una
  pestaña abierta.

### Packs chicos

- **RF-7** Packs de 10, 15, 20, 25, 30, 40 y 50 calcos en 4 y 6 cm.
- **RF-8** En el Home se priorizan 10, 20, 30 y 50; la página de ofertas muestra
  todos.
- **RF-9** De 1 a 9 calcos nada cambia: precio de lista y sin mínimo.
- **RF-10** El pack se arma con diseños del catálogo y/o propios, como en el
  armador de siempre. Hay una opción para completar al azar: tocar 30 diseños en
  un celular es fricción.

### Mayoristas

- **RF-11** Packs de 100, 200, 300 y 500 en 4 y 6 cm, destacando 100 y 200, con
  el mensaje "Cuantos más calcos pedís, menos pagás por unidad".
- **RF-12** Con un pack mayorista aprobado, ninguna pantalla de compra de
  mayorista vende más caro lo mismo. El 9 cm sigue con su pack normal.
- **RF-13** `/negocio` y `/personalizados` avisan la oferta vigente.

### Upsell

- **RF-14** El selector de cantidades y el carrito muestran la diferencia real en
  pesos con el pack siguiente.
- **RF-15** Sin ventanas emergentes: es un texto con un link y la persona puede
  seguir con su cantidad sin hacer nada.
- **RF-16** Quien tiene calcos sueltas en el carrito ve cuánto le sale el pack,
  y al pasarse conserva los diseños que ya eligió.

### Carrito y checkout

- **RF-17** El precio lo decide el servidor por el id de la línea y la fecha.
- **RF-18** Una línea de campaña fuera de ventana vale el precio habitual. No se
  traba el checkout y no se pierden los diseños del carrito guardado.
- **RF-19** El carrito muestra el precio habitual tachado y el de campaña.
- **RF-20** No se acumula con cupones ni promos N x M. El 10 % por transferencia
  sí corre, igual que en todo producto.
- **RF-21** El envío sigue las reglas de siempre. Ningún pack lo regala.

### Honestidad comercial

- **RF-22** El tachado y el % se comparan contra lo que esa cantidad cuesta hoy:
  lista × cantidad abajo de 100; escala aprobada (spec 032) desde 100.
- **RF-23** Si un pack no es más barato que su habitual, no muestra tachado ni %,
  y el deploy se frena.
- **RF-24** El contador usa la fecha real de fin.
- **RF-25** Vigencia, tamaños y condiciones están escritos junto a la oferta.
- **RF-26** No se publican unidades de regalo ni "segundo pack al 50 %".

## 7. Requisitos no funcionales

- **Mobile:** diseñado para 375 px. Los cuatro packs prioritarios entran en dos
  filas, con targets de 44 px.
- **Performance:** el chunk principal sube 3,3 kB gzip (de 100,9 a 104,3), incluso
  con la campaña apagada. Las secciones y la ruta se cargan aparte.
- **Reversible:** apagar es un cambio de una línea de cada lado del espejo.
- **Seguridad:** los costos no viajan al navegador; viven solo en los tests.

## 8. Reglas de negocio

### Costo

`Costo = $5.000 + $119 × cantidad`. Solo para calcos. **Supuesto a validar:** el
sistema no imputa ningún costo; acá el fijo se cuenta **una vez por pedido** y el
variable igual en 4 y 6 cm, aunque el 6 cm tiene 2,25 veces la superficie.

### Packs chicos

| Pack | Candidato | c/u | Lista 4 cm | Lista 6 cm | Off real | Costo | Margen | % | Con transf. |
|---|---|---|---|---|---|---|---|---|---|
| x10 | $9.990 | $999 | $16.000 | $21.000 | 38 a 52 % | $6.190 | $3.800 | 38,0 | $2.801 |
| x15 | $10.990 | $733 | $24.000 | $31.500 | 54 a 65 % | $6.785 | $4.205 | 38,3 | $3.106 |
| x20 | $11.990 | $600 | $32.000 | $42.000 | 63 a 71 % | $7.380 | $4.610 | 38,4 | $3.411 |
| x25 | $12.990 | $520 | $40.000 | $52.500 | 68 a 75 % | $7.975 | $5.015 | 38,6 | $3.716 |
| x30 | $13.990 | $466 | $48.000 | $63.000 | 71 a 78 % | $8.570 | $5.420 | 38,7 | $4.021 |
| x40 | $17.990 | $450 | $64.000 | $84.000 | 72 a 79 % | $9.760 | $8.230 | 45,7 | $6.431 |
| x50 | $20.990 | $420 | $80.000 | $105.000 | 74 a 80 % | $10.950 | $10.040 | 47,8 | $7.941 |

**Ninguno vende a pérdida.** Riesgo real: dilución de margen. Contra la lista de
4 cm, un x20 necesita 5,3 pedidos de campaña para igualar lo que deja uno a lista,
y un x30, 7,3. El margen tampoco cubre mucho de Meta: es el CPA máximo por pedido,
antes de comisión de Mercado Pago, impuestos y packaging.

**Ajuste propuesto (opción B):** deja el gancho de $9.990 y sube el medio de la
escalera, donde hoy cada 5 calcos más agregan solo $405 de margen.

| Pack | Candidato | Opción B | c/u | Margen B | % | Con transf. |
|---|---|---|---|---|---|---|
| x10 | $9.990 | $9.990 | $999 | $3.800 | 38,0 | $2.801 |
| x15 | $10.990 | $11.990 | $799 | $5.205 | 43,4 | $4.006 |
| x20 | $11.990 | $12.990 | $650 | $5.610 | 43,2 | $4.311 |
| x25 | $12.990 | $14.990 | $600 | $7.015 | 46,8 | $5.516 |
| x30 | $13.990 | $15.990 | $533 | $7.420 | 46,4 | $5.821 |
| x40 | $17.990 | $18.990 | $475 | $9.230 | 48,6 | $7.331 |
| x50 | $20.990 | $21.990 | $440 | $11.040 | 50,2 | $8.841 |

### Mayoristas

| Pack | Candidato | c/u | Habitual | Off real | Costo | Margen | % | Con transf. |
|---|---|---|---|---|---|---|---|---|
| x100 | $39.900 | $399 | $52.999 | 25 % | $16.900 | $23.000 | 57,6 | $19.010 |
| x200 | $74.900 | $375 | $105.998 | 29 % | $28.800 | $46.100 | 61,5 | $38.610 |
| x300 | $104.900 | $350 | $142.799 | 27 % | $40.700 | $64.200 | 61,2 | $53.710 |
| x500 | $164.900 | $330 | $211.999 | 22 % | $64.500 | $100.400 | 60,9 | $83.910 |

El x200 cruza el umbral nacional y viaja gratis: resignar $8.500 deja $37.600
de margen. El x100 viaja gratis solo en Rosario.

### Alternativas evaluadas

| Alternativa | Resultado | Decisión |
|---|---|---|
| Descuento por sumar unidades | Es la escalera misma | **Sí** |
| Beneficio de 20 a 30 | +$2.000 por 10 calcos más | **Sí**, como upsell |
| Beneficio de 30 a 50 | +$7.000 por 20 calcos más | **Sí**, como upsell |
| Segundo pack al 50 % | 2 x30 = $20.985 por 60 calcos; un x50 = $20.990 por 50. Rompe la escalera | **No** |
| 200 + 30 de regalo | Sumado al $74.900 son $326 c/u (acumula). Sin descuento, $105.998 por 230: más margen y mucha menos oferta | **No**: gana el descuento directo |
| Packs predeterminados | Requieren curaduría; "completar al azar" resuelve la misma fricción | **No** por ahora |

### Hallazgo: 1 a 3 calcos

Con esta fórmula, un pedido de 1 calco en 4 cm deja **−$3.519** a precio de
lista, y la fórmula se cubre desde 4 calcos en 4 cm y desde 3 en 6 cm. El sitio no
tiene ningún "importe mínimo de elaboración": es sin mínimo desde la spec 023. No
se toca (RF-9); se anota para decidir aparte.

## 9. Pendientes de aprobación

| Promo | Estado | Qué falta |
|---|---|---|
| Packs chicos | Listos para activar | Elegir candidatos u opción B |
| Packs mayoristas | Listos para activar | Aprobar |
| Calcos holográficos, hasta 20 % | Sin precio | Costo del material |
| DTF UV, hasta 15 % | Sin precio | Costo del material |
| Polaroid 3×2 | Sin precio | Costo por pack y cruce con su descuento por volumen |
| Tatuajes | Sin precio | Costo por hoja y definir la promo |

## 10. Edge cases

- Carrito guardado con una línea de campaña después del 8/11 → vale el habitual.
- Pestaña abierta a las 23:59 → el precio cambia sin recargar.
- Línea adulterada (9 cm, cantidad fuera de la tabla, o precio de campaña fuera
  de ventana) → el servidor la rechaza.
- Cupón EPICA10 con un pack en el carrito → no toca el pack.
- Cambiar de pack con el armador a medias → conserva los diseños; si sobran, lo
  avisa.
- Con el pack x100 sin aprobar → sigue la promo de $52.999 tal como está.

## 11. Analytics

Todo con `promotion_id: epicyber_2026`, solo por el módulo de analytics.

| Evento | Cuándo | Qué mide |
|---|---|---|
| `view_promotion` | Se ven las ofertas | Visualizaciones |
| `select_promotion` | Elige o cambia de pack | Selección |
| `add_to_cart` | Pack al carrito | Con pack, unidades y descuento |
| `begin_checkout` | Inicio de checkout | Ídem |
| `purchase` | Compra | Valor, unidades, tipo de pack y descuento |

No se reinstala nada y no se duplican eventos: los de ecommerce son los de
siempre, con campos nuevos en cada ítem.
