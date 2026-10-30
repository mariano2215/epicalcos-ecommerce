import { Link } from 'react-router-dom';
import { CAMINO_TIENDA } from '../../config/negocios.js';
import { NAV_CATEGORIAS, isSectionHidden } from '../../config/site.js';
import { CATEGORIES } from '../../data/categories.js';
import { trackCategoryClick, trackCustomStickerClick } from '../../lib/analytics.js';

/**
 * El camino a la tienda dentro del Home B2B (spec 031 RF-HO2, spec 034 RF-12;
 * US-6: "quiero llegar a la tienda en un click aunque el Home hable de
 * negocios"). El cliente minorista es la mayoría del tráfico de Instagram: si
 * la variante B2B lo pierde, el A/B lo va a mostrar en la facturación por
 * sesión — pero no puede perderlo por no encontrar la puerta.
 *
 * Las categorías son las mismas del menú (`NAV_CATEGORIAS`, spec 033): una
 * sola lista que mantener.
 */
export default function CaminoTienda() {
  const categorias = NAV_CATEGORIAS.map((slug) => CATEGORIES.find((c) => c.slug === slug)).filter(Boolean);
  const conPersonalizados = !isSectionHidden('/personalizados');

  return (
    <section className="seccion">
      <div className="container-app">
        <div className="card-glass p-6 md:p-10 text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">{CAMINO_TIENDA.titulo}</h2>
          <p className="text-white/70 mt-3">{CAMINO_TIENDA.bajada}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {categorias.map((c, i) => (
              <li key={c.slug}>
                <Link
                  to={`/categoria/${c.slug}`}
                  onClick={() => trackCategoryClick(c.name, i + 1)}
                  className="chip-busqueda min-h-[44px]"
                >
                  <span aria-hidden>{c.emoji}</span> {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/categorias" className="btn-primary min-h-[48px]">
              {CAMINO_TIENDA.ctaTienda}
            </Link>
            {conPersonalizados && (
              <Link
                to="/personalizados"
                onClick={() => trackCustomStickerClick('home_b2b')}
                className="btn-secondary min-h-[48px]"
              >
                {CAMINO_TIENDA.ctaPersonalizados}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
