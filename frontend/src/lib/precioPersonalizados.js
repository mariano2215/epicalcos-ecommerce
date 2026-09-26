/**
 * Precio de una tanda del configurador de /personalizados. Función PURA (sin React).
 *
 * Una "tanda" son los diseños que el cliente tiene cargados en el configurador,
 * todos del mismo tamaño: `unidades` = diseños × copias de cada uno.
 *
 * El precio de lista es el del catálogo por tamaño (rama `custom` de
 * netlify/functions/lib/pricing.js, que re-precia con el mismo SIZE_PRICES).
 *
 * CON EL 3x2 VIVO se calcula con la MISMA regla y el MISMO redondeo que el
 * servidor: `keepFraction` de `promo3x2()` sobre la bolsa de la tanda y el
 * unitario redondeado POR UNIDAD (`round(base × keep)`), que es lo que viaja en
 * la línea y lo que el servidor compara. Si acá se redondeara el total en vez
 * del unitario, la pantalla y el cobro podrían diferir en unos pesos — y un
 * "ahorrás" que no coincide con el checkout es una promesa rota. La paridad la
 * verifica `precioPersonalizados.test.js` contra `validateAndPriceOrder`.
 *
 * ⚠️ Es la tanda SOLA. En el carrito el 3x2 corre sobre TODAS las calcos
 * (catálogo + personalizados), así que con otras calcos en el carrito el
 * descuento real puede ser igual o mayor, nunca menor. El copy lo dice.
 *
 * No hay otro beneficio por cantidad para personalizados: el 10 % por
 * transferencia cuenta solo calcos de catálogo, y los cupones no se publican.
 *
 * Vinilo Holográfico NO pasa por `cotizarTanda()`: no tiene precio por unidad,
 * va en packs de 100 (enmienda 26/9/2026) — ver `cotizarPackHolografico()`.
 */
import {
  getTamano,
  tamanoPermitido,
  RECARGO_HOLOGRAFICO,
  MATERIAL_HOLOGRAFICO_ID,
  PACK_HOLOGRAFICO
} from '../config/personalizados.js';
import { PROMO_3X2, NEGOCIO, promo3x2, round } from '../config/pricing.js';

const unidadesValidas = (n) => Math.max(1, Math.floor(Number(n) || 1));
const disenosValidos = (n) => Math.max(1, Math.floor(Number(n) || 1));

/**
 * Precio por unidad de calcos personalizados (Vinilo Blanco / DTF UV).
 *
 * `recargo` sigue en la forma (siempre 0) porque la comparten los componentes
 * con `cotizarPackHolografico()`. Hasta el 26/9/2026 acá se sumaba el recargo
 * holográfico POR DISEÑO a cualquier cantidad; esa regla ya no existe.
 *
 * @param {{ tamano?: string|null, unidades?: number, promoActiva?: boolean }} args
 * @returns {{ configuracionCompleta: boolean, unidades: number, unitarioLista: number,
 *   unitario: number, totalLista: number, total: number, ahorro: number,
 *   ahorroPct: number, gratis: number, faltanParaGratis: number, beneficio: '3x2'|null,
 *   recargo: number }}
 */
export function cotizarTanda({ tamano, unidades = 1, promoActiva = false } = {}) {
  const n = unidadesValidas(unidades);
  const t = getTamano(tamano);
  const vacia = {
    configuracionCompleta: false,
    unidades: n,
    unitarioLista: 0,
    unitario: 0,
    totalLista: 0,
    total: 0,
    ahorro: 0,
    ahorroPct: 0,
    gratis: 0,
    faltanParaGratis: 0,
    beneficio: null,
    recargo: 0
  };
  if (!t) return vacia;

  const base = t.precio;
  const totalLista = base * n;
  const lista = {
    ...vacia,
    configuracionCompleta: true,
    unitarioLista: base,
    unitario: base,
    totalLista,
    total: totalLista
  };
  if (!promoActiva) return lista;

  const { freeUnits, keepFraction } = promo3x2({
    unitBasePrices: Array(n).fill(base),
    buy: PROMO_3X2.buy,
    pay: PROMO_3X2.pay
  });
  const unitario = round(base * keepFraction);
  const total = unitario * n;
  const ahorro = totalLista - total;
  return {
    ...lista,
    unitario,
    total,
    ahorro,
    ahorroPct: ahorro > 0 ? Math.round((ahorro / totalLista) * 100) : 0,
    gratis: freeUnits,
    // Cuántas faltan para que una salga gratis (0 si la tanda ya es múltiplo).
    faltanParaGratis: (PROMO_3X2.buy - (n % PROMO_3X2.buy)) % PROMO_3X2.buy,
    beneficio: '3x2'
  };
}

/**
 * Pack holográfico (enmienda 26/9/2026, spec 023 RF-MAT11…15): 100 calcos en
 * 4 o 6 cm, repartidas entre TODOS los diseños de la tanda, a
 * `PACK_HOLOGRAFICO.precio` + `RECARGO_HOLOGRAFICO.precio` ($39.999 + $15.000).
 * No depende de las copias, ni de la cantidad de diseños, ni del 3x2: el pack
 * es una línea `negocio:` (no `discountable` en el servidor) y el recargo una
 * `fixed:` — ninguna de las dos entra en la bolsa del N x M.
 *
 * Sin "ahorrás" (ahorro 0): no hay un precio de lista holográfico contra el
 * cual comparar, y un % armado contra el vinilo blanco sería una promesa que
 * nadie acordó.
 *
 * En 9 cm (o sin tamaño) la configuración queda incompleta: no hay precio.
 *
 * @returns la misma forma que `cotizarTanda()` + `{ esNegocio: false, esHolografico: true }`
 */
export function cotizarPackHolografico({ tamano } = {}) {
  const recargo = RECARGO_HOLOGRAFICO.precio;
  const t = tamanoPermitido(tamano, MATERIAL_HOLOGRAFICO_ID) ? getTamano(tamano) : null;
  const total = t ? PACK_HOLOGRAFICO.precio + recargo : 0;
  return {
    configuracionCompleta: Boolean(t),
    unidades: PACK_HOLOGRAFICO.qty,
    unitarioLista: t ? t.precio : 0,
    unitario: t ? round(total / PACK_HOLOGRAFICO.qty) : 0,
    totalLista: total,
    total,
    ahorro: 0,
    ahorroPct: 0,
    gratis: 0,
    faltanParaGratis: 0,
    beneficio: t ? 'holografico' : null,
    recargo: t ? recargo : 0,
    esNegocio: false,
    esHolografico: true,
    packsNegocio: 0,
    sueltas: 0,
    unitarioSueltas: 0
  };
}

/**
 * ¿Le conviene la Promo Negocio a UN diseño con estas copias? (spec 023, P-9)
 *
 * Cuando lo que suman las copias alcanza el precio de Negocio, la promo le da
 * `NEGOCIO.qty` calcos por esa misma plata o menos. Mariano, 14/9/2026: la promo
 * se puede tomar aunque el cliente quiera menos de 100 — no baja el ticket.
 *
 * El umbral NO se escribe en ningún lado: sale de NEGOCIO y del 3x2. Con los
 * precios de hoy, 38 copias en 6 cm, 31 en 9 cm y 50 en 4 cm (lo fija el test).
 */
export function convieneNegocio({ tamano, copias, promoActiva = false }) {
  const c = cotizarTanda({ tamano, unidades: copias, promoActiva });
  return c.configuracionCompleta && c.total >= NEGOCIO.price;
}

/**
 * Cómo se cobran las copias de UN diseño en `NEGOCIO.size`: cuántos packs de
 * la Promo Negocio y cuántas calcos sueltas (fix 26/9/2026).
 *
 * POR QUÉ EXISTE: hasta acá, un diseño en 6 cm por encima del umbral se
 * cobraba SIEMPRE como UN pack de Negocio. Con 200 copias el cliente pagaba
 * $39.999 y se llevaba 100: el configurador le mostraba "100 calcos" y la
 * mitad del pedido se perdía sin avisar.
 *
 * Es la misma regla de RF-MAT8, aplicada de a 100: cada 100 copias completas
 * son un pack, y el resto se cobra como siempre (3x2 si está vivo) salvo que
 * ya cueste lo mismo o más que otro pack — ahí es otro pack (Mariano,
 * 14/9/2026: "la promo se puede tomar aunque el cliente quiera menos de 100").
 * Nunca se cobra más que tomar los packs.
 *
 * Con 99 copias o menos da exactamente lo de antes: 0 packs (debajo del
 * umbral) o 1 pack.
 *
 * @returns {{ packs: number, sueltas: number }}
 */
export function repartoNegocio({ tamano, copias, promoActiva = false }) {
  const n = unidadesValidas(copias);
  if (tamano !== NEGOCIO.size) return { packs: 0, sueltas: n };
  let packs = Math.floor(n / NEGOCIO.qty);
  let sueltas = n - packs * NEGOCIO.qty;
  if (sueltas > 0 && convieneNegocio({ tamano, copias: sueltas, promoActiva })) {
    packs += 1;
    sueltas = 0;
  }
  return { packs, sueltas };
}

/**
 * Precio EFECTIVO de la tanda, para mostrar y para agregar al carrito
 * (enmienda 22/9/2026, "topear el precio en $39.999"): igual a `cotizarTanda()`,
 * salvo que UN diseño en `NEGOCIO.size` cuyas copias ya cuestan lo mismo o más
 * que la Promo Negocio (`convieneNegocio`) se muestra —y se cobra, ver
 * `useAgregarAlCarrito()` en `BotonCta.jsx`, que arma las líneas reales con esta
 * misma regla— al precio de Negocio, nunca al del 3x2 puro.
 *
 * Con más de un diseño, o con un tamaño que no sea el de Negocio, es IDÉNTICO
 * a `cotizarTanda()`: la promo es específicamente "100 de UN diseño en 6 cm",
 * así que no hay nada para topear — sigue siendo, como hasta ahora, un link a
 * /negocio (`conviene`/`NEGOCIO_COPY` en los componentes que llaman a esto).
 *
 * Más de 100 copias: tantos packs como diga `repartoNegocio()`, más las
 * sueltas que sobren al precio de `cotizarTanda()`. `packsNegocio` y `sueltas`
 * viajan en el resultado porque `useAgregarAlCarrito()` arma las líneas reales
 * con esos mismos números.
 *
 * Vinilo Holográfico (enmienda 26/9/2026): SIEMPRE el pack de 100 de
 * `cotizarPackHolografico()`, sin importar copias ni diseños. Va primero: si
 * cayera en la cuenta de abajo, un holográfico se cotizaría por unidad.
 *
 * @returns igual que `cotizarTanda()` + `{ esNegocio: boolean, esHolografico: boolean,
 *   packsNegocio: number, sueltas: number, unitarioSueltas: number }`
 */
export function precioEfectivoTanda({ tamano, copias = 1, disenos = 1, promoActiva = false, material = null } = {}) {
  if (material === MATERIAL_HOLOGRAFICO_ID) return cotizarPackHolografico({ tamano });
  const n = disenosValidos(disenos);
  const base = cotizarTanda({
    tamano,
    unidades: n * unidadesValidas(copias),
    promoActiva
  });
  const { packs, sueltas } = n === 1 ? repartoNegocio({ tamano, copias, promoActiva }) : { packs: 0, sueltas: 0 };
  if (packs === 0) {
    return { ...base, esNegocio: false, esHolografico: false, packsNegocio: 0, sueltas: 0, unitarioSueltas: 0 };
  }
  const resto = sueltas > 0 ? cotizarTanda({ tamano, unidades: sueltas, promoActiva }) : null;
  const total = packs * NEGOCIO.price + (resto ? resto.total : 0);
  // Lo que en verdad se llevan: 100 por pack (Mariano, 14/9/2026: la promo da
  // 100 aunque pidas menos) + las sueltas. La lista de referencia del
  // "ahorrás" es la de ESAS unidades, no la de las copias que el cliente tipeó
  // — si no, pedir menos "ahorraba" más sin ninguna razón real.
  const unidades = packs * NEGOCIO.qty + sueltas;
  const totalListaNegocio = base.unitarioLista * unidades;
  const ahorro = totalListaNegocio - total;
  return {
    ...base,
    unidades,
    unitario: round(total / unidades),
    totalLista: totalListaNegocio,
    total,
    ahorro,
    ahorroPct: ahorro > 0 ? Math.round((ahorro / totalListaNegocio) * 100) : 0,
    gratis: 0,
    faltanParaGratis: 0,
    beneficio: 'negocio',
    esNegocio: true,
    esHolografico: false,
    packsNegocio: packs,
    sueltas,
    unitarioSueltas: resto ? resto.unitario : 0
  };
}
