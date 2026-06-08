import LegalLayout from '../../components/LegalLayout.jsx';
import { useSeo } from '../../lib/seo.js';

export default function Terminos() {
  useSeo({
    title: 'Términos y condiciones',
    description: 'Condiciones generales de uso y compra en EPICALCOS.'
  });

  return (
    <LegalLayout
      title="Términos y condiciones"
      intro="Estas condiciones aplican a todas las compras realizadas en EPICALCOS."
      lastUpdated="2026"
      breadcrumbName="Términos"
    >
      <h2>1. Identificación</h2>
      <p>
        EPICALCOS es un emprendimiento de Mariano Calandra, persona humana con domicilio en Rosario,
        Santa Fe, Argentina. Contacto comercial: <strong>epicalcos@gmail.com</strong> y
        WhatsApp <strong>+54 9 341 680-6675</strong>.
      </p>

      <h2>2. Aceptación</h2>
      <p>
        Al realizar una compra en este sitio aceptás estos Términos y Condiciones, la Política de Envíos,
        la Política de Cambios y la Política de Privacidad.
      </p>

      <h2>3. Productos y precios</h2>
      <ul>
        <li>Los productos publicados son <strong>calcomanías, stickers, vinilos y fotos</strong> de fabricación propia.</li>
        <li>Los precios están expresados en <strong>pesos argentinos (ARS)</strong> e incluyen impuestos cuando corresponda.</li>
        <li>Los precios pueden actualizarse sin previo aviso. El precio aplicable es el vigente al momento de generar la orden de pago.</li>
        <li>El <strong>pedido mínimo</strong> es de 10 calcos por orden.</li>
      </ul>

      <h2>4. Forma de pago</h2>
      <p>
        El medio de pago principal es <strong>Mercado Pago Checkout Pro</strong>, que acepta tarjetas
        de crédito, débito, dinero en cuenta y pagos en efectivo (Rapipago, Pago Fácil). También aceptamos
        transferencia bancaria coordinada por WhatsApp. EPICALCOS no almacena información de tarjetas.
      </p>

      <h2>5. Envíos y entregas</h2>
      <p>
        Las condiciones de envío, costos y plazos están detalladas en la{' '}
        <a href="/politicas/envios" className="text-white/80 hover:text-white underline">Política de envíos</a>.
      </p>

      <h2>6. Cambios y devoluciones</h2>
      <p>
        Por tratarse de <strong>productos personalizados y de uso único</strong>, no aceptamos cambios ni
        devoluciones excepto por desperfectos de fabricación. Detalle completo en la{' '}
        <a href="/politicas/cambios" className="text-white/80 hover:text-white underline">Política de cambios</a>.
      </p>

      <h2>7. Productos personalizados</h2>
      <p>
        Para productos personalizados, el cliente debe enviar el archivo o la referencia de diseño dentro
        de las 48 horas posteriores al pago. EPICALCOS envía una vista previa por WhatsApp antes de imprimir.
        Una vez aprobada por el cliente, comienza la producción.
      </p>

      <h2>8. Propiedad intelectual</h2>
      <p>
        El cliente declara y garantiza que cualquier imagen, logo, marca o material que envíe para
        producción es de su propiedad o cuenta con autorización para reproducirlo. EPICALCOS no se
        responsabiliza por reclamos de terceros sobre propiedad intelectual del material entregado por
        el cliente.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        EPICALCOS no se responsabiliza por daños ocasionados por uso indebido del producto (aplicación
        en superficies incompatibles, exposición a condiciones extremas, etc.). Los stickers son
        resistentes al agua y al sol bajo condiciones normales de uso.
      </p>

      <h2>10. Modificaciones</h2>
      <p>
        EPICALCOS puede modificar estos Términos en cualquier momento. La versión vigente es la publicada
        en este sitio al momento de realizar la compra.
      </p>

      <h2>11. Jurisdicción</h2>
      <p>
        Estas condiciones se rigen por las leyes de la República Argentina. Cualquier controversia se
        someterá a los tribunales ordinarios de la ciudad de Rosario, Santa Fe.
      </p>

      <p className="text-xs text-white/40 italic">
        [REVISAR] Estos términos son un borrador estándar para e-commerce argentino de bajo volumen
        (CUIL persona humana). Si el volumen crece, conviene revisarlos con un abogado/a y considerar
        inscripción tributaria adecuada.
      </p>
    </LegalLayout>
  );
}
