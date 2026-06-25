import { announcements } from '../config/site.js';

const SEP = '   ·   ';
const ticker = announcements.join(SEP) + SEP;
// 6 copias: la animación mueve -50% (3 copias), las otras 3 actúan de relleno invisible
const COPIES = 6;

export default function AnnouncementBar() {
  if (!announcements.length) return null;

  return (
    <div
      className="overflow-hidden text-xs sm:text-sm font-medium py-2"
      style={{
        background: 'linear-gradient(90deg,#FF1B8D 0%,#FF5A1F 50%,#FFD84D 100%)',
        color: '#111'
      }}
      aria-label={announcements.join(' · ')}
    >
      <div className="announcement-ticker">
        {Array.from({ length: COPIES }, (_, i) => (
          <span key={i} aria-hidden={i > 0 ? 'true' : undefined}>{ticker}</span>
        ))}
      </div>
    </div>
  );
}
