import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { NEGOCIO } from '../config/pricing.js';
import { contact } from '../config/site.js';
import { MATERIAL_HOLOGRAFICO_ID, RECARGO_HOLOGRAFICO, getMaterial } from '../config/personalizados.js';
import { lineasNegocio } from '../lib/lineasNegocio.js';
import SubidaArchivo from './personalizados/SubidaArchivo.jsx';

const NEGOCIO_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='72' text-anchor='middle' dominant-baseline='middle'>🏪</text></svg>`
  );

/** % de descuento contra el precio de lista, para el badge. */
const NEGOCIO_OFF = Math.round((1 - NEGOCIO.price / NEGOCIO.listPrice) * 100);

/** Vinilo Holográfico: nombre y descripción salen del mismo lugar que en /personalizados. */
const HOLOGRAFICO = getMaterial(MATERIAL_HOLOGRAFICO_ID);

/** Foto real de una tirada de calcos de logo. Si falta el archivo, la card va sin foto. */
const MUESTRA_SRC = '/images/negocio-muestra.webp';

/**
 * Promo Negocio: 100 calcos de un solo diseño (el logo del cliente) en 6 cm a $39.999
 * (precio de lista $96.999). El logo se sube acá (va con el pedido) o, si no, se
 * coordina por WhatsApp después de la compra.
 *
 * Tornasolado (spec 033): opcional y apagado. Suma el recargo del Vinilo
 * Holográfico como línea aparte —las líneas las arma `lineasNegocio()`, que
 * explica por qué—. El precio grande de la card sigue siendo el de la promo:
 * el recargo se ve en la opción y en el total.
 *
 * `conFoto={false}` (spec 031): /negocio ya muestra esta misma foto en su hero,
 * y repetida dos pantallas más abajo no suma nada. El título es `h2` porque el
 * `h1` de la página es el del hero.
 */
export default function NegocioForm({ conFoto = true }) {
  const { addNegocio, addFixed } = useCart();
  const navigate = useNavigate();
  const [business, setBusiness] = useState('');
  const [error, setError] = useState('');
  const [muestraOk, setMuestraOk] = useState(true);
  const [archivos, setArchivos] = useState([]); // [{ nombre, pesoMB, url }]
  const [tornasolado, setTornasolado] = useState(false);
  const total = NEGOCIO.price + (tornasolado ? RECARGO_HOLOGRAFICO.precio : 0);

  const onArchivosChange = useCallback((items) => setArchivos(items), []);

  const submit = (e) => {
    e.preventDefault();
    if (!business.trim()) {
      setError('Poné el nombre de tu negocio');
      return;
    }
    const { linea, recargo } = lineasNegocio({ business, archivos, tornasolado, imagen: NEGOCIO_IMG });
    addNegocio(linea);
    if (recargo) addFixed(recargo, 1);
    navigate('/carrito');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="card-glass overflow-hidden">
        {conFoto && muestraOk && (
          <div className="relative">
            <img
              src={MUESTRA_SRC}
              alt="Tirada de calcos con el logo de un cliente, recién impresos"
              decoding="async"
              onError={() => setMuestraOk(false)}
              className="w-full aspect-[4/3] object-cover"
            />
            {/* funde la foto con la card para que no corte como un rectángulo pegado.
                #1d1d1d es el color efectivo de .card-glass (rgba(32,32,32,.82) sobre #111). */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#1d1d1d] via-[#1d1d1d]/70 to-transparent" />
            <span className="badge absolute top-4 left-4 bg-black/60 text-white backdrop-blur-sm border border-white/15">
              Muestra real
            </span>
          </div>
        )}
        <div className="p-6 md:p-8">
        <span className="badge badge-new mb-3">Para tu negocio</span>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl">Promo Negocio</h2>
        <p className="text-white/80 mt-3">
          <strong className="text-white">100 calcos</strong> de un solo diseño (tu logo o el arte de tu
          marca) en <strong className="text-white">6 cm</strong>.
        </p>

        <div className="mt-5">
          <div className="flex items-center gap-2.5">
            <span className="text-white/45 text-xl md:text-2xl line-through decoration-white/40">
              {formatPrice(NEGOCIO.listPrice)}
            </span>
            <span className="badge badge-new">{NEGOCIO_OFF}% OFF</span>
          </div>
          <div className="font-display font-extrabold text-4xl md:text-5xl leading-none mt-1"
            style={{ backgroundImage: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {formatPrice(NEGOCIO.price)}
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-sm text-white/70">
          <li>✅ Ideal para bares, kioscos, peluquerías, marcas y emprendimientos.</li>
          <li>✅ Vinilo premium resistente al agua y al sol.</li>
          <li>✅ Subí tu logo acá o mandalo por WhatsApp después de pagar.</li>
        </ul>
        </div>
      </div>

      <div className="space-y-4">
        {/* El logo se puede subir acá (va con el pedido) o mandar por WhatsApp después de pagar. */}
        <SubidaArchivo
          tamanoCm={6}
          max={3}
          paso={null}
          titulo="Subí tu logo"
          sustantivo="archivos"
          preset={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO || undefined}
          descripcion="PNG, JPG, PDF, SVG o AI, hasta 10 MB cada uno. Si tenés el vectorial (AI, SVG, PDF), mejor: el corte sale más preciso. También podés mandarlo por WhatsApp después de pagar."
          onChange={onArchivosChange}
        />

        <form onSubmit={submit} className="card-glass p-6 md:p-8 space-y-5">
          <h3 className="font-display font-extrabold text-xl">Pedí tu promo</h3>
          <label className="block">
            <span className="text-sm text-white/70 mb-1.5 block">Nombre del negocio / marca *</span>
            <input
              type="text"
              value={business}
              onChange={(e) => { setBusiness(e.target.value); setError(''); }}
              placeholder="Ej: Bar La Esquina"
              className="input-dark"
            />
            {error && <span className="text-xs text-brand-pink mt-1 block">{error}</span>}
          </label>

          {/* Tornasolado (spec 033, RF-T1/T2): opcional, apagado de entrada.
              El recargo sale de RECARGO_HOLOGRAFICO —el mismo que cobra el
              servidor—, nunca escrito a mano. */}
          <label
            className={`flex items-start gap-3 rounded-xl p-4 border cursor-pointer transition-colors ${
              tornasolado ? 'border-brand-fuchsia bg-brand-fuchsia/10' : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}
          >
            <input
              type="checkbox"
              checked={tornasolado}
              onChange={(e) => setTornasolado(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#FF1B8D]"
            />
            {/* La descripción va debajo y a todo el ancho: al lado del precio,
                a 375 px quedaba en una columna de tres palabras por renglón. */}
            <span className="flex-1 min-w-0">
              <span className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 font-semibold text-white">
                  <span
                    aria-hidden
                    className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                    style={{ background: 'linear-gradient(135deg,#a5f3fc,#f0abfc,#fde68a,#a7f3d0)' }}
                  />
                  Hacelas tornasoladas
                </span>
                <span className="font-semibold text-white whitespace-nowrap">+{formatPrice(RECARGO_HOLOGRAFICO.precio)}</span>
              </span>
              <span className="block text-xs text-white/60 mt-1">
                {HOLOGRAFICO.label}. {HOLOGRAFICO.descripcion} Opcional.
              </span>
            </span>
          </label>

          <div className="rounded-xl p-4 border border-white/10 bg-white/5 text-sm space-y-1.5">
            <div className="flex justify-between"><span className="text-white/60">Cantidad</span><span>100 calcos</span></div>
            <div className="flex justify-between"><span className="text-white/60">Tamaño</span><span>6 cm</span></div>
            <div className="flex justify-between"><span className="text-white/60">Diseño</span><span>1 (tu logo)</span></div>
            {tornasolado && (
              <div className="flex justify-between">
                <span className="text-white/60">Tornasoladas</span>
                <span>+{formatPrice(RECARGO_HOLOGRAFICO.precio)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline font-display font-extrabold text-lg pt-1">
              <span>Total</span>
              <span className="flex items-baseline gap-2">
                {/* El tachado es el precio de lista de la PROMO. Con tornasolado
                    no se tacha nada: no hay un "precio de lista" holográfico, y
                    sumarle el recargo sería inventar uno. */}
                {!tornasolado && (
                  <span className="text-sm font-normal text-white/40 line-through decoration-white/40">
                    {formatPrice(NEGOCIO.listPrice)}
                  </span>
                )}
                <span>{formatPrice(total)}</span>
              </span>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">Agregar al carrito →</button>
          <p className="text-xs text-white/50 text-center">
            {archivos.length > 0
              ? `Ya tenemos tu logo. Cualquier detalle lo coordinamos por WhatsApp (${contact.whatsappDisplay}).`
              : `Si no lo subís acá, coordinamos tu logo por WhatsApp después del pago (${contact.whatsappDisplay}).`}
          </p>
        </form>
      </div>
    </div>
  );
}
