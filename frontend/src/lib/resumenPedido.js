/**
 * Resumen legible del pedido para el vendedor (viaja en `shipping.comments`
 * hasta el mail y el CRM) y agrupación de los personalizados. Función PURA, sin
 * React, para poder testearla: es la nota que se leía mal cuando el cliente
 * subía N diseños y el carrito se llevaba UNA sola calco.
 */

/**
 * Agrupa las líneas de personalizados por especificación (material + tamaño +
 * corte + notas). El configurador emite UNA línea por diseño subido, así que sin
 * agrupar un pedido de 30 diseños escupiría 30 bloques idénticos en la nota y en
 * el mensaje de WhatsApp. `unidades` es el total de calcos del grupo y `copias`
 * las de cada archivo.
 *
 * El material entra en la clave y en la nota desde el 26/9/2026: hasta ahí un
 * pedido en DTF UV le llegaba al taller igual que uno en Vinilo Blanco — ni el
 * título de la línea ni esta nota lo decían. Una línea sin `materialLabel`
 * (carrito de antes del selector de material) queda como antes.
 */
export function groupCustomItems(items) {
  const grupos = new Map();
  for (const it of items) {
    if (it.type !== 'custom' || !it.meta) continue;
    const m = it.meta;
    const key = `${m.materialLabel || ''}|${m.tamanoLabel}|${m.corteLabel}|${m.instrucciones || ''}`;
    const grupo = grupos.get(key) || {
      materialLabel: m.materialLabel || null,
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

/**
 * Los packs de /personalizados —las líneas `negocio:` con `meta.material`: el
 * pack holográfico y la Promo Negocio que arma el configurador—, agrupados por
 * especificación y archivos. Un diseño con 200 copias son DOS líneas de
 * Negocio (el servidor exige 1 por línea): sin agrupar, el taller leería dos
 * pedidos de 100 en vez de uno de 200.
 */
export function groupPackItems(items) {
  const grupos = new Map();
  for (const it of items) {
    if (it.type !== 'negocio' || !it.meta?.material) continue;
    const m = it.meta;
    const files = m.archivos || [];
    const key = [m.materialLabel, m.tamanoLabel, m.corteLabel, m.instrucciones || '', ...files.map((f) => f.url || f.nombre)].join('|');
    const grupo = grupos.get(key) || {
      materialLabel: m.materialLabel,
      tamanoLabel: m.tamanoLabel,
      corteLabel: m.corteLabel,
      instrucciones: m.instrucciones || null,
      unidades: 0,
      archivos: files.map((f) => ({ nombre: f.nombre, url: f.url || null }))
    };
    grupo.unidades += (Number(m.qty) || 0) * (Number(it.quantity) || 1);
    grupos.set(key, grupo);
  }
  return [...grupos.values()];
}

/** Los diseños de un grupo, para la nota: links de Cloudinary o nombres + WhatsApp. */
function disenosLabel(files) {
  if (files.length === 0) return 'diseños: se envían por WhatsApp';
  if (files.some((f) => f.url)) return `diseños (${files.length}): ${files.map((f) => fileLabel(f, true)).join(' , ')}`;
  return `diseños (${files.length}): ${files.map((f) => fileLabel(f, false)).join(', ')} — se envían por WhatsApp`;
}

/** Un archivo en la nota: link de Cloudinary (o nombre) + copias si son varias. */
function fileLabel(f, conUrl) {
  const base = conUrl ? f.url || `${f.nombre} (por WhatsApp)` : f.nombre;
  return f.copias > 1 ? `${base} (x${f.copias})` : base;
}

/** Resumen legible de packs/personalizados/negocio para que le llegue al vendedor. */
export function buildDesignSummary(items) {
  const parts = [];

  // Con URL de Cloudinary los diseños llegan al CRM/mail como links.
  for (const g of groupCustomItems(items)) {
    const material = g.materialLabel ? ` ${g.materialLabel}` : '';
    const notas = g.instrucciones ? ` | notas: ${g.instrucciones}` : '';
    parts.push(`Personalizado${material} (${g.tamanoLabel}, corte ${g.corteLabel}, x${g.unidades}) | ${disenosLabel(g.archivos)}${notas}`);
  }

  // Packs de /personalizados: el pack holográfico (100 EN TOTAL repartidas
  // entre los diseños, enmienda 26/9/2026) y la Promo Negocio topeada. La rama
  // de Negocio de más abajo imprimiría `Negocio "undefined"` y perdería
  // material, corte y notas — justo lo que el taller necesita para producirlo.
  for (const g of groupPackItems(items)) {
    const reparto = g.archivos.length > 1 ? ` entre ${g.archivos.length} diseños` : '';
    const notas = g.instrucciones ? ` | notas: ${g.instrucciones}` : '';
    parts.push(`${g.materialLabel} (${g.tamanoLabel}, corte ${g.corteLabel}, x${g.unidades}${reparto}) | ${disenosLabel(g.archivos)}${notas}`);
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
    } else if (it.type === 'negocio' && it.meta?.material) {
      // Ya van arriba, agrupados (groupPackItems).
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
      // Sin `business`: una línea de Negocio que armó el configurador antes del
      // 26/9/2026 (no tenía material en meta). Sin esto la nota decía `Negocio "undefined"`.
      const negocio = it.meta.business ? `Negocio "${it.meta.business}"` : 'Negocio';
      parts.push(`${negocio}: ${it.meta.qty}u ${it.meta.size} (${logo})`);
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

/**
 * Lo que el checkout deja en sessionStorage para /pago-exitoso: la
 * configuración que ve el cliente y el mensaje de WhatsApp pre-cargado. Los
 * archivos van sin link (solo si se subieron): el cliente adjunta en WhatsApp.
 *
 * Los personalizados y los packs de /personalizados llevan el material
 * (fix 26/9/2026): /pago-exitoso ya mostraba `{it.material}`, pero nunca le
 * llegaba — el renglón arrancaba con un " · " suelto. Las líneas `fixed` y el
 * Negocio del formulario de /negocio comparten forma: nombre + adjuntos.
 */
export function especificacionDisenos(items) {
  const spec = [];
  const archivosSpec = (files) => files.map((f) => ({ nombre: f.nombre, subido: Boolean(f.url) }));
  for (const g of [...groupCustomItems(items), ...groupPackItems(items)]) {
    spec.push({
      tipo: 'custom',
      material: g.materialLabel || null,
      tamano: g.tamanoLabel,
      corte: g.corteLabel,
      cantidad: g.unidades,
      archivos: archivosSpec(g.archivos),
      instrucciones: g.instrucciones
    });
  }
  for (const it of items) {
    if (it.type === 'negocio' && it.meta?.material) continue; // ya va arriba
    if ((it.type === 'fixed' || it.type === 'negocio') && it.meta?.archivos?.length) {
      spec.push({ tipo: 'fixed', nombre: it.name, cantidad: it.quantity, archivos: archivosSpec(it.meta.archivos) });
    }
  }
  return spec;
}
