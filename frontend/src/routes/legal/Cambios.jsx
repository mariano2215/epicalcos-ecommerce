import LegalLayout from '../../components/LegalLayout.jsx';
import { useSeo } from '../../lib/seo.js';

export default function Cambios() {
  useSeo({
    title: 'Cambios y devoluciones',
    description: 'Política de cambios y devoluciones de EPICALCOS. Productos personalizados, garantía de fabricación.'
  });

  return (
    <LegalLayout
      title="Cambios y devoluciones"
      intro="Trabajamos con productos personalizados y de uso único. Acá te contamos qué se puede y qué no."
      lastUpdated="2026"
      breadcrumbName="Cambios"
    >
      <h2>No se aceptan cambios ni devoluciones</h2>
      <p>
        Todos nuestros productos son <strong>personalizados y de uso único</strong>: una vez pegados, el
        adhesivo se activa y los calcos ya no sirven para otro uso. Por ese motivo no aceptamos cambios,
        devoluciones ni reembolsos.
      </p>

      <h2>Desperfectos de fabricación</h2>
      <p>
        Si recibís un producto con un <strong>defecto de fabricación</strong> (impresión defectuosa, corte
        mal terminado, adhesivo que no pega, etc.), te lo cambiamos sin costo. Para gestionar el cambio:
      </p>
      <ul>
        <li>Enviá <strong>foto o video del producto</strong> dentro de los 7 días de recibido el pedido.</li>
        <li>Lo mandás por WhatsApp al <strong>+54 9 341 680-6675</strong> o por mail a <strong>epicalcos@gmail.com</strong>.</li>
        <li>Coordinamos el reemplazo o reimpresión del producto afectado.</li>
      </ul>

      <h2>Errores en el pedido</h2>
      <p>
        Si te llegó algo distinto a lo que pediste, escribinos en las primeras 48 horas con foto del paquete y
        del contenido. Te enviamos lo correcto sin costo.
      </p>

      <h2>Productos personalizados</h2>
      <p>
        Los diseños personalizados (logos, frases, fotos) se producen <strong>tal como los cargaste</strong>:
        con el tamaño, el corte y el archivo que elegiste en el pedido. No enviamos vista previa para aprobar,
        así que revisá bien esos datos antes de pagar. Si el archivo no es apto para impresión, te escribimos
        por WhatsApp antes de producir. Una vez impreso, no aceptamos cambios sobre el diseño.
      </p>

      <h2>Cancelación de pedidos</h2>
      <p>
        La producción arranca apenas se confirma el pago, así que si querés cancelar escribinos
        <strong> lo antes posible</strong> por WhatsApp. Si el pedido ya entró a producción no podemos
        cancelarlo, porque ya se consumió material y tiempo de impresión.
      </p>
    </LegalLayout>
  );
}
