import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '../lib/motion.js';

const SLOTS = [
  { top: '6%',  left: '4%',   size: 104, dur: 19, delay: 0,   depth: 0.9, rot: -8 },
  { top: '14%', left: '84%',  size: 120, dur: 23, delay: 1.5, depth: 1.2, rot: 10 },
  { top: '64%', left: '2%',   size: 132, dur: 21, delay: 0.8, depth: 1.3, rot: 6 },
  { top: '72%', left: '88%',  size: 96,  dur: 18, delay: 2.2, depth: 1.0, rot: -12 },
  { top: '4%',  left: '46%',  size: 76,  dur: 26, delay: 1.1, depth: 0.6, rot: 4 },
  { top: '40%', left: '92%',  size: 84,  dur: 20, delay: 0.4, depth: 1.1, rot: -6 },
  { top: '46%', left: '-1%',  size: 88,  dur: 24, delay: 1.9, depth: 0.8, rot: 12 },
  { top: '84%', left: '36%',  size: 80,  dur: 22, delay: 0.6, depth: 0.7, rot: -4 },
  { top: '82%', left: '64%',  size: 92,  dur: 25, delay: 1.3, depth: 1.0, rot: 8 },
  { top: '24%', left: '14%',  size: 70,  dur: 17, delay: 2.6, depth: 0.7, rot: -10 },
  { top: '28%', left: '74%',  size: 72,  dur: 27, delay: 0.2, depth: 0.6, rot: 6 },
  { top: '54%', left: '24%',  size: 66,  dur: 19, delay: 1.7, depth: 0.5, rot: -7 },
  { top: '58%', left: '70%',  size: 78,  dur: 23, delay: 2.0, depth: 0.9, rot: 9 },
  { top: '10%', left: '64%',  size: 68,  dur: 28, delay: 0.9, depth: 0.6, rot: -5 }
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let allSources = null;

async function loadSources() {
  if (allSources) return allSources;
  try {
    const r = await fetch('/data/nuevas-catalogo.json');
    if (r.ok) {
      const list = await r.json();
      if (Array.isArray(list) && list.length) {
        allSources = list;
        return list;
      }
    }
  } catch (_) {}
  // fallback to cutouts
  try {
    const r = await fetch('/data/cutouts.json');
    if (r.ok) {
      const list = await r.json();
      allSources = list;
      return list;
    }
  } catch (_) {}
  return [];
}

export default function StickerField({ count = 14, opacity = 0.34, className = '' }) {
  const reduced = useReducedMotion();
  const location = useLocation();
  const ref = useRef(null);
  const [imgs, setImgs] = useState([]);
  const [visible, setVisible] = useState(true);

  // Initial load
  useEffect(() => {
    let alive = true;
    loadSources().then((sources) => {
      if (!alive || !sources.length) return;
      setImgs(shuffle(sources).slice(0, count));
    });
    return () => { alive = false; };
  }, [count]);

  // Rotate stickers on route change with fade transition
  useEffect(() => {
    if (!allSources || !allSources.length) return;
    setVisible(false);
    const t = setTimeout(() => {
      setImgs(shuffle(allSources).slice(0, count));
      setVisible(true);
    }, 400);
    return () => clearTimeout(t);
  }, [location.pathname, count]);

  // Parallax on pointer move
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf = 0;
    const onMove = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--px', x.toFixed(3));
        el.style.setProperty('--py', y.toFixed(3));
      });
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (imgs.length === 0) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`sticker-field ${className}`}
      style={{ transition: 'opacity 0.4s ease', opacity: visible ? 1 : 0 }}
    >
      {imgs.map((src, i) => {
        const s = SLOTS[i % SLOTS.length];
        return (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="sticker-float"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              opacity,
              '--dur': `${s.dur}s`,
              '--delay': `${s.delay}s`,
              '--depth': s.depth,
              '--rot': `${s.rot}deg`
            }}
          />
        );
      })}
    </div>
  );
}
