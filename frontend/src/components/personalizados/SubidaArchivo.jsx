import { useEffect, useRef, useState } from 'react';
import { ARCHIVO, recomendacionPx } from '../../config/personalizados.js';
import { uploadDesign, uploadEnabled } from '../../services/uploadService.js';
import { comprimirImagen } from '../../lib/comprimirImagen.js';

let uid = 0;
// El id viaja dentro del id de la línea del carrito (`custom:{tamano}:{corte}:{fileId}`),
// que se persiste en localStorage: si al recargar volviéramos a emitir "f1", el
// diseño nuevo se mergearía con la línea vieja. Por eso lleva el timestamp.
const nextId = () => `f${Date.now().toString(36)}${++uid}`;
const ext = (name) => name.split('.').pop()?.toLowerCase() || '';

/**
 * Subida de hasta {max} archivos. Valida formato/peso/resolución por archivo (la
 * resolución es AVISO, no bloqueo). Si Cloudinary está configurado, sube cada
 * archivo y guarda su URL; si no, queda solo el nombre (se manda por WhatsApp).
 *
 * El copy es parametrizable para reusar el componente fuera del configurador
 * (ej. fotos en Polaroid): `paso` (badge numérico; null lo oculta), `titulo`,
 * `sustantivo` (plural para los avisos), `formatos` aceptados y `descripcion`.
 *
 * `bloqueo` desactiva la zona de subida con un motivo (el configurador exige
 * elegir tamaño y corte antes, porque cada diseño entra al carrito con esa
 * especificación ya puesta). `apiRef` recibe `{ quitar(id) }` para que el padre
 * pueda sacar un archivo de la lista (ej. si su línea se borró desde el carrito).
 *
 * @param {{ tamanoCm: number|null, max?: number, paso?: number|null, titulo?: string,
 *           sustantivo?: string, formatos?: string[], descripcion?: import('react').ReactNode,
 *           preset?: string, bloqueo?: import('react').ReactNode,
 *           apiRef?: import('react').MutableRefObject<{quitar:(id:string)=>void}|null>,
 *           onChange: (items:Array<{id,nombre,pesoMB,url}>) => void,
 *           onAdd?: (info:{nombre,pesoMB}) => void }} props
 */
export default function SubidaArchivo({
  tamanoCm,
  max = ARCHIVO.maxArchivos,
  paso = 5,
  titulo = 'Subí tu diseño',
  sustantivo = 'diseños',
  formatos = ARCHIVO.formatos,
  descripcion,
  preset,
  bloqueo,
  apiRef,
  onChange,
  onAdd
}) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [archivos, setArchivos] = useState([]); // { id, nombre, pesoMB, width, height, preview, aviso, url, uploading, progress, error }
  const [errorGlobal, setErrorGlobal] = useState('');

  // Reportar la lista válida al padre cada vez que cambia.
  useEffect(() => {
    onChange(archivos.map((a) => ({ id: a.id, nombre: a.nombre, pesoMB: a.pesoMB, url: a.url || null })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivos]);

  const patch = (id, cambios) =>
    setArchivos((list) => list.map((a) => (a.id === id ? { ...a, ...cambios } : a)));

  const medirImagen = (file) =>
    new Promise((resolve) => {
      if (!ARCHIVO.formatosRaster.includes(ext(file.name))) return resolve({ width: null, height: null });
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, preview: url });
      img.onerror = () => resolve({ width: null, height: null });
      img.src = url;
    });

  // Cola de subidas: con 50 o 100 archivos, largar todas las requests juntas las
  // estrangula entre sí (progreso congelado y timeouts en 4G). Subimos de a
  // `ARCHIVO.subidasEnParalelo` y el resto espera turno.
  const cola = useRef([]);
  const enVuelo = useRef(0);

  const subirUno = async (id, file) => {
    patch(id, { uploading: true, progress: 0, error: '' });
    try {
      const url = await uploadDesign(file, { preset, onProgress: (pct) => patch(id, { progress: pct }) });
      patch(id, { uploading: false, url: url || null });
    } catch {
      patch(id, { uploading: false, error: 'No se pudo subir — mandalo por WhatsApp.' });
    }
  };

  const bombearCola = () => {
    while (enVuelo.current < ARCHIVO.subidasEnParalelo && cola.current.length) {
      const { id, file } = cola.current.shift();
      enVuelo.current += 1;
      subirUno(id, file).finally(() => {
        enVuelo.current -= 1;
        bombearCola();
      });
    }
  };

  const subir = (id, file) => {
    if (!uploadEnabled) return;
    cola.current.push({ id, file });
    bombearCola();
  };

  const procesarUno = async (file, cupo) => {
    const e = ext(file.name);
    if (!formatos.includes(e)) {
      setErrorGlobal(`Formato .${e} no soportado. Usá ${formatos.join(', ').toUpperCase()}.`);
      return false;
    }
    if (cupo <= 0) return false;

    // La compresión va ANTES de validar el peso: una foto de 30 MB del celular
    // queda en ~1 MB y entra igual. Los vectoriales (PDF/SVG/AI) pasan intactos.
    const listo = await comprimirImagen(file, { maxMB: ARCHIVO.pesoMaximoMB });
    const optimizado = listo !== file;
    const pesoMB = listo.size / (1024 * 1024);
    if (pesoMB > ARCHIVO.pesoMaximoMB) {
      setErrorGlobal(
        optimizado
          ? `"${file.name}" quedó en ${pesoMB.toFixed(1)} MB incluso optimizado. El máximo es ${ARCHIVO.pesoMaximoMB} MB — mandalo por WhatsApp.`
          : `"${file.name}" pesa ${pesoMB.toFixed(1)} MB. El máximo es ${ARCHIVO.pesoMaximoMB} MB.`
      );
      return false;
    }

    // Medimos el archivo que REALMENTE se sube: el aviso de resolución tiene que
    // hablar de lo que se va a imprimir.
    const { width, height, preview } = await medirImagen(listo);
    let aviso = '';
    if (width && tamanoCm) {
      const min = recomendacionPx(tamanoCm);
      if (Math.min(width, height) < min) {
        aviso = `${width}×${height} px — para ${tamanoCm} cm recomendamos ≥ ${min}×${min} px. Igual sirve.`;
      }
    }
    const id = nextId();
    setArchivos((list) => [
      ...list,
      {
        id,
        nombre: file.name,
        pesoMB: Number(pesoMB.toFixed(2)),
        pesoOriginalMB: optimizado ? Number((file.size / (1024 * 1024)).toFixed(2)) : null,
        optimizado,
        width,
        height,
        preview,
        aviso,
        url: null,
        uploading: false,
        progress: 0,
        error: ''
      }
    ]);
    if (onAdd) onAdd({ nombre: file.name, pesoMB: Number(pesoMB.toFixed(2)) });
    subir(id, listo);
    return true;
  };

  const procesar = async (fileList) => {
    setErrorGlobal('');
    const files = Array.from(fileList);
    let cupo = max - archivos.length;
    if (files.length > cupo) {
      setErrorGlobal(`Podés subir hasta ${max} ${sustantivo}. Se tomaron los primeros ${Math.max(cupo, 0)}.`);
    }
    for (const file of files) {
      if (cupo <= 0) break;
      const ok = await procesarUno(file, cupo);
      if (ok) cupo -= 1;
    }
  };

  const onInput = (e) => {
    if (e.target.files?.length) procesar(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) procesar(e.dataTransfer.files);
  };

  const quitar = (id) => {
    cola.current = cola.current.filter((x) => x.id !== id); // si todavía esperaba turno, no lo subimos
    setArchivos((list) => {
      const a = list.find((x) => x.id === id);
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return list.filter((x) => x.id !== id);
    });
  };

  // Handle imperativo para el padre (ver `apiRef` en el docblock).
  useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = { quitar };
    return () => {
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef]);

  const lleno = archivos.length >= max;

  return (
    <section className="card-glass p-5">
      <div className="flex items-baseline gap-2 mb-1">
        {paso != null && (
          <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-fuchsia/20 text-brand-fuchsia text-xs font-bold shrink-0">
            {paso}
          </span>
        )}
        <h2 className="font-display font-extrabold text-lg">{titulo}</h2>
        <span className="text-xs text-white/40 ml-auto">{archivos.length}/{max}</span>
      </div>
      <p className={`text-white/50 text-sm mb-3 ${paso != null ? 'ml-8' : ''}`}>
        {descripcion ?? (
          <>
            PNG, JPG o PDF, hasta {ARCHIVO.pesoMaximoMB} MB cada uno. Podés sumar hasta {max} {sustantivo}. Si tenés el
            vectorial (AI, SVG, PDF), mejor: el corte sale más preciso.
          </>
        )}
      </p>

      {bloqueo && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
          {bloqueo}
        </div>
      )}

      {!bloqueo && !lleno && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed cursor-pointer px-4 py-6 text-center transition-colors ${
            drag ? 'border-brand-fuchsia bg-brand-fuchsia/10' : 'border-white/15 hover:border-white/30 bg-white/[0.02]'
          }`}
        >
          <div className="text-3xl">🖼️</div>
          <div className="text-sm font-semibold">Arrastrá tus archivos o tocá para elegirlos</div>
          <div className="text-xs text-white/40">
            {uploadEnabled
              ? 'Se suben con tu pedido. Las fotos pesadas se optimizan solas para que la subida no tarde.'
              : 'Opcional: también podés mandarlos por WhatsApp después de pagar.'}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={formatos.map((f) => '.' + f).join(',')}
            onChange={onInput}
            className="hidden"
          />
        </label>
      )}

      {archivos.length > 0 && (
        <ul
          className={`mt-3 space-y-2 ${archivos.length > 8 ? 'max-h-[26rem] overflow-y-auto pr-1' : ''}`}
        >
          {archivos.map((a) => (
            <li key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                {a.preview ? (
                  <img src={a.preview} alt={a.nombre} loading="lazy" className="w-12 h-12 rounded-xl object-contain bg-black/20 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-black/20 grid place-items-center text-2xl shrink-0">📄</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{a.nombre}</div>
                  <div className="text-xs text-white/45">
                    {a.pesoMB} MB{a.width ? ` · ${a.width}×${a.height} px` : ''}
                    {a.optimizado && <span className="text-white/40"> · optimizado de {a.pesoOriginalMB} MB</span>}
                    {a.url && <span className="text-emerald-400"> · subido ✓</span>}
                    {a.uploading && <span className="text-white/50"> · subiendo {a.progress}%</span>}
                    {uploadEnabled && !a.uploading && !a.url && !a.error && (
                      <span className="text-white/40"> · en cola</span>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => quitar(a.id)} className="btn-ghost text-xs shrink-0">
                  Quitar
                </button>
              </div>
              {a.uploading && (
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-brand-fuchsia transition-all" style={{ width: `${a.progress}%` }} />
                </div>
              )}
              {a.aviso && <div className="mt-1.5 text-[11px] text-brand-yellow">⚠️ {a.aviso}</div>}
              {a.error && <div className="mt-1.5 text-[11px] text-brand-pink">{a.error}</div>}
            </li>
          ))}
        </ul>
      )}

      {errorGlobal && <div className="mt-2 text-sm text-brand-pink">{errorGlobal}</div>}
    </section>
  );
}
