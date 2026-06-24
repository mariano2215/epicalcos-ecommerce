import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../context/CartContext.jsx';
import { SIZES, DEFAULT_SIZE, priceForSize, round } from '../config/pricing.js';
import { categoryName } from '../data/categories.js';

const CUSTOM_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='64' text-anchor='middle' dominant-baseline='middle'>🎨</text></svg>`
  );

/**
 * Armador de packs ("armá tu pack"). Un solo tamaño para todo el pack y descuento
 * fijo según el tipo. Sirve para Mayorista (target 100, 25%) y Personalizados (mín 10, 10%).
 *
 * @param {{ packType:'mayorista'|'personalizados', target?:number, min?:number,
 *           discount:number, title:string, subtitle:string, allowCustom?:boolean }} props
 */
export default function PackBuilder({ packType, target, min, discount, title, subtitle, allowCustom }) {
  const { addPack } = useCart();
  const navigate = useNavigate();

  const [size, setSize] = useState(DEFAULT_SIZE);
  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [catItems, setCatItems] = useState([]);
  const [visible, setVisible] = useState(60);
  const [selection, setSelection] = useState({}); // id -> { id, image, name, category, qty }
  const [customCount, setCustomCount] = useState(0);

  const cap = target || Infinity; // mayorista: tope 100

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

  const remaining = target ? Math.max(0, target - totalSelected) : 0;
  const unit = round(priceForSize(size) * (1 - discount));
  const totalPrice = unit * totalSelected;
  const valid = target ? totalSelected === target : totalSelected >= (min || 1);

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
  const fillRemaining = () => {
    // Completa hasta el target con el último diseño seleccionado (o el primero)
    if (!target || remaining <= 0) return;
    const last = Object.values(selection).slice(-1)[0];
    if (!last) return;
    setSelection((sel) => ({ ...sel, [last.id]: { ...last, qty: last.qty + remaining } }));
  };

  const confirm = () => {
    if (!valid) return;
    const items = Object.values(selection).map((s) => ({ id: s.id, name: s.name, qty: s.qty }));
    const sizeObj = SIZES.find((s) => s.id === size);
    const cover = Object.values(selection)[0]?.image || CUSTOM_IMG;
    const label =
      packType === 'mayorista'
        ? `Pack Mayorista x${totalSelected} · ${sizeObj.label}`
        : `Personalizados x${totalSelected} · ${sizeObj.label}`;
    addPack({
      id: `pack:${packType}:${size}:${Date.now()}`,
      name: label,
      categoryLabel: packType === 'mayorista' ? 'Pack Mayorista' : 'Personalizados',
      image: cover,
      size,
      basePrice: unit,
      quantity: totalSelected,
      meta: { packType, size, discount, items, customCount }
    });
    navigate('/carrito');
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Panel de armado */}
      <div className="lg:col-span-2 space-y-6">
        <header>
          <span className="badge badge-hot mb-3">{Math.round(discount * 100)}% OFF</span>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">{title}</h1>
          <p className="text-white/60 mt-2 max-w-xl">{subtitle}</p>
        </header>

        {/* Paso 1: tamaño */}
        <div className="card-glass p-5">
          <div className="text-sm font-semibold mb-3">1 · Elegí el tamaño del pack</div>
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {SIZES.map((s) => {
              const active = s.id === size;
              const u = round(s.price * (1 - discount));
              return (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={`rounded-xl py-2 border transition-colors ${
                    active
                      ? 'border-brand-fuchsia bg-brand-fuchsia/15'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                  }`}
                >
                  <span className="block text-sm font-bold">{s.label}</span>
                  <span className="block text-[11px] text-white/50">{formatPrice(u)} c/u</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paso 2: elegir diseños */}
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">
              2 · Elegí los diseños {target ? `(hasta ${target})` : `(mínimo ${min})`}
            </div>
            {allowCustom && (
              <button
                onClick={() => totalSelected < cap && setCustomCount((c) => c + 1)}
                className="btn-secondary !py-1.5 !px-3 text-xs"
              >
                🎨 + Diseño propio
              </button>
            )}
          </div>

          {/* Tabs de categoría */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {cats.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveCat(c.slug)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs border transition-colors ${
                  c.slug === activeCat
                    ? 'border-brand-fuchsia bg-brand-fuchsia/15 text-white'
                    : 'border-white/10 text-white/60 hover:border-white/25'
                }`}
              >
                {categoryName(c.slug)}
              </button>
            ))}
          </div>

          {/* Grilla de stickers */}
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {catItems.slice(0, visible).map((it) => {
              const id = it.id;
              const name = `${categoryName(activeCat)} #${id.split('-').pop()}`;
              const qty = selection[id]?.qty || 0;
              return (
                <button
                  key={id}
                  onClick={() => addOne({ id, image: it.file, name, category: activeCat })}
                  disabled={totalSelected >= cap && !qty}
                  className={`relative rounded-xl border bg-white/[0.03] p-2 aspect-square grid place-items-center transition-colors ${
                    qty ? 'border-brand-fuchsia' : 'border-white/10 hover:border-white/25'
                  } disabled:opacity-40`}
                  title={name}
                >
                  <img src={it.file} alt={name} loading="lazy" className="max-w-full max-h-full object-contain" />
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
      </div>

      {/* Resumen / bandeja */}
      <aside className="card-glass p-5 h-fit lg:sticky lg:top-24 space-y-4">
        <h3 className="font-display font-extrabold text-lg">Tu pack</h3>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-display font-extrabold">{totalSelected}</div>
            <div className="text-xs text-white/50">
              {target ? `de ${target} calcos` : `calcos (mín. ${min})`}
            </div>
          </div>
          {target && remaining > 0 && Object.keys(selection).length > 0 && (
            <button onClick={fillRemaining} className="btn-secondary !py-1.5 !px-3 text-xs">
              Completar {remaining}
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {Object.values(selection).map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <img src={s.image} alt={s.name} className="w-9 h-9 rounded-lg object-contain bg-white/5" />
              <span className="flex-1 truncate text-white/80">{s.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => bump(s.id, -1)} className="w-6 h-6 rounded bg-white/5 border border-white/10">–</button>
                <span className="w-6 text-center">{s.qty}</span>
                <button onClick={() => bump(s.id, +1)} className="w-6 h-6 rounded bg-white/5 border border-white/10">+</button>
              </div>
            </div>
          ))}
          {customCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center">🎨</span>
              <span className="flex-1 text-white/80">Diseños propios (por WhatsApp)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCustomCount((c) => Math.max(0, c - 1))} className="w-6 h-6 rounded bg-white/5 border border-white/10">–</button>
                <span className="w-6 text-center">{customCount}</span>
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
            <span>Precio por calco</span><span>{formatPrice(unit)}</span>
          </div>
          <div className="flex justify-between font-display font-extrabold text-xl">
            <span>Total</span><span>{formatPrice(totalPrice)}</span>
          </div>
          <p className="text-xs text-emerald-400 mt-1">{Math.round(discount * 100)}% de descuento aplicado</p>
        </div>

        <button onClick={confirm} disabled={!valid} className="btn-primary w-full">
          {valid
            ? 'Agregar al carrito →'
            : target
            ? `Faltan ${remaining} calcos`
            : `Mínimo ${min} calcos`}
        </button>
        {allowCustom && (
          <p className="text-xs text-white/50 text-center">
            Los diseños propios los coordinás por WhatsApp después de la compra.
          </p>
        )}
      </aside>
    </div>
  );
}
