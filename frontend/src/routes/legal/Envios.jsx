import LegalLayout from '../../components/LegalLayout.jsx';
import { useSeo } from '../../lib/seo.js';
import { shipping } from '../../config/site.js';
import { formatPrice } from '../../lib/formato.js';

export default function Envios() {
  useSeo({
    title: 'Política de envíos',
    description: 'Zonas, costos y plazos de entrega de EPICALCOS. Envíos en Rosario y al resto del país.'
  });

  return (
    <LegalLayout
      title="Política de envíos"
      intro="Hacemos envíos en Rosario y al resto del país. Acá te contamos cómo funciona."
      lastUpdated="2026"
      breadcrumbName="Envíos"
    >
      {/* Costos, umbrales y plazos SIEMPRE del config (config/site.js): es la
          página que el cliente cita cuando algo no coincide con el checkout. */}
      <h2>Zonas y costos</h2>
      <ul>
        <li>
          <strong>Envío en Rosario (motomensajería):</strong> {formatPrice(shipping.costRosario)}.{' '}
          <strong>Gratis</strong> en compras desde {formatPrice(shipping.freeShippingThresholdRosario)}.
        </li>
        <li>
          <strong>Ciudades próximas:</strong> {formatPrice(shipping.costNearby)} (Funes, Granadero
          Baigorria y Villa Gobernador Gálvez).
        </li>
        <li>
          <strong>Resto del país (Correo Argentino):</strong> {formatPrice(shipping.costInterior)} a
          domicilio.
        </li>
        <li>
          <strong>Envío gratis a todo el país</strong> en compras desde{' '}
          {formatPrice(shipping.freeShippingThresholdNational)} (fuera de Rosario, donde ya es gratis
          desde {formatPrice(shipping.freeShippingThresholdRosario)}).
        </li>
        <li>
          <strong>Retiro en mano:</strong> sin costo. Coordinamos lugar y horario por WhatsApp.
        </li>
      </ul>

      <h2>Plazos de producción y entrega</h2>
      <ul>
        <li><strong>Rosario:</strong> {shipping.deliveryRosario} desde la confirmación del pago.</li>
        <li><strong>Resto del país:</strong> {shipping.deliveryInterior} desde la confirmación del pago.</li>
        <li>Los productos personalizados pueden requerir 1 a 2 días adicionales para diseño.</li>
      </ul>

      <h2>Cómo coordinamos</h2>
      <p>
        Una vez confirmado el pago, te escribimos por WhatsApp al número que dejaste en el checkout para
        coordinar dirección, horario o punto de retiro. Si elegís envío al interior, te pasamos el código
        de seguimiento cuando despachamos el pedido.
      </p>

      <h2>Demoras</h2>
      <p>
        Los plazos están medidos en días hábiles y no incluyen el tiempo de tránsito del correo, que puede
        variar según la zona. En temporadas pico (fin de año, día de la madre, etc.) los plazos pueden
        extenderse — te avisamos por WhatsApp si hay cualquier demora.
      </p>

      <h2>Productos no entregados</h2>
      <p>
        Si el correo no logra entregar y el pedido vuelve a depósito, te contactamos para coordinar un
        segundo envío. El costo del re-envío corre por cuenta del cliente.
      </p>
    </LegalLayout>
  );
}
