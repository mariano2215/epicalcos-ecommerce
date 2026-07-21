/**
 * Helpers SEO: actualizar <head>, generar JSON-LD para producto, breadcrumb, organización.
 */
import { useEffect } from 'react';
import { site, contact } from '../config/site.js';

/**
 * Devuelve el pathname canónico: colapsa barras repetidas, elimina query/hash
 * y quita la trailing slash (salvo en la raíz). Puro → testeable sin DOM.
 */
export function buildCanonicalPath(pathname) {
  const path = String(pathname || '/').split(/[?#]/)[0] || '/';
  const withLead = path.startsWith('/') ? path : `/${path}`;
  const collapsed = withLead.replace(/\/{2,}/g, '/');
  if (collapsed === '/') return '/';
  return collapsed.replace(/\/+$/, '');
}

/** Convierte una ruta relativa en URL absoluta contra site.url. Puro. */
export function abs(url) {
  if (!url) return url;
  return url.startsWith('http') ? url : `${site.url}${url}`;
}

/**
 * Hook: setea title, meta description, OG, canonical, robots y JSON-LD.
 * Llamar al inicio de cada page component.
 * @param {boolean} [noindex]  true en páginas de resultados internos (?q=…).
 */
export function useSeo({ title, description, image, type = 'website', jsonLd, noindex = false }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${site.name}` : `${site.name} · ${site.tagline}`;
    document.title = fullTitle;

    // Canónico y og:url: SIEMPRE origin + pathname limpio (sin ?q=, sin UTM),
    // así cada búsqueda no genera una variante duplicada del catálogo.
    const canonicalUrl = site.url + buildCanonicalPath(window.location.pathname);

    setMeta('description', description || site.description);
    setMeta('robots', noindex ? 'noindex,follow' : 'index,follow');
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', description || site.description, 'property');
    setMeta('og:type', type, 'property');
    setMeta('og:site_name', site.name, 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setCanonical(canonicalUrl);
    if (image) setMeta('og:image', image, 'property');
    setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description || site.description);
    if (image) setMeta('twitter:image', image);

    let scriptEl = null;
    if (jsonLd) {
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.dataset.seoJsonld = 'page';
      scriptEl.textContent = JSON.stringify(jsonLd);
      // Limpiar JSON-LD anteriores de la página
      document.querySelectorAll('script[data-seo-jsonld="page"]').forEach((s) => s.remove());
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, image, type, noindex, JSON.stringify(jsonLd)]);
}

function setMeta(name, value, attr = 'name') {
  if (value == null) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

// ─── JSON-LD builders ────────────────────────────────────────────────────────

export function productJsonLd(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: [abs(product.image)],
    sku: product.id,
    brand: { '@type': 'Brand', name: site.name },
    category: product.categoryLabel,
    offers: {
      '@type': 'Offer',
      url: `${site.url}/producto/${product.category}/${product.num}`,
      priceCurrency: 'ARS',
      price: product.price,
      availability:
        (product.stock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: site.name }
    }
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url ? `${site.url}${it.url}` : undefined
    }))
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.url,
    description: site.description,
    email: contact.email,
    sameAs: [contact.instagramUrl],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Rosario',
      addressRegion: 'Santa Fe',
      addressCountry: 'AR'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: contact.email,
      telephone: contact.whatsapp,
      areaServed: 'AR',
      availableLanguage: ['Spanish']
    }
  };
}
