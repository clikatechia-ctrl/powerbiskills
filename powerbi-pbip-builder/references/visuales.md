# Tipos de visual, roles y objetos de formato

> Los roles y las propiedades **cambian por tipo de visual**. Esta tabla es un atajo, no un
> reemplazo de `powerbi-report-author catalog describe <tipo>`. Ante la duda, consultá el CLI.

## Nunca crear tipos legacy

| No usar | Usar |
|---|---|
| `card` | `cardVisual` |
| `multiRowCard` | `cardVisual` multi-valor |
| `table` | `tableEx` |
| `matrix` | `pivotTable` |
| `map`, `filledMap` | `azureMap` |

## Roles por tipo

| Tipo | Roles de datos |
|---|---|
| `cardVisual` | **`Data`**, `Rows`, `Tooltips` |
| `barChart`, `columnChart`, `clusteredBarChart`, `clusteredColumnChart` | `Category`, `Series`, `Y`, `Tooltips` |
| `lineChart`, `areaChart` | `Category`, `Series`, `Y`, `Y2` |
| `pivotTable` | `Rows`, `Columns`, `Values` |
| `tableEx` | `Values` |
| `gauge` | `Y`, `MinValue`, `MaxValue`, `TargetValue` |
| `slicer`, `listSlicer` | `Values` |
| `donutChart`, `pieChart` | `Category`, `Y` |
| `textbox`, `shape`, `actionButton` | ninguno |

> `cardVisual` usa **`Data`**. `Values` y `Fields` son de los tipos viejos y dejan la
> tarjeta vacía.

## Tarjetas KPI

Para 2 o más KPIs relacionados, **una sola `cardVisual` multi-valor** con varias
proyecciones en `Data`, en vez de varias tarjetas sueltas:

```js
objects: {
  value:  dual({ fontSize: N(20), bold: B(true), horizontalAlignment: S('left'), labelDisplayUnits: S('0') }),
  label:  dual({ fontSize: N(8), fontColor: F('#605E5C'), position: S('aboveValue') }),
  layout: dual({ style: S('Cards'), columnCount: I(4), rowCount: I(1), cellPadding: I(12),
                 backgroundShow: B(true), backgroundFillColor: F('#FFFFFF'),
                 rectangleRoundedCurve: I(8), borderWidth: N(1), borderColor: F('#E3E3E3') }),
  accentBar: dual({ show: B(true), position: S('Left'), color: F('#0F6CBD'), width: N(4) }),
}
```

`layout.style`: `Cards` (tarjetas separadas) o `Table`.
Todos estos objetos requieren el **patrón de doble entrada** (`dual`).

`labelDisplayUnits`: `'0'` auto · `'1'` ninguna · `'1000'` miles · `'1000000'` millones.

## Gráficos cartesianos

```js
objects: {
  categoryAxis: one({ show: B(true), fontSize: N(9), labelColor: F('#605E5C'),
                      showAxisTitle: B(false), gridlineShow: B(false) }),
  valueAxis:    one({ show: B(true), fontSize: N(9), labelColor: F('#605E5C'),
                      showAxisTitle: B(false), gridlineShow: B(true),
                      gridlineColor: F('#EDEBE9'), start: N(0), end: N(1) }),
  dataPoint:    one({ defaultColor: F('#0F6CBD') }),
  labels:       one({ show: B(true), fontSize: N(8), labelPosition: S('OutsideEnd') }),
  legend:       one({ show: B(false) }),
}
```

**Colores de serie:**
- Serie única → `dataPoint.defaultColor`, sin selector
- Varias series → una entrada `dataPoint` por serie con `{ metadata: '_Medidas.<Medida>' }`
  y `fill`. Usá **hex literal**: `ThemeDataColor` con selector de metadata falla.

```js
dataPoint: [
  { selector: { metadata: '_Medidas.Ventas' }, properties: { fill: F('#0F6CBD') } },
  { selector: { metadata: '_Medidas.Meta'   }, properties: { fill: F('#C8C6C4') } },
]
```

**Línea punteada** para la serie de comparación:

```js
lineStyles: [
  { properties: { strokeWidth: N(2), showMarker: B(false), lineChartType: S('linear') } },
  { selector: { metadata: '_Medidas.Año anterior' }, properties: { lineStyle: S('dashed') } },
]
```

## Tablas

```js
objects: {
  columnHeaders: one({ fontColor: F('#605E5C'), backColor: F('#FAF9F8'), fontSize: N(9), bold: B(true),
                       autoSizeColumnWidth: B(true), columnAdjustment: S('growToFit') }),
  rowHeaders:    one({ fontColor: F('#1B1A19'), fontSize: N(9), stepped: B(false) }),
  values:        one({ fontSize: N(9), backColorPrimary: F('#FFFFFF'), backColorSecondary: F('#FAFAFA') }),
  grid:          one({ gridHorizontal: B(true), gridHorizontalColor: F('#EDEBE9'),
                       gridVertical: B(false), rowPadding: N(4) }),
  subTotals:     [{ selector: { id: 'Row' }, properties: { rowSubtotals: B(false) } }],
}
```

- Poné siempre `columnAdjustment: 'growToFit'` y `autoSizeColumnWidth: true`, si no las
  columnas se encogen al contenido y sobra espacio en blanco.
- Con colores de fila propios, agregá el VCO `stylePreset: { name: 'None' }`; el preset por
  defecto pisa `backColorPrimary`/`backColorSecondary`.
- `rowHeaders.stepped: false` muestra cada campo de fila en su propia columna.

## Segmentadores

```js
objects: {
  data:      one({ mode: S('Dropdown') }),   // VerticalList, Dropdown, Between, Relative…
  header:    one({ show: B(true), text: S('Zona'), textSize: N(9), bold: B(true) }),
  items:     one({ fontColor: F('#1B1A19'), textSize: N(9) }),
  selection: one({ selectAllCheckboxEnabled: B(true), singleSelect: B(false) }),
}
```

Un slicer en modo `Dropdown` necesita **al menos 76 px de alto**. Ver `layout.md`.

## Cuadros de texto

El contenido vive en `objects.general[].properties.paragraphs`, como **array JSON nativo**
(nunca como cadena con JSON adentro):

```js
objects: {
  general: one({
    paragraphs: [{
      horizontalTextAlignment: 'left',
      textRuns: [
        { value: 'Título', textStyle: { fontFamily: 'Segoe UI', fontSize: '19pt', fontWeight: 'bold', color: '#1B1A19' } },
      ],
    }],
  }),
}
```

`textStyle` usa valores tipo CSS (`'19pt'`, `'#1B1A19'`), **no** la codificación de literales.

## Formas — paneles y separadores

Usá `shape` para tarjetas de fondo, rieles laterales y líneas divisorias. Un `textbox`
nunca sirve de separador fino: siempre ocupa ~24 px de alto.

```js
objects: {
  shape:   dual({ tileShape: S('rectangle'), rectangleRoundedCurve: I(8) }),
  fill:    dual({ show: B(true), fillColor: F('#FFFFFF'), transparency: N(0) }),
  outline: dual({ show: B(false) }),
}
```

Ponelas en `z: 0` para que queden detrás del resto.

## Chrome del contenedor (VCO)

```js
visualContainerObjects: {
  title:        one({ show: B(true), text: S('Ventas por vendedor'), fontSize: N(11), bold: B(true) }),
  subTitle:     one({ show: B(true), text: S('Aclaración'), fontSize: N(9), fontColor: F('#605E5C') }),
  background:   one({ show: B(true), color: F('#FFFFFF'), transparency: N(0) }),
  border:       one({ show: B(true), color: F('#E3E3E3'), width: N(1), radius: N(8) }),
  padding:      one({ top: N(6), bottom: N(6), left: N(10), right: N(10) }),
  visualHeader: one({ show: B(false) }),
}
```

`visualHeader.show: false` oculta el menú de tres puntos y deja el tablero más limpio.
