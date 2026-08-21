import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { imprimibleOff } from '../config/pricing.js';
import { contact } from '../config/site.js';
import { DIGITAL_SKU } from '../config/metaCatalog.js';
import { trackViewItem } from '../lib/analytics.js';

/** Imagen de respaldo si todavía no hay foto del pack: el emoji sobre la card. */
const fallbackImg = (emoji) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='96' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`
  );

/**
 * Card de compra de un pack de ARCHIVOS IMPRIMIBLES (producto digital).
 *
 * Mismo formato que la card de /negocio (foto arriba, precio grande, checklist,
 * panel de compra al costado), con dos diferencias que importan:
 *  - no hay formulario ni archivos que subir: se compra y listo;
 *  - el precio es fijo y NO admite cupones ni descuentos (ver IMPRIMIBLES en
 *    config/pricing.js), así que la card lo dice en vez de prometer un 10 % que
 *    el checkout no le va a aplicar.
 *
 * @param {{ pack: { id: string, name: string, price: number, disenos: number|null,
 *                   emoji: string, formatos: string, resumen: string },
 *           photo?: string, incluye: string[] }} props
 */
export default function ImprimiblesCard({ pack, photo, incluye }) {
  const { addDigital } = useCart();
  const navigate = useNavigate();
  const [fotoOk, setFotoOk] = useState(Boolean(photo));

  const image = photo && fotoOk ? photo : fallbackImg(pack.emoji);
  // % de descuento contra el precio de lista. 0 si el pack no tiene `listPrice`,
  // y en ese caso no se muestra ni el tachado ni el cartel.
  const off = imprimibleOff(pack);

  // Meta Pixel / GA4: ViewContent con el SKU del catálogo, igual que el resto
  // de las líneas especiales (ver FixedProductPage).
  useEffect(() => {
    trackViewItem({
      id: `digital:${pack.id}`,
      catalogSku: DIGITAL_SKU[pack.id],
      name: pack.name,
      categoryLabel: 'Archivos imprimibles',
      price: pack.price
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  const comprar = () => {
    addDigital({ ...pack, image });
    navigate('/carrito');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="card-glass overflow-hidden">
        {photo && fotoOk && (
          <div className="relative">
            <img
              src={photo}
              alt={`Muestra de los diseños incluidos en el ${pack.name.toLowerCase()}`}
              decoding="async"
              onError={() => setFotoOk(false)}
              className="w-full aspect-[4/3] object-cover"
            />
            {/* Funde la foto con la card para que no corte como un rectángulo
                pegado. #1d1d1d es el color efectivo de .card-glass. */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#1d1d1d] via-[#1d1d1d]/70 to-transparent" />
            <span className="badge absolute top-4 left-4 bg-black/60 text-white backdrop-blur-sm border border-white/15">
              Muestra del pack
            </span>
          </div>
        )}

        <div className="p-6 md:p-8">
          <span className="badge badge-new mb-3">Descarga digital</span>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">{pack.name}</h1>
          <p className="text-white/80 mt-3">
            {pack.disenos ? (
              <>
                <strong className="text-white">+{pack.disenos.toLocaleString('es-AR')} diseños</strong> listos
                para imprimir.{' '}
              </>
            ) : (
              <>
                <strong className="text-white">Un montón de diseños</strong> listos para imprimir.{' '}
              </>
            )}
            Los recibís por mail apenas se acredita el pago: no te enviamos nada físico, los imprimís vos.
          </p>

          <div className="mt-5">
            {/* Precio de lista tachado ARRIBA del precio real, con el % al lado.
                El % sale de `imprimibleOff()` y no escrito a mano: así un cambio
                de precio no deja el cartel prometiendo un descuento vencido. */}
            {off > 0 && (
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-white/45 line-through text-lg" aria-label={`Precio de lista ${formatPrice(pack.listPrice)}`}>
                  {formatPrice(pack.listPrice)}
                </span>
                <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                  {off}% OFF
                </span>
              </div>
            )}
            <div className="font-display font-extrabold text-4xl md:text-5xl leading-none"
              style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {formatPrice(pack.price)}
            </div>
            <div className="text-sm text-white/50 mt-1.5">Pago único · lo descargás las veces que quieras</div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-white/70">
            {incluye.map((b) => <li key={b}>✅ {b}</li>)}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-glass p-6 md:p-8 space-y-5">
          <h2 className="font-display font-extrabold text-xl">Comprá el pack</h2>

          <div className="rounded-xl p-4 border border-white/10 bg-white/5 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-white/60">Producto</span><span>Archivos digitales</span></div>
            <div className="flex justify-between"><span className="text-white/60">Formato</span><span>{pack.formatos}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Entrega</span><span>Por mail</span></div>
            {/* La fila "Envío · Sin envío" se sacó: en un producto que se entrega
                por mail, nombrar el envío para decir que no hay planta una duda
                que nadie tenía. La entrega ya está dicha en la fila de arriba. */}
            <div className="flex justify-between items-baseline font-display font-extrabold text-lg pt-1">
              <span>Total</span>
              <span className="flex items-baseline gap-2">
                {off > 0 && (
                  <span className="text-sm font-semibold text-white/40 line-through">{formatPrice(pack.listPrice)}</span>
                )}
                <span>{formatPrice(pack.price)}</span>
              </span>
            </div>
          </div>

          <button type="button" onClick={comprar} className="btn-primary w-full">
            Comprar y recibir por mail →
          </button>

          {/* El precio es fijo: decirlo acá evita que alguien llegue al checkout
              a escribir un cupón que la línea digital no acepta. */}
          <p className="text-xs text-white/50 text-center">
            Precio fijo: no admite cupones ni descuentos por cantidad.
          </p>
        </div>

        <div className="card-glass p-6 space-y-3 text-sm text-white/70">
          <h3 className="font-display font-extrabold text-base text-white">Cómo lo recibís</h3>
          <ol className="space-y-2">
            <li><strong className="text-white">1.</strong> Pagás con Mercado Pago o por transferencia.</li>
            <li><strong className="text-white">2.</strong> Te llega un mail a la casilla que dejes en el checkout, con el link de descarga.</li>
            <li><strong className="text-white">3.</strong> Descargás los archivos y los imprimís donde quieras, las veces que quieras.</li>
          </ol>
          <p className="text-xs text-white/50 pt-1">
            ¿No te llegó? Revisá spam y escribinos por WhatsApp al{' '}
            <a href={contact.whatsappUrl} target="_blank" rel="noreferrer" className="text-brand-fuchsia font-semibold">
              {contact.whatsappDisplay}
            </a>{' '}
            — te lo reenviamos.
          </p>
        </div>
      </div>
    </div>
  );
}
