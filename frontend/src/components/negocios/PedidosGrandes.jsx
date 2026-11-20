import { Link } from 'react-router-dom';
import { COTIZAR_FORM_HREF } from '../../config/site.js';
import { PEDIDOS_GRANDES, WHATSAPP } from '../../config/negocios.js';
import { CANTIDAD_MAS, consultaPresupuesto, guardarConsultaCotizar } from '../../lib/cotizadorNegocio.js';
import { hrefWhatsapp } from '../../lib/whatsapp.js';
import { trackCotizar, trackWhatsappClick } from '../../lib/analytics.js';

/**
 * "¿Necesitás más de 1.000?" (spec 031 RF-K1). El que necesita 5.000 calcos
 * para un evento no tenía camino: solo una línea del FAQ que decía "cotizamos
 * por WhatsApp".
 *
 * "Pedir presupuesto" abre el formulario de /contacto (mail + CRM, falla
 * cerrado) con la consulta ya armada (spec 034, design D-1).
 */
export default function PedidosGrandes({ pagina = 'negocio' }) {
  const presupuesto = () => {
    guardarConsultaCotizar(consultaPresupuesto({ cantidad: CANTIDAD_MAS }));
    trackCotizar({ origen: `${pagina}_pedidos_grandes`, via: 'formulario' });
  };
  const whatsapp = () => {
    trackCotizar({ origen: `${pagina}_pedidos_grandes`, via: 'whatsapp' });
    trackWhatsappClick(`pedidos_grandes_${pagina}`);
  };

  return (
    <section className="pb-12 md:pb-16">
      <div className="container-app">
        <div className="card-glass p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="min-w-0">
            <h2 className="font-display font-extrabold text-2xl md:text-3xl">{PEDIDOS_GRANDES.titulo}</h2>
            <p className="text-white/70 mt-2">{PEDIDOS_GRANDES.bajada}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to={COTIZAR_FORM_HREF} onClick={presupuesto} className="btn-primary min-h-[48px]">
              {PEDIDOS_GRANDES.ctaPresupuesto}
            </Link>
            <a
              href={hrefWhatsapp(WHATSAPP.pedidosGrandes)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={whatsapp}
              className="btn-secondary min-h-[48px]"
            >
              {PEDIDOS_GRANDES.ctaWhatsapp}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
