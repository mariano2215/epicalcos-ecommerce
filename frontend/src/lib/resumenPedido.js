/**
 * Resumen legible del pedido para el vendedor (viaja en `shipping.comments`
 * hasta el mail y el CRM) y agrupación de los personalizados. Función PURA, sin
 * React, para poder testearla: es la nota que se leía mal cuando el cliente
 * subía N diseños y el carrito se llevaba UNA sola calco.
 */

/**
 * Agrupa las líneas de personalizados por especificación (tamaño + corte +
 * notas). El configurador emite UNA línea por diseño subido, así que sin
 * agrupar un pedido de 30 diseños escupiría 30 bloques idénticos en la nota y en
 * el mensaje de WhatsApp. `unidades` es el total de calcos del grupo y `copias`
 * las de cada archivo.
 */
export function groupCustomItems(items) {
  const grupos = new Map();
  for (const it of items) {
    if (it.type !== 'custom' || !it.meta) continue;
    const m = it.meta;
    const key = `${m.tamanoLabel}|${m.corteLabel}|${m.instrucciones || ''}`;
    const grupo = grupos.get(key) || {
      tamanoLabel: m.tamanoLabel,
      corteLabel: m.corteLabel,
      instrucciones: m.instrucciones || null,
      unidades: 0,
      archivos: []
    };
    grupo.unidades += it.quantity;
    const files = m.archivos || [];
    for (const f of files) {
      // Una línea = un diseño: sus copias son la cantidad de la línea. Las
      // líneas viejas (varios archivos en una) no tienen copias por archivo.
      grupo.archivos.push({
        nombre: f.nombre,
        url: f.url || null,
        copias: files.length === 1 ? it.quantity : null
      });
    }
    grupos.set(key, grupo);
  }
  return [...grupos.values()];
}

/** Un archivo en la nota: link de Cloudinary (o nombre) + copias si son varias. */
function fileLabel(f, conUrl) {
  const base = conUrl ? f.url || `${f.nombre} (por WhatsApp)` : f.nombre;
  return f.copias > 1 ? `${base} (x${f.copias})` : base;
}

/** Resumen legible de packs/personalizados/negocio para que le llegue al vendedor. */
export function buildDesignSummary(items) {
  const parts = [];

  for (const g of groupCustomItems(items)) {
    const files = g.archivos;
    let arch;
    if (files.length === 0) {
      arch = 'diseños: se envían por WhatsApp';
    } else if (files.some((f) => f.url)) {
      // Con URL de Cloudinary: los diseños llegan al CRM/mail como links.
      arch = `diseños (${files.length}): ${files.map((f) => fileLabel(f, true)).join(' , ')}`;
    } else {
      arch = `diseños (${files.length}): ${files.map((f) => fileLabel(f, false)).join(', ')} — se envían por WhatsApp`;
    }
    const notas = g.instrucciones ? ` | notas: ${g.instrucciones}` : '';
    parts.push(`Personalizado (${g.tamanoLabel}, corte ${g.corteLabel}, x${g.unidades}) | ${arch}${notas}`);
  }

  for (const it of items) {
    if (it.type === 'pack' && it.meta) {
      const designs = (it.meta.items || []).map((d) => `${d.name} x${d.qty}`).join(', ');
      const custom = it.meta.customCount ? ` + ${it.meta.customCount} diseño(s) propio(s)` : '';
      const files = it.meta.archivos || [];
      let arch = '';
      if (files.length) {
        arch = files.some((f) => f.url)
          ? ` | archivos (${files.length}): ${files.map((f) => f.url || `${f.nombre} (por WhatsApp)`).join(' , ')}`
          : ` | archivos (${files.length}): ${files.map((f) => f.nombre).join(', ')} — se envían por WhatsApp`;
      }
      parts.push(`${it.name} → ${designs || 'sin catálogo'}${custom}${arch}`);
    } else if (it.type === 'negocio' && it.meta) {
      const files = it.meta.archivos || [];
      let logo;
      if (files.length === 0) {
        logo = 'logo por WhatsApp';
      } else if (files.some((f) => f.url)) {
        logo = `logo (${files.length}): ${files.map((f) => f.url || `${f.nombre} (por WhatsApp)`).join(' , ')}`;
      } else {
        logo = `logo (${files.length}): ${files.map((f) => f.nombre).join(', ')} — se envía por WhatsApp`;
      }
      parts.push(`Negocio "${it.meta.business}": ${it.meta.qty}u ${it.meta.size} (${logo})`);
    } else if (it.type === 'digital') {
      // Sin adjuntos ni producción: lo único que el vendedor necesita ver en el
      // CRM es que ESTE pedido se entrega por mail y no sale del taller.
      parts.push(`${it.name} → ENTREGA POR MAIL (archivos digitales, no se envía nada físico)`);
    } else if (it.type === 'fixed' && it.meta?.archivos?.length) {
      // Producto de precio fijo con archivos adjuntos (fotos de Polaroid, diseños de tatuajes).
      const files = it.meta.archivos;
      const arch = files.some((f) => f.url)
        ? `archivos (${files.length}): ${files.map((f) => f.url || `${f.nombre} (por WhatsApp)`).join(' , ')}`
        : `archivos (${files.length}): ${files.map((f) => f.nombre).join(', ')} — se envían por WhatsApp`;
      parts.push(`${it.name} | ${arch}`);
    }
  }

  return parts.length ? `PEDIDO: ${parts.join(' ; ')}` : '';
}
