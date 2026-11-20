/**
 * Cotizador de pedidos por volumen (spec 031 Fase 2, spec 032 Fase 2, spec 034).
 * Funciones PURAS, sin React: las usan el cotizador de /negocio, el armador de
 * /mayorista y el Home B2B, y las prueba `cotizadorNegocio.test.js` contra el
 * `validateAndPriceOrder()` real del servidor.
 *
 * ⚠️ ESTO NO ES UN MOTOR DE PRECIOS. Todo monto sale de `precioVolumen()` de
 * config/pricing.js, que está espejado en netlify/functions/lib/pricing.js. Si
 * acá apareciera una cuenta propia, el sitio mostraría un precio y el checkout
 * rechazaría el pedido con `price_mismatch` (CLAUDE.md, regla 11).
 *
 * La escala existe en el servidor desde el 5/10/2026, pero hasta esta spec
 * ningún camino del sitio emitía una línea `volumen:`: nadie podía comprar
 * 250, 500 o 1.000 calcos al precio que Mariano aprobó.
 */
import {
  ESCALA_ESCALONES,
  ESCALA_MAX,
  TRANSFER_DISCOUNT,
  filaEscala,
  pctEscalon,
  precioVolumen,
  round
} from '../config/pricing.js';
import { TAMANOS, MATERIALES, getTamano, getMaterial } from '../config/personalizados.js';

/** Las cantidades que ofrece el cotizador: los escalones aprobados y "Más de 1.000" (N-8). */
export const CANTIDAD_MAS = 'mas';
export const CANTIDADES_COTIZADOR = [...ESCALA_ESCALONES, CANTIDAD_MAS];

/** Tamaños que se venden por mayor: los que tienen fila en la escala (sin 9 cm, spec 032 §9.4). */
export const TAMANOS_ESCALA = TAMANOS.filter((t) => filaEscala(t.id)).map((t) => t.id);

/** Materiales de la escala, en el orden de `MATERIALES` (vinilo blanco primero: es el recomendado). */
export const MATERIALES_ESCALA = MATERIALES.map((m) => m.id).filter((id) => filaEscala(TAMANOS_ESCALA[0], id));

/**
 * Tope de diseños distintos en un pedido: el de archivos de la subida. Más que
 * eso no se puede subir, y en la nota del pedido serían links imposibles de leer.
 */
export const MAX_DISENOS = 100;

/**
 * Tope de las indicaciones del cliente. Viajan en `shipping.comments`, que las
 * Netlify Functions recortan (MAX_COMMENTS): un texto largo se comería los
 * links de los diseños, que van después.
 */
export const MAX_INDICACIONES = 300;

/** Lo que cuesta pagando por transferencia una línea de `quantity 1` — mismo redondeo que el servidor. */
export const precioTransferencia = (total) => round(total * (1 - TRANSFER_DISCOUNT));

/**
 * Precio de un pedido del cotizador.
 *
 * @param {{ cantidad: number|'mas', tamano: string, material?: string }} pedido
 * @returns {{ estado: 'precio', total: number, cantidadLlevada: number, escalon: number,
 *             unitario: number, pct: number, totalTransferencia: number, unitarioTransferencia: number }
 *         | { estado: 'presupuesto', motivo: 'mas_de_1000' | 'sin_precio_online' }}
 */
export function cotizarPedidoNegocio({ cantidad, tamano, material = 'vinilo-blanco' }) {
  if (cantidad === CANTIDAD_MAS || Number(cantidad) > ESCALA_MAX) {
    return { estado: 'presupuesto', motivo: 'mas_de_1000' };
  }
  const p = precioVolumen({ tamano, material, cantidad: Number(cantidad) });
  if (!p) return { estado: 'presupuesto', motivo: 'sin_precio_online' };
  const totalTransferencia = precioTransferencia(p.total);
  return {
    estado: 'precio',
    ...p,
    totalTransferencia,
    unitarioTransferencia: Math.round(totalTransferencia / p.cantidadLlevada)
  };
}

/**
 * Las filas de la tabla "Mientras más cantidad, más barato te sale" para un
 * tamaño y material. `[]` si esa combinación no se vende por mayor.
 */
export function filasEscala({ tamano = TAMANOS_ESCALA[TAMANOS_ESCALA.length - 1], material = 'vinilo-blanco' } = {}) {
  const fila = filaEscala(tamano, material);
  if (!fila) return [];
  return ESCALA_ESCALONES.map((cantidad) => {
    const total = fila[cantidad];
    const totalTransferencia = precioTransferencia(total);
    return {
      cantidad,
      total,
      unitario: Math.round(total / cantidad),
      totalTransferencia,
      unitarioTransferencia: Math.round(totalTransferencia / cantidad),
      pct: pctEscalon(fila, cantidad)
    };
  });
}

/** CUIT opcional: vacío, o 11 dígitos con o sin guiones. */
export function cuitValido(cuit) {
  const s = String(cuit ?? '').trim();
  if (!s) return true;
  return /^[\d\s-]+$/.test(s) && s.replace(/\D/g, '').length === 11;
}

/**
 * La línea de carrito de un pedido por volumen. Entra por `addNegocio()` del
 * CartContext (precio fijo, fuera de cupones y N×M, con transferencia), así
 * que el CartContext no cambia (spec 032, D-3).
 *
 * Devuelve `null` si la cantidad no es una que el servidor acepte tal cual
 * (fuera de 100–1.000, 9 cm, o una cantidad que cuesta lo mismo que el escalón
 * siguiente: 240 se cobra como 250, y el servidor rechaza un id que diga 240).
 * Nunca se emite una línea que el checkout vaya a rechazar.
 *
 * ⚠️ Sin `meta.material`: en lib/resumenPedido.js una línea de Negocio con
 * `meta.material` es un pack del configurador, y la nota del pedido saldría
 * con "undefined" en el tamaño y el corte. El material va en `meta.escala`.
 *
 * ⚠️ `name` no lleva nombres de archivo ni la razón social: viaja a GA4 y a
 * Meta como `item_name`.
 */
export function lineaVolumen({
  tamano,
  material = 'vinilo-blanco',
  cantidad,
  disenos = 1,
  indicaciones = '',
  archivos = [],
  razonSocial = '',
  cuit = '',
  items = null,
  customCount = 0,
  origen = 'cotizador',
  imagen = null,
  ts = Date.now()
}) {
  const q = Number(cantidad);
  const p = precioVolumen({ tamano, material, cantidad: q });
  if (!p || p.cantidadLlevada !== q) return null;

  const tamanoLabel = getTamano(tamano)?.label || tamano;
  const materialLabel = getMaterial(material)?.label || material;
  const deMayorista = origen === 'mayorista';
  const nDisenos = Math.max(1, Math.min(MAX_DISENOS, Math.floor(Number(disenos) || 1)));

  return {
    id: `volumen:${tamano}:${material}:${q}:${ts}`,
    // El armador de /mayorista no elige material: el catálogo sale en el
    // vinilo de siempre, así que el nombre no lo nombra.
    name: deMayorista
      ? `Pack por mayor · ${q} calcos · ${tamanoLabel}`
      : `Calcos para negocio · ${q} u · ${tamanoLabel} · ${materialLabel}`,
    categoryLabel: deMayorista ? 'Pack Mayorista' : 'Negocio',
    image: imagen,
    size: tamano,
    basePrice: p.total,
    quantity: 1,
    meta: {
      qty: q,
      escala: { tamano, tamanoLabel, material, materialLabel: deMayorista ? null : materialLabel },
      disenos: deMayorista ? null : nDisenos,
      // Cómo repartir las calcos entre los diseños lo escribe el cliente si
      // quiere ("150 del logo y 100 del isotipo"). NO hay regla por defecto
      // publicada: "partes iguales" era la recomendación de la spec 031 (N-9)
      // y Mariano todavía no la confirmó, así que sin indicaciones se coordina
      // por WhatsApp, como cualquier detalle del diseño hoy.
      indicaciones: String(indicaciones || '').trim().slice(0, MAX_INDICACIONES) || null,
      archivos: archivos.length ? archivos : null,
      razonSocial: String(razonSocial || '').trim() || null,
      cuit: String(cuit || '').trim() || null,
      items: items && items.length ? items : null,
      customCount: customCount || 0,
      origen
    }
  };
}

/**
 * Texto con el que arranca el formulario de /contacto cuando el pedido no
 * tiene precio online (más de 1.000 calcos). Va la configuración entera: es
 * lo que Mariano necesita para contestar con un precio en el primer mensaje.
 * Sin datos personales: esos los completa el cliente en el formulario.
 */
export function consultaPresupuesto({ cantidad, tamano, material, disenos } = {}) {
  const renglones = ['Hola, quiero cotizar calcos para mi negocio.'];
  renglones.push(
    cantidad === CANTIDAD_MAS || !cantidad
      ? `Cantidad aproximada: más de ${ESCALA_MAX.toLocaleString('es-AR')} (¿cuántas?): `
      : `Cantidad: ${Number(cantidad).toLocaleString('es-AR')}`
  );
  if (getTamano(tamano)) renglones.push(`Tamaño: ${getTamano(tamano).label}`);
  if (getMaterial(material)) renglones.push(`Material: ${getMaterial(material).label}`);
  if (disenos) renglones.push(`Cantidad de diseños: ${disenos}`);
  renglones.push('Empresa / razón social: ');
  return renglones.join('\n');
}

/** Mensaje de WhatsApp con la configuración del cotizador (031 RF-C13). */
export function mensajeWhatsappCotizador({ cantidad, tamano, material, disenos } = {}) {
  const partes = [
    cantidad === CANTIDAD_MAS ? `más de ${ESCALA_MAX.toLocaleString('es-AR')} calcos` : `${Number(cantidad).toLocaleString('es-AR')} calcos`,
    getTamano(tamano)?.label,
    getMaterial(material)?.label,
    disenos > 1 ? `${disenos} diseños` : '1 diseño'
  ].filter(Boolean);
  return `Hola EPICALCOS. Estoy cotizando calcos para mi negocio: ${partes.join(', ')}.`;
}

// ─── Consulta precargada para /contacto (spec 034, design D-1) ──────────────

const CLAVE_CONSULTA = 'epicalcos.consultaCotizar';
/** Media hora: después, el que entra a /contacto ya no viene del cotizador. */
const VIGENCIA_CONSULTA_MS = 30 * 60 * 1000;

/**
 * Deja la consulta para que el formulario de /contacto la levante. En
 * `sessionStorage` y en `try/catch`: en el navegador embebido de Instagram
 * puede no haber storage, y entonces el formulario arranca con la consulta
 * genérica de siempre. Nunca en la URL.
 */
export function guardarConsultaCotizar(texto, now = Date.now(), storage = globalThis.sessionStorage) {
  try {
    storage?.setItem(CLAVE_CONSULTA, JSON.stringify({ texto, ts: now }));
  } catch {
    /* sin storage: el formulario usa la consulta genérica */
  }
}

/** La consulta que dejó el cotizador, si sigue vigente. `null` si no hay. */
export function leerConsultaCotizar(now = Date.now(), storage = globalThis.sessionStorage) {
  try {
    const guardada = JSON.parse(storage?.getItem(CLAVE_CONSULTA) || 'null');
    if (!guardada?.texto || now - Number(guardada.ts) > VIGENCIA_CONSULTA_MS) return null;
    return String(guardada.texto);
  } catch {
    return null;
  }
}
