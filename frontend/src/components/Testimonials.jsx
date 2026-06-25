/**
 * Bloque de prueba social — 3 testimonios reales.
 * Reemplazá name, text e image con los datos reales cuando los tengas.
 * image: URL de foto del calco aplicado (subila a /public/testimonials/ o usá un link directo).
 */
const testimonials = [
  {
    name: 'Sol M.',
    text: 'Compré 20 calcos de anime y quedaron perfectos en mi termo. Ya van 3 meses y ninguno se despegó ni perdió color. Re recomendados.',
    image: null, // reemplazar con ruta real: '/testimonials/sol.jpg'
    label: 'Calcos anime · Rosario'
  },
  {
    name: 'Lucas R.',
    text: 'Pedí el pack personalizado con el logo de mi banda. Me mandaron vista previa antes de imprimir, quedó exactamente como lo quería. Servicio 10.',
    image: null,
    label: 'Pack personalizado · Buenos Aires'
  },
  {
    name: 'Caro V.',
    text: 'Los calcos de Pokémon para la laptop de mi hijo son una locura. Resistentes, bien cortados y llegaron rapidísimo. Voy a pedir más.',
    image: null,
    label: 'Calcos Pokémon · Córdoba'
  }
];

export default function Testimonials() {
  return (
    <section className="py-12">
      <div className="container-app">
        <div className="text-center mb-8">
          <span className="badge badge-soft mb-3">Lo que dicen</span>
          <h2 className="font-display font-extrabold text-3xl md:text-4xl">Clientes que ya personalizaron</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="card-glass p-6 flex flex-col gap-4">
              {t.image ? (
                <img
                  src={t.image}
                  alt={`Calco aplicado — testimonio de ${t.name}`}
                  className="w-full h-36 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-36 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 text-sm">
                  📸 Foto del calco aplicado
                </div>
              )}
              <p className="text-white/80 text-sm leading-relaxed flex-1">"{t.text}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-white/40 text-xs">{t.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
