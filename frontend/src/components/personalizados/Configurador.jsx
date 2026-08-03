import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../../context/CartContext.jsx';
import { TAMANOS, CORTES, CANTIDAD, getTamano, getCorte, clampCantidad } from '../../config/personalizados.js';
import { calcularPrecio } from '../../lib/precioPersonalizados.js';
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
import { customImageDataUri } from './swatches.jsx';

/**
 * Configurador de /personalizados: SOLO tres decisiones — tamaño, corte y el
 * archivo. El precio es el mismo que el del catálogo y no hay mínimo de compra.
 */
export default function Configurador() {
  const { addCustom } = useCart();
  const navigate = useNavigate();

  const [tamano, setTamano] = useState(null);
  const [corte, setCorte] = useState(null);
  const [cantidad, setCantidad] = useState(CANTIDAD.default);
  const [archivos, setArchivos] = useState([]); // [{ nombre, pesoMB, url }]
  const [instrucciones, setInstrucciones] = useState('');

  const precio = useMemo(() => calcularPrecio({ tamano, corte, cantidad }), [tamano, corte, cantidad]);

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
      trackPersonalizadoPrecio({ valor: precio.total, tamano, cantidad: precio.cantidad });
    }
  }, [precio.configuracionCompleta, precio.total, tamano, precio.cantidad]);

  const onArchivosChange = useCallback((items) => setArchivos(items), []);
  const onArchivoAdd = useCallback((info) => trackPersonalizadoArchivo(info), []);
  const onCantidadChange = useCallback((n) => setCantidad(clampCantidad(n)), []);

  const seleccion = {
    tamanoLabel: getTamano(tamano)?.label,
    corteLabel: getCorte(corte)?.label
  };

  const onAdd = () => {
    if (!precio.configuracionCompleta) return;
    const tam = getTamano(tamano);
    const cor = getCorte(corte);
    const unidades = precio.cantidad;
    addCustom({
      id: `custom:${tamano}:${corte}:${Date.now()}`,
      name: `Personalizado · ${tam.label} · ${cor.label} · x${unidades}`,
      categoryLabel: 'Personalizados',
      image: customImageDataUri(),
      basePrice: precio.unitario,
      quantity: unidades,
      meta: {
        tipo: 'calcos',
        tamano,
        tamanoLabel: tam.label,
        corte,
        corteLabel: cor.label,
        cantidad: unidades,
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
        <span className="badge badge-hot mb-3">Sin mínimo de compra</span>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Armá tu calco personalizado</h1>
        <p className="text-white/60 mt-2 max-w-xl">
          Elegí el tamaño y el corte, subí tu diseño y listo. Mismo precio que los calcos del catálogo,
          desde una sola unidad.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0 space-y-4">
          <PasoSelector
            paso={1}
            titulo="¿De qué tamaño?"
            kind="tamano"
            opciones={TAMANOS}
            value={tamano}
            onSelect={seleccionar(setTamano, 'tamano')}
            columnas="grid-cols-1 sm:grid-cols-3"
            renderSub={(op) => <span className="text-[11px] text-white/60">{formatPrice(op.precio)} c/u</span>}
          />
          <PasoSelector
            paso={2}
            titulo="¿Cómo lo cortamos?"
            kind="corte"
            opciones={CORTES}
            value={corte}
            onSelect={seleccionar(setCorte, 'corte')}
            columnas="grid-cols-1 sm:grid-cols-3"
          />

          <SubidaArchivo paso={3} tamanoCm={tamanoCm} onChange={onArchivosChange} onAdd={onArchivoAdd} />

          <section className="card-glass p-5">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-fuchsia/20 text-brand-fuchsia text-xs font-bold shrink-0">
                4
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
          <ResumenPedido
            precio={precio}
            seleccion={seleccion}
            cantidad={cantidad}
            onCantidadChange={onCantidadChange}
            onAdd={onAdd}
          />
        </div>
      </div>

      <BarraResumenMovil precio={precio} onAdd={onAdd} />
    </div>
  );
}
