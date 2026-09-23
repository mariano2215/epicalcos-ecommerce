import { useEffect, useRef, useState } from 'react';
import { dibujarVistaCalco, anchoEnTermo, TERMO_CM } from '../../lib/vistaCalco.js';
import { getTamano } from '../../config/personalizados.js';
import { VISTAS, ROTULO_VISTA, TAMANO_MAS_ELEGIDO } from '../../config/personalizadosLanding.js';
import { trackPersonalizedPreview } from '../../lib/analytics.js';

/** Imágenes ya decodificadas, por URL: cambiar de corte o de vista no las vuelve a bajar. */
const cache = new Map();
function cargar(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = () => {
          cache.delete(url);
          reject(new Error('no cargó'));
        };
        img.src = url;
      })
    );
  }
  return cache.get(url);
}

/** Dibuja la vista calco de `url` en un canvas; se redibuja al cambiar el corte. */
function LienzoCalco({ url, corte, transparencia, className = '', lado }) {
  const ref = useRef(null);
  const [falla, setFalla] = useState(false);
  useEffect(() => {
    let vivo = true;
    setFalla(false);
    cargar(url)
      .then((img) => {
        if (!vivo || !ref.current) return;
        const ok = dibujarVistaCalco(ref.current, img, {
          corte,
          transparencia,
          lado,
          dpr: window.devicePixelRatio || 1
        });
        if (!ok) setFalla(true);
      })
      .catch(() => vivo && setFalla(true));
    return () => {
      vivo = false;
    };
  }, [url, corte, transparencia, lado]);
  if (falla) return null;
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/**
 * Silueta de un termo de 1 L. Es un DIBUJO y se ve como tal: la vista "En un
 * termo" muestra la ESCALA, no promete una foto del resultado (no se usan
 * renders — ver data/personalizadosFotos.js). El cuerpo va de x=20 a x=180 en
 * el viewBox: esos 160 son los `TERMO_CM` de ancho.
 */
const TERMO_VB = { w: 200, h: 520, cuerpo: 160 };
function Termo() {
  return (
    <svg viewBox={`0 0 ${TERMO_VB.w} ${TERMO_VB.h}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="termo-cuerpo" x1="0" x2="1">
          <stop offset="0" stopColor="#3b3b3b" />
          <stop offset="0.35" stopColor="#5a5a5a" />
          <stop offset="0.6" stopColor="#4a4a4a" />
          <stop offset="1" stopColor="#343434" />
        </linearGradient>
      </defs>
      <rect x="66" y="8" width="68" height="54" rx="10" fill="#2a2a2a" />
      <rect x="52" y="58" width="96" height="40" rx="8" fill="#3a3a3a" />
      <rect x="20" y="92" width="160" height="420" rx="34" fill="url(#termo-cuerpo)" />
      <rect x="40" y="110" width="10" height="380" rx="5" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
}

/**
 * Vista previa del diseño activo: ORIGINAL | VISTA CALCO | EN UN TERMO.
 * La calco y el termo se rotulan "Vista aproximada": son un dibujo hecho en el
 * navegador, no una prueba de producción.
 */
export default function VistaPrevia({ diseno, vista, corte, tamano, onVista }) {
  const url = diseno?.previewUrl || null;
  const sePuedeDibujar = Boolean(url);
  const actual = sePuedeDibujar ? vista : 'original';
  const tam = getTamano(tamano) || getTamano(TAMANO_MAS_ELEGIDO);

  const elegir = (v) => {
    if (v === vista) return;
    onVista(v);
    trackPersonalizedPreview(v);
  };

  // % del ancho del termo que ocupa la calco. El dibujo de la calco llena el
  // 88 % de su lienzo (el resto es aire para la sombra), por eso se compensa.
  const anchoCalcoEnTermo = (anchoEnTermo(tam.cm, TERMO_VB.cuerpo) / TERMO_VB.w / 0.88) * 100;

  return (
    <div className="card-glass p-3 sm:p-4" data-clarity-mask="true">
      <div role="group" aria-label="Cómo ver tu diseño" className="flex justify-center gap-1 rounded-full bg-white/[0.05] p-1 w-fit mx-auto">
        {VISTAS.map((v) => {
          const deshabilitada = v.id !== 'original' && !sePuedeDibujar;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => elegir(v.id)}
              disabled={deshabilitada}
              aria-pressed={actual === v.id}
              className={`min-h-[44px] px-3 sm:px-4 rounded-full text-xs sm:text-sm font-semibold transition-colors disabled:opacity-30 ${
                actual === v.id ? 'bg-white text-black' : 'text-white/70 hover:text-white'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="relative mt-3 aspect-square rounded-2xl overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_70%)] grid place-items-center">
        {actual === 'original' &&
          (url ? (
            <img src={url} alt="Tu diseño, tal como lo subiste" className="max-w-[88%] max-h-[88%] object-contain" />
          ) : (
            <div className="text-center px-6">
              <div className="text-5xl" aria-hidden="true">📄</div>
              <div className="text-sm text-white/70 mt-2 break-all">{diseno?.nombre}</div>
            </div>
          ))}

        {actual === 'calco' && url && (
          <LienzoCalco
            url={url}
            corte={corte}
            transparencia={diseno.transparencia}
            lado={480}
            className="w-[92%] h-[92%]"
          />
        )}

        {actual === 'termo' && url && (
          <div className="relative h-[94%] aspect-[200/520]">
            <Termo />
            <div className="absolute left-1/2 -translate-x-1/2 top-[42%]" style={{ width: `${anchoCalcoEnTermo}%` }}>
              <LienzoCalco url={url} corte={corte} transparencia={diseno.transparencia} lado={240} className="w-full h-auto aspect-square" />
            </div>
          </div>
        )}

        {actual !== 'original' && (
          <span className="absolute top-2 left-2 badge badge-soft !text-[10px]">{ROTULO_VISTA}</span>
        )}
        {actual === 'termo' && (
          <span className="absolute bottom-2 inset-x-2 text-center text-[11px] text-white/60">
            {tam.label} sobre un termo de ~{TERMO_CM} cm de ancho
          </span>
        )}
      </div>
    </div>
  );
}
