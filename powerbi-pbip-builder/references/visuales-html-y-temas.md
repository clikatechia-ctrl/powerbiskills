# Visuales personalizados, temas y HTML generado por DAX

Todo lo de este archivo salió de romper cosas de verdad armando el Módulo 6 del
curso Next Gen (30/07/2026). Ninguna de estas reglas está en la documentación
oficial, y cada una costó al menos una vuelta de prueba y error.

---

## 1. Visuales personalizados de AppSource

Un visual de AppSource **sí** se puede usar desde PBIR. Hay dos partes:

**Instalarlo** — manual, una sola vez, desde Power BI Desktop
(*Obtener más objetos visuales*). Eso baja el paquete a la máquina y no se
puede hacer por archivo.

**Declarar que el informe lo usa** — eso sí es un archivo:

```json
// report.json, al mismo nivel que "settings"
"publicCustomVisuals": ["htmlContent443BE3AD55E043BF878BED274D3A6865"]
```

Y en el `visual.json`, el `visualType` es ese mismo identificador.

> ⚠️ **El identificador no se inventa.** Sale del `pbiviz.json` del visual, o —
> mejor — de agregarlo a mano una vez en Desktop, guardar, y leer qué escribió
> Power BI en `report.json`. Si va mal, **Power BI descarta el visual sin
> ningún mensaje de error**: simplemente no aparece.

**La ranura de datos no se llama igual en todos los visuales.** Sale del
`capabilities.json` del visual, no del catálogo del CLI:

```json
"query": { "queryState": { "content": { "projections": [ ... ] } } }
//                          ^^^^^^^ HTML Content usa "content", no "Values" ni "Data"
```

**Identificadores conocidos de HTML Content** (difieren en **un carácter**, así
que copiar y pegar, nunca tipear):

| Edición | Identificador | Cuándo |
|---|---|---|
| HTML Content (lite) — certificada | `htmlContent443BE3AD55E043BF878BED274D3A6865` | Por defecto. Funciona en export a PDF/PPT y suscripciones, y no la bloquea IT. Permite SVG. |
| HTML Content — completa | `htmlContent443BE3AD55E043BF878BED274D3A6855` | Solo si chocás con el sanitizador de la lite. |

**Qué filtra el sanitizador de la edición certificada** (verificado en Power BI):

| Técnica | ¿Pasa? |
|---|---|
| SVG `<filter><feGaussianBlur>` (glow real) | ✅ |
| `<linearGradient>` sobre `stroke` | ✅ |
| `stroke-dasharray` / `stroke-dashoffset` | ✅ |
| `<pattern>` | ✅ |
| `@keyframes` y animaciones CSS | ✅ |
| CSS `backdrop-filter` (glassmorphism) | ❌ |
| JavaScript, `@import`, `@font-face`, `url()` remota | ❌ |

> **Conclusión práctica:** para efectos visuales, usá **SVG**, no CSS avanzado.

El validador va a marcar `PBIR_VISUAL_TYPE_UNKNOWN` para cualquier visual de
AppSource. Es un **warning esperable**: el catálogo del CLI solo conoce los
nativos.

---

## 2. HTML generado desde una medida DAX

### La regla que rompe el archivo

**Todo el HTML tiene que quedar en UNA SOLA LÍNEA** dentro del string de DAX,
incluido el bloque `<style>`. Si el `<style>` conserva sus saltos de línea, el
string queda partido y **Power BI no abre el archivo**.

Cómo detectarlo sin abrir Power BI:

```bash
# líneas del .tmdl con cantidad IMPAR de comillas dobles = string partido
```

### Nombres reservados

**Ninguna variable ni columna de extensión puede llamarse como una función de
DAX.** Nos rompió dos veces:

```dax
VAR path = ...                      -- ✗ choca con PATH()
ADDCOLUMNS ( t, "@abs", ... )       -- ✗ choca con ABS()
```

Peligrosos frecuentes: `path`, `abs`, `value`, `date`, `format`, `filter`,
`min`, `max`, `sum`, `round`, `int`, `mod`, `row`, `all`, `search`, `find`,
`replace`, `year`, `month`, `day`, `now`.

> ⚠️ **El error apunta a la línea SIGUIENTE.** Cuando un nombre choca, el parser
> corta y reporta el error en la variable que viene después — que suele estar
> perfecta. Si DAX marca algo que a simple vista está bien, **mirá la anterior**.
> El mensaje típico es `The syntax for '' is incorrect`.

### Construcciones que no compilan

```dax
-- ✗ VAR anidada como expresión de ADDCOLUMNS
ADDCOLUMNS ( t, "@x", VAR k = t[col] RETURN <algo con k> )

-- ✗ RANKX sobre la misma tabla que estás recorriendo
ADDCOLUMNS ( serie, "@i", RANKX ( serie, [clave],, ASC ) )
```

Resolvelo con **aritmética de la fila**, sin volver a recorrer la tabla. Ejemplo
real: para posicionar puntos de un gráfico por mes, con `Clave_Mes` en formato
`AAAAMM`:

```dax
VAR conMes = ADDCOLUMNS ( doce, "@mesnum",
                 INT ( t[Clave_Mes] / 100 ) * 12 + MOD ( t[Clave_Mes], 100 ) )
VAR minM   = MINX ( conMes, [@mesnum] )
VAR maxM   = MAXX ( conMes, [@mesnum] )
VAR puntos = ADDCOLUMNS ( conMes,
                 "@x", DIVIDE ( [@mesnum] - minM, maxM - minM ) * ancho )
```

`Clave_Mes` en `AAAAMM` **no** se puede restar (`202601 - 12` no existe): para
tomar los últimos N meses usá `TOPN ( N, tabla, [Clave_Mes], DESC )`.

### Otras reglas

- **Límite de ~32.760 caracteres** en una medida de texto. Pedí siempre que te
  informe cuánto ocupa.
- **Sin comentarios `--` dentro de la medida.** Si en algún paso se pierden los
  saltos de línea, un comentario se traga todo lo que sigue.
- **A prueba de filtros:** cuando el usuario filtra, alguna medida puede quedar
  en BLANK. Cada zona del componente tiene que resolverlo (`IF ( ISBLANK (…) )`)
  o el componente se ve roto.
- **Degradación elegante:** el estado **base** del CSS ya tiene que ser el
  **final**; la animación solo anima *desde* otro estado *hacia* el base. Así,
  si el sanitizador la quita, el componente se ve igual.

  ```css
  /* ✓ */ .barra { width:72% }   @keyframes crecer { from { transform:scaleX(0) } }
  /* ✗ */ .barra { width:0 }     @keyframes crecer { to { width:72% } }
  ```

---

## 3. Temas

El tema es un JSON en `StaticResources/RegisteredResources/`, registrado en
`report.json`. Convierte **todo el informe de una vez** — en un informe de 76
visuales, eso es la diferencia entre una tarde y un pedido.

> ⚠️ **La regla de los tres nombres.** El `name` de adentro del JSON del tema, el
> `name` **y** el `path` del item en `resourcePackages`, y el
> `customTheme.name` de `report.json` tienen que ser **exactamente el mismo
> string, con la extensión `.json` incluida**. Si uno difiere, el tema no carga.

`customTheme` además necesita `reportVersionAtImport`: heredalo del `baseTheme`.

```json
"themeCollection": {
  "baseTheme":   { "name": "CY26SU07", "type": "SharedResources", "reportVersionAtImport": { … } },
  "customTheme": { "name": "Mi Tema.json", "type": "RegisteredResources", "reportVersionAtImport": { … } }
},
"resourcePackages": [
  { "name": "RegisteredResources", "type": "RegisteredResources",
    "items": [ { "name": "Mi Tema.json", "path": "Mi Tema.json", "type": "CustomTheme" } ] }
]
```

**El olvido clásico: los `shape`.** Se usan como paneles de fondo y, si no están
en `visualStyles`, siguen saliendo **blancos** por más que todo lo demás quede
oscuro. Incluí también `textbox` y `page`.

**Nombres que el validador rechaza** (confirmalos siempre con
`formatting describe-object`):

| Mal | Bien |
|---|---|
| `cardVisual` → `calloutValue` | `value` *(lleva `_selectorHint: ['default']`)* |
| `cardVisual` → `labels` | `label` *(ídem)* |
| `slicer` → `items.fontSize` | `items.textSize` |
| `slicer` → `outline` | `outlineStyle` |

---

## 4. Segmentadores

- **Alto mínimo 76px** para un desplegable, o se recorta el encabezado. Usá 82.
  El validador lo marca (`PBIR_SLICER_HEIGHT_BELOW_FLOOR`).
- **Van arriba de la página.** Si quedan en la mitad inferior, el desplegable
  **se abre hacia arriba** y tapa el contenido.
- **El fondo de los items no puede ser transparente**: se ve el fondo de la
  página a través de la lista y queda ilegible.

---

## 5. Cuando algo no compila: aislar, no adivinar

En una medida de 15.000 caracteres el error no se encuentra mirando. Se hace al
revés: armá una medida **mínima** que devuelva solo la parte sospechosa **como
texto plano**, creala a mano en Power BI (*Nueva medida*, pegar, Enter), y
sumale **una pieza por vez**. La primera que rompe es la culpable.

Secuencia real que resolvió un gráfico generado por DAX:

```
Test 1 → solo las filas de meses                    ✅
Test 2 → + el valor por mes                         ✅
Test 3 → + el cálculo de coordenadas                ❌
Test 4 → mismo cálculo, otra estrategia             ❌
Test 5 → renombrando la columna que chocaba         ✅
```

Recién con la 5 andando se ensambla el componente completo.

> ⚠️ **Nunca escribas DAX nuevo directo al archivo si no lo podés ejecutar.**
> El ciclo que funciona es: escribir la medida mínima → que la pegue en Power BI
> quien tenga el archivo abierto → leer el error → corregir. Meter DAX sin
> probar rompe el `.pbip` y cuesta más tiempo del que ahorra.

---

## 6. Reportes HTML fuera de Power BI

Cuando el entregable es un `.html` propio en vez de un visual, **no hay
sandbox**: se puede usar JavaScript, y con eso, filtros que recalculan de
verdad. Dos cosas que igual se mantienen:

- **Cero recursos externos** (ningún CDN, ninguna fuente remota), para que el
  archivo funcione sin internet.
- **Los datos quedan embebidos.** Un MCP puede traerlos *al generar* el reporte
  — eso resuelve la autoría, no el tiempo de ejecución. El archivo terminado
  sigue siendo una foto.
- **Qué cortes embebés es una decisión de diseño**: lo que no está en el
  archivo, no se puede filtrar.

> ⚠️ **Un error de sintaxis mata TODO el `<script>`**, no solo la parte rota.
> Síntoma: desaparecen gráficos y tablas que no tenían nada que ver.
> Se verifica sin abrir el navegador:
> ```bash
> node -e "new Function(require('fs').readFileSync('archivo.js','utf8'))"
> ```
> Es el equivalente del `validate` de Power BI.
