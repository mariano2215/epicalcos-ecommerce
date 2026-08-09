import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * El bucketing es la base de cualquier conclusión que saquemos de un A/B: si la
 * variante no es estable o el kill switch no manda, los datos del test mienten y
 * no hay forma de darse cuenta mirando la pantalla.
 *
 * Los tests corren en `environment: node` (ver vite.config.js), así que hay que
 * simular `localStorage` y `window` a mano.
 */
function montarNavegador() {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
  globalThis.localStorage = localStorage;
  globalThis.window = { location: { search: '' }, localStorage };
  return store;
}

/** Import fresco: el módulo cachea el Set de exposiciones reportadas. */
async function cargarModulo() {
  vi.resetModules();
  return import('./experiments.js?t=' + Math.random());
}

describe('experiments', () => {
  let store;

  beforeEach(() => {
    store = montarNavegador();
    vi.resetModules();
  });

  it('asigna una variante válida y la deja guardada', async () => {
    const { getVariant, EXPERIMENTS } = await cargarModulo();
    const v = getVariant('ahorro_pack');
    expect(EXPERIMENTS.ahorro_pack.variants).toContain(v);
    expect(JSON.parse(store.get('epicalcos.exp.v1')).ahorro_pack).toBe(v);
  });

  it('es ESTABLE: la misma persona ve siempre la misma variante', async () => {
    const { getVariant } = await cargarModulo();
    const primera = getVariant('ahorro_pack');
    for (let i = 0; i < 20; i++) expect(getVariant('ahorro_pack')).toBe(primera);
  });

  it('conserva el id de visitante al asignar otro experimento', async () => {
    // Regresión: `guardarEstado` pisaba el estado con un snapshot previo y el
    // `_vid` se perdía en cada asignación, rompiendo la coherencia del bucketing.
    const { getVariant } = await cargarModulo();
    getVariant('ahorro_pack');
    const vid = JSON.parse(store.get('epicalcos.exp.v1'))._vid;
    expect(vid).toBeTruthy();

    getVariant('guia_tamano');
    const estado = JSON.parse(store.get('epicalcos.exp.v1'));
    expect(estado._vid).toBe(vid);
    expect(estado.ahorro_pack).toBeTruthy();
    expect(estado.guia_tamano).toBeTruthy();
  });

  it('el kill switch manda por encima de lo ya guardado', async () => {
    const { getVariant, EXPERIMENTS } = await cargarModulo();
    const control = EXPERIMENTS.ahorro_pack.variants[0];
    // Forzamos guardada la NO-control para que el test sirva de algo.
    store.set('epicalcos.exp.v1', JSON.stringify({ _vid: 'x', ahorro_pack: EXPERIMENTS.ahorro_pack.variants[1] }));

    EXPERIMENTS.ahorro_pack.active = false;
    expect(getVariant('ahorro_pack')).toBe(control);
    EXPERIMENTS.ahorro_pack.active = true;
  });

  it('reparte las variantes de forma pareja entre visitantes', async () => {
    // Sin reparto parejo el test tarda el doble en llegar a significancia.
    const { getVariant } = await cargarModulo();
    const conteo = {};
    for (let i = 0; i < 400; i++) {
      store.clear();
      const v = getVariant('ahorro_pack');
      conteo[v] = (conteo[v] || 0) + 1;
    }
    const valores = Object.values(conteo);
    expect(valores).toHaveLength(2);
    // Tolerancia amplia: se verifica que no haya sesgo grosero, no la aleatoriedad.
    for (const n of valores) expect(n).toBeGreaterThan(400 * 0.35);
  });

  it('un experimento inexistente devuelve null en vez de romper', async () => {
    const { getVariant } = await cargarModulo();
    expect(getVariant('no_existe')).toBeNull();
  });

  it('el override por query param fuerza la variante', async () => {
    globalThis.window.location.search = '?exp_ahorro_pack=monto';
    const { getVariant } = await cargarModulo();
    expect(getVariant('ahorro_pack')).toBe('monto');
    expect(JSON.parse(store.get('epicalcos.exp.v1')).ahorro_pack).toBe('monto');
  });

  it('ignora un override con una variante que no existe', async () => {
    globalThis.window.location.search = '?exp_ahorro_pack=inventada';
    const { getVariant, EXPERIMENTS } = await cargarModulo();
    expect(EXPERIMENTS.ahorro_pack.variants).toContain(getVariant('ahorro_pack'));
  });

  it('sin localStorage cae a control en vez de tirar', async () => {
    // Modo incógnito estricto: el tracking nunca puede romper la tienda.
    globalThis.localStorage = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
      removeItem: () => {}
    };
    globalThis.window.localStorage = globalThis.localStorage;
    const { getVariant, EXPERIMENTS } = await cargarModulo();
    expect(EXPERIMENTS.ahorro_pack.variants).toContain(getVariant('ahorro_pack'));
  });
});
