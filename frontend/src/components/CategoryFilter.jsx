import { categories } from '../data/products.js';

export default function CategoryFilter({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = value === c.slug || (!value && c.slug === 'todas');
        return (
          <button
            key={c.slug}
            onClick={() => onChange(c.slug)}
            className={
              active
                ? 'btn-primary !py-2 !px-4 text-sm'
                : 'btn-secondary !py-2 !px-4 text-sm'
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
