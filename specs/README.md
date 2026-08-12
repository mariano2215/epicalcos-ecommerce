# SPECS — Proceso de trabajo de EPICALCOS

Este directorio contiene las especificaciones de las features. **Nada se
implementa sin pasar por acá.**

---

## ⛔ Regla que gobierna todo lo demás

> **La existencia de una spec NO es autorización para implementarla.**

Claude Code puede leer, escribir, revisar y discutir specs libremente. Pero
**escribir código de producción arranca únicamente** cuando Mariano dice, de
forma explícita:

> **"Implementá la spec XXX."**

No cuentan como autorización:
- que la spec esté completa, aprobada o bien escrita
- que las tasks estén listas
- que sea "obvio" cuál es el próximo paso
- haber terminado otra spec
- que Mariano haya aprobado el *diseño* (aprobar el diseño ≠ pedir la
  implementación)

Ante la duda: **preguntar, no implementar.**

---

## El workflow

```
                REQUEST
                   ↓
              DISCOVERY
                   ↓
             REQUIREMENTS
                   ↓
                DESIGN
                   ↓
                 TASKS
                   ↓
          ═══► APPROVAL ◄═══   ⛔ frontera dura
                   ↓
            IMPLEMENTATION
                   ↓
                TESTING
                   ↓
              ACCEPTANCE
                   ↓
                 DONE
```

Todo lo que está **arriba** de APPROVAL es documentación: se puede hacer sin
permiso. Todo lo que está **abajo** requiere la frase explícita.

### 1. REQUEST
Mariano describe lo que quiere, en lenguaje de negocio. Puede ser una línea.

### 2. DISCOVERY
**Leer el código antes de escribir nada.** Sin excepción.

- ¿Esto ya existe, total o parcialmente?
- ¿Qué archivos toca? ¿Quién los importa?
- ¿Toca el camino de precios? → hay que leer **los dos** lados del espejo
  (`config/pricing.js` y `netlify/functions/lib/pricing.js`)
- ¿Hay tests que lo cubran hoy?
- ¿Hay carritos guardados en `localStorage` que se romperían?

Salida: un resumen de hallazgos. Si el discovery revela que la feature ya existe
o que el problema es otro, **se dice antes de escribir la spec**.

### 3. REQUIREMENTS → `requirements.md`
**QUÉ** debe suceder. Sin soluciones técnicas.

### 4. DESIGN → `design.md`
**CÓMO** se implementará. Acá sí van archivos, funciones y payloads.

### 5. TASKS → `tasks.md`
Checklist ordenado de pasos verificables.

### 6. ⛔ APPROVAL
Se presentan los tres documentos y **se para**.
Mariano aprueba, corrige o descarta. La implementación no arranca acá.

### 7. IMPLEMENTATION
Solo tras la frase explícita. Se sigue `tasks.md` **en orden**, sin refactors de
oportunidad (`CLAUDE.md` regla 8). Si aparece algo fuera de scope, se anota como
hallazgo y se sigue.

### 8. TESTING
```bash
npm test
```
Los 210 tests existentes tienen que seguir pasando. Si la feature toca precios,
promos o envíos, **agregar tests de paridad** frontend↔servidor.

Desde la spec 004 esto **ya no depende de acordarse**: el build de Netlify corre
la suite y no publica si está en rojo. El paso sigue acá porque enterarse antes
de pushear es más barato que enterarse en el deploy.

### 9. ACCEPTANCE
Recorrer `acceptance.md` punto por punto y reportar el resultado **real** de cada
criterio. Si algo no se cumple, se dice — no se cierra la feature.

### 10. DONE
Marcar la spec como completada e informar qué quedó fuera de scope.

---

## Estructura

```
specs/
├── README.md                 este archivo
├── _template/                plantilla — copiar, no editar
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   └── acceptance.md
│
└── NNN-nombre-corto/         una carpeta por feature
    ├── requirements.md
    ├── design.md
    ├── tasks.md
    └── acceptance.md
```

### Convención de nombres
`NNN-nombre-en-kebab-case`, numeración secuencial de tres dígitos.

```
001-fix-precio-carrito-promo-categoria
002-entrega-imprimibles-por-transferencia
003-tests-del-servidor
004-tests-obligatorios-antes-del-deploy
```

El número da orden cronológico; el nombre dice de qué se trata. No se renumera.

### Estado
Cada `requirements.md` arranca con un estado en su encabezado:

| Estado | Significa |
|---|---|
| `DRAFT` | en escritura |
| `READY FOR REVIEW` | los 4 documentos están completos |
| `APPROVED` | Mariano lo aprobó — **sigue sin autorizar la implementación** |
| `IN PROGRESS` | se pidió implementar y está en curso |
| `DONE` | implementada y validada contra `acceptance.md` |
| `DISCARDED` | descartada (dejar el motivo escrito) |

---

## Cómo empezar una spec

```bash
cp -r specs/_template specs/001-nombre-corto
```

Después completar los cuatro documentos en orden: requirements → design → tasks
→ acceptance.

---

## Reglas de escritura

**`requirements.md`** — nada de nombres de archivo, funciones ni librerías. Si
aparece un `pricing.js`, va en design.

**`design.md`** — todo lo técnico. Si toca un módulo compartido, listar
explícitamente quién lo importa (`CLAUDE.md` regla 9).

**`tasks.md`** — cada paso tiene que poder marcarse sin discusión. "Mejorar el
carrito" no es una task; "`CartContext.addSticker()` guarda el precio de
vidriera en `basePrice`" sí.

**`acceptance.md`** — criterios que otra persona pueda verificar sin preguntar
nada. "Funciona bien" no es un criterio.

---

## Qué NO necesita spec

- Corregir un typo o un texto
- Cambiar un valor ya declarado como configurable (ej. `HIDDEN_SECTIONS`)
- Un fix de un bug ya diagnosticado y acordado en la conversación
- Actualizar documentación

**Todo lo demás necesita spec**, incluso si parece chico. En este repo un cambio
de una línea en `pricing.js` puede rechazar todos los checkouts del país.

---

## Recordatorio de contexto

EPICALCOS está **en producción y vende**. `main` deploya solo, y `netlify.toml`
fuerza el build en todo push (`ignore = "exit 1"`).

**Un push a `main` es un deploy a producción.** El proceso de arriba existe para
eso.
