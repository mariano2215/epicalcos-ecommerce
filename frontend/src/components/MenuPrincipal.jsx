import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { navMenu } from '../config/site.js';
import { getCategory } from '../data/categories.js';
import { trackMenu } from '../lib/analytics.js';

/**
 * El menú principal de la spec 033: Home · Mayorista ▾ · Minorista ▾ · Otros
 * productos ▾ · Contacto. Lo que dice sale de `navMenu` (config/site.js);
 * acá solo se dibuja, dos veces: `MenuEscritorio` desde lg y `MenuMovil`
 * adentro de la hamburguesa.
 *
 * Patrón "disclosure" (botón + panel) y no `role="menu"`: ese rol es para
 * menús de aplicación y cambia cómo lo lee un lector de pantalla; para la
 * navegación de un sitio, un botón con `aria-expanded` es lo que se espera.
 *
 * Los paneles están SIEMPRE en el DOM (con `hidden`), no se montan al abrir:
 * así los links del menú quedan en el HTML que recorre un buscador.
 */

/** `id` del menú del celular mientras está abierto (lo pone Header.jsx). */
export const ID_MENU_MOVIL = 'menu-movil';

/**
 * Para lo que flota abajo de la pantalla en el celular (WhatsApp, "🎁 10% OFF",
 * la barra fija de /personalizados): se esconde mientras el menú del celular
 * está abierto. Son `fixed` con z-40, igual que el header y después de él en
 * el DOM, así que pintaban ENCIMA del menú: con Minorista desplegado tapaban
 * opciones y el botón Cotizar del final (spec 033). Con `:has()` no hace falta
 * pasar estado entre componentes; un navegador sin `:has()` los muestra como
 * antes.
 *
 * ⚠️ El id va escrito a mano en la clase porque Tailwind la lee del código tal
 * cual: si cambia ID_MENU_MOVIL, cambiar también acá.
 */
export const OCULTO_CON_MENU_MOVIL = '[body:has(#menu-movil)_&]:hidden';

/** Las categorías del grupo con nombre y emoji. Un slug que ya no existe se saltea. */
const categoriasDe = (g) => (g.categorias || []).map(getCategory).filter(Boolean);

/** ¿La página actual es de este grupo? (RF-C5). Una categoría o un producto son de Minorista. */
export function grupoActivo(g, pathname) {
  return g.items.some((l) => l.to === pathname) || (g.activoEn || []).some((p) => pathname.startsWith(p));
}

/** Misma flecha que el botón Cotizar: los dos se despliegan igual. */
function Flecha({ abierta }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 transition-transform ${abierta ? 'rotate-180' : ''}`}
    >
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

/** Una opción con su línea de detalle ("100 calcos con tu logo…"). */
function Opcion({ link, onElegir, className }) {
  return (
    <Link to={link.to} onClick={onElegir} className={className}>
      <span className="block font-semibold text-white">{link.label}</span>
      {link.detalle && <span className="block text-xs text-white/60 mt-0.5">{link.detalle}</span>}
    </Link>
  );
}

/**
 * Ítem del nav de compu. Entre lg y xl el padding baja de 0.9rem a 0.75rem: a
 * 1024 px el menú, Buscar, Cotizar y Carrito sumaban 1.003 px en 984 de lugar,
 * y el flex le sacaba los 19 px que faltaban AL LOGO (quedaba de 25 px de
 * ancho, aplastado). Ver también el `shrink-0` del logo en Header.jsx.
 */
const ITEM = 'btn-ghost !px-3 xl:!px-[0.9rem] !text-white font-semibold whitespace-nowrap';

const OPCION =
  'block rounded-xl px-3 py-2.5 min-h-[44px] hover:bg-white/10 focus-visible:bg-white/10';
const CATEGORIA =
  'flex items-center gap-2 rounded-xl px-3 min-h-[44px] text-sm text-white/85 hover:bg-white/10 hover:text-white focus-visible:bg-white/10';
const VER_TODAS =
  'flex items-center rounded-xl px-3 min-h-[44px] text-sm font-semibold text-brand-pink hover:bg-white/10 focus-visible:bg-white/10';

/**
 * Las categorías del grupo + "Ver todas las categorías" al pie. El nombre baja
 * de línea en vez de cortarse: a 375 px, en dos columnas, "Escudos de Fútbol"
 * no entra y con `truncate` se leía "Escudos de F…".
 */
function ListaCategorias({ grupo, elegir }) {
  return (
    <>
      <ul className="grid grid-cols-2 gap-0.5">
        {categoriasDe(grupo).map((c) => (
          <li key={c.slug} className="min-w-0">
            <Link to={`/categoria/${c.slug}`} onClick={() => elegir(grupo.id, `/categoria/${c.slug}`)} className={CATEGORIA}>
              <span aria-hidden>{c.emoji}</span>
              <span className="min-w-0 leading-tight py-1">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {grupo.items
        .filter((l) => l.verTodas)
        .map((l) => (
          <Link key={l.to} to={l.to} onClick={() => elegir(grupo.id, l.to)} className={`${VER_TODAS} mt-1`}>
            {l.label} →
          </Link>
        ))}
    </>
  );
}

/** Milisegundos de gracia al sacar el mouse: lo que tarda en cruzar del título al panel. */
const GRACIA_MS = 150;

/**
 * Desde lg. El grupo abre con click/tap, con Enter/Espacio y —solo con mouse—
 * al pasar por encima (RF-C1).
 *
 * ⚠️ El hover es SOLO para `pointerType === 'mouse'`. En una tablet táctil de
 * 1024 px el tap dispara `pointerenter` y `click` seguidos: con hover para
 * todos, el primero abría y el segundo cerraba, y el menú no abría nunca.
 * Por lo mismo, si el grupo lo abrió el hover, el primer click lo FIJA en vez
 * de cerrarlo (RF-C2): con mouse, el click siempre llega después del hover.
 */
export function MenuEscritorio() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(null);
  const abiertoPor = useRef(null); // 'mouse' | 'click'
  const cierre = useRef(0);
  const navRef = useRef(null);

  // Cambio de página → se cierra (RF-C4). Cubre también el "atrás" del navegador.
  useEffect(() => {
    setAbierto(null);
  }, [pathname]);
  useEffect(() => () => clearTimeout(cierre.current), []);

  // Solo con un grupo abierto se escucha afuera: cerrado no cuesta nada.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => {
      if (!navRef.current?.contains(e.target)) setAbierto(null);
    };
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setAbierto(null);
        document.getElementById(`menu-boton-${abierto}`)?.focus();
      }
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const abrir = (id, por) => {
    clearTimeout(cierre.current);
    abiertoPor.current = por;
    if (abierto !== id) trackMenu({ accion: 'abrir', grupo: id, vista: 'desktop' });
    setAbierto(id);
  };

  const alternar = (id) => {
    if (abierto === id && abiertoPor.current === 'mouse') {
      abiertoPor.current = 'click';
    } else if (abierto === id) {
      setAbierto(null);
    } else {
      abrir(id, 'click');
    }
  };

  const entrar = (e, id) => {
    if (e.pointerType === 'mouse') abrir(id, 'mouse');
  };

  // Solo cierra al salir lo que abrió el hover: lo que se fijó con un click
  // espera a un click afuera, Escape o elegir.
  const salir = (e) => {
    if (e.pointerType !== 'mouse' || abiertoPor.current !== 'mouse') return;
    clearTimeout(cierre.current);
    cierre.current = setTimeout(() => setAbierto(null), GRACIA_MS);
  };

  // Con Tab, al salir del grupo hacia otro elemento se cierra. `relatedTarget`
  // null (un click en el fondo del panel, Safari que no enfoca botones) no
  // cuenta: de eso se ocupa el click afuera.
  const desenfocar = (e, id) => {
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && abierto === id) setAbierto(null);
  };

  const elegir = (grupo, destino) => {
    trackMenu({ accion: 'click', grupo, destino, vista: 'desktop' });
    setAbierto(null);
  };

  return (
    <nav ref={navRef} aria-label="Principal" className="hidden lg:block">
      <ul className="flex items-center gap-0.5 xl:gap-1">
        {navMenu.map((e) =>
          e.items ? (
            <li
              key={e.id}
              className="relative"
              onPointerEnter={(ev) => entrar(ev, e.id)}
              onPointerLeave={salir}
              onBlur={(ev) => desenfocar(ev, e.id)}
            >
              <button
                id={`menu-boton-${e.id}`}
                type="button"
                aria-expanded={abierto === e.id}
                aria-controls={`menu-panel-${e.id}`}
                onClick={() => alternar(e.id)}
                className={`${ITEM} ${
                  abierto === e.id || grupoActivo(e, pathname) ? 'bg-white/10' : ''
                }`}
              >
                {e.label}
                <Flecha abierta={abierto === e.id} />
              </button>

              {/* `pt-2` y no `mt-2`: el espacio entre el título y el panel es
                  parte del <li>, así el mouse lo cruza sin disparar el
                  `pointerleave`. `data-popup-bloqueo`: con un panel abierto el
                  popup de bienvenida espera (spec 026). Fondo opaco y sin
                  backdrop-filter: el header ya tiene uno, y anidado no
                  desenfoca lo de atrás en todos los navegadores. */}
              <div
                id={`menu-panel-${e.id}`}
                hidden={abierto !== e.id}
                data-popup-bloqueo={abierto === e.id ? '' : undefined}
                className="absolute left-0 top-full z-50 pt-2"
              >
                {e.categorias ? (
                  <div className="w-[38rem] grid grid-cols-[12rem_1fr] gap-2 rounded-2xl border border-white/15 bg-[#1a1a1a] p-2 shadow-2xl shadow-black/50">
                    <ul>
                      {e.items
                        .filter((l) => !l.verTodas)
                        .map((l) => (
                          <li key={l.to}>
                            <Opcion link={l} onElegir={() => elegir(e.id, l.to)} className={OPCION} />
                          </li>
                        ))}
                    </ul>
                    <div className="border-l border-white/10 pl-2">
                      <ListaCategorias grupo={e} elegir={elegir} />
                    </div>
                  </div>
                ) : (
                  <ul className="w-72 rounded-2xl border border-white/15 bg-[#1a1a1a] p-2 shadow-2xl shadow-black/50">
                    {e.items.map((l) => (
                      <li key={l.to}>
                        <Opcion link={l} onElegir={() => elegir(e.id, l.to)} className={OPCION} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ) : (
            <li key={e.to}>
              <NavLink
                to={e.to}
                end={e.to === '/'}
                onClick={() => elegir('raiz', e.to)}
                className={({ isActive }) =>
                  `${ITEM} ${isActive ? 'bg-white/10' : ''}`
                }
              >
                {e.label}
              </NavLink>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}

const FILA = 'flex items-center min-h-[44px] px-3 rounded-lg text-white font-semibold';

/**
 * Adentro de la hamburguesa (< lg): los grupos son acordeones, uno abierto a
 * la vez para que el menú no se haga eterno. Se monta al abrir el menú, así
 * que arranca con el grupo de la página actual ya abierto (RF-C7).
 * `onElegir` cierra el menú del header.
 */
export function MenuMovil({ onElegir }) {
  const { pathname } = useLocation();
  const [grupo, setGrupo] = useState(() => navMenu.find((e) => e.items && grupoActivo(e, pathname))?.id ?? null);

  const alternar = (id) => {
    const proximo = grupo === id ? null : id;
    setGrupo(proximo);
    if (proximo) trackMenu({ accion: 'abrir', grupo: id, vista: 'mobile' });
  };

  const elegir = (g, destino) => {
    trackMenu({ accion: 'click', grupo: g, destino, vista: 'mobile' });
    onElegir();
  };

  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {navMenu.map((e) =>
        e.items ? (
          <div key={e.id}>
            <button
              type="button"
              aria-expanded={grupo === e.id}
              aria-controls={`menu-movil-${e.id}`}
              onClick={() => alternar(e.id)}
              className={`${FILA} w-full justify-between ${grupoActivo(e, pathname) ? 'bg-white/10' : ''}`}
            >
              {e.label}
              <Flecha abierta={grupo === e.id} />
            </button>
            <div id={`menu-movil-${e.id}`} hidden={grupo !== e.id}>
              <div className="mt-1 mb-2 ml-3 pl-2 border-l border-white/10">
                <ul>
                  {e.items
                    .filter((l) => !(e.categorias && l.verTodas))
                    .map((l) => (
                      <li key={l.to}>
                        <Opcion link={l} onElegir={() => elegir(e.id, l.to)} className={OPCION} />
                      </li>
                    ))}
                </ul>
                {e.categorias && <ListaCategorias grupo={e} elegir={elegir} />}
              </div>
            </div>
          </div>
        ) : (
          <NavLink
            key={e.to}
            to={e.to}
            end={e.to === '/'}
            onClick={() => elegir('raiz', e.to)}
            className={({ isActive }) => `${FILA} ${isActive ? 'bg-white/10' : ''}`}
          >
            {e.label}
          </NavLink>
        )
      )}
    </nav>
  );
}
