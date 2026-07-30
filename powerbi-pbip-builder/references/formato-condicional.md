# Formato condicional

> **Leer esto entero antes de escribir la primera regla.** El formato condicional es la
> parte del PBIR donde más fácil se falla, porque el validador **no** revisa el interior de
> las expresiones: da `succeeded` con 0 errores y Power BI igual ignora la regla — o borra
> el visual completo sin ningún mensaje.

## La forma correcta

Fondo con escala de degradado sobre una columna de medida en `tableEx` o `pivotTable`:

```json
"objects": {
  "values": [
    {
      "properties": {
        "fontColor":  { "solid": { "color": { "expr": { "Literal": { "Value": "'#1B1A19'" } } } } },
        "backColorPrimary":   { "solid": { "color": { "expr": { "Literal": { "Value": "'#FFFFFF'" } } } } },
        "backColorSecondary": { "solid": { "color": { "expr": { "Literal": { "Value": "'#FAFAFA'" } } } } }
      }
    },
    {
      "selector": {
        "data": [ { "dataViewWildcard": { "matchingOption": 1 } } ],
        "metadata": "_Medidas.% Cumplimiento Meta"
      },
      "properties": {
        "backColor": {
          "solid": {
            "color": {
              "expr": {
                "FillRule": {
                  "Input": {
                    "Measure": {
                      "Expression": { "SourceRef": { "Entity": "_Medidas" } },
                      "Property": "% Cumplimiento Meta"
                    }
                  },
                  "FillRule": {
                    "linearGradient2": {
                      "min": { "color": { "Literal": { "Value": "'#F8696B'" } } },
                      "max": { "color": { "Literal": { "Value": "'#63BE7B'" } } },
                      "nullColoringStrategy": { "strategy": { "Literal": { "Value": "'asZero'" } } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

## Los tres detalles que lo hacen funcionar

### 1. El selector necesita `data`, no sólo `metadata`

```jsonc
// SE IGNORA EN SILENCIO          // FUNCIONA
"selector": {                     "selector": {
  "metadata": "_Medidas.X"          "data": [ { "dataViewWildcard": { "matchingOption": 1 } } ],
}                                   "metadata": "_Medidas.X"
                                  }
```

Sin el comodín de datos la regla nunca hace match. El archivo valida, abre, la tabla se
dibuja — y las celdas salen sin color. Es el error más difícil de detectar porque **nada
falla**.

### 2. Dentro de `expr` ya no se vuelve a envolver en `expr`

`FillRule` es una expresión. Todo lo que cuelga de ella son expresiones crudas.

```jsonc
// ROMPE EL VISUAL (desaparece)      // CORRECTO
"min": { "color": {                   "min": { "color": {
    "expr": { "Literal": { ... } }        "Literal": { "Value": "'#F8696B'" }
} }                                   } }
```

Este error no deja error visible: el visual simplemente **no se dibuja**. Donde debería
estar la tabla queda el fondo de la página vacío.

### 3. `nullColoringStrategy` va incluida

`'asZero'` es lo que escribe la interfaz por defecto. Otros valores posibles: `'asBlank'`.

## Degradado de tres colores

```json
"linearGradient3": {
  "min": { "color": { "Literal": { "Value": "'#F8696B'" } } },
  "mid": { "color": { "Literal": { "Value": "'#FFEB84'" } } },
  "max": { "color": { "Literal": { "Value": "'#63BE7B'" } } },
  "nullColoringStrategy": { "strategy": { "Literal": { "Value": "'asZero'" } } }
}
```

## Invertir la escala

Cuando **más es peor** (días sin venta, demora de entrega, costo), invertí los colores:
`min` verde y `max` rojo. No hace falta ninguna otra opción.

## Otras propiedades que aceptan `FillRule`

- `values.backColor` — fondo de celda
- `values.fontColor` — color de texto
- `dataPoint.fill` en gráficos cartesianos
- `columnFormatting.dataBars` — barras de datos (estructura distinta; extraela de la
  interfaz antes de usarla)

## Si algo no anda: extraé la verdad desde la interfaz

Es la técnica más rápida y no falla nunca:

1. Aplicá el formato **a mano** en Power BI Desktop sobre una sola columna
2. `Ctrl+S`
3. Abrí el `visual.json` correspondiente y leé lo que escribió Power BI
4. Copiá esa estructura exacta y replicala por código

Power BI guarda los colores del tema como los tokens literales `'minColor'` y `'maxColor'`.
Si querés colores fijos, reemplazalos por hex — es válido y no depende del tema.

## Alternativa sin `FillRule`

Para un semáforo por texto, suele ser más simple y robusto crear una **medida DAX** que
devuelva la categoría y mostrarla como columna:

```dax
Semaforo = SWITCH ( TRUE (),
    ISBLANK ( [% Cumplimiento] ), "Sin meta",
    [% Cumplimiento] >= 1,   "Cumple",
    [% Cumplimiento] >= 0.9, "En riesgo",
    "Crítico" )
```

No requiere ninguna expresión de formato y se lee igual de bien.
