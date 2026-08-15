---
name: powerbi-pbip-builder
description: Construir informes de Power BI escribiendo directamente los archivos PBIR de un proyecto PBIP (páginas, visuales, formato, formato condicional, temas). Usar cuando haya que crear, modificar o depurar un tablero desde el código en vez de arrastrar visuales a mano en Power BI Desktop.
metadata:
  tags: powerbi, pbip, pbir, dashboard, dax, tmdl, informes
---

# Construir informes Power BI desde archivos PBIP

Un proyecto **PBIP** guarda el informe como JSON en texto plano (formato **PBIR**) y el
modelo como **TMDL**. Eso significa que un tablero entero se puede escribir, versionar y
revisar como código, sin tocar la interfaz.

## Cuándo usar esta skill

- Crear páginas y visuales nuevos en un `.pbip`
- Aplicar formato, estética, formato condicional o un tema
- Reproducir un mock-up o un diseño de referencia
- Depurar visuales que no renderizan o un archivo que no abre

**No** usar para modelado de datos (medidas DAX, relaciones, Power Query). Eso vive en
`<Nombre>.SemanticModel/` y se toca aparte.

---

## Regla de oro

> **Nunca adivines la estructura JSON. Preguntale al CLI oficial de Microsoft.**

Los nombres de propiedades, roles y valores de enum **cambian por tipo de visual** y no
están todos en los esquemas públicos. Inventarlos produce visuales que desaparecen sin
mensaje de error, o un archivo que directamente no abre.

```bash
npm install -g @microsoft/powerbi-report-authoring-cli@latest @microsoft/powerbi-desktop-bridge-cli@latest
```

| Necesitás saber… | Comando |
|---|---|
| Qué tipos de visual existen | `powerbi-report-author catalog list` |
| Roles de datos de un visual | `powerbi-report-author catalog describe cardVisual` |
| Qué objetos de formato acepta | `powerbi-report-author formatting list-objects tableEx` |
| Propiedades y enums de un objeto | `powerbi-report-author formatting describe-object barChart labels` |
| Dónde vive una propiedad | `powerbi-report-author formatting search lineChart "marker"` |
| Cómo se codifica un valor | `powerbi-report-author expr encode 0.9 --kind number` |
| **Si el informe es válido** | `powerbi-report-author validate <ruta>.Report` |

---

## Flujo de trabajo

### 0 · Leer el modelo antes de escribir nada

Listá las medidas y columnas reales desde los TMDL. **Toda referencia a un campo
inexistente rompe el visual.**

```bash
grep -h "^	measure\|^	column" <Nombre>.SemanticModel/definition/tables/*.tmdl
```

Si falta una medida que el diseño necesita, **avisá antes de inventarla**: agregar DAX es
una decisión del dueño del modelo, no un detalle de implementación.

### 1 · Diseñar la grilla en papel primero

Definí `x, y, ancho, alto` de cada visual antes de escribir JSON. Verificá que nada se
superponga ni se salga de la página. Ver `references/layout.md` para los **mínimos de
tamaño** — un slicer o un gráfico demasiado chico sale con scrollbar y se ve roto.

### 2 · Generar con un script, no a mano

Para más de ~5 visuales, escribí un **generador determinista en Node**. Mantiene la
consistencia, permite rehacer todo de cero y evita errores de copiar y pegar.

Arrancá copiando `assets/pbir-lib.js` (helpers de codificación y fábricas de visuales) y
mirá `assets/generador-ejemplo.js` como plantilla.

### 3 · Validar SIEMPRE antes de abrir

```bash
powerbi-report-author validate "<ruta>/<Nombre>.Report"
```

Tiene que dar `succeeded` con **0 errores**. Detecta nombres de propiedad inválidos, enums
mal escritos, roles incorrectos, IDs repetidos y visuales fuera de los límites de página.

**Lo que NO detecta:** la estructura interna de las expresiones (`FillRule`, filtros,
gradientes). Ahí el validador da luz verde y Power BI igual ignora la regla o borra el
visual. Por eso hace falta el paso 4.

### 4 · Verificar el render de verdad

Validar no es ver. Abrí el `.pbip` y mirá cada página. Un visual puede validar perfecto y
no dibujarse.

> **Y abrir no es que haya arrancado Power BI.** Cuando no puede cargar el proyecto,
> Desktop abre igual, con un informe nuevo y vacío, sin error ni diálogo. La señal es el
> título de la ventana: `Sin título - Power BI Desktop` = no abrió.
> `powerbi-desktop open` puede decir `launched` + `connected` y no haber abierto nada.
> Ver **`references/verificar-en-desktop.md`**.

Si no podés abrirlo vos, pedí una **exportación a PDF** (`Archivo → Exportar → PDF`) y
revisá esa salida.

Checklist visual:
- ¿Está **cada** visual que esperabas? Un hueco = un visual que Power BI descartó.
- ¿Hay scrollbars? El visual es muy chico para sus categorías.
- ¿Se cortan textos o valores? Falta alto.
- ¿El formato condicional se ve aplicado?

### 5 · Cuando algo no renderiza: aislar, no adivinar

Creá una **página temporal** con variantes del visual, cada una con una diferencia. Abrí,
mirá cuál falta y ya sabés cuál es la culpable.

> ⚠️ **Borrá esa página apenas terminás.** Una estructura experimental malformada puede
> impedir que el archivo entero abra, no sólo romper ese visual.

---

## La técnica más útil: extraer la verdad desde la interfaz

Cuando no sepas cómo se escribe algo (formato condicional, filtros, marcadores):

1. Aplicalo **una vez a mano** en Power BI Desktop
2. Guardá (`Ctrl+S`)
3. Leé el `visual.json` que Power BI acaba de escribir
4. Replicá esa estructura exacta por código

Power BI es su propia documentación. Esto convierte horas de adivinanza en dos minutos.

---

## Reglas que no se negocian

1. **Tipos modernos.** `card` → `cardVisual`, `table` → `tableEx`, `matrix` → `pivotTable`,
   `map` → `azureMap`. Los legacy renderizan mal o quedan deprecados.
2. **Los roles cambian por visual.** `cardVisual` usa `Data` (no `Values` ni `Fields`).
   `pivotTable` usa `Rows`/`Columns`/`Values`. Confirmalos siempre con `catalog describe`.
3. **`visualContainerObjects` va DENTRO de `visual`**, como hermano de `objects`.
4. **`sortDefinition` va dentro de `query`**, no dentro de `visual`.
5. **Preservá el `$schema`.** Copialo de un archivo existente del mismo tipo. No lo
   inventes ni lo subas de versión.
6. **`nativeQueryRef` siempre presente** en cada proyección.
7. **Toda página nueva va en `pages.json` → `pageOrder`**, o es invisible. Y un informe
   **sin ninguna página** no abre el proyecto entero: una plantilla PBIP vacía no sirve
   para probar un modelo semántico recién escrito.
8. **Objetos con `_selectorHint: ['default']`** necesitan doble entrada: una sin selector y
   otra con `{ id: 'default' }`.
9. **Ningún nombre de variable o de columna de extensión puede coincidir con una
   función DAX** (`path`, `abs`, `value`, `date`, `filter`…). El parser corta y
   reporta el error en la línea SIGUIENTE, que suele estar bien.
10. **HTML generado por DAX va en UNA sola línea**, incluido el `<style>`: si no,
    el string se parte y el archivo no abre. Detectalo buscando líneas del
    `.tmdl` con cantidad impar de comillas dobles.

---

## Referencias

Leé el archivo que corresponda antes de tocar esa área:

| Archivo | Para qué |
|---|---|
| `references/anatomia-pbir.md` | Estructura de carpetas y archivos del PBIP |
| `references/codificacion.md` | Cómo se escribe cada tipo de valor y referencia de campo |
| `references/visuales.md` | Tipos, roles y objetos de formato más usados |
| `references/formato-condicional.md` | **Leer sí o sí antes de intentar gradientes o barras** |
| `references/layout.md` | Mínimos de tamaño y convenciones de grilla |
| `references/troubleshooting.md` | Síntoma → causa → solución |
| `references/verificar-en-desktop.md` | **Comprobar que el proyecto abre de verdad y consultarlo por DAX.** Leer antes de dar algo por verificado |
| `references/visuales-html-y-temas.md` | **Visuales de AppSource, temas, HTML generado por DAX y sus trampas** |

| Asset | Qué es |
|---|---|
| `assets/pbir-lib.js` | Librería de helpers lista para usar |
| `assets/generador-ejemplo.js` | Generador completo de una página, como plantilla |

---

## Al terminar

- [ ] `validate` en 0 errores
- [ ] Todas las páginas en `pageOrder`, sin páginas de diagnóstico
- [ ] El proyecto **abre**: el título de la ventana es el del proyecto, no "Sin título"
- [ ] Cada visual verificado visualmente (abierto o por PDF)
- [ ] Cero referencias a campos que no existen en el modelo
- [ ] Sin scrollbars ni textos cortados
