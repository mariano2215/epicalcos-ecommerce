import { useState, useCallback } from 'react';
import Breadcrumbs from './Breadcrumbs.jsx';
import SubidaArchivo from './personalizados/SubidaArchivo.jsx';
import { useCart, formatPrice } from '../context/CartContext.jsx';

/**
 * Página de producto de precio fijo (tatuajes / polaroid) con stepper de cantidad.
 * Si se pasa `upload`, muestra un uploader de archivos (mismo que personalizados) y
 * adjunta los archivos al pedido en `meta.archivos` (llegan al CRM vía el checkout).
 * @param {{ product:{id,name,price}, emoji:string, badge:string, title:string,
 *           subtitle:string, bullets:string[], specs?:{label:string,value:string}[], breadcrumb:string,
 *           upload?:{ titulo?:string, sustantivo?:string, formatos?:string[], descripcion?:import('react').ReactNode,
 *                     tamanoCm?:number|null, preset?:string, perUnit?:number, max?:number } }} props
 */
export default function FixedProductPage({ product, emoji, badge, title, subtitle, bullets, specs, breadcrumb, upload }) {
  const { addFixed } = useCart();
  const [qty, setQty] = useState(1);
  const [archivos, setArchivos] = useState([]);
  const onArchivosChange = useCallback((items) => setArchivos(items), []);

  // Cupo de archivos: por unidad (perUnit × cantidad) o un máximo fijo.
  const uploadMax = upload ? (upload.perUnit ? upload.perUnit * qty : upload.max ?? 10) : 0;

  const image =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='96' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`
    );

  const onAdd = () => {
    const meta = upload && archivos.length ? { archivos } : null;
    addFixed({ ...product, image, meta }, qty);
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: breadcrumb }]} />

        <div className="grid lg:grid-cols-2 gap-6 items-start mt-6">
          <div className="card-glass aspect-square grid place-items-center text-[8rem]">{emoji}</div>

          <div className="card-glass p-6 md:p-8">
            <span className="badge badge-new mb-3">{badge}</span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl">{title}</h1>
            <p className="text-white/70 mt-3">{subtitle}</p>

            <div className="mt-5 font-display font-extrabold text-3xl"
              style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {formatPrice(product.price)}
            </div>

            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {bullets.map((b) => <li key={b}>✅ {b}</li>)}
            </ul>

            {specs && specs.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-2">
                {specs.map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">{label}</dt>
                    <dd className="text-sm font-semibold text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar">–</button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setQty((q) => q + 1)} aria-label="Sumar">+</button>
              </div>
              <button onClick={onAdd} className="btn-primary flex-1">
                Agregar · {formatPrice(product.price * qty)}
              </button>
            </div>

            {upload && (
              <p className="mt-3 text-xs text-white/50">
                📸 {archivos.length > 0
                  ? `${archivos.length} archivo${archivos.length > 1 ? 's' : ''} listo${archivos.length > 1 ? 's' : ''} — se suman al pedido.`
                  : 'Subí tus fotos abajo antes de agregar (o mandalas por WhatsApp después).'}
              </p>
            )}
          </div>
        </div>

        {upload && (
          <div className="mt-6 lg:max-w-2xl">
            <SubidaArchivo
              tamanoCm={upload.tamanoCm ?? null}
              max={uploadMax}
              paso={null}
              titulo={upload.titulo}
              sustantivo={upload.sustantivo}
              formatos={upload.formatos}
              descripcion={upload.descripcion}
              preset={upload.preset}
              onChange={onArchivosChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
