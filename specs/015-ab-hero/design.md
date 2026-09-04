# Design — A/B del hero: titular y CTA principal

| | |
|---|---|
| **Spec** | `015-ab-hero` |
| **Requirements** | [`requirements.md`](requirements.md) |
| **Fecha** | 04/09/2026 |

---

## 0. Hallazgos del discovery

| Pregunta | Hallazgo |
|---|---|
| ¿Ya existe algo parecido? | **Sí, toda la maquinaria.** `lib/experiments.js` resuelve asignación estable, kill switch, override por URL, reparto parejo y exposición. Ya corren dos experimentos (`ahorro_pack` en `PackCard`, `guia_tamano` en `SizeGuide`). Esta spec **no construye infra**: declara dos experimentos y los consume. |
| ¿Qué archivos? | `lib/experiments.js` (declarar), `lib/heroVariantes.js` (nuevo, el copy), `components/Hero.jsx` (consumir), `components/AntesDespues.jsx` (colisión de copy, ver §3). |
| ¿Hay tests hoy? | `lib/experiments.test.js` cubre el bucketing (9 casos). Falta cubrir el **contenido** de las variantes. |
| ¿Toca el camino de precios? | **No.** Es copy. `config/pricing.js` y su espejo no se tocan. |
| ¿Comentarios que expliquen por qué está así? | Sí, dos que mandan (abajo). |

### Comentarios existentes que gobiernan este diseño

| Comentario | Qué dice | Cómo se respeta |
|---|---|---|
| `experiments.js` — *"⚠️ REGLA DURA: los experimentos son SOLO DE PRESENTACIÓN. Nunca testear un PRECIO."* | Un A/B de precios dispara `price_mismatch` en el servidor | Se testea copy: un titular y el texto de un botón. Ningún número. |
| `experiments.js` — *"la asignación es SINCRÓNICA… no hay parpadeo que tapar"* | Por eso el A/B es propio y no VWO/Optimizely | Se usa `useExperiment`, que asigna en el inicializador de `useState`: la variante ya está en el primer render |
| `Hero.jsx` (spec 014) — *"el H1 pasó a ser el titular grande… el término principal ('calcos') sigue en el H1"* | El H1 carga la señal SEO | RF-9: **cada variante** nombra el producto en el H1 o en el subtítulo. Lo verifica un test |
| `experiments.js` — *"la exposición es 'esta persona vio el experimento', NO 'montó un componente'"* | Guarda `reportados` contra denominadores inflados | Se aprovecha tal cual: el hero monta una vez, y aun así la guarda cubre StrictMode |

---

## 1. Los dos experimentos

En `EXPERIMENTS` de `lib/experiments.js`:

```js
hero_titular: {
  active: true,
  variants: ['catalogo', 'objeto'],   // [0] = control = lo que hoy está vivo
  descripcion: 'Hero: titular de amplitud de catálogo (control) vs de objeto personalizado'
},
hero_cta: {
  active: true,
  variants: ['ver_disenos', 'encontra_calcos'],
  descripcion: 'Hero: CTA principal, describir la acción (control) vs el resultado'
}
```

### Por qué los dos a la vez

`getVariant` mezcla el id del experimento en el hash
(`hash(\`${visitorId()}:${id}\`)`), así que las dos asignaciones son
**independientes**: el que cae en `objeto` tiene la misma probabilidad de caer
en cualquiera de los dos CTA. Es un factorial 2×2, y el efecto principal de cada
test se estima sin sesgo aunque el otro esté corriendo.

⚠️ **Lo que sí hay que tener en cuenta al leer los resultados**: titular y CTA
se leen juntos, así que puede haber interacción. Si los dos ganan por poco,
mirar las cuatro celdas antes de concluir. Y si hace falta aislar uno, se apaga
el otro con `active: false` — sin deploy de lógica.

---

## 2. El copy — `lib/heroVariantes.js` (nuevo)

Datos puros, en su propio módulo y **no dentro de `Hero.jsx`**, por dos razones:
el test tiene que poder importarlo sin arrastrar React ni el router (los tests
corren en `environment: node`), y el copy de un experimento se compara mejor
cuando las dos variantes están una al lado de la otra.

```js
export const TITULARES = {
  catalogo: {
    h1: ['Calcos para todo', 'lo que te gusta'],   // [normal, resaltado]
    subtitulo: '…'
  },
  objeto: {
    h1: ['Tu termo.', 'Pero más vos.'],
    subtitulo: '…'
  }
};

export const CTA_PRINCIPAL = {
  ver_disenos: 'Ver todos los diseños',
  encontra_calcos: 'Encontrá tus calcos'
};
```

El `h1` viaja partido en dos porque el hero resalta la segunda mitad con
`gradient-text`. Partirlo acá y no en el JSX evita meter markup en los datos.

**RF-9 (piso de SEO)**: el H1 de `objeto` no dice "calcos", así que su subtítulo
sí — y el test lo exige para **todas** las variantes, presentes y futuras. El
`title`, la meta description y el JSON-LD no cambian nunca: son la señal fuerte
y quedan fuera del experimento.

---

## 3. La colisión de copy con Antes/Después

`components/AntesDespues.jsx` ya usa **"Tu termo. Pero más vos."** como su H2
(viene del brief §12). Si la variante `objeto` lo pone también en el H1, la
mitad del tráfico ve la misma frase dos veces en la misma página, y la sección
de transformación pierde su golpe.

Se resuelve cambiando el H2 de Antes/Después a **"De liso a inconfundible."**
para **todo el mundo**, no sólo para una variante: un texto que cambia según la
celda del experimento es una segunda variable y ensucia el resultado. Al ser
constante entre variantes, no confunde nada.

---

## 4. `components/Hero.jsx`

```js
const titular = useExperiment('hero_titular');
const cta     = useExperiment('hero_cta');
const copy    = TITULARES[titular] ?? TITULARES.catalogo;
```

El `??` no es decorativo: `useExperiment` devuelve `null` si el experimento no
existe (por ejemplo si alguien lo borra de `EXPERIMENTS` sin tocar el hero), y el
hero **no puede** quedarse sin titular.

Lo único que cambia entre variantes es el H1, el subtítulo y el texto del botón
principal. El CTA secundario, el fondo, el espaciado y el `StickerField` quedan
idénticos (RF-10).

---

## 5. QA

`?exp_hero_titular=objeto` y `?exp_hero_cta=encontra_calcos` fuerzan la variante
y la dejan fija — ya lo soporta `getVariant`. Sirve para revisar una variante sin
esperar a caer en el bucket.

---

## 6. Seguridad

Sin variables de entorno, sin endpoints, sin datos de cliente. El id de
visitante ya existía y es un random propio: no es PII.

---

## 7. Manejo de errores

Todo cubierto por `lib/experiments.js`, que ya cae a control ante
`localStorage` bloqueado, variante inválida y experimento inexistente. El
`?? TITULARES.catalogo` del hero es la última red.

---

## 8. Migración

Ninguna. Los visitantes que ya tienen `epicalcos.exp.v1` guardado conservan su
`_vid` y reciben la asignación nueva la primera vez que ven el hero.

---

## 9. Tests nuevos — `lib/heroVariantes.test.js`

| Qué verifica | Por qué |
|---|---|
| Los dos experimentos están declarados y tienen exactamente 2 variantes | Un A/B/n cambia el análisis y el reparto |
| Las claves de `TITULARES` y `CTA_PRINCIPAL` coinciden **exactamente** con `variants` | Una variante sin copy deja el hero vacío para la mitad del tráfico |
| `variants[0]` es el copy que hoy está publicado | El control tiene que ser el statu quo, o el test compara dos cosas nuevas |
| Toda variante del titular nombra el producto en H1 o subtítulo | RF-9, el piso de SEO |
| Ningún H1 ni CTA está vacío | Un botón sin texto arriba del fold |
| El H1 de cada variante entra en 2 líneas a 375 px (tope de caracteres) | El hero es lo único arriba del fold; un titular de 4 líneas lo rompe |
| El titular del hero no repite el de Antes/Después | La colisión de §3, con guardarraíl |
