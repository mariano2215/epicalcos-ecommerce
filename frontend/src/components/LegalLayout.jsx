import Breadcrumbs from './Breadcrumbs.jsx';

/**
 * Layout compartido para páginas legales.
 * children: contenido en JSX. Usar h2 / p / ul.
 */
export default function LegalLayout({ title, intro, lastUpdated, children, breadcrumbName }) {
  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-10">
        <Breadcrumbs
          items={[
            { name: 'Inicio', to: '/' },
            { name: breadcrumbName || title }
          ]}
        />

        <article className="max-w-3xl mx-auto card-glass p-8 md:p-12">
          <header className="mb-8">
            <span className="badge badge-soft mb-3">Información</span>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl">{title}</h1>
            {intro && <p className="text-white/70 mt-4">{intro}</p>}
            {lastUpdated && (
              <p className="text-white/40 text-xs mt-3">Última actualización: {lastUpdated}</p>
            )}
          </header>

          <div className="prose-legal text-white/80 space-y-5 leading-relaxed">
            {children}
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-xs text-white/40">
            <p>
              ¿Dudas? Escribinos a{' '}
              <a href="mailto:epicalcos@gmail.com" className="text-white/70 hover:text-white underline">
                epicalcos@gmail.com
              </a>{' '}
              o por WhatsApp.
            </p>
          </div>
        </article>
      </div>

      <style>{`
        .prose-legal h2 {
          font-family: 'Montserrat', system-ui, sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .prose-legal ul {
          list-style: disc;
          padding-left: 1.25rem;
          color: rgba(255,255,255,0.75);
        }
        .prose-legal ul li { margin-bottom: 0.35rem; }
        .prose-legal strong { color: white; }
        .prose-legal mark {
          background: rgba(255, 27, 141, 0.18);
          color: #FFD84D;
          padding: 0 4px;
          border-radius: 4px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
