# Síntoma → causa → solución

## El archivo no abre / error con identificador de actividad

| Causa probable | Solución |
|---|---|
| Un objeto de formato malformado en **cualquier** visual | Quitá los visuales experimentales. Un solo objeto inválido impide abrir el informe entero, no sólo ese visual. |
| Página de diagnóstico olvidada | Borrala. Nunca dejes estructuras de prueba en un informe que se entrega. |
| Selector faltante en un objeto que lo exige | Revisá `_selectorHint` con `formatting describe-object`. |

**Cómo aislar:** quitá la mitad de las páginas de `pageOrder`, abrí, repetí. En 2 o 3
pasadas cae la culpable.

> Power BI **no** deja logs accesibles de este error. Bisecar es más rápido que buscarlos.

## Un visual no se dibuja (queda el hueco)

| Causa | Solución |
|---|---|
| `FillRule` con doble envoltorio `expr` | Los stops de color van crudos. Ver `formato-condicional.md`. |
| Rol incorrecto para ese tipo de visual | `catalog describe <tipo>` |
| Referencia a un campo que no existe | Cruzá contra los TMDL |
| Se mezcló `Column` con `Measure` | Columnas → `Column`; medidas → `Measure` |

Un hueco donde debería estar un visual **siempre** significa que Power BI lo descartó al
cargar. No es un problema de datos.

## El visual se dibuja pero sin datos

| Causa | Solución |
|---|---|
| Rol equivocado (`Values` en `cardVisual` en vez de `Data`) | corregir el rol |
| El filtro de página deja el conjunto vacío | revisar `filterConfig` |
| La medida devuelve BLANK en ese contexto | verificar el DAX en Desktop |

## El formato condicional no se aplica

Casi siempre: **el selector no lleva `data: [{ dataViewWildcard: ... }]`**.
Ver `formato-condicional.md`.

## Una propiedad de formato no tiene ningún efecto

| Causa | Solución |
|---|---|
| Falta la entrada con `{ id: 'default' }` | usar el patrón de doble entrada |
| Número sin sufijo `D`/`L` | `12` → `"12L"`, `0.9` → `"0.9D"` |
| Texto sin comillas simples internas | `"growToFit"` → `"'growToFit'"` |
| Color sin envoltorio `solid.color` | usar el helper `F()` |
| El preset de estilo pisa los colores de tabla | agregar VCO `stylePreset: { name: 'None' }` |
| La propiedad pertenece a otro objeto | `formatting search <tipo> "<regex>"` |

## Scrollbars o contenido cortado

El visual es más chico que lo que necesita su contenido. Ver los mínimos en `layout.md`.
Contá las **categorías reales** del modelo, no las que imaginás.

## Barras invisibles en un gráfico

`dataPoint.fill` sin selector en un gráfico de serie única. Usá `defaultColor` para el color
base; `fill` requiere selector `metadata`.

## Todas las series salen del mismo color

`defaultColor` en un gráfico con varias series. Usá una entrada `dataPoint` por serie con
selector `metadata` y **hex literal** (`ThemeDataColor` falla en ese contexto).

## `EPERM` al escribir desde un script (Windows)

Windows retiene el handle de un directorio recién vaciado. No borres la carpeta de la
página: vaciá su contenido y reescribí adentro.

```js
function rmQuiet(p) {
  for (let i = 0; i < 5; i++) {
    try { fs.rmSync(p, { recursive: true, force: true }); return true; } catch (e) {}
  }
  return false;
}
```

Y cerrá Power BI Desktop antes de escribir: mantiene handles abiertos sobre los archivos.

## Los cambios en el TMDL desaparecen

Power BI Desktop tenía el proyecto abierto y al guardar sobrescribió con su modelo en
memoria.

**Siempre cerrá Desktop antes de editar el modelo semántico.** Si ya estaba abierto,
cerralo **sin guardar** (o terminá el proceso) antes de escribir.

## El puente de automatización deja de responder

`powerbi-desktop screenshot` puede devolver `Print metadata is not available` de forma
permanente si el subsistema de impresión quedó en mal estado. Reiniciar Desktop no siempre
alcanza.

**Alternativa confiable:** pedir una exportación manual a PDF
(`Archivo → Exportar → PDF`). El archivo queda en
`%LOCALAPPDATA%\Temp\Power BI Desktop\print-job-<guid>\`.

Para leerlo como imagen:

```bash
pip install pymupdf
python -c "
import fitz
d = fitz.open('ruta/al.pdf')
for i, p in enumerate(d):
    p.get_pixmap(dpi=130).save(f'p{i+1}.png')
"
```

## El validador pasa pero se ve mal

Esperable. `validate` revisa nombres de propiedades, enums, roles, IDs y límites de página.
**No** revisa el interior de las expresiones ni el resultado visual.

Validar no es ver. Siempre abrí o exportá.
