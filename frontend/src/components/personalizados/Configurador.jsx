import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../../context/CartContext.jsx';
import {
  MATERIALES,
  TAMANOS,
  CORTES,
  TIERS,
  getMaterial,
  getTamano,
  getCorte
} from '../../config/personalizados.js';
import { calcularPrecio, unitarioParaTier } from '../../lib/precioPersonalizados.js';
import {
  trackPersonalizadoInicio,
  trackPersonalizadoPaso,
  trackPersonalizadoArchivo,
  trackPersonalizadoPrecio
} from '../../lib/analytics.js';
import PasoSelector from './PasoSelector.jsx';
import SubidaArchivo from './SubidaArchivo.jsx';
import ResumenPedido, { BarraResumenMovil } from './ResumenPedido.jsx';
import QueSigue from './QueSigue.jsx';
import { materialImageDataUri } from './swatches.jsx';

export default function Configurador() {
  const { addCustom } = useCart();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [tamano, setTamano] = useState(null);
  const [corte, setCorte] = useState(null);
  const [cantidad, setCantidad] = useState(null);
  const [archivos, setArchivos] = useState([]); // [{ nombre, pesoMB, url }]
  const [instrucciones, setInstrucciones] = useState('');

  const precio = useMemo(
    () => calcularPrecio({ material, tamano, corte, cantidad }),
    [material, tamano, corte, cantidad]
  );

  // ── Tracking ──
  useEffect(() => {
    trackPersonalizadoInicio();
  }, []);

  const seleccionar = (setter, paso) => (valor) => {
    setter(valor);
    trackPersonalizadoPaso(paso, valor);
  };

  // Cotización en vivo cada vez que la config queda completa.
  useEffect(() => {
    if (precio.configuracionCompleta) {
      trackPersonalizadoPrecio({ valor: precio.total, material, cantidad });
    }
  }, [precio.configuracionCompleta, precio.total, material, cantidad]);

  const onArchivosChange = useCallback((items) => setArchivos(items), []);
  const onArchivoAdd = useCallback((info) => trackPersonalizadoArchivo(info), []);

  // ── Sub-línea de cada tier de cantidad: $/u + % off ──
  const renderCantidadSub = (op) => {
    const factorBase = TIERS[0].factor;
    const tier = TIERS.find((t) => t.cantidad === op.id);
    const pct = Math.round((1 - tier.factor / factorBase) * 100);
    const unit = unitarioParaTier({ material, tamano, corte, cantidad: op.id });
    return (
      <div className="text-[11px] leading-tight">
        {unit > 0 && <span className="text-white/70">{formatPrice(unit)} c/u</span>}
        {pct > 0 && <span className="text-emerald-400 ml-1">· {pct}% off</span>}
      </div>
    );
  };

  // ── Nudge al siguiente tier ──
  const nudge = useMemo(() => {
    if (!cantidad || !material || !tamano) return null;
    const idx = TIERS.findIndex((t) => t.cantidad === cantidad);
    const next = TIERS[idx + 1];
    if (!next) return null;
    const actual = unitarioParaTier({ material, tamano, corte, cantidad });
    const conMas = unitarioParaTier({ material, tamano, corte, cantidad: next.cantidad });
    const ahorroUnit = actual - conMas;
    if (ahorroUnit <= 0) return null;
    return `Sumando ${next.cantidad - cantidad} más pagás ${formatPrice(ahorroUnit)} menos por unidad.`;
  }, [cantidad, material, tamano, corte]);

  const seleccion = {
    materialLabel: getMaterial(material)?.label,
    tamanoLabel: getTamano(tamano)?.label,
    corteLabel: getCorte(corte)?.label,
    cantidad
  };

  const onAdd = () => {
    if (!precio.configuracionCompleta) return;
    const mat = getMaterial(material);
    const tam = getTamano(tamano);
    const cor = getCorte(corte);
    addCustom({
      id: `custom:${material}:${tamano}:${corte}:${Date.now()}`,
      name: `Personalizado · ${mat.label} · ${tam.label} · ${cor.label} · x${cantidad}`,
      categoryLabel: 'Personalizados',
      image: materialImageDataUri(material),
      basePrice: precio.unitario,
      quantity: cantidad,
      meta: {
        tipo: 'calcos',
        material,
        materialLabel: mat.label,
        tamano,
        tamanoLabel: tam.label,
        corte,
        corteLabel: cor.label,
        cantidad,
        instrucciones: instrucciones.trim() || null,
        archivos: archivos.length ? archivos : null
      }
    });
    navigate('/carrito');
  };

  const tamanoCm = getTamano(tamano)?.cm ?? null;

  return (
    <div className="pb-24 lg:pb-0">
      <header className="mb-6">
        <span className="badge badge-hot mb-3">Cotizás antes de pagar</span>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Armá tu calco personalizado</h1>
        <p className="text-white/60 mt-2 max-w-xl">
          Elegí material, tamaño y cantidad. Subí tu diseño. Ves el precio final antes de pagar.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <PasoSelector
            paso={1}
            titulo="Elegí el material"
            kind="material"
            opciones={MATERIALES}
            value={material}
            onSelect={seleccionar(setMaterial, 'material')}
          />
          <PasoSelector
            paso={2}
            titulo="¿De qué tamaño?"
            kind="tamano"
            opciones={TAMANOS}
            value={tamano}
            onSelect={seleccionar(setTamano, 'tamano')}
            renderSub={(op) => {
              const u = unitarioParaTier({ material, tamano: op.id, corte, cantidad: cantidad || TIERS[0].cantidad });
              return u > 0 ? <span className="text-[11px] text-white/60">desde {formatPrice(u)} c/u</span> : null;
            }}
          />
          <PasoSelector
            paso={3}
            titulo="¿Cómo lo cortamos?"
            kind="corte"
            opciones={CORTES}
            value={corte}
            onSelect={seleccionar(setCorte, 'corte')}
          />
          <div>
            <PasoSelector
              paso={4}
              titulo="¿Cuántos querés?"
              opciones={TIERS.map((t) => ({ id: t.cantidad, label: `${t.cantidad} u` }))}
              value={cantidad}
              onSelect={seleccionar(setCantidad, 'cantidad')}
              renderSub={renderCantidadSub}
              columnas="grid-cols-3 sm:grid-cols-6"
            />
            {nudge && (
              <p className="text-xs text-brand-yellow bg-brand-yellow/10 border border-brand-yellow/25 rounded-lg px-3 py-2 mt-2">
                💡 {nudge}
              </p>
            )}
          </div>

          <SubidaArchivo tamanoCm={tamanoCm} onChange={onArchivosChange} onAdd={onArchivoAdd} />

          <section className="card-glass p-5">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-fuchsia/20 text-brand-fuchsia text-xs font-bold shrink-0">
                6
              </span>
              <h2 className="font-display font-extrabold text-lg">¿Algo que tengamos que saber?</h2>
            </div>
            <textarea
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Colores exactos, qué parte va sin fondo, referencias de otro calco tuyo."
              className="input-dark mt-2 resize-none"
            />
          </section>

          <QueSigue />
        </div>

        <div className="min-w-0">
          <ResumenPedido precio={precio} seleccion={seleccion} onAdd={onAdd} />
        </div>
      </div>

      <BarraResumenMovil precio={precio} onAdd={onAdd} />
    </div>
  );
}
