import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../../context/CartContext.jsx';
import {
  TAMANOS,
  CORTES,
  CANTIDAD,
  ARCHIVO,
  getTamano,
  getCorte,
  clampCantidad,
  formatosLegibles
} from '../../config/personalizados.js';
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
import SocialProof from '../SocialProof.jsx';
import { customImageDataUri } from './swatches.jsx';

/** Extensiones que el carrito puede mostrar como miniatura desde Cloudinary. */
const RASTER = ARCHIVO.formatosRaster;
const esRaster = (nombre) => RASTER.includes(String(nombre).split('.').pop()?.toLowerCase());

/** Nombre de la línea del carrito, con el archivo adentro y acotado. */
function nombreLinea({ tamanoLabel, corteLabel, archivo }) {
  const corto = archivo.length > 42 ? `${archivo.slice(0, 39)}…` : archivo;
  return `Personalizado · ${tamanoLabel} · ${corteLabel} · ${corto}`;
}

/** Igualdad superficial de la lista de diseños (evita re-render por cada tick de progreso). */
function mismaLista(a, b) {
  return a.length === b.length && a.every((d, i) => d.fileId === b[i].fileId && d.url === b[i].url);
}

/**
 * Configurador de /personalizados: SOLO tres decisiones — tamaño, corte y los
 * archivos. El precio es el mismo que el del catálogo y no hay mínimo de compra.
 *
 * CADA DISEÑO SUBIDO ES UNA LÍNEA DEL CARRITO. No hay botón "agregar": el
 * carrito se sincroniza solo con la lista de archivos (alta al subir, baja al
 * quitar, parche de la URL de Cloudinary cuando termina la subida). Antes el
 * cliente subía N diseños y se llevaba UNA sola calco: pagaba 1 y en la nota
 * del pedido viajaban los N archivos.
 */
export default function Configurador() {
  const cart = useCart();
  const { items } = cart;
  const navigate = useNavigate();

  const [tamano, setTamano] = useState(null);
  const [corte, setCorte] = useState(null);
  const [copias, setCopias] = useState(CANTIDAD.default);
  const [disenos, setDisenos] = useState([]); // [{ fileId, nombre, pesoMB, url, tamano, corte }]
  const [instrucciones, setInstrucciones] = useState('');
  const [notas, setNotas] = useState(''); // instrucciones "asentadas" (debounce) → van a las líneas

  const precio = useMemo(() => calcularPrecio({ tamano, corte, cantidad: copias }), [tamano, corte, copias]);

  // El cart context y la selección viva se leen por ref: la sincronización corre
  // en efectos que NO deben re-dispararse cuando cambia la identidad de las
  // funciones del carrito (removeItem depende de items).
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const specRef = useRef({ tamano: null, corte: null });
  specRef.current = { tamano, corte };

  /** fileId → { lineId, url, cantidad, notas, visto } de lo que YA está en el carrito. */
  const lineasRef = useRef(new Map());
  const subidaRef = useRef(null);

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

  // Las notas se asientan medio segundo después de dejar de tipear: parchear las
  // líneas en cada tecla reescribiría el carrito (y el localStorage) letra a letra.
  useEffect(() => {
    const t = setTimeout(() => setNotas(instrucciones.trim()), 500);
    return () => clearTimeout(t);
  }, [instrucciones]);

  /**
   * Lista de diseños: se estampa el tamaño y el corte VIGENTES al momento de
   * subir cada archivo. Cambiar el tamaño después no re-precia lo ya agregado
   * (así se puede armar un pedido con tamaños mezclados).
   */
  const onArchivosChange = useCallback((archivos) => {
    setDisenos((prev) => {
      const viejos = new Map(prev.map((d) => [d.fileId, d]));
      const siguiente = archivos.map((a) => {
        const old = viejos.get(a.id);
        if (old) return old.url === a.url ? old : { ...old, url: a.url };
        return {
          fileId: a.id,
          nombre: a.nombre,
          pesoMB: a.pesoMB,
          url: a.url,
          tamano: specRef.current.tamano,
          corte: specRef.current.corte
        };
      });
      return mismaLista(prev, siguiente) ? prev : siguiente;
    });
  }, []);

  const onArchivoAdd = useCallback((info) => trackPersonalizadoArchivo(info), []);
  const onCopiasChange = useCallback((n) => setCopias(clampCantidad(n)), []);

  // ── Sincronización lista de diseños → carrito ──
  useEffect(() => {
    const { addCustom, patchLine, removeItem } = cartRef.current;
    const vivos = new Set(disenos.map((d) => d.fileId));

    // Bajas: el cliente quitó el diseño de la lista.
    for (const [fileId, info] of lineasRef.current) {
      if (!vivos.has(fileId)) {
        lineasRef.current.delete(fileId);
        removeItem(info.lineId);
      }
    }

    for (const d of disenos) {
      const tam = getTamano(d.tamano);
      const cor = getCorte(d.corte);
      if (!tam || !cor) continue; // la subida está bloqueada hasta elegir: no debería pasar
      const archivo = { nombre: d.nombre, pesoMB: d.pesoMB, url: d.url || null };
      const imagen = d.url && esRaster(d.nombre) ? d.url : customImageDataUri();
      const previa = lineasRef.current.get(d.fileId);

      if (!previa) {
        const lineId = `custom:${d.tamano}:${d.corte}:${d.fileId}`;
        lineasRef.current.set(d.fileId, {
          lineId,
          url: d.url || null,
          cantidad: copias,
          notas,
          visto: false
        });
        addCustom(
          {
            id: lineId,
            name: nombreLinea({ tamanoLabel: tam.label, corteLabel: cor.label, archivo: d.nombre }),
            categoryLabel: 'Personalizados',
            image: imagen,
            basePrice: tam.precio,
            quantity: copias,
            meta: {
              tipo: 'calcos',
              tamano: d.tamano,
              tamanoLabel: tam.label,
              corte: d.corte,
              corteLabel: cor.label,
              cantidad: copias,
              instrucciones: notas || null,
              archivos: [archivo]
            }
          },
          { openDrawer: false, silent: true }
        );
        continue;
      }

      // Altas ya hechas: solo se parchea lo que cambió (URL de Cloudinary al
      // terminar la subida, copias, notas).
      const cambios = {};
      const meta = {};
      if ((previa.url || null) !== (d.url || null)) {
        previa.url = d.url || null;
        meta.archivos = [archivo];
        cambios.image = imagen;
      }
      if (previa.cantidad !== copias) {
        previa.cantidad = copias;
        cambios.quantity = copias;
        meta.cantidad = copias;
      }
      if (previa.notas !== notas) {
        previa.notas = notas;
        meta.instrucciones = notas || null;
      }
      if (Object.keys(meta).length) cambios.meta = meta;
      if (Object.keys(cambios).length) patchLine(previa.lineId, cambios);
    }
  }, [disenos, copias, notas]);

  // ── Sincronización inversa: si el cliente borra la línea desde el carrito o el
  // drawer, el diseño también sale de la lista de acá. `visto` evita sacarlo por
  // leer `items` antes de que se aplique el alta recién despachada.
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    for (const [fileId, info] of lineasRef.current) {
      if (ids.has(info.lineId)) {
        info.visto = true;
      } else if (info.visto) {
        lineasRef.current.delete(fileId);
        subidaRef.current?.quitar(fileId);
      }
    }
  }, [items]);

  const tamanoCm = getTamano(tamano)?.cm ?? null;
  const listoParaSubir = Boolean(tamano && corte);

  const resumen = useMemo(() => {
    const total = disenos.reduce((a, d) => a + (getTamano(d.tamano)?.precio || 0) * copias, 0);
    return { disenos: disenos.length, unidades: disenos.length * copias, total };
  }, [disenos, copias]);

  return (
    <div className="pb-24 lg:pb-0">
      <header className="mb-6">
        <span className="badge badge-hot mb-3">Sin mínimo de compra</span>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">Armá tu calco personalizado</h1>
        <p className="text-white/80 mt-2 max-w-xl">
          Elegí el tamaño y el corte, subí tus diseños y cada uno se suma al carrito como una calco.
          Mismo precio que los calcos del catálogo, desde una sola unidad.
        </p>
      </header>

      {/* Prueba social arriba de todo, antes del paso 1: el que llega acá con
          su logo quiere ver cómo queda un diseño puesto, no leerlo. Estaba al
          final de la columna izquierda, o sea después de decidir. El testimonio
          del logo (index 1) es el único que muestra un calco de cliente
          aplicado, que es de lo que se trata esta página. */}
      <SocialProof index={1} destacado className="mb-6" />

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

          <SubidaArchivo
            paso={3}
            tamanoCm={tamanoCm}
            apiRef={subidaRef}
            bloqueo={
              listoParaSubir ? null : (
                <>
                  Elegí primero el <strong className="text-white/70">tamaño</strong> y el{' '}
                  <strong className="text-white/70">corte</strong>: cada diseño que subas se agrega al carrito con
                  esa especificación.
                </>
              )
            }
            descripcion={
              <>
                Cada archivo que subas <strong className="text-white/70">se agrega solo al carrito</strong> como una
                calco personalizada. {formatosLegibles()}, hasta {ARCHIVO.pesoMaximoMB} MB cada uno (hasta{' '}
                {ARCHIVO.maxArchivos} diseños).
              </>
            }
            onChange={onArchivosChange}
            onAdd={onArchivoAdd}
          />

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
            {disenos.length > 0 && (
              <p className="text-[11px] text-white/40 mt-2">Se guardan en todos los diseños de este pedido.</p>
            )}
          </section>

          <QueSigue />
        </div>

        <div className="min-w-0">
          <ResumenPedido
            precio={precio}
            seleccion={{ tamanoLabel: getTamano(tamano)?.label, corteLabel: getCorte(corte)?.label }}
            disenos={disenos}
            resumen={resumen}
            copias={copias}
            hayCarrito={items.length > 0}
            onCopiasChange={onCopiasChange}
            onIrAlCarrito={() => navigate('/carrito')}
          />
        </div>
      </div>

      <BarraResumenMovil
        resumen={resumen}
        precio={precio}
        hayCarrito={items.length > 0}
        onIrAlCarrito={() => navigate('/carrito')}
      />
    </div>
  );
}
