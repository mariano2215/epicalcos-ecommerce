import { useEffect, useRef, useState } from 'react';
import { ARCHIVO, formatosCortos } from '../../config/personalizados.js';
import { SUBIDA } from '../../config/personalizadosLanding.js';
import { avisoResolucion, PENDIENTES } from '../../lib/borradorPersonalizado.js';
import { trackPersonalizedUploadStart } from '../../lib/analytics.js';
import VistaPrevia from './VistaPrevia.jsx';
import { IDS, abrirSelector } from './acciones.js';

const accept = ARCHIVO.formatosEntrada.map((f) => `.${f}`).join(',');

function IconoSubir() {
  return (
    <span className="grid place-items-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-fuchsia to-brand-orange shadow-glow" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 16V4M6.5 9.5 12 4l5.5 5.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
      </svg>
    </span>
  );
}

/** Texto del estado de un diseño. Nunca un código técnico (RF-U7). */
function textoEstado(d) {
  switch (d.estado) {
    case 'preparando':
      return 'Preparando…';
    case 'en_cola':
      return 'En espera…';
    case 'subiendo':
      return `Subiendo ${d.progreso || 0} %`;
    case 'listo':
      return SUBIDA.cargado;
    case 'por_whatsapp':
      return 'Lo recibimos por WhatsApp después de pagar';
    default:
      return d.error?.mensaje || '';
  }
}

function Miniatura({ d, activo, onClick }) {
  const pendiente = PENDIENTES.includes(d.estado);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={`Ver ${d.nombre}`}
      className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 bg-black/30 grid place-items-center ${
        activo ? 'border-brand-fuchsia' : 'border-white/10'
      }`}
    >
      {d.previewUrl ? (
        <img src={d.previewUrl} alt="" className="w-full h-full object-contain" />
      ) : (
        <span className="text-xl" aria-hidden="true">📄</span>
      )}
      {pendiente && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
          <span className="block h-full bg-brand-fuchsia transition-all" style={{ width: `${d.progreso || 0}%` }} />
        </span>
      )}
      {d.estado === 'error' && (
        <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-brand-pink text-[10px] font-bold grid place-items-center" aria-hidden="true">
          !
        </span>
      )}
    </button>
  );
}

/**
 * Zona de subida del hero (RF-U1…U11). Vacía: un dropzone grande. Con diseños:
 * la vista previa del activo, la tira de miniaturas y las acciones del activo.
 *
 * El input es `sr-only` y NO `hidden`: hasta la spec 023 el de /personalizados
 * era `display: none` dentro de un `<label>` no enfocable, y con teclado no se
 * podía subir nada. Ahora se abre con un `<button>` real (Tab + Enter), y el
 * input queda fuera del orden de tabulación para no duplicar la parada.
 *
 * La lista y la vista llevan `data-clarity-mask`: Clarity graba la página, y el
 * nombre y la imagen del cliente no tienen por qué quedar en una grabación.
 */
export default function ZonaSubida({ estado, store, tamano }) {
  const [avisos, setAvisos] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const reemplazoRef = useRef(null);
  const aReemplazar = useRef(null);
  const previos = useRef(new Map());

  const { disenos } = estado;
  const activo = disenos.find((d) => d.id === estado.activo) || disenos[0] || null;

  // Lo que cambió de estado se anuncia a lectores de pantalla (RF-U11).
  useEffect(() => {
    let texto = '';
    const vistos = new Map();
    for (const d of disenos) {
      const antes = previos.current.get(d.id);
      if (antes && antes !== d.estado) {
        if (d.estado === 'listo') texto = `${SUBIDA.cargado}: ${d.nombre}`;
        if (d.estado === 'error') texto = `${d.nombre}: ${d.error?.mensaje || ''}`;
      }
      vistos.set(d.id, d.estado);
    }
    previos.current = vistos;
    if (texto) setAnuncio(texto);
  }, [disenos]);

  const sumar = async (files) => {
    if (!files?.length) return;
    setAvisos([]);
    const r = await store.agregarArchivos(files);
    if (r.avisos.length) setAvisos(r.avisos);
  };

  const onInput = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    sumar(files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (!e.dataTransfer?.files?.length) return;
    trackPersonalizedUploadStart('hero');
    sumar(e.dataTransfer.files);
  };

  const reemplazar = (id) => {
    aReemplazar.current = id;
    trackPersonalizedUploadStart('hero');
    reemplazoRef.current?.click();
  };

  const onReemplazo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !aReemplazar.current) return;
    setAvisos([]);
    const r = await store.reemplazar(aReemplazar.current, file);
    if (r.aviso) setAvisos([r.aviso]);
  };

  const arrastre = {
    onDragOver: (e) => {
      e.preventDefault();
      setArrastrando(true);
    },
    onDragLeave: () => setArrastrando(false),
    onDrop
  };

  const aviso = activo ? avisoResolucion(activo, tamano) : null;

  return (
    <div id={IDS.configurador} className="scroll-mt-28">
      <input
        id={IDS.input}
        type="file"
        multiple
        accept={accept}
        onChange={onInput}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      <input ref={reemplazoRef} type="file" accept={accept} onChange={onReemplazo} tabIndex={-1} aria-hidden="true" className="sr-only" />

      {disenos.length === 0 ? (
        <div
          {...arrastre}
          onClick={() => abrirSelector('hero')}
          className={`cursor-pointer rounded-3xl border-2 border-dashed px-6 py-8 sm:py-14 min-h-[16rem] sm:min-h-[26rem] flex flex-col items-center justify-center gap-3 text-center transition-colors ${
            arrastrando ? 'border-brand-fuchsia bg-brand-fuchsia/10' : 'border-white/20 bg-white/[0.03] hover:border-white/40'
          }`}
        >
          <IconoSubir />
          <div className="font-display font-extrabold text-xl sm:text-2xl mt-1">{SUBIDA.titulo}</div>
          {/* En el celular no se arrastra nada: el "arrastrá" confunde más de lo que ayuda. */}
          <div className="hidden sm:block text-white/65 text-sm">{SUBIDA.arrastrar}</div>
          <div className="hidden sm:block text-white/35 text-xs">{SUBIDA.o}</div>
          {/* El click del botón sube hasta el contenedor: un solo manejador. */}
          <button type="button" className="btn-secondary">
            {SUBIDA.boton}
          </button>
          <div className="text-[11px] text-white/45 tracking-wide">
            {formatosCortos()} · hasta {ARCHIVO.pesoMaximoMB} MB
          </div>
          <div className="text-xs text-white/65">{SUBIDA.revision}</div>
        </div>
      ) : (
        <div {...arrastre} className={`rounded-3xl ${arrastrando ? 'ring-2 ring-brand-fuchsia' : ''}`}>
          <VistaPrevia
            diseno={activo}
            vista={estado.vista}
            corte={estado.corte}
            tamano={tamano}
            onVista={(v) => store.setVista(v)}
          />

          <div id={IDS.lista} className="mt-3 scroll-mt-28" data-clarity-mask="true">
            {disenos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Tus diseños">
                {disenos.map((d) => (
                  <Miniatura key={d.id} d={d} activo={d.id === activo?.id} onClick={() => store.setActivo(d.id)} />
                ))}
              </div>
            )}

            {activo && (
              <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{activo.nombre}</div>
                    <div
                      className={`text-xs ${
                        activo.estado === 'error'
                          ? 'text-brand-pink'
                          : activo.estado === 'listo'
                            ? 'text-emerald-400'
                            : 'text-white/55'
                      }`}
                    >
                      {textoEstado(activo)}
                    </div>
                  </div>
                  <button type="button" onClick={() => reemplazar(activo.id)} className="btn-ghost !px-3 min-h-[44px] text-xs">
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={() => store.quitar(activo.id)}
                    className="btn-ghost !px-3 min-h-[44px] text-xs"
                    aria-label={`Quitar ${activo.nombre}`}
                  >
                    Quitar
                  </button>
                </div>
                {activo.estado === 'subiendo' && (
                  <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-brand-fuchsia transition-all" style={{ width: `${activo.progreso || 0}%` }} />
                  </div>
                )}
                {activo.estado === 'error' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activo.error?.motivo === 'red' && (
                      <button type="button" onClick={() => store.reintentar(activo.id)} className="btn-secondary !py-2 min-h-[44px] text-xs">
                        Reintentar
                      </button>
                    )}
                    {['red', 'peso'].includes(activo.error?.motivo) && (
                      <button type="button" onClick={() => store.porWhatsapp(activo.id)} className="btn-ghost min-h-[44px] text-xs">
                        Agregar igual y mandarlo por WhatsApp
                      </button>
                    )}
                  </div>
                )}
                {aviso && <div className="mt-2 text-[11px] text-brand-yellow">{aviso}</div>}
              </div>
            )}

            {disenos.length < ARCHIVO.maxArchivos && (
              <button type="button" onClick={() => abrirSelector('hero')} className="btn-ghost mt-2 min-h-[44px] text-sm">
                + {SUBIDA.sumarOtro}
              </button>
            )}
          </div>
        </div>
      )}

      {avisos.length > 0 && (
        <ul className="mt-2 space-y-1">
          {avisos.map((a) => (
            <li key={a.motivo} className="text-sm text-brand-pink">
              {a.mensaje}
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>
    </div>
  );
}
