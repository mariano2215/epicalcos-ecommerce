import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, formatPrice } from '../../context/CartContext.jsx';
import { NEGOCIO, ESCALA_MIN } from '../../config/pricing.js';
import { shipping, COTIZAR_FORM_HREF } from '../../config/site.js';
import { getTamano, getMaterial, ARCHIVO, MATERIAL_HOLOGRAFICO_ID, IMAGEN_HOLOGRAFICO } from '../../config/personalizados.js';
import { COTIZADOR, MUESTRA_GRATIS, WHATSAPP } from '../../config/negocios.js';
import {
  CANTIDADES_COTIZADOR,
  CANTIDAD_MAS,
  TAMANOS_ESCALA,
  MATERIALES_ESCALA,
  MAX_DISENOS,
  MAX_INDICACIONES,
  cotizarPedidoNegocio,
  lineaVolumen,
  cuitValido,
  consultaPresupuesto,
  mensajeWhatsappCotizador,
  guardarConsultaCotizar
} from '../../lib/cotizadorNegocio.js';
import { hrefWhatsapp } from '../../lib/whatsapp.js';
import { trackCotizadorStart, trackCotizadorComplete, trackCotizar, trackWhatsappClick } from '../../lib/analytics.js';
import GrupoOpciones from './GrupoOpciones.jsx';
import SubidaArchivo from '../personalizados/SubidaArchivo.jsx';
import { Swatch } from '../personalizados/swatches.jsx';

/** Miniatura de la línea en el carrito: la misma de la Promo Negocio (NegocioForm). */
const IMAGEN_NEGOCIO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' rx='24' fill='#202020'/><text x='50%' y='52%' font-size='72' text-anchor='middle' dominant-baseline='middle'>🏪</text></svg>`
  );

const num = (n) => Number(n).toLocaleString('es-AR');

/**
 * El cotizador de pedidos por volumen (spec 031 §7.5, spec 034 §7.1; en el
 * pedido, *BulkCalculator*). Cantidad → tamaño → material → diseños → precio
 * → datos y archivos → carrito.
 *
 * QUÉ RESUELVE: hasta acá un negocio solo podía comprar "un logo, 100, 6 cm".
 * La escala por volumen aprobada el 5/10/2026 (spec 032) estaba en el servidor
 * pero ninguna página la ofrecía: 250, 500 o 1.000 calcos se pedían por
 * WhatsApp, y el que compara proveedores a la noche no espera la respuesta.
 *
 * TODO PRECIO SALE DE `cotizarPedidoNegocio()` (→ `precioVolumen()`, espejado
 * en el servidor). `cotizadorNegocio.test.js` pasa cada configuración por el
 * validador real del checkout: lo que se ve acá es lo que se cobra.
 *
 * Arranca con la configuración de la Promo Negocio (100 · 6 cm · vinilo
 * blanco · un diseño), que cuesta lo mismo: el precio se ve sin tocar nada, y
 * el que venía a comprar la promo de siempre la compra igual. El tornasolado
 * de la spec 033 es el material holográfico (mismo total que Negocio +
 * recargo; lo verifica el test).
 *
 * "Más de 1.000" no tiene precio online (N-8): ofrece el formulario de
 * contacto con la consulta ya armada (spec 034, design D-1) y WhatsApp.
 *
 * `id="cotizador"`: lo apuntan "Ver el precio ahora" del botón Cotizar y los
 * CTAs de los heros. NO renombrar.
 */
export default function Cotizador({ pagina = 'negocio' }) {
  const { addNegocio } = useCart();
  const navigate = useNavigate();

  const [cantidad, setCantidad] = useState(CANTIDADES_COTIZADOR.includes(NEGOCIO.qty) ? NEGOCIO.qty : CANTIDADES_COTIZADOR[0]);
  const [tamano, setTamano] = useState(TAMANOS_ESCALA.includes(NEGOCIO.size) ? NEGOCIO.size : TAMANOS_ESCALA[0]);
  const [material, setMaterial] = useState(MATERIALES_ESCALA[0]);
  const [varios, setVarios] = useState(false);
  const [nDisenos, setNDisenos] = useState(2);
  const [paso, setPaso] = useState('elegir'); // elegir | datos
  const [razonSocial, setRazonSocial] = useState('');
  const [cuit, setCuit] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [errores, setErrores] = useState({});

  const iniciado = useRef(false);
  const agregando = useRef(false);
  const datosRef = useRef(null);
  const razonRef = useRef(null);
  const cuitRef = useRef(null);

  const disenos = varios ? nDisenos : 1;
  const cot = cotizarPedidoNegocio({ cantidad, tamano, material });
  const config = { cantidad, tamano, material, disenos };
  const tamanoLabel = getTamano(tamano)?.label;
  const materialLabel = getMaterial(material)?.label;

  /** Primera interacción = arranque del embudo. Una sola vez por montaje. */
  const tocar = (setter) => (v) => {
    if (!iniciado.current) {
      iniciado.current = true;
      trackCotizadorStart({ pagina });
    }
    setter(v);
  };

  const onArchivos = useCallback((items) => setArchivos(items), []);

  // ── Opciones de cada grupo (precios por calco leídos de la escala) ──────────
  const opcionesCantidad = CANTIDADES_COTIZADOR.map((c) => {
    if (c === CANTIDAD_MAS) return { valor: c, label: COTIZADOR.cantidadMas, detalle: 'a medida' };
    const p = cotizarPedidoNegocio({ cantidad: c, tamano, material });
    return { valor: c, label: num(c), detalle: p.estado === 'precio' ? `${formatPrice(p.unitario)} c/u` : null };
  });
  const opcionesTamano = TAMANOS_ESCALA.map((id) => ({
    valor: id,
    label: getTamano(id)?.label,
    detalle: COTIZADOR.usosTamano[id],
    visual: <Swatch kind="tamano" id={id} />
  }));
  const totalBlanco = cantidad === CANTIDAD_MAS ? null : cotizarPedidoNegocio({ cantidad, tamano, material: MATERIALES_ESCALA[0] }).total;
  const opcionesMaterial = MATERIALES_ESCALA.map((id, i) => {
    const p = cantidad === CANTIDAD_MAS ? null : cotizarPedidoNegocio({ cantidad, tamano, material: id });
    const diferencia = p?.total && totalBlanco ? p.total - totalBlanco : 0;
    return {
      valor: id,
      label: getMaterial(id)?.label,
      etiqueta: i === 0 ? COTIZADOR.recomendado : null,
      detalle: diferencia > 0 ? `+${formatPrice(diferencia)}` : i === 0 ? 'El clásico' : 'Mismo precio',
      visual: <Swatch kind="material" id={id} />
    };
  });
  const opcionesDisenos = [
    { valor: false, label: COTIZADOR.disenos.uno },
    { valor: true, label: COTIZADOR.disenos.varios }
  ];

  // ── Acciones ────────────────────────────────────────────────────────────────
  const continuar = () => {
    if (cot.estado !== 'precio') return;
    trackCotizadorComplete({ pagina, cantidad: cot.cantidadLlevada, tamano, material, disenos, value: cot.total });
    setPaso('datos');
    // El foco va al primer campo: el que usa teclado o lector de pantalla
    // tiene que enterarse de que apareció un formulario abajo.
    requestAnimationFrame(() => {
      datosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      razonRef.current?.focus({ preventScroll: true });
    });
  };

  const agregar = (e) => {
    e.preventDefault();
    if (agregando.current || cot.estado !== 'precio') return;
    const nuevos = {};
    if (!razonSocial.trim()) nuevos.razonSocial = COTIZADOR.razonSocial.error;
    if (!cuitValido(cuit)) nuevos.cuit = COTIZADOR.cuit.error;
    setErrores(nuevos);
    if (nuevos.razonSocial) return razonRef.current?.focus();
    if (nuevos.cuit) return cuitRef.current?.focus();

    const linea = lineaVolumen({
      tamano,
      material,
      cantidad: cot.cantidadLlevada,
      disenos,
      indicaciones,
      archivos,
      razonSocial,
      cuit,
      origen: 'cotizador',
      imagen: material === MATERIAL_HOLOGRAFICO_ID ? IMAGEN_HOLOGRAFICO : IMAGEN_NEGOCIO
    });
    // No debería pasar: el cotizador solo ofrece escalones que el servidor acepta.
    if (!linea) return;
    agregando.current = true;
    addNegocio(linea);
    navigate('/carrito');
  };

  const pedirPresupuesto = () => {
    guardarConsultaCotizar(consultaPresupuesto(config));
    trackCotizar({ origen: `${pagina}_cotizador`, via: 'formulario' });
  };

  const mensajeWa = cot.estado === 'precio' ? mensajeWhatsappCotizador(config) : WHATSAPP.pedidosGrandes;
  const clickWhatsapp = () => {
    trackCotizar({ origen: `${pagina}_cotizador`, via: 'whatsapp' });
    trackWhatsappClick(`cotizador_${pagina}`);
  };

  return (
    <div id="cotizador" className="scroll-mt-24">
      <div className="text-center max-w-2xl mx-auto mb-6 md:mb-8">
        <h2 className="font-display font-extrabold text-3xl md:text-5xl">{COTIZADOR.titulo}</h2>
        <p className="text-white/70 mt-3">{COTIZADOR.bajada}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* ── Elecciones ──────────────────────────────────────────────────── */}
        <div className="card-glass p-5 md:p-6 space-y-6">
          <GrupoOpciones
            titulo={`1 · ${COTIZADOR.grupos.cantidad}`}
            opciones={opcionesCantidad}
            valor={cantidad}
            onElegir={tocar(setCantidad)}
            columnas="grid-cols-3 sm:grid-cols-5"
          />
          <GrupoOpciones
            titulo={`2 · ${COTIZADOR.grupos.tamano}`}
            opciones={opcionesTamano}
            valor={tamano}
            onElegir={tocar(setTamano)}
            columnas="grid-cols-2"
          />
          <GrupoOpciones
            titulo={`3 · ${COTIZADOR.grupos.material}`}
            opciones={opcionesMaterial}
            valor={material}
            onElegir={tocar(setMaterial)}
            columnas="grid-cols-3"
            rotulo="text-[13px] sm:text-base"
          />
          <div>
            <GrupoOpciones
              titulo={`4 · ${COTIZADOR.grupos.disenos}`}
              opciones={opcionesDisenos}
              valor={varios}
              onElegir={tocar(setVarios)}
              columnas="grid-cols-2"
            />
            {varios && (
              <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-white/80">{COTIZADOR.disenos.cuantos}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={MAX_DISENOS}
                  value={nDisenos}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value));
                    setNDisenos(Number.isFinite(n) ? Math.min(MAX_DISENOS, Math.max(2, n)) : 2);
                  }}
                  className="input-dark !w-24 text-center tabular-nums"
                />
              </label>
            )}
          </div>
        </div>

        {/* ── Precio ───────────────────────────────────────────────────────
            `aria-live`: el que usa lector de pantalla escucha el total nuevo
            al cambiar una opción (031 RF-C14). `min-h` reserva el alto para
            que el botón no salte de 5 a 6 dígitos (CLS). */}
        <aside className="card-glass p-5 md:p-6 lg:sticky lg:top-24 border border-brand-fuchsia/25">
          {cot.estado === 'precio' ? (
            <>
              <div aria-live="polite" className="min-h-[11rem]">
                <p className="text-sm text-white/60">
                  {num(cot.cantidadLlevada)} calcos · {tamanoLabel} · {materialLabel}
                  {disenos > 1 ? ` · ${disenos} diseños` : ''}
                </p>
                <p className="font-display font-black text-4xl md:text-5xl leading-none mt-2 gradient-text">
                  {formatPrice(cot.total)}
                </p>
                <p className="mt-2 text-white/85">
                  <strong className="text-white">{formatPrice(cot.unitario)}</strong> {COTIZADOR.porCalco}
                  {cot.pct > 0 && (
                    <span className="badge badge-hot ml-2 align-middle">−{cot.pct}% por calco</span>
                  )}
                </p>
                {cot.pct > 0 && (
                  <p className="text-[11px] text-white/45 mt-1">contra el precio por calco de {num(ESCALA_MIN)}</p>
                )}
                <p className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
                  <strong>{formatPrice(cot.totalTransferencia)}</strong> {COTIZADOR.transferencia}
                </p>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-white/70">
                <li>👀 {MUESTRA_GRATIS.titulo}: {MUESTRA_GRATIS.aclaracion.toLowerCase()}</li>
                <li>⚡ Producción: {shipping.produccionVolumen}</li>
                <li>🚚 El envío se calcula en el checkout</li>
              </ul>
              {paso === 'elegir' ? (
                <button type="button" onClick={continuar} className="btn-primary w-full min-h-[48px] mt-5">
                  {COTIZADOR.continuar} →
                </button>
              ) : (
                <p className="mt-5 text-sm text-white/60">Completá tus datos abajo para agregarlo al carrito.</p>
              )}
            </>
          ) : (
            <div aria-live="polite">
              <p className="font-display font-extrabold text-xl leading-tight">{COTIZADOR.presupuesto.titulo}</p>
              <p className="text-white/70 text-sm mt-2">{COTIZADOR.presupuesto.bajada}</p>
              <Link
                to={COTIZAR_FORM_HREF}
                onClick={pedirPresupuesto}
                className="btn-primary w-full min-h-[48px] mt-5"
              >
                Pedir presupuesto
              </Link>
            </div>
          )}
          <a
            href={hrefWhatsapp(mensajeWa)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={clickWhatsapp}
            className="btn-ghost w-full min-h-[44px] mt-2 text-sm"
          >
            💬 {cot.estado === 'precio' ? COTIZADOR.whatsapp : 'Hablar por WhatsApp'}
          </a>
        </aside>
      </div>

      {/* ── Datos y archivos (después de "Continuar") ───────────────────────── */}
      {paso === 'datos' && cot.estado === 'precio' && (
        <form ref={datosRef} onSubmit={agregar} noValidate className="card-glass p-5 md:p-6 mt-5 scroll-mt-24 space-y-5">
          <h3 className="font-display font-extrabold text-xl">{COTIZADOR.datosTitulo}</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-white/80 mb-1.5 block">{COTIZADOR.razonSocial.label} *</span>
              <input
                ref={razonRef}
                type="text"
                autoComplete="organization"
                maxLength={120}
                value={razonSocial}
                onChange={(e) => {
                  setRazonSocial(e.target.value);
                  if (errores.razonSocial) setErrores((x) => ({ ...x, razonSocial: undefined }));
                }}
                aria-invalid={Boolean(errores.razonSocial)}
                aria-describedby="razon-ayuda"
                className="input-dark"
              />
              <span id="razon-ayuda" className={`text-xs mt-1 block ${errores.razonSocial ? 'text-brand-pink' : 'text-white/50'}`}>
                {errores.razonSocial || COTIZADOR.razonSocial.ayuda}
              </span>
            </label>
            <label className="block">
              <span className="text-sm text-white/80 mb-1.5 block">{COTIZADOR.cuit.label}</span>
              <input
                ref={cuitRef}
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={cuit}
                onChange={(e) => {
                  setCuit(e.target.value);
                  if (errores.cuit) setErrores((x) => ({ ...x, cuit: undefined }));
                }}
                aria-invalid={Boolean(errores.cuit)}
                aria-describedby="cuit-ayuda"
                placeholder="20-12345678-3"
                className="input-dark"
              />
              <span id="cuit-ayuda" className={`text-xs mt-1 block ${errores.cuit ? 'text-brand-pink' : 'text-white/50'}`}>
                {errores.cuit || COTIZADOR.cuit.ayuda}
              </span>
            </label>
          </div>

          {varios && (
            <label className="block">
              <span className="text-sm text-white/80 mb-1.5 block">{COTIZADOR.disenos.indicaciones}</span>
              <textarea
                rows={2}
                maxLength={MAX_INDICACIONES}
                value={indicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                className="input-dark"
              />
              <span className="text-xs text-white/50 mt-1 block">{COTIZADOR.disenos.indicacionesAyuda}</span>
            </label>
          )}

          <SubidaArchivo
            tamanoCm={parseInt(tamano, 10) || null}
            max={Math.min(ARCHIVO.maxArchivos, Math.max(3, disenos))}
            paso={null}
            titulo={COTIZADOR.subida.titulo}
            sustantivo="archivos"
            preset={import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_NEGOCIO || undefined}
            descripcion={COTIZADOR.subida.descripcion}
            onChange={onArchivos}
          />

          <button type="submit" className="btn-primary w-full min-h-[52px] text-base">
            {COTIZADOR.agregar} · {formatPrice(cot.total)}
          </button>
          <p className="text-xs text-white/50 text-center">
            {archivos.length > 0
              ? 'Ya tenemos tus archivos. Cualquier detalle lo coordinamos por WhatsApp.'
              : 'Si no subís tus archivos acá, los coordinamos por WhatsApp después del pago.'}
          </p>
        </form>
      )}
    </div>
  );
}
