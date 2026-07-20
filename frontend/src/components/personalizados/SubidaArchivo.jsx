import { useEffect, useRef, useState } from 'react';
import { ARCHIVO, recomendacionPx } from '../../config/personalizados.js';
import { uploadDesign, uploadEnabled } from '../../services/uploadService.js';

let uid = 0;
const nextId = () => `f${++uid}`;
const ext = (name) => name.split('.').pop()?.toLowerCase() || '';

/**
 * Subida de hasta {max} diseños. Valida formato/peso/resolución por archivo (la
 * resolución es AVISO, no bloqueo). Si Cloudinary está configurado, sube cada
 * archivo y guarda su URL; si no, queda solo el nombre (se manda por WhatsApp).
 *
 * @param {{ tamanoCm: number|null, max?: number,
 *           onChange: (items:Array<{nombre,pesoMB,url}>) => void,
 *           onAdd?: (info:{nombre,pesoMB}) => void }} props
 */
export default function SubidaArchivo({ tamanoCm, max = ARCHIVO.maxArchivos, onChange, onAdd }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [archivos, setArchivos] = useState([]); // { id, nombre, pesoMB, width, height, preview, aviso, url, uploading, progress, error }
  const [errorGlobal, setErrorGlobal] = useState('');

  // Reportar la lista válida al padre cada vez que cambia.
  useEffect(() => {
    onChange(archivos.map((a) => ({ nombre: a.nombre, pesoMB: a.pesoMB, url: a.url || null })));
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

  const subir = (id, file) => {
    if (!uploadEnabled) return;
    patch(id, { uploading: true, progress: 0, error: '' });
    uploadDesign(file, { onProgress: (pct) => patch(id, { progress: pct }) })
      .then((url) => patch(id, { uploading: false, url: url || null }))
      .catch(() => patch(id, { uploading: false, error: 'No se pudo subir — mandalo por WhatsApp.' }));
  };

  const procesarUno = async (file, cupo) => {
    const e = ext(file.name);
    if (!ARCHIVO.formatos.includes(e)) {
      setErrorGlobal(`Formato .${e} no soportado. Usá ${ARCHIVO.formatos.join(', ').toUpperCase()}.`);
      return false;
    }
    const pesoMB = file.size / (1024 * 1024);
    if (pesoMB > ARCHIVO.pesoMaximoMB) {
      setErrorGlobal(`"${file.name}" pesa ${pesoMB.toFixed(1)} MB. El máximo es ${ARCHIVO.pesoMaximoMB} MB.`);
      return false;
    }
    if (cupo <= 0) return false;

    const { width, height, preview } = await medirImagen(file);
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
      { id, nombre: file.name, pesoMB: Number(pesoMB.toFixed(2)), width, height, preview, aviso, url: null, uploading: false, progress: 0, error: '' }
    ]);
    if (onAdd) onAdd({ nombre: file.name, pesoMB: Number(pesoMB.toFixed(2)) });
    subir(id, file);
    return true;
  };

  const procesar = async (fileList) => {
    setErrorGlobal('');
    const files = Array.from(fileList);
    let cupo = max - archivos.length;
    if (files.length > cupo) {
      setErrorGlobal(`Podés subir hasta ${max} diseños. Se tomaron los primeros ${Math.max(cupo, 0)}.`);
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
    setArchivos((list) => {
      const a = list.find((x) => x.id === id);
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return list.filter((x) => x.id !== id);
    });
  };

  const lleno = archivos.length >= max;

  return (
    <section className="card-glass p-5">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-fuchsia/20 text-brand-fuchsia text-xs font-bold shrink-0">
          5
        </span>
        <h2 className="font-display font-extrabold text-lg">Subí tu diseño</h2>
        <span className="text-xs text-white/40 ml-auto">{archivos.length}/{max}</span>
      </div>
      <p className="text-white/50 text-sm mb-3 ml-8">
        PNG, JPG o PDF, hasta {ARCHIVO.pesoMaximoMB} MB cada uno. Podés sumar hasta {max} diseños. Si tenés el
        vectorial (AI, SVG, PDF), mejor: el corte sale más preciso.
      </p>

      {!lleno && (
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
            {uploadEnabled ? 'Se suben con tu pedido.' : 'Opcional: también podés mandarlos por WhatsApp después de pagar.'}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ARCHIVO.formatos.map((f) => '.' + f).join(',')}
            onChange={onInput}
            className="hidden"
          />
        </label>
      )}

      {archivos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {archivos.map((a) => (
            <li key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-3">
                {a.preview ? (
                  <img src={a.preview} alt={a.nombre} className="w-12 h-12 rounded-xl object-contain bg-black/20 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-black/20 grid place-items-center text-2xl shrink-0">📄</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{a.nombre}</div>
                  <div className="text-xs text-white/45">
                    {a.pesoMB} MB{a.width ? ` · ${a.width}×${a.height} px` : ''}
                    {a.url && <span className="text-emerald-400"> · subido ✓</span>}
                    {a.uploading && <span className="text-white/50"> · subiendo {a.progress}%</span>}
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
