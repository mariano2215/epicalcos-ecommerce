import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackSearch, trackSearchResultsView } from '../lib/analytics.js';
import { suggest } from '../lib/searchCatalog.js';
import { cargarCatalogo, cargarAliases } from '../lib/catalogoBusqueda.js';
import { BUSQUEDAS_SUGERIDAS, leerBusquedas, registrarBusqueda } from '../lib/busquedasSugeridas.js';
import { CATEGORIES } from '../data/categories.js';

/**
 * El buscador de EPICALCOS, en un solo lugar.
 *
 * Vivía adentro del `Hero` —input, fetch de los dos manifests, autocomplete,
 * submit y tracking, todo mezclado con el layout del hero—. Con el buscador
 * ahora en tres lugares de la Home (su propia sección, el modal del header y el
 * CTA final), dejarlo ahí significaba copiar esa lógica tres veces y bajar
 * `catalog.json` tres veces por visita. Los manifests se comparten en
 * `lib/catalogoBusqueda.js`; esto es sólo la interfaz.
 *
 * POR QUÉ ES PROTAGONISTA: 61 categorías y 3.397 diseños. Navegar por grilla
 * hasta encontrar "Taylor Swift" es imposible; escribirlo tarda dos segundos.
 *
 * @param {object} props
 * @param {'md'|'lg'} [props.size]     `lg` = el de la sección y el CTA final
 * @param {boolean} [props.autoFocus]  el modal lo usa; también precarga los datos
 * @param {boolean} [props.chips]      mostrar búsquedas sugeridas y recientes
 * @param {string}  [props.origen]     de dónde salió la búsqueda (analytics)
 * @param {() => void} [props.onNavigate] avisar al padre (el modal se cierra)
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 */
export default function BuscadorCalcos({
  size = 'md',
  autoFocus = false,
  chips = false,
  origen = 'home',
  onNavigate,
  placeholder = 'Buscá Taylor Swift, Boca, Harry Potter, Argentina…',
  className = ''
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [catalogo, setCatalogo] = useState({});
  const [aliases, setAliases] = useState({ categorias: {}, rutas: {} });
  const [cargado, setCargado] = useState(false);
  const [recientes, setRecientes] = useState([]);
  const ultimaMedida = useRef('');

  // Los manifests bajan en el primer focus para no tocar el LCP del Home. Con
  // `autoFocus` (el modal) bajan al montar: ahí la persona ya pidió buscar y
  // esperar al focus sería esperar de más.
  const cargarDatos = () => {
    if (cargado) return;
    setCargado(true);
    cargarCatalogo().then(setCatalogo);
    cargarAliases().then(setAliases);
  };

  useEffect(() => {
    if (!autoFocus) return;
    cargarDatos();
    // El foco va en un frame posterior: en iOS, enfocar mientras el diálogo
    // todavía está animando no abre el teclado.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  useEffect(() => {
    if (chips) setRecientes(leerBusquedas());
  }, [chips]);

  const sugerencias = useMemo(
    () => suggest(q, CATEGORIES, catalogo, aliases, 6),
    [q, catalogo, aliases]
  );
  const mostrarSugerencias = abierto && sugerencias.length > 0;

  // `search_results_view`: la búsqueda que se resuelve en el autocomplete y
  // nunca se envía. Se mide una vez por término, no en cada tecla.
  useEffect(() => {
    const termino = q.trim();
    if (termino.length < 2 || !sugerencias.length) return;
    if (ultimaMedida.current === termino) return;
    ultimaMedida.current = termino;
    trackSearchResultsView(termino, sugerencias.length, origen);
  }, [q, sugerencias, origen]);

  const irA = (to, termino) => {
    if (termino) registrarBusqueda(termino);
    setAbierto(false);
    onNavigate?.();
    navigate(to);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const termino = q.trim();
    if (termino) trackSearch(termino);
    const params = new URLSearchParams();
    if (termino) params.set('q', termino);
    irA(`/categorias${params.toString() ? `?${params.toString()}` : ''}`, termino);
  };

  const buscarTermino = (termino) => {
    trackSearch(termino);
    irA(`/categorias?q=${encodeURIComponent(termino)}`, termino);
  };

  const grande = size === 'lg';

  return (
    <div className={`buscador ${className}`}>
      {/* El campo y la lista viven en su PROPIA caja relativa. Con la lista
          posicionada contra el `.buscador` entero, su `top: 100%` caía debajo de
          los chips y el desplegable aparecía flotando a media pantalla del
          input. */}
      <div className="buscador__caja">
      <form onSubmit={onSubmit} className={`buscador__campo ${grande ? 'buscador__campo--lg' : ''}`}>
        <span className="buscador__lupa" aria-hidden>🔎</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            cargarDatos();
            setAbierto(true);
          }}
          // El blur se difiere: sin eso, el click en una sugerencia cierra la
          // lista antes de que el evento llegue al botón. (El listado usa
          // onMouseDown por lo mismo; esto cubre el foco por teclado.)
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          placeholder={placeholder}
          className="buscador__input"
          aria-label="Buscar calcos"
          role="combobox"
          aria-expanded={mostrarSugerencias}
          aria-autocomplete="list"
          enterKeyHint="search"
          type="search"
        />
        <button type="submit" className="btn-primary buscador__submit">
          Buscar
        </button>
      </form>

      {mostrarSugerencias && (
        <ul className="buscador__lista" role="listbox" aria-label="Sugerencias">
          {sugerencias.map((s) => (
            <li key={s.to}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                // onMouseDown (no onClick): corre antes del blur del input y no
                // pierde el click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  irA(s.to, q.trim());
                }}
                className="buscador__opcion"
              >
                {/* Se vende una IMAGEN: una lista de nombres en gris obliga a
                    navegar para recién ahí ver si era eso lo que buscaba. Si la
                    portada da 404 se esconde y queda el emoji del label — un
                    ícono de imagen rota en la primera interacción del home no. */}
                {s.image && (
                  <img
                    src={s.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    width={32}
                    height={32}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-8 h-8 shrink-0 rounded-lg object-contain bg-white/5 p-0.5"
                  />
                )}
                <span className="truncate flex-1 text-left">{s.label}</span>
                {typeof s.count === 'number' && (
                  <span className="shrink-0 text-xs text-white/40">{s.count} diseños</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>

      {/* Los chips se esconden mientras hay sugerencias: son ejemplos para
          arrancar, y una vez que la persona escribió ya no ayudan — sólo le
          disputan la atención al resultado que estaba buscando. */}
      {chips && !mostrarSugerencias && (
        <div className="mt-5 space-y-4">
          {recientes.length > 0 && (
            <div>
              <p className="buscador__rotulo">Tus últimas búsquedas</p>
              <div className="buscador__chips">
                {recientes.map((t) => (
                  <button key={t} type="button" className="chip-busqueda" onClick={() => buscarTermino(t)}>
                    <span aria-hidden>🕘</span> {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="buscador__rotulo">Lo que más buscan</p>
            <div className="buscador__chips">
              {BUSQUEDAS_SUGERIDAS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="chip-busqueda"
                  onClick={() => buscarTermino(t)}
                  aria-label={`Buscar ${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
