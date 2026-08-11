import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { SIZES, DEFAULT_SIZE, priceForSize, round, BULK_THRESHOLD, BULK_DISCOUNT } from '../config/pricing.js';
import { categoryName } from '../data/categories.js';
import { trackPackBuilderStart, trackPackCompleted } from '../lib/analytics.js';
import CategoryMenu from './CategoryMenu.jsx';
import SubidaArchivo from './personalizados/SubidaArchivo.jsx';

const CUSTOM_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='64' text-anchor='middle' dominant-baseline='middle'>🎨</text></svg>`
  );

/**
 * Armador de packs ("armá tu pack"). Un solo tamaño para todo el pack y descuento
 * fijo según el tipo. Sirve para Mayorista (mín 100, 50%) y Personalizados (mín 10, 10%).
 *
 * `promo` (opcional) = promo de PRECIO FIJO por tiempo limitado: `qty` calcos a
 * `price`, solo en los tamaños de `sizes`. Mientras esté activa Y el tamaño
 * elegido entre en la promo, el pack pasa a ser de cantidad EXACTA (`qty`) y
 * precio fijo; en cualquier otro tamaño el armador vuelve solo al pack normal.
 *
 * `emit` decide QUÉ va al carrito:
 *   'pack'     (default) → UNA línea `pack:…` con su propio precio ya
 *                          descontado. Es lo que necesitan Mayorista y
 *                          Personalizados, que tienen regla propia en el
 *                          servidor (netlify/functions/lib/pricing.js).
 *   'stickers'            → una línea `sticker:…` POR DISEÑO, al precio normal
 *                          del catálogo. Sirve para los packs x10/x20/x50, que
 *                          NO son una regla de precio nueva sino una forma
 *                          guiada de elegir: el 10 % por transferencia desde 10
 *                          calcos les aplica solo, sin inventar descuentos ni
 *                          tocar el espejo de precios del servidor.
 *
 * @param {{ packType:'mayorista'|'personalizados'|'catalogo', target?:number, min?:number,
 *           discount:number, title:string, subtitle:string, allowCustom?:boolean,
 *           emit?:'pack'|'stickers', packSizeLabel?:string,
 *           promo?:{ active:boolean, qty:number, price:number, sizes:string[] } }} props
 */
export default function PackBuilder({
  packType, target, min, discount, title, subtitle, allowCustom, defaultSize, promo,
  emit = 'pack', packSizeLabel
}) {
  const { addPack, addSticker } = useCart();
  const navigate = useNavigate();

  const [size, setSize] = useState(defaultSize || DEFAULT_SIZE);
  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [catItems, setCatItems] = useState([]);
  const [visible, setVisible] = useState(60);
  const [selection, setSelection] = useState({}); // id -> { id, image, name, category, qty }
  const [customCount, setCustomCount] = useState(0);
  const [customFiles, setCustomFiles] = useState([]); // [{ nombre, pesoMB, url }] subidos a Cloudinary
  const [showCustom, setShowCustom] = useState(false);

  // ¿Este tamaño está bajo la promo de precio fijo? (4 y 6 cm sí, 9 cm no).
  const promoOn = !!promo?.active && promo.sizes.includes(size);
  // Con la promo, el pack es de cantidad EXACTA (100). Sin promo, manda `target`.
  const effTarget = promoOn ? promo.qty : target;

  const cap = effTarget || Infinity; // con promo: tope 100

  /**
   * Arranque del armador — primer escalón del funnel de packs. El ref lo hace
   * idempotente: el doble efecto de StrictMode lo mandaría dos veces y el
   * denominador de `pack_completed / pack_builder_start` quedaría a la mitad.
   */
  const inicioEnviado = useRef(false);
  useEffect(() => {
    if (inicioEnviado.current) return;
    inicioEnviado.current = true;
    trackPackBuilderStart(packSizeLabel || (target ? `x${target}` : packType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar lista de categorías
  useEffect(() => {
    fetch('/data/catalog.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setCats(list);
        if (list.length) setActiveCat(list[0].slug);
      })
      .catch(() => setCats([]));
  }, []);

  // Cargar stickers de la categoría activa
  useEffect(() => {
    if (!activeCat) return;
    setVisible(60);
    fetch(`/data/${activeCat}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCatItems)
      .catch(() => setCatItems([]));
  }, [activeCat]);

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((a, s) => a + s.qty, 0) + customCount,
    [selection, customCount]
  );

  const remaining = effTarget ? Math.max(0, effTarget - totalSelected) : 0;
  // Sobrante: solo pasa si venía de un tamaño sin tope (9 cm) y cambia a uno con promo.
  const excess = effTarget ? Math.max(0, totalSelected - effTarget) : 0;
  const listUnit = priceForSize(size);

  /**
   * Pack de catálogo (`emit="stickers"`): al carrito van calcos SUELTAS al
   * precio de lista, y el 10 % recién se aplica en el checkout si el cliente
   * elige transferencia. Así que acá se muestra el precio de lista como total
   * —que es lo que va a ver en el carrito— y el de transferencia al lado, con
   * su condición. Mostrar solo el precio con descuento haría que el armador
   * prometa $14.400 y el carrito diga $16.000.
   *
   * Mayorista y personalizados no tienen este problema: su descuento va dentro
   * del `basePrice` de la línea y no depende del medio de pago.
   */
  const esCatalogo = emit === 'stickers';
  const unit = promoOn
    ? promo.price / promo.qty
    : esCatalogo
    ? listUnit
    : round(listUnit * (1 - discount));
  const totalPrice = promoOn ? promo.price : unit * totalSelected;

  // Precio con el 10 % por transferencia, solo si ya llegó al umbral.
  const aplicaTransferencia = esCatalogo && totalSelected >= BULK_THRESHOLD;
  const unitTransferencia = round(listUnit * (1 - BULK_DISCOUNT));
  const totalTransferencia = unitTransferencia * totalSelected;
  /** % off real de la promo contra el precio de lista de ESTE tamaño (67% en 4cm, 75% en 6cm). */
  const promoOff = promoOn ? Math.round((1 - promo.price / (listUnit * promo.qty)) * 100) : 0;
  const offLabel = promoOn ? promoOff : Math.round(discount * 100);
  const valid = effTarget ? totalSelected === effTarget : totalSelected >= (min || 1);

  const addOne = (item) => {
    if (totalSelected >= cap) return;
    setSelection((sel) => {
      const cur = sel[item.id];
      return { ...sel, [item.id]: { ...item, qty: (cur?.qty || 0) + 1 } };
    });
  };
  const bump = (id, delta) => {
    setSelection((sel) => {
      const cur = sel[id];
      if (!cur) return sel;
      const qty = cur.qty + delta;
      if (qty <= 0) {
        const { [id]: _, ...rest } = sel;
        return rest;
      }
      if (delta > 0 && totalSelected >= cap) return sel;
      return { ...sel, [id]: { ...cur, qty } };
    });
  };
  // Cantidad escrita a mano (ya clampeada por QtyInput). Para llevarla a 0 se usa el "–".
  const setQtyExact = (id, n) => {
    setSelection((sel) => {
      const cur = sel[id];
      if (!cur) return sel;
      return { ...sel, [id]: { ...cur, qty: n } };
    });
  };
  const fillRemaining = () => {
    // Completa hasta el target con el último diseño seleccionado (o el primero)
    if (!effTarget || remaining <= 0) return;
    const last = Object.values(selection).slice(-1)[0];
    if (!last) return;
    setSelection((sel) => ({ ...sel, [last.id]: { ...last, qty: last.qty + remaining } }));
  };

  const confirm = () => {
    if (!valid) return;
    const seleccionados = Object.values(selection);

    trackPackCompleted({
      packSize: packSizeLabel || (effTarget ? `x${effTarget}` : packType),
      units: totalSelected,
      designs: seleccionados.length,
      value: totalPrice
    });

    // Pack de catálogo: van calcos SUELTAS al carrito, al precio de lista. El
    // descuento por volumen (10 % desde 10, por transferencia) lo aplica solo
    // el CartContext, y el servidor las valida con la regla `sticker:` de
    // siempre — sin tipo de línea nuevo que espejar.
    if (emit === 'stickers') {
      for (const s of seleccionados) {
        addSticker(
          { id: s.id, sku: s.sku, name: s.name, image: s.image, category: s.category, categoryLabel: categoryName(s.category) },
          size,
          s.qty,
          { openDrawer: false, silent: true }
        );
      }
      navigate('/carrito');
      return;
    }

    const items = seleccionados.map((s) => ({ id: s.id, name: s.name, qty: s.qty }));
    const sizeObj = SIZES.find((s) => s.id === size);
    const cover = Object.values(selection)[0]?.image || CUSTOM_IMG;
    // Con la promo, la línea es UN pack de precio fijo (quantity 1, `qty` calcos
    // adentro); sin promo, es la de siempre (precio por calco × cantidad).
    const lineType = promoOn ? 'mayorista100' : packType;
    const label = promoOn
      ? `Pack Mayorista PROMO x${promo.qty} · ${sizeObj.label}`
      : packType === 'mayorista'
      ? `Pack Mayorista x${totalSelected} · ${sizeObj.label}`
      : `Personalizados x${totalSelected} · ${sizeObj.label}`;
    addPack({
      id: `pack:${lineType}:${size}:${Date.now()}`,
      name: label,
      categoryLabel: packType === 'mayorista' ? 'Pack Mayorista' : 'Personalizados',
      image: cover,
      size,
      basePrice: promoOn ? promo.price : unit,
      quantity: promoOn ? 1 : totalSelected,
      meta: {
        packType: lineType,
        size,
        ...(promoOn ? { qty: promo.qty, promo: '100x39999' } : { discount }),
        items,
        customCount,
        archivos: customFiles.length ? customFiles : null
      }
    });
    navigate('/carrito');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel de armado */}
      <div className="lg:col-span-2 min-w-0 space-y-6">
        <header>
          {/* El pack de catálogo no tiene un % propio: su descuento es el 10 %
              por transferencia, con condición. Prometerlo suelto en un badge
              sería la misma trampa que el viejo "10% off automático". */}
          <span className="badge badge-hot mb-3">
            {esCatalogo ? `${totalSelected || effTarget || min} calcos` : `${offLabel}% OFF`}
          </span>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">{title}</h1>
          <p className="text-white/60 mt-2 max-w-xl">{subtitle}</p>
        </header>

        {/* Paso 1: tamaño */}
        <div className="card-glass p-5">
          <div className="text-sm font-semibold mb-3">1 · Elegí el tamaño del pack</div>
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {SIZES.map((s) => {
              const active = s.id === size;
              const enPromo = !!promo?.active && promo.sizes.includes(s.id);
              // En un pack de catálogo el precio del selector es el de LISTA:
              // el 10 % depende del medio de pago y se aclara abajo, en el total.
              const u = esCatalogo ? s.price : round(s.price * (1 - discount));
              return (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={`relative rounded-xl py-2 border transition-colors ${
                    active
                      ? 'border-brand-fuchsia bg-brand-fuchsia/15'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                  }`}
                >
                  {enPromo && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-full bg-brand-fuchsia text-white">
                      PROMO
                    </span>
                  )}
                  <span className="block text-sm font-bold">{s.label}</span>
                  <span className="block text-[11px] text-white/50">
                    {enPromo ? `${promo.qty} × ${formatPrice(promo.price)}` : `${formatPrice(u)} c/u`}
                  </span>
                </button>
              );
            })}
          </div>
          {promo?.active && (
            <p className="text-xs text-white/50 mt-3">
              {promoOn
                ? `La promo son ${promo.qty} calcos exactas a ${formatPrice(promo.price)}. En 9 cm no aplica: ahí el pack sigue siendo desde ${min || promo.qty} calcos con ${Math.round(discount * 100)}% off.`
                : `El 9 cm queda fuera de la promo: pack desde ${min || promo.qty} calcos con ${Math.round(discount * 100)}% off. Elegí 4 o 6 cm para llevarte ${promo.qty} calcos a ${formatPrice(promo.price)}.`}
            </p>
          )}
        </div>

        {/* Paso 2: elegir diseños */}
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">
              2 · Elegí los diseños {effTarget ? `(${effTarget} en total)` : `(mínimo ${min})`}
            </div>
            {allowCustom && (
              <button
                onClick={() => {
                  setShowCustom(true);
                  setCustomCount((c) => (c === 0 ? 1 : c));
                }}
                className="btn-secondary !py-1.5 !px-3 text-xs"
              >
                🎨 + Diseño propio
              </button>
            )}
          </div>

          {/* Menú de categorías colapsable (hamburguesa) */}
          <CategoryMenu
            slugs={cats.map((c) => c.slug)}
            activeSlug={activeCat}
            onSelect={setActiveCat}
          />

          {/* Grilla de stickers */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {catItems.slice(0, visible).map((it) => {
              const id = it.id;
              const name = `${categoryName(activeCat)} #${id.split('-').pop()}`;
              const qty = selection[id]?.qty || 0;
              return (
                <button
                  key={id}
                  onClick={() => addOne({ id, sku: it.sku, image: it.file, name, category: activeCat })}
                  disabled={totalSelected >= cap && !qty}
                  className={`relative rounded-xl border bg-white/[0.03] p-2 aspect-square grid place-items-center transition-colors ${
                    qty ? 'border-brand-fuchsia' : 'border-white/10 hover:border-white/25'
                  } disabled:opacity-40`}
                  title={name}
                >
                  <img
                    src={it.file}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    width={320}
                    height={320}
                    className="max-w-full max-h-full object-contain"
                  />
                  {qty > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 grid place-items-center min-w-[20px] h-5 px-1 text-[11px] font-bold rounded-full bg-brand-fuchsia">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {visible < catItems.length && (
            <button onClick={() => setVisible((v) => v + 60)} className="btn-ghost mt-3">
              Ver más diseños
            </button>
          )}
        </div>

        {/* Diseño propio: cantidad de calcos + subida de archivos */}
        {allowCustom && showCustom && (
          <div className="space-y-3">
            <div className="card-glass p-5 border border-brand-fuchsia/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">🎨 Calcos con tu diseño</div>
                <div className="text-xs text-white/50 mt-0.5">
                  Poné cuántos querés (podés repetir el mismo diseño) y subí los archivos abajo.
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomCount((c) => Math.max(0, c - 1))}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10"
                  aria-label="Restar"
                >–</button>
                <QtyInput
                  value={customCount}
                  onChange={(n) => setCustomCount(n)}
                  ariaLabel="Cantidad de calcos con tu diseño"
                />
                <button
                  type="button"
                  onClick={() => setCustomCount((c) => c + 1)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10"
                  aria-label="Sumar"
                >+</button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomCount(0);
                    setCustomFiles([]);
                  }}
                  className="btn-ghost !text-xs ml-1"
                >
                  Quitar
                </button>
              </div>
            </div>
            <SubidaArchivo
              paso={null}
              titulo="Subí tus diseños"
              sustantivo="diseños"
              tamanoCm={parseInt(size, 10) || null}
              onChange={setCustomFiles}
            />
          </div>
        )}
      </div>

      {/* Resumen / bandeja */}
      <aside className="card-glass p-5 h-fit lg:sticky lg:top-24 space-y-4">
        <h3 className="font-display font-extrabold text-lg">Tu pack</h3>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-display font-extrabold">{totalSelected}</div>
            <div className="text-xs text-white/50">
              {effTarget ? `de ${effTarget} calcos` : `calcos (mín. ${min})`}
            </div>
          </div>
          {effTarget && remaining > 0 && Object.keys(selection).length > 0 && (
            <button onClick={fillRemaining} className="btn-secondary !py-1.5 !px-3 text-xs">
              Completar {remaining}
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {Object.values(selection).map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <img
                src={s.image}
                alt={s.name}
                loading="lazy"
                decoding="async"
                width={36}
                height={36}
                className="w-9 h-9 rounded-lg object-contain bg-white/5"
              />
              <span className="flex-1 truncate text-white/80">{s.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => bump(s.id, -1)} className="w-6 h-6 rounded bg-white/5 border border-white/10">–</button>
                <QtyInput
                  value={s.qty}
                  onChange={(n) => setQtyExact(s.id, n)}
                  max={cap === Infinity ? Infinity : Math.max(1, cap - (totalSelected - s.qty))}
                  ariaLabel={`Cantidad de ${s.name}`}
                />
                <button onClick={() => bump(s.id, +1)} className="w-6 h-6 rounded bg-white/5 border border-white/10">+</button>
              </div>
            </div>
          ))}
          {customCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center">🎨</span>
              <span className="flex-1 text-white/80 truncate">
                Diseños propios
                {customFiles.length > 0 && (
                  <span className="text-white/45"> · {customFiles.length} archivo{customFiles.length > 1 ? 's' : ''}</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCustomCount((c) => Math.max(0, c - 1))} className="w-6 h-6 rounded bg-white/5 border border-white/10">–</button>
                <QtyInput
                  value={customCount}
                  onChange={(n) => setCustomCount(n)}
                  max={cap === Infinity ? Infinity : Math.max(1, cap - (totalSelected - customCount))}
                  ariaLabel="Cantidad de diseños propios"
                />
                <button onClick={() => totalSelected < cap && setCustomCount((c) => c + 1)} className="w-6 h-6 rounded bg-white/5 border border-white/10">+</button>
              </div>
            </div>
          )}
          {totalSelected === 0 && (
            <p className="text-white/40 text-sm">Tocá los diseños para sumarlos al pack.</p>
          )}
        </div>

        <div className="border-t border-white/10 pt-3">
          <div className="flex justify-between text-white/70 text-sm mb-1">
            <span>Precio por calco</span>
            <span>{promoOn ? `≈ ${formatPrice(unit)}` : formatPrice(unit)}</span>
          </div>
          <div className="flex justify-between font-display font-extrabold text-xl">
            <span>Total</span>
            <span className="flex items-baseline gap-2">
              {promoOn && (
                <span className="text-sm font-normal text-white/40 line-through decoration-white/40">
                  {formatPrice(listUnit * promo.qty)}
                </span>
              )}
              <span>{formatPrice(totalPrice)}</span>
            </span>
          </div>
          {esCatalogo ? (
            aplicaTransferencia ? (
              <div className="mt-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-2">
                <div className="flex justify-between text-sm text-emerald-400 font-semibold">
                  <span>Pagando por transferencia</span>
                  <span>{formatPrice(totalTransferencia)}</span>
                </div>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  {formatPrice(unitTransferencia)} por calco · 10% off. Elegís el medio de pago en el checkout.
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/50 mt-1">
                Desde {BULK_THRESHOLD} calcos, 10% off pagando por transferencia bancaria.
              </p>
            )
          ) : (
            <p className="text-xs text-emerald-400 mt-1">
              {promoOn
                ? `Precio fijo de la promo · ${promoOff}% de descuento`
                : `${Math.round(discount * 100)}% de descuento aplicado`}
            </p>
          )}
        </div>

        <button onClick={confirm} disabled={!valid} className="btn-primary w-full">
          {valid
            ? 'Agregar al carrito →'
            : excess > 0
            ? `Quitá ${excess} calco${excess === 1 ? '' : 's'}`
            : effTarget
            ? `Faltan ${remaining} calcos`
            : `Mínimo ${min} calcos`}
        </button>
        {allowCustom && (
          <p className="text-xs text-white/50 text-center">
            Subí tus diseños propios en “+ Diseño propio” o coordinálos por WhatsApp después de la compra.
          </p>
        )}
      </aside>
    </div>
  );
}

/**
 * Cantidad editable: se puede ESCRIBIR el número (ej. 100) además de usar –/+.
 * Mientras se tipea permite el campo vacío sin commitear; en blur vuelve al valor.
 * Para llegar a 0 (quitar) se usa el botón "–". Clampea a `max`.
 */
function QtyInput({ value, onChange, max = Infinity, ariaLabel }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const handle = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      setText(''); // permitir vacío mientras edita; no commitea
      return;
    }
    let n = parseInt(digits, 10);
    if (n < 1) n = 1;
    if (n > max) n = max;
    setText(String(n));
    onChange(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => handle(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => setText(String(value))}
      aria-label={ariaLabel}
      className="w-11 h-6 text-center rounded bg-white/5 border border-white/10 text-sm tabular-nums outline-none focus:border-brand-fuchsia"
    />
  );
}
