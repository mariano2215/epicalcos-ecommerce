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
 */
import { getTamano, RECARGO_HOLOGRAFICO, MATERIAL_HOLOGRAFICO_ID } from '../config/personalizados.js';
import { PROMO_3X2, NEGOCIO, promo3x2, round } from '../config/pricing.js';

const unidadesValidas = (n) => Math.max(1, Math.floor(Number(n) || 1));
const disenosValidos = (n) => Math.max(1, Math.floor(Number(n) || 1));

/**
 * @param {{ tamano?: string|null, unidades?: number, promoActiva?: boolean,
 *   material?: string|null, disenos?: number }} args
 * @returns {{ configuracionCompleta: boolean, unidades: number, unitarioLista: number,
 *   unitario: number, totalLista: number, total: number, ahorro: number,
 *   ahorroPct: number, gratis: number, faltanParaGratis: number, beneficio: '3x2'|null,
 *   recargo: number }}
 */
export function cotizarTanda({ tamano, unidades = 1, promoActiva = false, material = null, disenos = 1 } = {}) {
  const n = unidadesValidas(unidades);
  const t = getTamano(tamano);
  // Recargo (enmienda 22/9/2026, RF-MAT3): FIJO POR DISEÑO, no por copia — se
  // suma una vez por cada diseño de la tanda, no se multiplica por `unidades`.
  // Ver el comentario de `construirLineas()` sobre por qué es una línea de
  // carrito aparte y no un ajuste al `unitario` de acá.
  const recargo = material === MATERIAL_HOLOGRAFICO_ID ? RECARGO_HOLOGRAFICO.precio * disenosValidos(disenos) : 0;
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
    total: totalLista + recargo,
    recargo
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
    total: total + recargo,
    ahorro,
    ahorroPct: ahorro > 0 ? Math.round((ahorro / totalLista) * 100) : 0,
    gratis: freeUnits,
    // Cuántas faltan para que una salga gratis (0 si la tanda ya es múltiplo).
    faltanParaGratis: (PROMO_3X2.buy - (n % PROMO_3X2.buy)) % PROMO_3X2.buy,
    beneficio: '3x2'
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
 * Precio EFECTIVO de la tanda, para mostrar y para agregar al carrito
 * (enmienda 22/9/2026, "topear el precio en $39.999"): igual a `cotizarTanda()`,
 * salvo que UN diseño en `NEGOCIO.size` cuyas copias ya cuestan lo mismo o más
 * que la Promo Negocio (`convieneNegocio`) se muestra —y se cobra, ver
 * `useAgregarAlCarrito()` en `BotonCta.jsx`, que arma las líneas reales con esta
 * misma regla— al precio de Negocio + el recargo del material si corresponde
 * (Mariano, 22/9/2026: el holográfico se suma arriba de Negocio, no lo
 * reemplaza), nunca al del 3x2 puro.
 *
 * Con más de un diseño, o con un tamaño que no sea el de Negocio, es IDÉNTICO
 * a `cotizarTanda()`: la promo es específicamente "100 de UN diseño en 6 cm",
 * así que no hay nada para topear — sigue siendo, como hasta ahora, un link a
 * /negocio (`conviene`/`NEGOCIO_COPY` en los componentes que llaman a esto).
 *
 * @returns igual que `cotizarTanda()` + `{ esNegocio: boolean }`
 */
export function precioEfectivoTanda({ tamano, copias = 1, disenos = 1, promoActiva = false, material = null } = {}) {
  const n = disenosValidos(disenos);
  const base = cotizarTanda({
    tamano,
    unidades: n * unidadesValidas(copias),
    promoActiva,
    material,
    disenos: n
  });
  if (n !== 1 || tamano !== NEGOCIO.size || !convieneNegocio({ tamano, copias, promoActiva })) {
    return { ...base, esNegocio: false };
  }
  const recargo = material === MATERIAL_HOLOGRAFICO_ID ? RECARGO_HOLOGRAFICO.precio : 0;
  const total = NEGOCIO.price + recargo;
  // Lista de referencia para el "ahorrás": la de las NEGOCIO.qty unidades que en
  // verdad se llevan (Mariano, 14/9/2026: la promo da 100 aunque pidas menos),
  // no la de las copias que el cliente tipeó — si no, pedir menos "ahorraba" más
  // sin ninguna razón real.
  const totalListaNegocio = base.unitarioLista * NEGOCIO.qty;
  const ahorro = totalListaNegocio - total;
  return {
    ...base,
    unidades: NEGOCIO.qty,
    unitario: round(NEGOCIO.price / NEGOCIO.qty),
    totalLista: totalListaNegocio,
    total,
    recargo,
    ahorro,
    ahorroPct: ahorro > 0 ? Math.round((ahorro / totalListaNegocio) * 100) : 0,
    gratis: 0,
    faltanParaGratis: 0,
    beneficio: 'negocio',
    esNegocio: true
  };
}
