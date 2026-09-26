/**
 * Borrador del configurador de /personalizados (spec 023): los diseños que el
 * cliente está subiendo y la configuración de la tanda (tamaño, material,
 * corte, copias e instrucciones) ANTES de entrar al carrito.
 *
 * ── POR QUÉ UN STORE DE MÓDULO Y NO ESTADO DEL COMPONENTE (D-3) ──────────────
 * Hasta la spec 023 la lista vivía en el componente y la subida la parcheaba el
 * componente montado. Si el cliente tocaba "Ir al carrito" a mitad de una
 * subida, la página se desmontaba, la subida terminaba en Cloudinary y el
 * carrito NUNCA recibía el link: el pedido llegaba con "(por WhatsApp)" aunque
 * el archivo estuviera subido. Y al volver, la lista aparecía vacía.
 * Un módulo vive lo que vive la pestaña: la cola sigue subiendo aunque la
 * página se desmonte, y al volver el diseño está ahí, terminado.
 *
 * ── UNA LÍNEA POR DISEÑO (D-1) ───────────────────────────────────────────────
 * El alta al carrito es explícita, pero `construirLineas()` emite UNA línea por
 * diseño, como desde el 6/8/2026. Antes de eso el cliente subía N diseños y se
 * llevaba UNA calco: pagaba 1 y en la nota viajaban los N archivos.
 *
 * ── "AGREGAR" ESPERA A LA SUBIDA (D-2) ────────────────────────────────────────
 * `estadoCta()` no habilita el alta mientras haya un diseño subiendo: la línea
 * nace con su link adentro. Parchearlo después es justamente lo que se perdía.
 *
 * Sin React y con las dependencias inyectadas (`crearBorrador`), así se testea
 * en Node sin red ni navegador. El singleton con los servicios reales vive en
 * `components/personalizados/useBorrador.js`.
 */
import {
  ARCHIVO,
  extension,
  getTamano,
  getCorte,
  getMaterial,
  tamanoPermitido,
  MATERIAL_POR_DEFECTO,
  MATERIAL_HOLOGRAFICO_ID,
  PACK_HOLOGRAFICO,
  clampCantidad,
  recomendacionPx,
  formatosLegibles
} from '../config/personalizados.js';

export const CLAVE_BORRADOR = 'epicalcos.personalizados.borrador.v1';
export const CORTE_POR_DEFECTO = 'silueta';
const MAX_INSTRUCCIONES = 500;

let uid = 0;
/**
 * El id viaja dentro del id de la línea del carrito (`custom:{tamano}:{corte}:{id}`),
 * que se persiste en localStorage: si al recargar volviéramos a emitir "f1", el
 * diseño nuevo se mergearía con una línea vieja. Por eso lleva el timestamp.
 */
export const nuevoId = () => `f${Date.now().toString(36)}${(++uid).toString(36)}`;

/** Mismo archivo elegido dos veces = mismo nombre, peso y fecha. */
export const huellaArchivo = (f) => `${f.name}|${f.size}|${f.lastModified}`;

/** Extensiones que el navegador puede mostrar en un `<img>`. */
const PREVISUALIZABLES = ['png', 'jpg', 'jpeg', 'webp', 'svg'];

/** Estados en los que el diseño todavía no está listo para el carrito. */
export const PENDIENTES = ['preparando', 'en_cola', 'subiendo'];
/** Estados con los que el diseño puede entrar al carrito. */
export const LISTOS = ['listo', 'por_whatsapp'];

/**
 * Los mensajes que ve el cliente. Nunca un código HTTP, "MIME" ni "payload"
 * (RF-U7): el cliente no puede hacer nada con eso.
 */
export const MENSAJES = {
  formato: () =>
    `No pudimos subir esta imagen. Probá con ${formatosLegibles(ARCHIVO.formatosEntrada)} de hasta ${ARCHIVO.pesoMaximoMB} MB.`,
  peso: () =>
    `Esta imagen es demasiado pesada, incluso optimizada (máximo ${ARCHIVO.pesoMaximoMB} MB). Elegí otra o mandala por WhatsApp después de pagar.`,
  lectura: () => 'No pudimos leer esta imagen. Probá exportarla de nuevo o elegí otra.',
  red: () => 'Se cortó la subida.',
  tope: () => `Podés subir hasta ${ARCHIVO.maxArchivos} diseños por pedido.`,
  duplicado: () => 'Ese archivo ya está en tu lista.'
};

const aviso = (motivo) => ({ motivo, mensaje: MENSAJES[motivo]() });

function inicial() {
  return {
    disenos: [],
    tamano: null,
    material: MATERIAL_POR_DEFECTO, // enmienda 22/9/2026 (RF-MAT4): sí arranca con default
    corte: CORTE_POR_DEFECTO,
    copias: 1,
    instrucciones: '',
    vista: 'original',
    activo: null,
    agregado: null,
    tanda: 0
  };
}

// ─── Funciones puras ──────────────────────────────────────────────────────────

/**
 * Qué dice y qué hace el CTA (el del hero y el de la barra fija, que son el
 * mismo). El orden de las condiciones ES la regla — design §3.1.
 * @returns {{ tipo: 'agregado'|'subir'|'crear'|'esperando'|'revisar'|'agregar', progreso?: number }}
 */
export function estadoCta(e) {
  if (e.agregado) return { tipo: 'agregado' };
  if (!e.disenos.length) return { tipo: 'subir' };
  if (!e.tamano) return { tipo: 'crear' };
  if (e.disenos.some((d) => PENDIENTES.includes(d.estado))) {
    const suma = e.disenos.reduce((a, d) => a + (LISTOS.includes(d.estado) ? 100 : d.progreso || 0), 0);
    return { tipo: 'esperando', progreso: Math.round(suma / e.disenos.length) };
  }
  if (e.disenos.some((d) => d.estado === 'error')) return { tipo: 'revisar' };
  return { tipo: 'agregar' };
}

/** Diseños que pueden entrar al carrito. */
export const disenosListos = (e) => e.disenos.filter((d) => LISTOS.includes(d.estado));

/** Nombre de la línea, con el archivo adentro y acotado (le sirve al cliente en el carrito). */
function nombreLinea(tamanoLabel, corteLabel, archivo) {
  const corto = archivo.length > 42 ? `${archivo.slice(0, 39)}…` : archivo;
  return `Personalizado · ${tamanoLabel} · ${corteLabel} · ${corto}`;
}

/**
 * Las líneas del carrito de la tanda: UNA POR DISEÑO. El servidor re-precia
 * por el id — ver design.md §3.2 (enmienda 22/9/2026).
 *
 * El id gana el MATERIAL como cuarto segmento, antes del id del diseño:
 * `custom:{tamano}:{corte}:{material}:{d.id}`. Va ahí y no primero (como el
 * modelo de precio por material de julio/2026, ya retirado) para que
 * `esCustomViejo()` del CartContext lo siga distinguiendo de una línea
 * realmente vieja — ver el comentario largo de esa función.
 *
 * Vinilo Holográfico NO sale de acá (enmienda 26/9/2026): no existe como
 * calco suelta — va en el pack de `construirLineaHolografica()`, y el servidor
 * rechaza una `custom:` holográfica. Devolver `[]` y no la línea hace que un
 * llamador que se olvide de separar el caso no pueda mandar al carrito algo
 * que el checkout después traba.
 *
 * @param {{ imagenGenerica?: string|null }} [opts] miniatura para lo que no es raster
 */
export function construirLineas(e, { imagenGenerica = null } = {}) {
  const tam = getTamano(e.tamano);
  const cor = getCorte(e.corte);
  const mat = getMaterial(e.material) || getMaterial(MATERIAL_POR_DEFECTO);
  if (!tam || !cor || !mat || mat.id === MATERIAL_HOLOGRAFICO_ID) return [];
  const notas = e.instrucciones.trim() || null;
  return disenosListos(e).map((d) => ({
    id: `custom:${tam.id}:${cor.id}:${mat.id}:${d.id}`,
    name: nombreLinea(tam.label, cor.label, d.nombre),
    categoryLabel: 'Personalizados',
    image: d.url && ARCHIVO.formatosRaster.includes(d.extSubida) ? d.url : imagenGenerica,
    basePrice: tam.precio,
    quantity: e.copias,
    meta: {
      tipo: 'calcos',
      tamano: tam.id,
      tamanoLabel: tam.label,
      corte: cor.id,
      corteLabel: cor.label,
      material: mat.id,
      materialLabel: mat.label,
      cantidad: e.copias,
      instrucciones: notas,
      archivos: [{ nombre: d.nombre, pesoMB: d.pesoMB, url: d.url || null }]
    }
  }));
}

/**
 * La línea del pack holográfico (enmienda 26/9/2026, spec 023 design §3.7):
 * UNA para toda la tanda, con los N diseños en `meta.archivos` — las 100
 * calcos son en total, repartidas entre ellos (Mariano, 26/9/2026).
 *
 * Es una línea `negocio:` porque el servidor ya sabe cobrarla a $39.999 y
 * exigirle su recargo (`fixed:material-holografico:{ts}`, que agrega
 * `BotonCta.jsx` con el MISMO `ts`: ese último segmento compartido es lo que
 * las liga en el servidor y en `removeItem`). El tamaño va en el id para que
 * el servidor pueda rechazar un 9 cm.
 *
 * `name` sin el nombre del archivo (PII: `nombreParaAnalytics()` no limpia un
 * `negocio:` — mismo criterio que la línea de Negocio de `BotonCta.jsx`).
 *
 * @returns la línea, o `null` si la tanda no es un pack holográfico válido
 */
export function construirLineaHolografica(e, { imagenGenerica = null, ts = Date.now() } = {}) {
  if (e.material !== MATERIAL_HOLOGRAFICO_ID || !tamanoPermitido(e.tamano, e.material)) return null;
  const tam = getTamano(e.tamano);
  const cor = getCorte(e.corte);
  const mat = getMaterial(e.material);
  const listos = disenosListos(e);
  if (!cor || !listos.length) return null;
  const conImagen = listos.find((d) => d.url && ARCHIVO.formatosRaster.includes(d.extSubida));
  return {
    id: `negocio:${mat.id}:${tam.id}:${ts}`,
    name: `Holográfico · ${PACK_HOLOGRAFICO.qty}u ${tam.label}`,
    categoryLabel: 'Personalizados',
    image: conImagen ? conImagen.url : imagenGenerica,
    basePrice: PACK_HOLOGRAFICO.precio,
    quantity: 1,
    meta: {
      qty: PACK_HOLOGRAFICO.qty,
      size: tam.id,
      tamanoLabel: tam.label,
      material: mat.id,
      materialLabel: mat.label,
      corte: cor.id,
      corteLabel: cor.label,
      disenos: listos.length,
      instrucciones: e.instrucciones.trim() || null,
      archivos: listos.map((d) => ({ nombre: d.nombre, pesoMB: d.pesoMB, url: d.url || null }))
    }
  };
}

/**
 * Aviso de resolución baja (RF-U13): NO bloquea. Depende del tamaño elegido,
 * así que se calcula al mostrar y no al subir.
 */
export function avisoResolucion(d, tamano) {
  const t = getTamano(tamano);
  if (!t || !d?.ancho || !d?.alto) return null;
  const min = recomendacionPx(t.cm);
  const lado = Math.min(d.ancho, d.alto);
  if (lado >= min) return null;
  return `Para ${t.label} conviene una imagen de al menos ${min} px de lado (la tuya tiene ${lado}). Podés agregarla igual.`;
}

// ─── Persistencia ─────────────────────────────────────────────────────────────

/** Lo que sobrevive a un refresh: la config y los diseños YA subidos (con link). */
function serializar(e) {
  return JSON.stringify({
    tamano: e.tamano,
    material: e.material,
    corte: e.corte,
    copias: e.copias,
    instrucciones: e.instrucciones,
    disenos: e.disenos
      .filter((d) => d.estado === 'listo' && d.url)
      .map(({ id, nombre, ext, extSubida, pesoMB, ancho, alto, transparencia, url, huella }) => ({
        id, nombre, ext, extSubida, pesoMB, ancho, alto, transparencia, url, huella
      }))
  });
}

function hidratar(storage) {
  try {
    const raw = storage?.getItem(CLAVE_BORRADOR);
    if (!raw) return null;
    const g = JSON.parse(raw);
    const base = inicial();
    const disenos = Array.isArray(g.disenos)
      ? g.disenos
          .filter((d) => d && d.id && d.url)
          .map((d) => ({
            ...d,
            // Sin el blob local (se fue con el refresh): se muestra el subido.
            previewUrl: PREVISUALIZABLES.includes(d.extSubida) ? d.url : null,
            estado: 'listo',
            progreso: 100,
            error: null
          }))
      : [];
    const material = getMaterial(g.material) ? g.material : base.material;
    return {
      ...base,
      // Un borrador guardado en holográfico + 9 cm (antes del 26/9/2026 se
      // podía) vuelve sin tamaño: el cliente lo elige de nuevo (D-4).
      tamano: tamanoPermitido(g.tamano, material) ? g.tamano : null,
      material,
      corte: getCorte(g.corte) ? g.corte : base.corte,
      copias: clampCantidad(g.copias),
      instrucciones: String(g.instrucciones || '').slice(0, MAX_INSTRUCCIONES),
      disenos,
      activo: disenos[0]?.id || null
    };
  } catch {
    return null;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   subir?: (file: File, opts: { onProgress: (pct:number)=>void }) => Promise<string|null>,
 *   preparar?: (file: File, opts: { maxMB: number }) => Promise<{ archivo: File, ancho: number|null, alto: number|null, transparencia: boolean|null }>,
 *   subidaHabilitada?: boolean,
 *   storage?: { getItem: Function, setItem: Function } | null,
 *   crearUrl?: (file: File) => string|null,
 *   revocarUrl?: (url: string) => void,
 *   onEvento?: (tipo: 'subido'|'error', datos: object) => void,
 *   enParalelo?: number, max?: number, maxMB?: number
 * }} deps
 */
export function crearBorrador({
  subir = async () => null,
  preparar = async (file) => ({ archivo: file, ancho: null, alto: null, transparencia: null }),
  subidaHabilitada = true,
  storage = null,
  crearUrl = () => null,
  revocarUrl = () => {},
  onEvento = () => {},
  enParalelo = ARCHIVO.subidasEnParalelo,
  max = ARCHIVO.maxArchivos,
  maxMB = ARCHIVO.pesoMaximoMB
} = {}) {
  let estado = hidratar(storage) || inicial();
  let persistido = serializar(estado);
  const subs = new Set();
  const archivos = new Map(); // id → File ya preparado (para reintentar)
  let cola = [];
  let enVuelo = 0;

  const avisar = (tipo, datos) => {
    try {
      onEvento(tipo, datos);
    } catch {
      /* el tracking nunca rompe la subida */
    }
  };

  function persistir() {
    if (!storage) return;
    const s = serializar(estado);
    if (s === persistido) return; // el progreso de subida no toca el storage
    persistido = s;
    try {
      storage.setItem(CLAVE_BORRADOR, s);
    } catch {
      /* storage lleno o bloqueado: el borrador sigue en memoria */
    }
  }

  function emitir() {
    persistir();
    subs.forEach((fn) => fn());
  }

  function set(cambios) {
    estado = { ...estado, ...cambios };
    emitir();
  }

  const buscar = (id) => estado.disenos.find((d) => d.id === id);

  function patch(id, cambios) {
    if (!buscar(id)) return false;
    estado = { ...estado, disenos: estado.disenos.map((d) => (d.id === id ? { ...d, ...cambios } : d)) };
    emitir();
    return true;
  }

  function bombear() {
    while (enVuelo < enParalelo && cola.length) {
      const id = cola.shift();
      const file = archivos.get(id);
      if (!file || !buscar(id)) continue;
      enVuelo += 1;
      patch(id, { estado: 'subiendo', progreso: 0 });
      Promise.resolve()
        .then(() =>
          subir(file, {
            onProgress: (pct) => {
              const d = buscar(id);
              if (d && d.estado === 'subiendo' && pct !== d.progreso) patch(id, { progreso: pct });
            }
          })
        )
        .then((url) => {
          const d = buscar(id);
          if (!d) return; // lo quitaron mientras subía: la respuesta se descarta
          patch(id, { estado: url ? 'listo' : 'por_whatsapp', url: url || null, progreso: 100 });
          avisar('subido', { ext: d.ext, pesoMB: d.pesoMB });
        })
        .catch(() => {
          if (!buscar(id)) return;
          patch(id, { estado: 'error', error: aviso('red') });
          avisar('error', { motivo: 'red' });
        })
        .finally(() => {
          enVuelo -= 1;
          bombear();
        });
    }
  }

  /** Prepara (convierte, comprime, mide) y encola la subida de un diseño ya en la lista. */
  async function procesar(id, file) {
    let prep;
    try {
      prep = await preparar(file, { maxMB });
    } catch {
      if (patch(id, { estado: 'error', error: aviso('lectura') })) avisar('error', { motivo: 'lectura' });
      return;
    }
    if (!buscar(id)) return; // lo quitaron mientras se preparaba
    const pesoMB = Number((prep.archivo.size / (1024 * 1024)).toFixed(2));
    const medidas = {
      pesoMB,
      ancho: prep.ancho ?? null,
      alto: prep.alto ?? null,
      transparencia: prep.transparencia ?? null,
      extSubida: extension(prep.archivo.name)
    };
    if (pesoMB > maxMB) {
      patch(id, { ...medidas, estado: 'error', error: aviso('peso') });
      avisar('error', { motivo: 'peso' });
      return;
    }
    archivos.set(id, prep.archivo);
    if (!subidaHabilitada) {
      // Sin cuenta de Cloudinary la página sigue vendiendo: el archivo va por WhatsApp.
      patch(id, { ...medidas, estado: 'por_whatsapp', progreso: 100 });
      avisar('subido', { ext: buscar(id)?.ext, pesoMB });
      return;
    }
    patch(id, { ...medidas, estado: 'en_cola', progreso: 0 });
    cola.push(id);
    bombear();
  }

  function nuevoDiseno(file) {
    const ext = extension(file.name);
    return {
      id: nuevoId(),
      nombre: file.name,
      ext,
      extSubida: ext,
      pesoMB: Number((file.size / (1024 * 1024)).toFixed(2)),
      ancho: null,
      alto: null,
      huella: huellaArchivo(file),
      previewUrl: PREVISUALIZABLES.includes(ext) ? crearUrl(file) : null,
      transparencia: null,
      estado: 'preparando',
      progreso: 0,
      url: null,
      error: null
    };
  }

  function soltar(d) {
    if (d?.previewUrl && d.previewUrl !== d.url) revocarUrl(d.previewUrl);
    archivos.delete(d.id);
    cola = cola.filter((x) => x !== d.id);
  }

  const api = {
    leer: () => estado,

    suscribir(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },

    /**
     * Suma archivos a la tanda. Formato, tope y duplicados se rechazan acá y
     * vuelven como `avisos` (no entran a la lista); peso, lectura y red quedan
     * en la lista como diseño con error, para que el cliente decida.
     * @returns {Promise<{ agregados: number, avisos: Array<{motivo:string, mensaje:string}> }>}
     */
    async agregarArchivos(lista) {
      const files = Array.from(lista || []);
      const avisos = [];
      const nuevos = [];
      for (const file of files) {
        if (!ARCHIVO.formatosEntrada.includes(extension(file.name))) {
          avisos.push(aviso('formato'));
          continue;
        }
        if (estado.disenos.length + nuevos.length >= max) {
          avisos.push(aviso('tope'));
          break;
        }
        const huella = huellaArchivo(file);
        if ([...estado.disenos, ...nuevos.map((n) => n.d)].some((d) => d.huella === huella)) {
          avisos.push(aviso('duplicado'));
          continue;
        }
        nuevos.push({ d: nuevoDiseno(file), file });
      }
      const unicos = [...new Map(avisos.map((a) => [a.motivo, a])).values()];
      unicos.forEach((a) => avisar('error', { motivo: a.motivo }));
      if (nuevos.length) {
        set({
          disenos: [...estado.disenos, ...nuevos.map((n) => n.d)],
          activo: nuevos[0].d.id,
          agregado: null,
          vista: estado.tamano ? 'calco' : 'original'
        });
        // De a uno: preparar 30 fotos de 12 MP en paralelo le agota la memoria a
        // un celular. Las subidas sí van en paralelo (la cola).
        for (const n of nuevos) await procesar(n.d.id, n.file);
      }
      return { agregados: nuevos.length, avisos: unicos };
    },

    /** Cambia el archivo de un diseño conservando su lugar en la lista (RF-U5). */
    async reemplazar(id, file) {
      const viejo = buscar(id);
      if (!viejo || !file) return { ok: false };
      if (!ARCHIVO.formatosEntrada.includes(extension(file.name))) {
        avisar('error', { motivo: 'formato' });
        return { ok: false, aviso: aviso('formato') };
      }
      const huella = huellaArchivo(file);
      if (estado.disenos.some((d) => d.id !== id && d.huella === huella)) {
        avisar('error', { motivo: 'duplicado' });
        return { ok: false, aviso: aviso('duplicado') };
      }
      soltar(viejo);
      const d = nuevoDiseno(file);
      set({
        disenos: estado.disenos.map((x) => (x.id === id ? d : x)),
        activo: estado.activo === id ? d.id : estado.activo
      });
      await procesar(d.id, file);
      return { ok: true };
    },

    quitar(id) {
      const d = buscar(id);
      if (!d) return;
      soltar(d);
      const disenos = estado.disenos.filter((x) => x.id !== id);
      set({ disenos, activo: estado.activo === id ? disenos[0]?.id || null : estado.activo });
    },

    reintentar(id) {
      const d = buscar(id);
      if (!d || d.estado !== 'error' || !archivos.has(id)) return;
      patch(id, { estado: 'en_cola', progreso: 0, error: null });
      cola.push(id);
      bombear();
    },

    /** "Agregar igual y mandarlo por WhatsApp" (RF-U7): la línea entra sin link. */
    porWhatsapp(id) {
      const d = buscar(id);
      if (!d || d.estado !== 'error') return;
      cola = cola.filter((x) => x !== id);
      patch(id, { estado: 'por_whatsapp', error: null, url: null });
    },

    setTamano(tamano) {
      // Con holográfico, 9 cm no existe (RF-MAT13): la card está deshabilitada,
      // esto es la red por si algo la llama igual.
      if (!tamanoPermitido(tamano, estado.material)) return;
      // El momento de "creación" (RF-P4): la primera vez que se elige el tamaño
      // con un diseño cargado, la vista pasa sola a la calco.
      const vista = !estado.tamano && estado.disenos.length && estado.vista === 'original' ? 'calco' : estado.vista;
      set({ tamano, vista, agregado: null });
    },
    setCorte(corte) {
      if (getCorte(corte)) set({ corte });
    },
    setMaterial(material) {
      if (!getMaterial(material)) return;
      // Pasar a holográfico con 9 cm elegido deselecciona el tamaño en vez de
      // cambiarlo solo a 6 cm (RF-MAT13): el tamaño es una decisión que el
      // cliente ve, no un default que se le pasa (D-4 — un personalizado solo
      // se devuelve por falla).
      const tamano = tamanoPermitido(estado.tamano, material) ? estado.tamano : null;
      set({ material, tamano });
    },
    setCopias(n) {
      set({ copias: clampCantidad(n) });
    },
    setInstrucciones(texto) {
      set({ instrucciones: String(texto || '').slice(0, MAX_INSTRUCCIONES) });
    },
    setVista(vista) {
      if (['original', 'calco', 'termo'].includes(vista)) set({ vista });
    },
    setActivo(id) {
      if (buscar(id)) set({ activo: id });
    },

    /**
     * La tanda ya está en el carrito: se vacía la lista (la config queda, para
     * la próxima) y queda la confirmación hasta `limpiarAgregado()`.
     */
    marcarAgregado() {
      const listos = disenosListos(estado);
      // El pack holográfico son 100 en total, no diseños × copias (26/9/2026).
      const unidades =
        estado.material === MATERIAL_HOLOGRAFICO_ID ? PACK_HOLOGRAFICO.qty : listos.length * estado.copias;
      listos.forEach(soltar);
      set({
        disenos: estado.disenos.filter((d) => !LISTOS.includes(d.estado)),
        activo: null,
        vista: 'original',
        agregado: { disenos: listos.length, unidades },
        tanda: estado.tanda + 1
      });
    },
    limpiarAgregado() {
      if (estado.agregado) set({ agregado: null });
    }
  };
  return api;
}
