import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar.jsx';
import BuscadorModal from './BuscadorModal.jsx';
import { useCart } from '../context/CartContext.jsx';
import PromoBanner, { endLabel } from './PromoBanner.jsx';
import { usePromoActive, useMayoristaPromoActive, useArgentinaPromoActive } from '../lib/promo.js';
import {
  PROMO_MAYORISTA_100,
  PROMO_ARGENTINA,
  PROMO_ARGENTINA_END_MS
} from '../config/pricing.js';
import { site } from '../config/site.js';
import BotonCotizar from './BotonCotizar.jsx';
import { MenuEscritorio, MenuMovil, ID_MENU_MOVIL } from './MenuPrincipal.jsx';

/** Páginas de negocio: ahí la tira suma "desde 100 unidades" (spec 031, RF-N5). */
const PAGINAS_NEGOCIO = ['/negocio', '/mayorista'];

/** Píxeles de scroll desde los que el header se compacta (como mínimo: ver abajo). */
const UMBRAL_COMPACTO = 80;
/**
 * Lo que se le suma al alto de la tira para el umbral: los 16 px de padding del
 * nav que también se recogen (`py-4` → `py-2`) y aire para que, compensado por
 * el navegador, el scroll no llegue a 0.
 */
const MARGEN_UMBRAL = 40;

export default function Header() {
  const { totalItems, openDrawer } = useCart();
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [compacto, setCompacto] = useState(false);
  const promoActive = usePromoActive();
  const mayoristaPromoActive = useMayoristaPromoActive();
  const argentinaPromoActive = useArgentinaPromoActive();
  const { pathname } = useLocation();
  const esNegocio = PAGINAS_NEGOCIO.includes(pathname);

  // Header reducido al scrollear: en celular, después del primer scroll lo único
  // que hace falta arriba es volver al inicio, buscar y ver el carrito. Todo lo
  // demás (la barra de anuncios) se recoge para devolverle esa altura al
  // producto.
  //
  // ⚠️ NO ES `scrollY > 80` A SECAS: así la tira TITILABA. El header es sticky
  // y está en el flujo, así que al compactarse toda la página sube lo que él
  // pierde (51 px: la tira y el padding). Chrome —y con él Android y el
  // navegador de Instagram en Android— lo compensa con el scroll anchoring:
  // baja `scrollY` esos mismos 51 px para que el contenido no salte. Con un solo
  // umbral, 85 pasaba a 34, quedaba debajo de 80, la tira volvía, el scroll
  // volvía a 85… y así sin fin: 30 a 80 veces por segundo mientras el dedo
  // quedara en esa franja (medido el 28/9/2026, en todas las páginas). Por eso
  // son dos umbrales:
  //  - se compacta pasado lo que el header va a perder, con aire: compensado, el
  //    scroll sigue arriba de 0;
  //  - se expande recién arriba de todo, donde Chrome no compensa nada (con el
  //    scroll en 0 no ancla: medido).
  // El umbral crece con la tira porque con movimiento reducido ocupa varias
  // líneas (143 px a 375): con 80 fijo el scroll compensado caía a 0 y rebotaba
  // igual. En Safari, que no ancla, el contenido salta al compactarse como
  // siempre, pero tampoco hay loop.
  const tiraRef = useRef(null);
  useEffect(() => {
    let compactado = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (compactado) {
        // `< 1` y no `=== 0`: con zoom, algún navegador reporta décimas arriba de todo.
        compactado = y >= 1;
      } else {
        const tira = tiraRef.current?.offsetHeight ?? 0;
        compactado = y > Math.max(UMBRAL_COMPACTO, tira + MARGEN_UMBRAL);
      }
      setCompacto(compactado);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cambio de página → el menú del celular se cierra. Los links ya lo cierran
  // al tocarlos; esto cubre el "atrás" del navegador con el menú abierto.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // El menú del celular scrollea POR DENTRO (spec 033, RF-C8). Con Minorista
  // abierto (Personalizados + 8 categorías) ya no entra en 667 px de alto, y
  // como cuelga de un header sticky, lo que quedara abajo de la pantalla no se
  // podía alcanzar de ninguna forma: la página scrolleaba atrás del header.
  // El alto se mide y no se escribe en CSS: arriba puede haber banner de promo
  // o no, y abajo cuelga la tira de anuncios, que se recoge al compactar.
  const menuRef = useRef(null);
  const [altoMenu, setAltoMenu] = useState(null);
  useLayoutEffect(() => {
    if (!open) return;
    const medir = () => {
      const el = menuRef.current;
      if (!el) return;
      const tira = tiraRef.current?.offsetHeight ?? 0;
      setAltoMenu(Math.max(240, window.innerHeight - el.getBoundingClientRect().top - tira));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [open, compacto]);

  return (
    /* El modal de búsqueda va FUERA del <header>, no adentro.
       El header tiene `backdrop-filter`, y un elemento con backdrop-filter se
       vuelve el bloque contenedor de sus descendientes `position: fixed`: el
       modal quedaba encerrado en los 100 px del header y la página seguía
       visible debajo. Como hermano, su `inset: 0` vuelve a resolver contra el
       viewport. (Mismo motivo por el que no sirve subirle el z-index.) */
    <>
    {/* Orden del header: banner de promo (si hay) → nav → menú mobile → barra de
       anuncios. La barra va ÚLTIMA y no entre el nav y el menú: el menú
       desplegable cuelga pegado al nav, y meterle una tira de color en el medio
       lo parte al abrirlo. */}
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/10">
      {promoActive ? (
        /* ⚠️ P-1 de la spec 017: con las TRES promos vivas este if/else muestra
           una sola, y es el 3x2 — el de mayor alcance, porque toca todo el
           catálogo. El 2x1 se anuncia en sus cuatro categorías y el mayorista en
           `OfertaPrincipal` del Home, así cada oferta habla donde significa algo
           en vez de tres carteles peleando arriba (spec 014). Cambiar cuál gana
           es reordenar este if/else.
           Sin subtítulo desde el 28/9/2026 ("Cada 3 calcos, la más barata
           gratis"): "3×2" ya dice llevás 3 y pagás 2 (Mariano). La mecánica
           exacta sigue explicada en el carrito y en el checkout. */
        <PromoBanner
          title="3×2 EN TODAS LAS CALCOS"
          to="/categorias"
          ariaLabel="Promoción 3x2 en todas las calcos"
        />
      ) : mayoristaPromoActive ? (
        // Título, subtítulo y precio salen de PROMO_MAYORISTA_100; la fecha, de
        // su `endsAt`. Acá no se escribe ni un dato de la promo a mano.
        <PromoBanner
          title={PROMO_MAYORISTA_100.titulo}
          subtitle={PROMO_MAYORISTA_100.subtitulo}
          to="/mayorista"
          ariaLabel={`Promoción mayorista: ${PROMO_MAYORISTA_100.titulo}`}
        />
      ) : argentinaPromoActive ? (
        // Lunes 17 a miércoles 19 de agosto. Se prende sola a las 00:00 del
        // lunes (ver useActiveBetween) — no hay que deployar nada ese día.
        <PromoBanner
          title={PROMO_ARGENTINA.titulo}
          subtitle={`${PROMO_ARGENTINA.subtitulo} · hasta ${endLabel(PROMO_ARGENTINA_END_MS, 'el miércoles')}`}
          endMs={PROMO_ARGENTINA_END_MS}
          to={`/categoria/${PROMO_ARGENTINA.categoria}`}
          ariaLabel={`Promoción: ${PROMO_ARGENTINA.titulo}`}
        />
      ) : null}

      <div
        className={`container-app flex items-center justify-between transition-[padding] duration-200 ${
          compacto ? 'py-2' : 'py-4'
        }`}
      >
        <Link to="/" className="flex items-center shrink-0" onClick={() => setOpen(false)} aria-label={site.name}>
          {/* El logo está arriba del fold en todas las páginas: eager + tamaño
              declarado para que el header no salte al cargar. */}
          <img
            src="/favicon.png"
            alt={site.name}
            width={44}
            height={44}
            decoding="async"
            className={`rounded-lg transition-all duration-200 ${compacto ? 'h-9 w-9' : 'h-11 w-11'}`}
          />
        </Link>

        {/* lg y no md: con 7 links el nav no entraba en 768 px y desbordaba la
            página. Con el menú de la spec 033 son 5 entradas, pero 3 con flecha:
            el corte sigue en lg. */}
        <MenuEscritorio />

        <div className="flex items-center gap-2">
          {/* BUSCAR, antes que el carrito y bastante antes que la hamburguesa.
              Con 61 categorías y 3.397 diseños, buscar es la forma real de
              navegar este catálogo: en mobile tiene que pesar más que el menú.
              Por eso lleva texto en celular (el menú no) y va con el mismo
              tratamiento visual que el carrito. */}
          <button
            onClick={() => setBuscando(true)}
            className="btn-secondary !py-2 !px-3.5 min-h-[44px] !border-white/25"
            aria-label="Buscar calcos"
          >
            <span aria-hidden>🔎</span>
            {/* El texto se muestra TAMBIÉN en celular, al revés que en el
                carrito y el menú. Es lo que hace que buscar pese más que la
                hamburguesa: tres círculos idénticos de 44 px dicen que las tres
                acciones valen lo mismo, y acá no valen lo mismo. */}
            <span>Buscar</span>
          </button>

          {/* COTIZAR (spec 031, RF-N1): el CTA de negocio, separado de los
              links porque es una acción, no un lugar. Solo desde lg: en el
              celular el header ya tiene Buscar, carrito y menú, y un cuarto
              botón aplastaría a "Buscar"; ahí vive dentro del menú. Despliega
              WhatsApp o "Dejar mis datos" (enmienda E-1). */}
          <BotonCotizar
            origen="header"
            label="Cotizar"
            alinear="derecha"
            contenedorClassName="hidden lg:block"
            className="btn-primary !py-2 !px-4 min-h-[44px] whitespace-nowrap"
          />
          <button onClick={openDrawer} className="btn-secondary !py-2 !px-3 relative min-h-[44px] min-w-[44px]" aria-label="Abrir carrito">
            <span aria-hidden>🛒</span>
            <span className="hidden lg:inline">Carrito</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 grid place-items-center min-w-[20px] h-5 px-1 text-xs font-bold rounded-full"
                style={{ background: 'linear-gradient(135deg,#FF1B8D,#FF5A1F)' }}>
                {totalItems}
              </span>
            )}
          </button>
          <button
            className="lg:hidden btn-secondary !py-2 !px-3 min-h-[44px] min-w-[44px]"
            aria-label="Abrir menú"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* `data-popup-bloqueo`: con el menú abierto el popup de bienvenida
          espera (spec 026). */}
      {open && (
        <div
          ref={menuRef}
          id={ID_MENU_MOVIL}
          className="lg:hidden border-t border-white/10 bg-black/80 overflow-y-auto overscroll-contain"
          style={altoMenu ? { maxHeight: altoMenu } : undefined}
          data-popup-bloqueo=""
        >
          <div className="container-app py-3">
            <MenuMovil onElegir={() => setOpen(false)} />
            <BotonCotizar
              origen="menu"
              modo="en-linea"
              alElegir={() => setOpen(false)}
              contenedorClassName="mt-2"
              className="btn-primary w-full min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* La tira de anuncios va SIEMPRE, haya o no banner de promo (spec 020).
          Hasta el 14/9/2026 se callaba con una promo viva —dos tiras de colores
          compitiendo se anulaban (spec 014)—, pero con el 3x2 sin fecha de fin
          eso la apagó para siempre: desde el 7/9 el header no decía en ningún
          lado desde cuánto el envío es gratis. Ahora la tira es oscura y el
          color queda solo en el banner: una se lee como oferta, la otra como
          información.
          Se recoge al scrollear: pasado el primer scroll las dudas ya se leyeron
          y esos ~35 px valen más para el producto. El `div` es para medirla
          (el umbral de arriba); compactado queda vacío y no ocupa nada. */}
      <div ref={tiraRef}>{!compacto && <AnnouncementBar negocio={esNegocio} />}</div>
    </header>

    <BuscadorModal abierto={buscando} onCerrar={() => setBuscando(false)} />
    </>
  );
}
