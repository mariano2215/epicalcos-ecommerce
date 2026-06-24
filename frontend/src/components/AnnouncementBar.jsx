import { announcements } from '../config/site.js';

const SEP = '   ·   ';
const ticker = announcements.join(SEP) + SEP;

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
        <span>{ticker}</span>
        <span aria-hidden="true">{ticker}</span>
      </div>
    </div>
  );
}
