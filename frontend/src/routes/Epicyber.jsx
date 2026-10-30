import { useLocation, useSearchParams, Navigate, Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import PackBuilder from '../components/PackBuilder.jsx';
import CyberBanner from '../components/cyber/CyberBanner.jsx';
import CyberSelectorPack from '../components/cyber/CyberSelectorPack.jsx';
import {
  CyberCondiciones,
  CyberMayoristas,
  CyberPacksChicos,
  CyberPendientes
} from '../components/cyber/CyberSecciones.jsx';
import { CYBER, DEFAULT_SIZE, WHOLESALE_QTY } from '../config/pricing.js';
import { EPICYBER_COPY, RANGO_FECHAS, promoDePack, separarPacks, textoBanner } from '../config/epicyber.js';
import { usePacksCyber } from '../lib/promo.js';
import { useSeo } from '../lib/seo.js';

/**
 * Las ofertas de EPICYBER en un solo lugar (spec 036), y el destino de los
 * anuncios durante la campaña. `?n=30` abre el armador con ese pack.
 *
 * Va en una ruta propia y no en /armar-pack porque esa sección está despublicada
 * (HIDDEN_SECTIONS) y publicarla es otra decisión: acá no se toca.
 *
 * Sin campaña redirige en vez de dar 404: un anuncio o un link guardado sigue
 * llevando a la tienda.
 */
export default function Epicyber() {
  const packs = usePacksCyber();
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();

  const n = parseInt(params.get('n') || '', 10);
  const pack = packs.find((p) => p.qty === n) || null;

  useSeo({
    title: pack ? `Pack Cyber x${pack.qty}` : CYBER.nombre,
    description: `${EPICYBER_COPY.banner.subtitulo}, ${RANGO_FECHAS}. ${textoBanner(packs)}.`
  });

  if (!packs.length) return <Navigate to="/categorias" replace />;

  if (pack) {
    const { chicos, mayoristas } = separarPacks(packs);
    const gama = pack.qty < WHOLESALE_QTY ? chicos : mayoristas;
    const elegir = (qty) => setParams({ n: String(qty) }, { replace: true, state });

    return (
      <div className="page-gradient min-h-screen">
        <div className="container-app py-6 md:py-10">
          <Breadcrumbs
            items={[
              { name: 'Inicio', to: '/' },
              { name: CYBER.nombre, to: '/epicyber' },
              { name: `Pack x${pack.qty}` }
            ]}
          />
          <div className="mt-4">
            <CyberSelectorPack packs={gama} qty={pack.qty} onElegir={elegir} ubicacion="armador" />
          </div>
          <div className="mt-4">
            <PackBuilder
              packType="cyber"
              discount={0}
              promo={promoDePack(pack)}
              soloTamanos={CYBER.sizes}
              defaultSize={DEFAULT_SIZE}
              allowCustom
              semilla={state?.semilla}
              packSizeLabel={`cyber_x${pack.qty}`}
              title={`Pack Cyber x${pack.qty}`}
              subtitle="Elegí tus diseños del catálogo, subí los tuyos o mezclá. Podés repetir."
            />
          </div>
          <CyberCondiciones />
        </div>
      </div>
    );
  }

  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app pt-6">
        <Breadcrumbs items={[{ name: 'Inicio', to: '/' }, { name: CYBER.nombre }]} />
      </div>
      <CyberBanner soloTitulo />
      <CyberPacksChicos ubicacion="epicyber_chicos" />
      <CyberMayoristas ubicacion="epicyber_mayoristas" />
      <CyberPendientes />
      <div className="container-app pb-10 text-center">
        <Link to="/categorias" className="btn-ghost text-sm">
          ¿Preferís de a uno? Ver el catálogo
        </Link>
      </div>
    </div>
  );
}
