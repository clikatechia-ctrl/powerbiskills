/* pbir-lib.js — helpers para generar informes PBIR por código.
 *
 * Uso:
 *   const L = require('./pbir-lib');
 *   const { S, N, I, B, F, pm, pc, kpiCard, writePage } = L;
 *
 * Antes de agregar propiedades nuevas, confirmalas con:
 *   powerbi-report-author formatting describe-object <visualType> <objeto>
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ── esquemas ──────────────────────────────────────────────────────────────
   Copiá estos valores de un archivo existente del mismo informe.
   No los inventes ni los subas de versión.                                  */
const SCHEMA = {
  visual: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json',
  page: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json',
  pages: 'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json',
};

/* ── paleta ─────────────────────────────────────────────────────────────── */
const C = {
  bg: '#F4F5F7', card: '#FFFFFF', border: '#E3E3E3',
  text: '#1B1A19', muted: '#605E5C', soft: '#8A8886',
  primary: '#0F6CBD', primaryDark: '#0A4A82', grey: '#C8C6C4',
  good: '#107C10', warn: '#C19C00', bad: '#C4314B',
  gradLo: '#F8696B', gradHi: '#63BE7B',
};

/* ── codificación de literales ──────────────────────────────────────────── */
const lit = v => ({ expr: { Literal: { Value: v } } });
const S = v => lit(`'${v}'`);   // texto y enums
const N = v => lit(`${v}D`);    // decimales
const I = v => lit(`${v}L`);    // enteros
const B = v => lit(`${v}`);     // booleanos
const F = hex => ({ solid: { color: { expr: { Literal: { Value: `'${hex}'` } } } } });

/* ── referencias a campos ───────────────────────────────────────────────── */
const M = (name, table = '_Medidas') =>
  ({ Measure: { Expression: { SourceRef: { Entity: table } }, Property: name } });
const Col = (table, prop) =>
  ({ Column: { Expression: { SourceRef: { Entity: table } }, Property: prop } });

/** proyección de medida */
const pm = (name, displayName, table = '_Medidas') => {
  const p = { field: M(name, table), queryRef: `${table}.${name}`, nativeQueryRef: name };
  if (displayName) p.displayName = displayName;
  return p;
};
/** proyección de columna */
const pc = (table, prop, displayName) => {
  const p = { field: Col(table, prop), queryRef: `${table}.${prop}`, nativeQueryRef: prop };
  if (displayName) p.displayName = displayName;
  return p;
};

/* ── entradas de formato ────────────────────────────────────────────────── */
const one = props => [{ properties: props }];
/** objetos con _selectorHint ['default'] necesitan las DOS entradas */
const dual = props => [{ properties: props }, { selector: { id: 'default' }, properties: props }];

/* ── formato condicional ────────────────────────────────────────────────── */
/** Degradado sobre una medida. Los stops van SIN envoltorio `expr`. */
const grad = (measure, lo = C.gradLo, hi = C.gradHi, table = '_Medidas') => ({
  solid: { color: { expr: { FillRule: {
    Input: M(measure, table),
    FillRule: { linearGradient2: {
      min: { color: { Literal: { Value: `'${lo}'` } } },
      max: { color: { Literal: { Value: `'${hi}'` } } },
      nullColoringStrategy: { strategy: { Literal: { Value: "'asZero'" } } },
    } },
  } } } },
});

/**
 * Entrada de fondo condicional para una columna de tabla.
 * El selector necesita `data` ADEMÁS de `metadata`: sin el comodín la regla
 * se ignora en silencio (valida bien y no pinta nada).
 */
const cfBack = (measure, lo, hi, table = '_Medidas') => ({
  selector: { data: [{ dataViewWildcard: { matchingOption: 1 } }], metadata: `${table}.${measure}` },
  properties: { backColor: grad(measure, lo, hi, table) },
});

/* ── fábrica de visuales ────────────────────────────────────────────────── */
function makeFactory(pagePrefix) {
  let seq = 0;
  const nextName = () => pagePrefix.slice(0, 14) + String(++seq).padStart(6, '0');

  /** pos = [x, y, ancho, alto, z?] */
  function visual(type, pos, { query, objects, vco } = {}) {
    const v = {
      $schema: SCHEMA.visual,
      name: nextName(),
      position: { x: pos[0], y: pos[1], z: pos[4] ?? 1, width: pos[2], height: pos[3], tabOrder: seq },
      visual: { visualType: type },
    };
    if (query) v.visual.query = query;
    if (objects) v.visual.objects = objects;
    if (vco) v.visual.visualContainerObjects = vco;
    v.visual.drillFilterOtherVisuals = true;
    return v;
  }

  const run = (value, { size = 10, bold = false, color = C.text } = {}) => ({
    value,
    textStyle: { fontFamily: 'Segoe UI', fontSize: `${size}pt`, fontWeight: bold ? 'bold' : 'normal', color },
  });

  /** cuadro de texto — recordá los mínimos de alto (ver layout.md) */
  const textbox = (pos, runs, align = 'left') =>
    visual('textbox', pos, {
      objects: { general: one({ paragraphs: [{ horizontalTextAlignment: align, textRuns: runs }] }) },
      vco: { background: one({ show: B(false) }), visualHeader: one({ show: B(false) }) },
    });

  /** rectángulo de fondo — usar z:0 */
  const panel = (pos, color = C.card, radius = 0) =>
    visual('shape', [pos[0], pos[1], pos[2], pos[3], 0], {
      objects: {
        shape: dual({ tileShape: S('rectangle'), rectangleRoundedCurve: I(radius) }),
        fill: dual({ show: B(true), fillColor: F(color), transparency: N(0) }),
        outline: dual({ show: B(false) }),
      },
      vco: { background: one({ show: B(false) }), visualHeader: one({ show: B(false) }) },
    });

  /** chrome de contenedor: tarjeta blanca con título */
  function chrome({ title, subTitle, fontSize = 11 } = {}) {
    const vco = {
      background: one({ show: B(true), color: F(C.card), transparency: N(0) }),
      border: one({ show: B(true), color: F(C.border), width: N(1), radius: N(8) }),
      padding: one({ top: N(6), bottom: N(6), left: N(10), right: N(10) }),
      visualHeader: one({ show: B(false) }),
    };
    if (title) vco.title = one({ show: B(true), text: S(title), fontColor: F(C.text), fontSize: N(fontSize), bold: B(true), fontFamily: S('Segoe UI'), alignment: S('left') });
    if (subTitle) vco.subTitle = one({ show: B(true), text: S(subTitle), fontColor: F(C.muted), fontSize: N(9), fontFamily: S('Segoe UI'), alignment: S('left') });
    return vco;
  }

  /** tarjeta KPI multi-valor — preferila a varias tarjetas sueltas */
  function kpiCard(pos, projections, { columnCount, valueSize = 20, labelSize = 8, accent = C.primary, flat = false } = {}) {
    return visual('cardVisual', pos, {
      query: { queryState: { Data: { projections } } },   // rol Data, no Values
      objects: {
        value: dual({ show: B(true), fontSize: N(valueSize), bold: B(true), fontColor: F(C.text), fontFamily: S('Segoe UI'), horizontalAlignment: S('left'), labelDisplayUnits: S('0') }),
        label: dual({ show: B(true), fontSize: N(labelSize), fontColor: F(C.muted), fontFamily: S('Segoe UI'), position: S('aboveValue'), horizontalAlignment: S('left') }),
        layout: dual({
          style: S('Cards'), columnCount: I(columnCount ?? projections.length), rowCount: I(1),
          cellPadding: I(12), backgroundShow: B(!flat), backgroundFillColor: F(C.card),
          rectangleRoundedCurve: I(8), customizeLines: B(false),
          borderWidth: N(flat ? 0 : 1), borderColor: F(C.border), borderStyle: S('solid'),
        }),
        accentBar: dual({ show: B(!flat), position: S('Left'), color: F(accent), width: N(4), transparency: N(0) }),
      },
      vco: { background: one({ show: B(false) }), border: one({ show: B(false) }), visualHeader: one({ show: B(false) }) },
    });
  }

  /** segmentador desplegable — mínimo 78 px de alto */
  const slicer = (pos, projection, title) =>
    visual('slicer', pos, {
      query: { queryState: { Values: { projections: [projection] } } },
      objects: {
        data: one({ mode: S('Dropdown') }),
        header: one({ show: B(true), text: S(title), fontColor: F(C.text), textSize: N(9), bold: B(true), fontFamily: S('Segoe UI'), background: F(C.card) }),
        items: one({ fontColor: F(C.text), textSize: N(9), fontFamily: S('Segoe UI'), background: F(C.card) }),
        selection: one({ selectAllCheckboxEnabled: B(true), singleSelect: B(false) }),
      },
      vco: {
        background: one({ show: B(true), color: F(C.card), transparency: N(0) }),
        border: one({ show: B(true), color: F(C.border), width: N(1), radius: N(6) }),
        visualHeader: one({ show: B(false) }),
      },
    });

  return { visual, run, textbox, panel, chrome, kpiCard, slicer };
}

/* ── objetos reutilizables de gráficos y tablas ─────────────────────────── */
const axisCat = (e = {}) => one(Object.assign(
  { show: B(true), fontSize: N(9), labelColor: F(C.muted), fontFamily: S('Segoe UI'), showAxisTitle: B(false), gridlineShow: B(false) }, e));

const axisVal = (e = {}) => one(Object.assign(
  { show: B(true), fontSize: N(9), labelColor: F(C.muted), fontFamily: S('Segoe UI'), showAxisTitle: B(false), gridlineShow: B(true), gridlineColor: F('#EDEBE9'), gridlineThickness: N(1) }, e));

const dataLabels = (e = {}) => one(Object.assign(
  { show: B(true), fontSize: N(8), color: F(C.muted), fontFamily: S('Segoe UI'), labelDisplayUnits: S('0') }, e));

/** objetos de tabla; `cf` son entradas de cfBack() */
const tableObjects = ({ size = 9, cf = [] } = {}) => ({
  columnHeaders: one({
    fontColor: F(C.muted), backColor: F('#FAF9F8'), fontSize: N(size), bold: B(true),
    fontFamily: S('Segoe UI'), alignment: S('Auto'),
    autoSizeColumnWidth: B(true), columnAdjustment: S('growToFit'), wordWrap: B(false),
  }),
  rowHeaders: one({ fontColor: F(C.text), fontSize: N(size), fontFamily: S('Segoe UI'), stepped: B(false), backColor: F(C.card) }),
  values: [
    { properties: { fontColor: F(C.text), fontSize: N(size), fontFamily: S('Segoe UI'), wordWrap: B(false), backColorPrimary: F(C.card), backColorSecondary: F('#FAFAFA') } },
    ...cf,
  ],
  grid: one({ gridHorizontal: B(true), gridHorizontalColor: F('#EDEBE9'), gridHorizontalWeight: N(1), gridVertical: B(false), rowPadding: N(4), outlineColor: F(C.border), outlineWeight: N(1) }),
  subTotals: [{ selector: { id: 'Row' }, properties: { rowSubtotals: B(false) } }],
});

const sortBy = (field, direction = 'Descending') =>
  ({ sort: [{ field, direction }], isDefaultSort: true });

/* ── escritura en disco ─────────────────────────────────────────────────── */
/** Windows retiene handles de directorios recién vaciados: reintentar y seguir. */
function rmQuiet(p) {
  for (let i = 0; i < 5; i++) {
    try { fs.rmSync(p, { recursive: true, force: true }); return true; } catch (e) { /* reintento */ }
  }
  return false;
}

/**
 * Escribe una página completa.
 * No borra el directorio de la página (falla en Windows): vacía su contenido.
 */
function writePage(pagesDir, { id, displayName, visuals, width = 1280, height = 900, background = C.bg }) {
  const dir = path.join(pagesDir, id);
  const vdir = path.join(dir, 'visuals');
  if (fs.existsSync(vdir)) for (const e of fs.readdirSync(vdir)) rmQuiet(path.join(vdir, e));
  if (fs.existsSync(dir)) for (const e of fs.readdirSync(dir)) if (e !== 'visuals') rmQuiet(path.join(dir, e));
  fs.mkdirSync(vdir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'page.json'), JSON.stringify({
    $schema: SCHEMA.page, name: id, displayName,
    displayOption: 'FitToPage', height, width,
    objects: { background: [{ properties: { color: F(background), transparency: N(0) } }] },
  }, null, 2) + '\n');

  for (const v of visuals) {
    const vd = path.join(vdir, v.name);
    fs.mkdirSync(vd, { recursive: true });
    fs.writeFileSync(path.join(vd, 'visual.json'), JSON.stringify(v, null, 2) + '\n');
  }
  return visuals.length;
}

/** Reescribe pages.json. Toda página debe figurar acá o es invisible. */
function writePagesIndex(pagesDir, pageIds, activePage) {
  fs.writeFileSync(path.join(pagesDir, 'pages.json'), JSON.stringify({
    $schema: SCHEMA.pages, pageOrder: pageIds, activePageName: activePage || pageIds[0],
  }, null, 2) + '\n');
}

module.exports = {
  SCHEMA, C,
  lit, S, N, I, B, F, M, Col, pm, pc,
  one, dual, grad, cfBack,
  makeFactory, axisCat, axisVal, dataLabels, tableObjects, sortBy,
  rmQuiet, writePage, writePagesIndex,
};
