/**
 * "Vista calco" del configurador de /personalizados (spec 023, D-10): la imagen
 * del cliente dibujada como si ya fuera una calco, con su borde blanco.
 *
 * Es un DIBUJO APROXIMADO y se rotula así en la pantalla. No es una prueba de
 * producción: el archivo lo revisa una persona antes de imprimir.
 *
 * Se dibuja en el navegador y no con una transformación de Cloudinary
 * (`e_outline`, `e_background_removal`) por dos motivos: el add-on se cobra, y
 * la vista tiene que aparecer apenas se elige el archivo, antes de que termine
 * la subida (RF-P1).
 *
 * ⚠️ Con una imagen SIN transparencia y corte silueta no se inventa un
 * contorno: no sabemos dónde termina lo que el cliente quiere y empieza el
 * fondo. Se dibuja la imagen entera con borde redondeado y no se promete nada
 * sobre el fondo (P-4 sin respuesta; D-18).
 *
 * Los helpers de arriba son puros y tienen test; `dibujarVistaCalco` necesita
 * un canvas de verdad.
 */

/** Ancho visible de un termo de 1 L, en cm: la referencia de la vista "En un termo". */
export const TERMO_CM = 9;

/** Lado del canvas de la vista calco, en px CSS. */
export const LADO_VISTA = 480;

/**
 * ¿La imagen tiene fondo transparente? Mira el canal alfa de un `ImageData`
 * reducido. Un PNG puede traer canal alfa y ser opaco entero: lo que cuenta es
 * que una proporción real de píxeles sea transparente, no un par de bordes
 * suavizados.
 * @param {Uint8ClampedArray|number[]} data RGBA
 */
export function hayTransparencia(data, { umbral = 250, minimo = 0.02 } = {}) {
  const total = Math.floor(data.length / 4);
  if (!total) return false;
  let transparentes = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < umbral) transparentes++;
  return transparentes / total >= minimo;
}

/** Ancho del borde blanco, proporcional al lado mayor del dibujo (~4,5 %). */
export const margenPx = (lado) => Math.max(2, Math.round(lado * 0.045));

/**
 * Ancho que ocupa una calco de `cm` sobre un termo de `anchoTermo` (en las
 * unidades que se quiera: px, %, unidades de un viewBox). Proporción pura.
 */
export const anchoEnTermo = (cm, anchoTermo, termoCm = TERMO_CM) =>
  (anchoTermo * Math.min(Number(cm) || 0, termoCm)) / termoCm;

/** Escala `w × h` para que entre en un cuadrado de `caja` sin deformar. */
export function encajar(w, h, caja) {
  if (!w || !h) return { w: caja, h: caja };
  const k = Math.min(caja / w, caja / h);
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

function rectRedondeado(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function sombra(ctx, lado) {
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = Math.round(lado * 0.03);
  ctx.shadowOffsetY = Math.round(lado * 0.012);
}

const sinSombra = (ctx) => {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
};

/**
 * Dibuja la vista calco en `canvas` (se redimensiona a `lado × dpr`).
 *
 * - silueta + transparencia: borde blanco que sigue la forma. Se dibuja la
 *   imagen corrida en 24 direcciones alrededor de un círculo de radio `margen`,
 *   y se pinta de blanco con `source-in`: queda la silueta engordada, que es el
 *   troquel. Costo de GPU, sin librerías.
 * - silueta sin transparencia: la imagen entera con borde redondeado (D-18).
 * - cuadrado: borde recto con margen parejo.
 * - círculo: recorte circular con aro blanco.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasImageSource & { width: number, height: number }} img
 * @param {{ corte: 'silueta'|'cuadrado'|'circulo', transparencia: boolean|null, lado?: number, dpr?: number }} opts
 */
export function dibujarVistaCalco(canvas, img, { corte, transparencia, lado = LADO_VISTA, dpr = 1 }) {
  const escala = Math.min(2, Math.max(1, dpr));
  canvas.width = Math.round(lado * escala);
  canvas.height = Math.round(lado * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.clearRect(0, 0, lado, lado);
  ctx.imageSmoothingQuality = 'high';

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  // Aire alrededor para la sombra: la calco ocupa ~88 % del lienzo.
  const caja = Math.round(lado * 0.88);
  const margen = margenPx(caja);

  if (corte === 'circulo') {
    const d = caja;
    const cx = lado / 2;
    const cy = lado / 2;
    ctx.save();
    sombra(ctx, lado);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, d / 2 - margen, 0, Math.PI * 2);
    ctx.clip();
    // `cover`: el círculo se llena entero, como sale del troquel.
    const k = Math.max((d - 2 * margen) / iw, (d - 2 * margen) / ih);
    ctx.drawImage(img, cx - (iw * k) / 2, cy - (ih * k) / 2, iw * k, ih * k);
    ctx.restore();
    return true;
  }

  const dentro = encajar(iw, ih, caja - 2 * margen);
  const x = (lado - dentro.w) / 2;
  const y = (lado - dentro.h) / 2;

  if (corte === 'silueta' && transparencia) {
    const capa = document.createElement('canvas');
    capa.width = canvas.width;
    capa.height = canvas.height;
    const c = capa.getContext('2d');
    if (!c) return false;
    c.setTransform(escala, 0, 0, escala, 0, 0);
    const pasos = 24;
    for (let i = 0; i < pasos; i++) {
      const a = (i / pasos) * Math.PI * 2;
      c.drawImage(img, x + Math.cos(a) * margen, y + Math.sin(a) * margen, dentro.w, dentro.h);
    }
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#fff';
    c.fillRect(0, 0, lado, lado);
    ctx.save();
    sombra(ctx, lado);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(capa, 0, 0);
    ctx.restore();
    sinSombra(ctx);
    ctx.drawImage(img, x, y, dentro.w, dentro.h);
    return true;
  }

  // Cuadrado, o silueta de una imagen opaca: la calco es un rectángulo.
  const radioExterno = corte === 'cuadrado' ? Math.round(caja * 0.03) : Math.round(caja * 0.08);
  ctx.save();
  sombra(ctx, lado);
  ctx.fillStyle = '#fff';
  rectRedondeado(ctx, x - margen, y - margen, dentro.w + 2 * margen, dentro.h + 2 * margen, radioExterno);
  ctx.fill();
  ctx.restore();
  ctx.save();
  rectRedondeado(ctx, x, y, dentro.w, dentro.h, Math.max(0, radioExterno - margen));
  ctx.clip();
  ctx.drawImage(img, x, y, dentro.w, dentro.h);
  ctx.restore();
  return true;
}
