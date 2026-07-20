/**
 * Swatches SVG diseñados a propósito para el configurador. Nada de placeholder gris:
 * cada opción se representa con el color/forma que la identifica.
 */

/** Material: rectángulo que insinúa la terminación real del vinilo. */
function MaterialSwatch({ id }) {
  const gid = `mat-${id}`;
  const common = { width: 56, height: 56, viewBox: '0 0 56 56', 'aria-hidden': true };
  if (id === 'vinilo-blanco') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="48" height="48" rx="12" fill="#FAFAF5" />
        <path d="M10 40 L30 12" stroke="#fff" strokeWidth="8" opacity="0.6" />
        <rect x="4" y="4" width="48" height="48" rx="12" fill="none" stroke="rgba(0,0,0,0.15)" />
      </svg>
    );
  }
  if (id === 'transparente') {
    return (
      <svg {...common}>
        <defs>
          <pattern id={gid} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#2b2b2b" />
            <rect width="6" height="6" fill="#3f3f3f" />
            <rect x="6" y="6" width="6" height="6" fill="#3f3f3f" />
          </pattern>
        </defs>
        <rect x="4" y="4" width="48" height="48" rx="12" fill={`url(#${gid})`} />
        <rect x="4" y="4" width="48" height="48" rx="12" fill="none" stroke="rgba(255,255,255,0.25)" />
      </svg>
    );
  }
  if (id === 'holografico') {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="30%" stopColor="#3A86FF" />
            <stop offset="55%" stopColor="#FF4DCA" />
            <stop offset="80%" stopColor="#FFD84D" />
            <stop offset="100%" stopColor="#FF5A1F" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="48" height="48" rx="12" fill={`url(#${gid})`} />
        <path d="M10 42 L34 10" stroke="#fff" strokeWidth="6" opacity="0.45" />
      </svg>
    );
  }
  // dtf-uv: iridiscente con insinuación de relieve
  return (
    <svg {...common}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c7f9ff" />
          <stop offset="50%" stopColor="#e9d5ff" />
          <stop offset="100%" stopColor="#ffe4f3" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="48" height="48" rx="12" fill={`url(#${gid})`} />
      <rect x="12" y="12" width="32" height="32" rx="8" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
      <rect x="4" y="4" width="48" height="48" rx="12" fill="none" stroke="rgba(0,0,0,0.12)" />
    </svg>
  );
}

/** Tamaño: cuadrado proporcional al cm, para comparar visualmente. */
function TamanoSwatch({ id }) {
  const cm = { '4cm': 4, '6cm': 6, '9cm': 9, '12cm': 12 }[id] || 6;
  const s = 20 + (cm / 12) * 30; // 25 → 50 px aprox
  const off = (56 - s) / 2;
  return (
    <svg width={56} height={56} viewBox="0 0 56 56" aria-hidden>
      <rect
        x={off}
        y={off}
        width={s}
        height={s}
        rx={6}
        fill="rgba(255,27,141,0.15)"
        stroke="#FF1B8D"
        strokeWidth="2"
      />
      <text x="28" y="31" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">
        {cm}
      </text>
    </svg>
  );
}

/** Corte: la forma del troquel. */
function CorteSwatch({ id }) {
  const stroke = '#FF1B8D';
  const fill = 'rgba(255,27,141,0.12)';
  const common = { width: 56, height: 56, viewBox: '0 0 56 56', 'aria-hidden': true };
  if (id === 'cuadrado') {
    return (
      <svg {...common}>
        <rect x="12" y="12" width="32" height="32" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  if (id === 'circulo') {
    return (
      <svg {...common}>
        <circle cx="28" cy="28" r="17" fill={fill} stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  if (id === 'kiss-cut') {
    return (
      <svg {...common}>
        <rect x="10" y="10" width="36" height="36" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="28" cy="28" r="11" fill={fill} stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  // silueta: contorno recortado siguiendo una forma libre (troquel punteado)
  return (
    <svg {...common}>
      <path
        d="M28 10 C 40 10, 46 22, 42 30 C 48 34, 44 46, 34 44 C 30 50, 20 48, 20 40 C 10 38, 12 24, 22 24 C 22 14, 24 10, 28 10 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray="3 2.5"
      />
    </svg>
  );
}

export function Swatch({ kind, id }) {
  if (kind === 'material') return <MaterialSwatch id={id} />;
  if (kind === 'tamano') return <TamanoSwatch id={id} />;
  if (kind === 'corte') return <CorteSwatch id={id} />;
  return null;
}

/** Imagen (data-URI) del material para la miniatura del carrito (se serializa a localStorage). */
export function materialImageDataUri(materialId) {
  const bg = {
    'vinilo-blanco': '#FAFAF5',
    transparente: '#3f3f3f',
    holografico: '#8B5CF6',
    'dtf-uv': '#e9d5ff'
  }[materialId] || '#202020';
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>` +
    `<rect width='200' height='200' rx='24' fill='${bg}'/>` +
    `<text x='50%' y='54%' font-size='72' text-anchor='middle' dominant-baseline='middle'>✏️</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
