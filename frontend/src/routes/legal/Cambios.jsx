import LegalLayout from '../../components/LegalLayout.jsx';
import { useSeo } from '../../lib/seo.js';
import { devoluciones } from '../../config/site.js';

/**
 * Política de cambios y devoluciones.
 *
 * ⚠️ Hasta el 14/9/2026 esta página decía "No se aceptan cambios ni
 * devoluciones". Desde la spec 020 hay devolución por CUALQUIER motivo durante
 * `devoluciones.dias` días, y la tira de arriba del sitio lo promete en todas
 * las páginas. Si esta política se endurece, la tira cambia en el mismo commit:
 * si no, el sitio promete algo que la política no cumple.
 *
 * Las condiciones (sin pegar, quién paga la vuelta, qué entra, cómo se
 * reembolsa) son decisiones de Mariano, en
 * specs/020-ticker-de-confianza/requirements.md §9. El plazo no se escribe a
 * mano en ningún párrafo: sale de `devoluciones.dias`, igual que en la tira, los
 * Términos y el FAQ. `lib/politicaDevoluciones.test.js` lo verifica.
 */
export default function Cambios() {
  const { dias } = devoluciones;

  useSeo({
    title: 'Cambios y devoluciones',
    description: `Política de cambios y devoluciones de EPICALCOS: ${dias} días para devolver tu compra por cualquier motivo.`
  });

  return (
    <LegalLayout
      title="Cambios y devoluciones"
      intro={`Tenés ${dias} días para devolver tu compra, por el motivo que sea. Acá te contamos cómo.`}
      lastUpdated="septiembre 2026"
      breadcrumbName="Cambios"
    >
      <h2>Devolución por cualquier motivo</h2>
      <ul>
        <li>
          Tenés <strong>{dias} días corridos desde que recibís el pedido</strong> para devolverlo, aunque sea
          porque no te gustó.
        </li>
        <li>
          Las calcos tienen que estar <strong>sin pegar</strong>: una vez pegadas, el adhesivo se activa y no
          se pueden volver a usar.
        </li>
        <li>
          Escribinos por WhatsApp al <strong>+54 9 341 680-6675</strong> o por mail a{' '}
          <strong>epicalcos@gmail.com</strong> con tu número de pedido, y te decimos cómo mandarlas.
        </li>
        <li>
          El envío de vuelta corre por tu cuenta, salvo que el producto tenga una falla o te hayamos mandado
          algo equivocado (ver abajo).
        </li>
        <li>
          Cuando las recibimos, te devolvemos lo que pagaste por los productos <strong>por el mismo medio de
          pago</strong>, dentro de los 10 días hábiles. El costo del envío original no se devuelve.
        </li>
      </ul>

      <h2>Desperfectos de fabricación</h2>
      <p>
        Si recibís un producto con un <strong>defecto de fabricación</strong> (impresión defectuosa, corte
        mal terminado, adhesivo que no pega, etc.), te lo reponemos sin costo, envío incluido. Para gestionarlo:
      </p>
      <ul>
        <li>Enviá <strong>foto o video del producto</strong> dentro de los {dias} días de recibido el pedido.</li>
        <li>Lo mandás por WhatsApp al <strong>+54 9 341 680-6675</strong> o por mail a <strong>epicalcos@gmail.com</strong>.</li>
        <li>Coordinamos el reemplazo o reimpresión del producto afectado.</li>
      </ul>

      <h2>Errores en el pedido</h2>
      <p>
        Si te llegó algo distinto a lo que pediste, escribinos dentro de los {dias} días con foto del paquete
        y del contenido. Te enviamos lo correcto sin costo.
      </p>

      <h2>Productos hechos con tu archivo</h2>
      <p>
        Los <strong>personalizados, la Promo Negocio, las fotos Polaroid y los tatuajes temporales</strong> se
        producen con tu archivo o tus fotos, así que no se pueden volver a vender: entran en la garantía por
        desperfecto de fabricación, pero <strong>no en la devolución por cualquier motivo</strong>.
      </p>
      <p>
        Se producen <strong>tal como los cargaste</strong>: con el tamaño, el corte y el archivo que elegiste en
        el pedido. No enviamos vista previa para aprobar, así que revisá bien esos datos antes de pagar. Si el
        archivo no es apto para impresión, te escribimos por WhatsApp antes de producir. Una vez impreso, no
        aceptamos cambios sobre el diseño.
      </p>

      <h2>Archivos imprimibles</h2>
      <p>
        Son un producto digital: una vez enviados no se pueden devolver. Si el archivo no abre o te llega
        dañado, te lo reenviamos.
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
