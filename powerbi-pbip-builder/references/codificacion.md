# Codificación de valores y referencias

Todo valor de formato en PBIR es una **expresión**, no un literal plano. Escribir `12` en
vez de `{"expr":{"Literal":{"Value":"12L"}}}` no funciona.

Verificá cualquier duda con:

```bash
powerbi-report-author expr encode <valor> --kind <bool|number|integer|string|color|themeColor>
```

## Tabla de codificación

| Tipo | Cómo se escribe |
|---|---|
| Booleano | `{"expr":{"Literal":{"Value":"true"}}}` |
| Decimal | `{"expr":{"Literal":{"Value":"0.9D"}}}` — **sufijo `D`** |
| Entero | `{"expr":{"Literal":{"Value":"12L"}}}` — **sufijo `L`** |
| Texto / enum | `{"expr":{"Literal":{"Value":"'growToFit'"}}}` — **comillas simples adentro** |
| Color | `{"solid":{"color":{"expr":{"Literal":{"Value":"'#0F6CBD'"}}}}}` |
| Color de tema | `{"solid":{"color":{"expr":{"ThemeDataColor":{"ColorId":0,"Percent":-20}}}}}` |

Errores clásicos:

- Número sin sufijo → discrepancia de tipo, la propiedad se ignora
- Texto sin comillas simples internas → se interpreta como identificador, no como cadena
- Color sin el envoltorio `solid.color` → la propiedad se ignora

Los tipos que el CLI reporta como `formatting` (por ejemplo `fontSize`) se codifican como
decimal: `N(9)`.

## Helpers mínimos

```js
const lit = v => ({ expr: { Literal: { Value: v } } });
const S = v => lit(`'${v}'`);          // texto y enums
const N = v => lit(`${v}D`);           // decimales
const I = v => lit(`${v}L`);           // enteros
const B = v => lit(`${v}`);            // booleanos
const F = hex => ({ solid: { color: { expr: { Literal: { Value: `'${hex}'` } } } } });
```

## Referencias a campos

Una **columna**:

```json
{ "Column": { "Expression": { "SourceRef": { "Entity": "Dim_Vendedor" } }, "Property": "Vendedor" } }
```

Una **medida**:

```json
{ "Measure": { "Expression": { "SourceRef": { "Entity": "_Medidas" } }, "Property": "Ventas" } }
```

`Entity` es el nombre de la tabla; `Property`, el de la columna o medida — **exactamente**
como figuran en el TMDL, con espacios, tildes y símbolos incluidos.

> Mezclar los tipos rompe la consulta: las columnas van con `Column`, las medidas con
> `Measure`. Siempre.

## Proyecciones

```json
{
  "field": { "Measure": { "Expression": { "SourceRef": { "Entity": "_Medidas" } }, "Property": "Ventas" } },
  "queryRef": "_Medidas.Ventas",
  "nativeQueryRef": "Ventas",
  "displayName": "Facturación"
}
```

- `queryRef` — identificador único dentro del visual. Convención: `Tabla.Campo`.
- `nativeQueryRef` — **incluilo siempre**; sin él se rompen los cálculos visuales y los
  selectores de formato condicional.
- `displayName` — opcional, renombra la columna sólo en ese visual.

## Ordenamiento

`sortDefinition` es propiedad de **`query`**, no de `visual`:

```json
"query": {
  "queryState": { "...": "..." },
  "sortDefinition": {
    "sort": [ { "field": { "Measure": { "...": "..." } }, "direction": "Descending" } ],
    "isDefaultSort": true
  }
}
```

`direction`: `Ascending` | `Descending`.

## Selectores de formato

| Forma | Para qué |
|---|---|
| sin selector | aplica a todo el visual |
| `{ "id": "default" }` | instancia por defecto — requerido por objetos con `_selectorHint: ['default']` |
| `{ "metadata": "_Medidas.Ventas" }` | apunta a un campo concreto (por ejemplo el color de una serie) |
| `{ "data": [ { "dataViewWildcard": { "matchingOption": 1 } } ], "metadata": "..." }` | **formato condicional** — ver `formato-condicional.md` |

### Patrón de doble entrada

Si `formatting describe-object` devuelve `_selectorHint: ['default']`, escribí **dos**
entradas con las mismas propiedades: una sin selector y otra con `{ id: 'default' }`. Con
una sola, el formato valida pero no se aplica.

```js
const dual = props => [{ properties: props }, { selector: { id: 'default' }, properties: props }];
```
