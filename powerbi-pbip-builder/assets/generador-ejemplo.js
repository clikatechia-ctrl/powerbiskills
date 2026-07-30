/* generador-ejemplo.js — plantilla de una página completa.
 *
 *   node generador-ejemplo.js "C:/ruta/MiInforme.Report"
 *
 * Después SIEMPRE:
 *   powerbi-report-author validate "C:/ruta/MiInforme.Report"
 *
 * Adaptá los nombres de tabla, columna y medida a tu modelo.
 * Toda referencia a un campo inexistente rompe el visual.
 */
'use strict';
const path = require('path');
const L = require('./pbir-lib');
const {
  C, S, N, I, B, F, M, Col, pm, pc,
  one, cfBack, makeFactory, axisCat, axisVal, dataLabels, tableObjects, sortBy,
  writePage, writePagesIndex,
} = L;

const REPORT = process.argv[2];
if (!REPORT) { console.error('Falta la ruta a la carpeta .Report'); process.exit(1); }
const PAGES = path.join(REPORT, 'definition', 'pages');

/* ── geometría (ver references/layout.md) ───────────────────────────────── */
const PAGE_W = 1280, PAGE_H = 900;
const RAIL_W = 216, HEAD_H = 92;
const CONTENT_X = RAIL_W + 16;                 // 232
const CONTENT_W = PAGE_W - CONTENT_X - 16;     // 1032
const COL2 = (CONTENT_W - 16) / 2;             // 508

const PAGE_ID = 'a1b2c3d4e5f600000001';
const f = makeFactory(PAGE_ID);
const { run, textbox, panel, chrome, kpiCard, slicer } = f;

const v = [];

/* ── marco: riel de filtros + cabecera ──────────────────────────────────── */
v.push(panel([0, 0, RAIL_W, PAGE_H], C.card));
v.push(panel([RAIL_W, 0, PAGE_W - RAIL_W, HEAD_H], C.card));

v.push(textbox([20, 16, 176, 38, 2], [run('MI EMPRESA', { size: 12, bold: true, color: C.primaryDark })]));
v.push(textbox([20, 100, 176, 34, 2], [run('FILTROS', { size: 9, bold: true, color: C.soft })]));

// slicers: 78 px de alto y 88 de paso (el mínimo del desplegable es 76)
let y = 136;
for (const s of [
  { t: 'Año', p: pc('Dim_Calendario', 'Anio') },
  { t: 'Mes', p: pc('Dim_Calendario', 'Mes') },
  { t: 'Zona', p: pc('Dim_Vendedor', 'Zona') },
]) { v.push(slicer([20, y, 176, 78, 2], s.p, s.t)); y += 88; }

v.push(textbox([20, PAGE_H - 100, 176, 80, 2], [run('Fuente: ERP · actualización diaria', { size: 7, color: C.soft })]));

v.push(textbox([CONTENT_X, 12, 620, 48, 2], [run('Dashboard Comercial', { size: 19, bold: true, color: C.text })]));
v.push(textbox([CONTENT_X, 56, 620, 34, 2], [run('Seguimiento de ventas por vendedor', { size: 9, color: C.muted })]));

// tarjeta de frescura del dato, plana porque va sobre la cabecera blanca
v.push(kpiCard([986, 10, 278, 74, 2], [pm('Fecha de Corte de Datos', 'Datos actualizados al')],
  { valueSize: 12, labelSize: 8, columnCount: 1, flat: true }));

/* ── fila 1 · KPIs ──────────────────────────────────────────────────────── */
v.push(kpiCard([CONTENT_X, 104, CONTENT_W, 100], [
  pm('Ventas', 'Ventas del período'),
  pm('Unidades Vendidas', 'Unidades'),
  pm('Ticket Promedio', 'Ticket promedio'),
  pm('Pedidos', 'Pedidos'),
], { valueSize: 19, labelSize: 8, columnCount: 4 }));

/* ── fila 2 · gráficos ──────────────────────────────────────────────────── */
// alto 196 ≈ 5 categorías × 28 + 60 de ejes
v.push(f.visual('barChart', [CONTENT_X, 212, COL2, 196], {
  query: {
    queryState: {
      Category: { projections: [pc('Dim_Vendedor', 'Vendedor')] },
      Y: { projections: [pm('Ventas')] },
    },
    sortDefinition: sortBy(M('Ventas'), 'Descending'),
  },
  objects: {
    categoryAxis: axisCat({ fontSize: N(8) }),
    valueAxis: axisVal({ fontSize: N(8), labelDisplayUnits: S('1000') }),
    dataPoint: one({ defaultColor: F(C.primary) }),      // serie única → defaultColor
    labels: dataLabels({ labelDisplayUnits: S('1000'), labelPosition: S('OutsideEnd') }),
    legend: one({ show: B(false) }),
  },
  vco: chrome({ title: 'Ventas por vendedor' }),
}));

// dos series → una entrada dataPoint por serie, con hex literal
v.push(f.visual('lineChart', [CONTENT_X + COL2 + 16, 212, COL2, 196], {
  query: {
    queryState: {
      Category: { projections: [pc('Dim_Calendario', 'Anio_Mes', 'Mes')] },
      Y: { projections: [pm('Ventas', 'Ventas'), pm('Ventas Anio Anterior', 'Año anterior')] },
    },
    sortDefinition: sortBy(Col('Dim_Calendario', 'Anio_Mes'), 'Ascending'),
  },
  objects: {
    categoryAxis: axisCat({ fontSize: N(8) }),
    valueAxis: axisVal({ fontSize: N(8), labelDisplayUnits: S('1000') }),
    dataPoint: [
      { selector: { metadata: '_Medidas.Ventas' }, properties: { fill: F(C.primary) } },
      { selector: { metadata: '_Medidas.Ventas Anio Anterior' }, properties: { fill: F('#A19F9D') } },
    ],
    lineStyles: [
      { properties: { strokeWidth: N(2), showMarker: B(false), lineChartType: S('linear') } },
      { selector: { metadata: '_Medidas.Ventas Anio Anterior' }, properties: { lineStyle: S('dashed') } },
    ],
    labels: one({ show: B(false) }),
    legend: one({ show: B(true), position: S('TopRight'), fontSize: N(8), labelColor: F(C.muted), showTitle: B(false) }),
  },
  vco: chrome({ title: 'Evolución mensual vs. año anterior' }),
}));

/* ── fila 3 · tabla con formato condicional ─────────────────────────────── */
v.push(f.visual('pivotTable', [CONTENT_X, 424, CONTENT_W, 392], {
  query: {
    queryState: {
      Rows: { projections: [pc('Dim_Vendedor', 'Vendedor'), pc('Dim_Vendedor', 'Zona')] },
      Values: { projections: [
        pm('Ventas', 'Venta'),
        pm('Meta del Periodo', 'Meta'),
        pm('% Cumplimiento Meta', 'Cumpl. %'),
        pm('Semaforo Cumplimiento', 'Estado'),
      ] },
    },
    sortDefinition: sortBy(M('Ventas'), 'Descending'),
  },
  // cfBack ya arma el selector con dataViewWildcard, que es lo que lo hace funcionar
  objects: tableObjects({ size: 9, cf: [cfBack('% Cumplimiento Meta')] }),
  vco: chrome({ title: 'Detalle de desempeño por vendedor' }),
}));

v.push(textbox([CONTENT_X, 822, CONTENT_W, 34, 2],
  [run('Nota metodológica al pie.', { size: 7, color: C.soft })]));

/* ── escritura ──────────────────────────────────────────────────────────── */
const n = writePage(PAGES, { id: PAGE_ID, displayName: 'Comercial', visuals: v, width: PAGE_W, height: PAGE_H });
writePagesIndex(PAGES, [PAGE_ID], PAGE_ID);   // ⚠ agregá acá TODAS las páginas del informe

console.log(`OK · ${n} visuales · ${PAGE_W}x${PAGE_H}`);
console.log('Ahora: powerbi-report-author validate "' + REPORT + '"');
