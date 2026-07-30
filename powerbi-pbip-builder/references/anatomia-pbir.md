# Anatomía de un proyecto PBIP

```text
MiInforme.pbip                          # manifiesto: apunta a la carpeta .Report
├── MiInforme.Report/
│   ├── .platform                       # metadata de Fabric (type, logicalId)
│   ├── definition.pbir                 # vínculo informe → modelo semántico
│   ├── definition/
│   │   ├── version.json
│   │   ├── report.json                 # tema, settings, recursos
│   │   └── pages/
│   │       ├── pages.json              # orden de páginas + página activa
│   │       └── <idPagina>/
│   │           ├── page.json           # nombre, tamaño, fondo, filtros
│   │           └── visuals/
│   │               └── <idVisual>/
│   │                   └── visual.json # tipo, posición, query, formato
│   └── StaticResources/
│       └── SharedResources/BaseThemes/ # temas base
└── MiInforme.SemanticModel/            # TMDL — fuera del alcance de esta skill
    └── definition/
        ├── model.tmdl
        ├── relationships.tmdl
        └── tables/*.tmdl
```

## Los IDs

`<idPagina>` y `<idVisual>` son cadenas únicas de hasta 50 caracteres. La convención de
Power BI son 20 caracteres hexadecimales. Al generar por código, un contador con prefijo
funciona bien y es reproducible:

```js
const name = pagePrefix.slice(0, 14) + String(i).padStart(6, '0');
```

Nunca repitas un ID dentro del mismo informe.

## `pages.json`

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.1.0/schema.json",
  "pageOrder": ["idPagina1", "idPagina2"],
  "activePageName": "idPagina1"
}
```

Una carpeta de página que no figura en `pageOrder` **no se ve**.

## `page.json`

```json
{
  "$schema": ".../page/2.1.0/schema.json",
  "name": "idPagina1",
  "displayName": "Resumen Ejecutivo",
  "displayOption": "FitToPage",
  "height": 900,
  "width": 1280,
  "objects": {
    "background": [
      { "properties": { "color": { "solid": { "color": { "expr": { "Literal": { "Value": "'#F4F5F7'" } } } } },
                        "transparency": { "expr": { "Literal": { "Value": "0D" } } } } }
    ]
  }
}
```

`displayOption`: `FitToPage` | `FitToWidth` | `ActualSize`.

El fondo de página acepta sólo `color`, `image` y `transparency`. **No acepta `show`** —
eso es un error de esquema. `show` existe únicamente en el fondo de un visual.

## `visual.json`

```json
{
  "$schema": ".../visualContainer/2.9.0/schema.json",
  "name": "idVisual",
  "position": { "x": 20, "y": 100, "z": 1, "width": 400, "height": 200, "tabOrder": 1 },
  "visual": {
    "visualType": "cardVisual",
    "query": { "queryState": { "Data": { "projections": [ /* ... */ ] } },
               "sortDefinition": { /* ... */ } },
    "objects": { /* formato propio del tipo de visual */ },
    "visualContainerObjects": { /* chrome: título, fondo, borde, relleno */ },
    "drillFilterOtherVisuals": true
  }
}
```

Obligatorios: `$schema`, `name`, `position` y **uno** de `visual` o `visualGroup`.

### `objects` vs `visualContainerObjects`

- **`objects`** — formato específico del tipo de visual: ejes, etiquetas, colores de serie,
  celdas de tabla. Las claves válidas dependen del `visualType`.
- **`visualContainerObjects`** (VCO) — el marco, igual para todos los visuales:
  `title`, `subTitle`, `background`, `border`, `dropShadow`, `padding`, `stylePreset`,
  `visualHeader`, `spacing`, `divider`, `lockAspect`.

Ambos van **dentro** de `visual`. Ponerlos como hermanos de `visual` es error de esquema.

## Versiones de `$schema`

Power BI Desktop las sube casi con cada release. **Copiá el valor de un archivo existente
del mismo tipo dentro del mismo informe.** No inventes ni subas versiones.

Si el validador avisa `PBIR_SCHEMA_UNREACHABLE`, esa versión todavía no está publicada en
developer.microsoft.com: el archivo funciona igual en Desktop, pero se salta la validación
de esquema. Para poder validar de verdad, usá una versión publicada (por ejemplo
`visualContainer/2.9.0`) siempre que ya exista en el informe.
