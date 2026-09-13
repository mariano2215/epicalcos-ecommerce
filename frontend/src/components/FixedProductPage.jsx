import { useState, useCallback, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs.jsx';
import SubidaArchivo from './personalizados/SubidaArchivo.jsx';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { trackViewItem } from '../lib/analytics.js';
import { FIXED_SKU } from '../config/metaCatalog.js';

/**
 * Página de producto de precio fijo (tatuajes / polaroid) con stepper de cantidad.
 * Si se pasa `upload`, muestra un uploader de archivos (mismo que personalizados) y
 * adjunta los archivos al pedido en `meta.archivos` (llegan al CRM vía el checkout).
 * Si se pasa `sizes`, muestra un selector de tamaño: el precio sale de la opción
 * elegida y el id del carrito pasa a ser `{product.id}-{size.id}` (el backend
 * valida cada variante por su id en FIXED_PRICES).
 *
 * `variants` + `pricing` (spec 019) agregan un SEGUNDO eje de variante —el
 * material de las Polaroid— y un precio que puede depender de la cantidad.
 * Los dos son OPCIONALES y van juntos: sin ellos el componente se comporta
 * exactamente como antes, que es lo que necesita /tatuajes. El componente no
 * sabe nada de imanes ni de escalones: delega en `pricing`, porque la regla de
 * precio vive en config/pricing.js y ahí está espejada contra el servidor.
 *
 * @param {{ product:{id,name,price}, emoji:string, photo?:string, badge:string, title:string,
 *           sizes?:{id:string,label:string,tag?:string,price:number}[],
 *           variants?:{ label:string, options:{id:string,label:string,hint?:string}[] },
 *           pricing?:{ listPrice:(sizeId:string,variantId:string)=>number,
 *                      unitPrice:(sizeId:string,variantId:string,packs:number)=>number,
 *                      productId:(sizeId:string,variantId:string)=>string,
 *                      lineName:(sel:{size:object,variant:object})=>string,
 *                      aviso?:(packs:number)=>string|null },
 *           nota?:string, onVariantChange?:(variantId:string,sizeId:string)=>void,
 *           subtitle:string, bullets:string[], specs?:{label:string,value:string}[], breadcrumb:string,
 *           upload?:{ titulo?:string, sustantivo?:string, formatos?:string[], descripcion?:import('react').ReactNode,
 *                     tamanoCm?:number|null, preset?:string, perUnit?:number, max?:number } }} props
 */
export default function FixedProductPage({ product, emoji, photo, badge, title, subtitle, bullets, specs, breadcrumb, upload, sizes, variants, pricing, nota, onVariantChange }) {
  const { addFixed } = useCart();
  const [qty, setQty] = useState(1);
  const [archivos, setArchivos] = useState([]);
  const [sizeId, setSizeId] = useState(sizes?.[0]?.id ?? null);
  const [variantId, setVariantId] = useState(variants?.options?.[0]?.id ?? null);
  const onArchivosChange = useCallback((items) => setArchivos(items), []);

  const selectedSize = sizes?.find((s) => s.id === sizeId) ?? null;
  const selectedVariant = variants?.options?.find((v) => v.id === variantId) ?? null;

  // Precio por unidad. Sin `pricing` es el de siempre (el del tamaño, o el del
  // producto); con `pricing` lo decide el producto, que es el único que sabe de
  // materiales y de escalones por cantidad.
  const precioUnitario = (sId, vId, packs) =>
    pricing
      ? pricing.unitPrice(sId, vId, packs)
      : sizes?.find((s) => s.id === sId)?.price ?? product.price;

  const unitPrice = precioUnitario(sizeId, variantId, qty);
  const avisoVolumen = pricing?.aviso ? pricing.aviso(qty) : null;

  // Meta Pixel / GA4: ViewContent al abrir la página, con el SKU del catálogo.
  // Se repite al cambiar de tamaño o de material: es otra variante y otro
  // precio, y reportar siempre el de la primera dejaba a Meta optimizando
  // contra un valor que el cliente nunca vio. El precio es el de UN pack —no
  // el del stepper— para que mover la cantidad no dispare eventos.
  const variantProductId = pricing ? pricing.productId(sizeId, variantId) : product.id;
  useEffect(() => {
    trackViewItem({
      id: `fixed:${variantProductId}`,
      catalogSku: FIXED_SKU[variantProductId],
      name: product.name,
      categoryLabel: badge || 'Especial',
      price: precioUnitario(sizeId, variantId, 1)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, sizeId, variantId]);

  // Cupo de archivos: por unidad (perUnit × cantidad) o un máximo fijo.
  const uploadMax = upload ? (upload.perUnit ? upload.perUnit * qty : upload.max ?? 10) : 0;

  const image =
    photo ??
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='96' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`
    );

  const onAdd = () => {
    const meta = upload && archivos.length ? { archivos } : null;
    // ⚠️ `price` es el de LISTA de la variante, NO el que muestra el botón: es
    // el que se guarda como `basePrice` de la línea. El descuento por cantidad
    // lo deriva `precioVidrieraLinea()` en cada render — guardarlo acá es la
    // trampa que ese comentario documenta (un carrito guardado mandaría después
    // un precio que ya no es el vigente y trabaría TODO el checkout).
    const cartProduct = pricing
      ? {
          id: pricing.productId(sizeId, variantId),
          name: pricing.lineName({ size: selectedSize, variant: selectedVariant }),
          price: pricing.listPrice(sizeId, variantId)
        }
      : selectedSize
        ? { id: `${product.id}-${selectedSize.id}`, name: `${product.name} · ${selectedSize.label}`, price: selectedSize.price }
        : product;
    addFixed({ ...cartProduct, image, meta }, qty);
  };

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: 'Categorías', to: '/categorias' }, { name: breadcrumb }]} />

        <div className="grid lg:grid-cols-2 gap-6 items-start mt-6">
          {photo ? (
            <div className="card-glass aspect-square overflow-hidden">
              <img src={photo} alt={title} className="w-full h-full object-cover rounded-2xl" loading="eager" />
            </div>
          ) : (
            <div className="card-glass aspect-square grid place-items-center text-[8rem]">{emoji}</div>
          )}

          <div className="card-glass p-6 md:p-8">
            <span className="badge badge-new mb-3">{badge}</span>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl">{title}</h1>
            <p className="text-white/80 mt-3">{subtitle}</p>

            <div className="mt-5 font-display font-extrabold text-3xl"
              style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {formatPrice(unitPrice)}
            </div>

            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {bullets.map((b) => <li key={b}>✅ {b}</li>)}
            </ul>

            {sizes && sizes.length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Tamaño</div>
                <div className="grid gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSizeId(s.id)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        sizeId === s.id
                          ? 'border-brand-fuchsia bg-brand-fuchsia/10'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                      }`}
                    >
                      <span>
                        <span className="text-sm font-semibold text-white">{s.label}</span>
                        {s.tag && <span className="ml-2 text-xs text-white/50">{s.tag}</span>}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {formatPrice(precioUnitario(s.id, variantId, qty))}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/50">{nota ?? 'El precio es por el pack de 10 fotos.'}</p>
              </div>
            )}

            {variants?.options?.length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{variants.label}</div>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={variants.label}>
                  {variants.options.map((v) => {
                    const elegida = variantId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={elegida}
                        onClick={() => {
                          setVariantId(v.id);
                          onVariantChange?.(v.id, sizeId);
                        }}
                        className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          elegida
                            ? 'border-brand-fuchsia bg-brand-fuchsia/10'
                            : 'border-white/10 bg-white/[0.04] hover:border-white/25'
                        }`}
                      >
                        <span className="block text-sm font-semibold text-white">
                          {/* El ✓ es lo que distingue la opción elegida sin depender del color */}
                          {elegida ? '✓ ' : ''}{v.label}
                        </span>
                        {v.hint && <span className="block text-xs text-white/50 mt-0.5">{v.hint}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                Agregar · {formatPrice(unitPrice * qty)}
              </button>
            </div>

            {avisoVolumen && <p className="mt-3 text-xs text-brand-fuchsia">{avisoVolumen}</p>}

            {upload && (
              <p className="mt-3 text-xs text-white/50">
                📸 {archivos.length > 0
                  ? `${archivos.length} archivo${archivos.length > 1 ? 's' : ''} listo${archivos.length > 1 ? 's' : ''} — se suman al pedido.`
                  : `Subí tus ${upload.sustantivo ?? 'archivos'} abajo antes de agregar, o mandá todo por WhatsApp después.`}
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
