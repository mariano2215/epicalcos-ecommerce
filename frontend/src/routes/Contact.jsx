export default function Contact() {
  return (
    <div className="page-gradient min-h-screen">
      <div className="container-app py-16">
        <div className="max-w-2xl mx-auto text-center">
          <span className="badge badge-soft mb-3">Hablemos</span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl">Contacto</h1>
          <p className="text-white/70 mt-4">
            Para consultas, diseños personalizados o pedidos especiales, escribinos por cualquiera de estos canales.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto">
          <a
            href="https://wa.me/5493410000000"
            target="_blank"
            rel="noopener noreferrer"
            className="card-glass card-glass-hover p-6 text-center"
          >
            <div className="text-3xl mb-2">💬</div>
            <div className="font-semibold">WhatsApp</div>
            <div className="text-white/60 text-sm">Consultas y diseño</div>
          </a>
          <a
            href="mailto:hola@epicalcos.com"
            className="card-glass card-glass-hover p-6 text-center"
          >
            <div className="text-3xl mb-2">✉️</div>
            <div className="font-semibold">Email</div>
            <div className="text-white/60 text-sm">hola@epicalcos.com</div>
          </a>
          <a
            href="https://instagram.com/epicalcos"
            target="_blank"
            rel="noopener noreferrer"
            className="card-glass card-glass-hover p-6 text-center"
          >
            <div className="text-3xl mb-2">📸</div>
            <div className="font-semibold">Instagram</div>
            <div className="text-white/60 text-sm">@epicalcos</div>
          </a>
        </div>

        <p className="text-center text-white/40 text-xs mt-10">
          Para finalizar una compra, elegí tus productos en la tienda y pagá online con Mercado Pago.
        </p>
      </div>
    </div>
  );
}
