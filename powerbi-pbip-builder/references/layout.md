# Layout: tamaños mínimos y convenciones de grilla

## Tamaño de página

| Uso | Medida |
|---|---|
| Por defecto de Power BI | 1280 × 720 |
| **Recomendado para tableros densos** | **1280 × 900** |
| Mock-ups tipo presentación (3:2) | 1280 × 854 |

Con 4 filas de contenido, 720 px queda corto: los gráficos aparecen con scrollbar y los
ejes no entran. Subir a 900 casi siempre resuelve.

`displayOption: "FitToPage"` escala la página al viewport, así que un alto mayor no
perjudica en pantallas chicas.

## Mínimos que no se pueden ignorar

| Elemento | Mínimo | Qué pasa si no |
|---|---|---|
| Slicer desplegable | **76 px** de alto (28 encabezado + 32 selector + 16 relleno) | se corta el encabezado o el selector |
| Cuadro de texto | alto ≈ `fontSize(pt) × 1.6 + 16` — un texto de 19 pt necesita ~46 px | aparece scrollbar dentro del texto |
| Gráfico de barras | ~28 px **por categoría** + 60 de ejes | scrollbar; se ven sólo las primeras categorías |
| Gráfico de líneas con etiquetas de eje | ≥ 170 px de alto | desaparecen las etiquetas del eje X |
| Tabla | 24 (encabezado) + ~20 **por fila** | se corta y aparece scrollbar |
| Tarjeta KPI | ~100 px con etiqueta arriba del valor | se corta el valor |

**El cálculo por categoría es el que más se olvida.** Un gráfico de 5 vendedores necesita
~200 px; uno de 10 productos, ~340. Contá las filas reales del modelo antes de fijar el alto.

## Grilla de referencia

```text
0        216   232                                              1264  1280
│  riel   │  │                    contenido                        │  │
├─────────┴──┴────────────────────────────────────────────────────┴──┤  0
│                          cabecera                                  │
├─────────┬──┬────────────────────────────────────────────────────┬──┤  92
│ FILTROS │  │  fila 1 · tarjetas KPI                             │  │  104
│         │  ├────────────────────────────────────────────────────┤  │  204
│ [slicer]│  │  fila 2 · gráficos                                 │  │  212
│ [slicer]│  ├────────────────────────────────────────────────────┤  │  408
│ [slicer]│  │  fila 3 · tabla de detalle                         │  │  416
│         │  └────────────────────────────────────────────────────┘  │  816
│ fuente  │                        nota al pie                       │  822
└─────────┴─────────────────────────────────────────────────────────┘  900
```

```js
const PAGE_W = 1280, PAGE_H = 900;
const RAIL_W = 216, HEAD_H = 92;
const CONTENT_X = RAIL_W + 16;               // 232
const CONTENT_W = PAGE_W - CONTENT_X - 16;   // 1032
```

Con separación de 16 px, dos columnas iguales dan 508 px cada una
(`(1032 - 16) / 2`). Cuatro columnas: 246 px.

## Capas (`z`)

| `z` | Qué |
|---|---|
| 0 | formas de fondo (riel, cabecera, paneles) |
| 1 | visuales de datos |
| 2 | textos y elementos que van encima de las formas |

## Reglas de composición

- **Sin superposiciones** entre visuales de datos. El validador marca los que se salen de
  la página, pero no los que se pisan entre sí.
- **Alineá los bordes.** Que las filas compartan `y` y `height`, y las columnas `x` y `width`.
- **Márgenes constantes** — 16 px entre visuales y contra los bordes se ve prolijo.
- **Un `shape` de fondo agrupa** visuales relacionados (por ejemplo un panel de alertas):
  poné la forma en `z: 0` y las tarjetas encima en modo plano, sin fondo propio, para no
  apilar tarjeta sobre tarjeta.

## Estética que funciona

```js
const C = {
  bg: '#F4F5F7',       // lienzo gris claro
  card: '#FFFFFF',     // tarjetas
  border: '#E3E3E3',
  text: '#1B1A19',
  muted: '#605E5C',    // etiquetas
  soft: '#8A8886',     // notas al pie
  primary: '#0F6CBD',
  good: '#107C10', warn: '#C19C00', bad: '#C4314B',
  gradLo: '#F8696B', gradHi: '#63BE7B',   // escala roja→verde
};
```

Lienzo gris + tarjetas blancas con borde y esquinas redondeadas (`radius: 8`) es el patrón
que más se parece a los mock-ups modernos. Una barra de acento de 4 px a la izquierda de
cada tarjeta KPI agrega jerarquía sin ruido.

Jerarquía tipográfica (Segoe UI): título de página 19 pt bold · título de visual 11 pt bold ·
valor KPI 18–22 pt bold (38 pt si es el número protagonista) · etiquetas 8–9 pt ·
notas al pie 7 pt.
