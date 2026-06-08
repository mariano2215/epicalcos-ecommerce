import { useEffect, useState } from 'react';
import { announcements } from '../config/site.js';

export default function AnnouncementBar() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % announcements.length), 4500);
    return () => clearInterval(t);
  }, []);

  if (!announcements.length) return null;

  return (
    <div
      className="text-center text-xs sm:text-sm font-medium py-2 px-3"
      style={{
        background: 'linear-gradient(90deg,#FF1B8D 0%,#FF5A1F 50%,#FFD84D 100%)',
        color: '#111'
      }}
      aria-live="polite"
    >
      <span className="inline-block transition-opacity duration-300" key={i}>
        {announcements[i]}
      </span>
    </div>
  );
}
