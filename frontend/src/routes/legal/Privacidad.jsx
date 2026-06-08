import LegalLayout from '../../components/LegalLayout.jsx';
import { useSeo } from '../../lib/seo.js';

export default function Privacidad() {
  useSeo({
    title: 'Política de privacidad',
    description: 'Cómo EPICALCOS recolecta, usa y protege tus datos personales.'
  });

  return (
    <LegalLayout
      title="Política de privacidad"
      intro="Tu información se usa solo para procesar tu pedido y comunicarnos con vos."
      lastUpdated="2026"
      breadcrumbName="Privacidad"
    >
      <h2>Responsable del tratamiento</h2>
      <p>
        EPICALCOS — Mariano Calandra, persona humana con domicilio en Rosario, Santa Fe, Argentina.
        Contacto: <strong>epicalcos@gmail.com</strong>.
      </p>

      <h2>Qué datos recolectamos</h2>
      <ul>
        <li><strong>Datos de contacto:</strong> nombre, email, teléfono y, si elegís envío, dirección.</li>
        <li><strong>Datos del pedido:</strong> productos elegidos, cantidades, comentarios.</li>
        <li><strong>Datos de pago:</strong> NO almacenamos datos de tarjetas. El pago se procesa íntegramente
          a través de Mercado Pago, que tiene su propia política de privacidad.</li>
        <li><strong>Datos técnicos:</strong> si tenés cookies habilitadas, podemos recolectar información
          anónima de navegación (páginas vistas, productos consultados) para mejorar la tienda.</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Procesar y coordinar tu pedido.</li>
        <li>Contactarte por dudas o avisos sobre el pedido.</li>
        <li>Generar estadísticas anónimas de uso de la tienda.</li>
        <li>Eventualmente, enviarte novedades — solo si te suscribís voluntariamente.</li>
      </ul>

      <h2>Con quién los compartimos</h2>
      <p>
        Solo con servicios necesarios para que funcione la tienda: <strong>Mercado Pago</strong> (procesar el
        pago) y <strong>Correo Argentino / plataformas logísticas</strong> (entregar el pedido). Nunca vendemos
        ni cedemos tus datos para fines comerciales de terceros.
      </p>

      <h2>Cookies y analytics</h2>
      <p>
        Si tenemos analytics activos, usamos cookies de Google Analytics y/o Meta Pixel para medir tráfico
        anónimo. Podés bloquearlas desde la configuración de tu navegador.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Tenés derecho a acceder, rectificar o eliminar tus datos personales escribiendo a{' '}
        <strong>epicalcos@gmail.com</strong>. Respondemos dentro de los 10 días hábiles.
      </p>

      <h2>Marco legal</h2>
      <p>
        Esta política se rige por la <strong>Ley 25.326 de Protección de Datos Personales</strong> de la
        República Argentina y normativa complementaria.
      </p>

      <p className="text-xs text-white/40 italic">
        [REVISAR] Esta política es un borrador estándar para e-commerce argentino. Recomendamos que la revise un
        abogado/a si el volumen de operación crece o si empezás a tratar categorías sensibles de datos.
      </p>
    </LegalLayout>
  );
}
