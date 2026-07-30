# Power BI Skills para Claude Code

Skills que le enseñan a **Claude Code** a construir informes de Power BI escribiendo
directamente los archivos del proyecto, en vez de arrastrar visuales a mano.

| Skill | Para qué sirve |
|---|---|
| [`powerbi-pbip-builder`](./powerbi-pbip-builder) | Crear páginas, visuales, formato, estética y formato condicional en un proyecto `.pbip` |

---

## Qué resuelve

Un proyecto **PBIP** guarda el informe como JSON en texto plano (formato **PBIR**) y el
modelo como TMDL. Eso significa que un tablero entero se puede escribir, versionar y revisar
**como código**.

El problema es que la estructura de ese JSON no está documentada del todo: los nombres de
propiedades y los roles cambian según el tipo de visual, y equivocarse no da error — el
visual simplemente **desaparece**, o el archivo deja de abrir.

Esta skill encapsula ese conocimiento: qué preguntar, cómo escribirlo, cómo validarlo y qué
hacer cuando algo no se ve.

Con esto instalado, le podés pedir a Claude cosas como:

> *"Armá una página «Resumen Comercial» en mi .pbip: tarjetas de ventas, unidades y ticket
> promedio arriba, un gráfico de líneas de ventas por mes al medio, y abajo una tabla por
> vendedor y categoría con semáforo de cumplimiento."*

y sabe qué archivos tocar, cómo escribirlos y cómo verificar que quedaron bien.

---

## Requisitos

| | |
|---|---|
| **Power BI Desktop** | cualquier versión reciente |
| **Node.js 20 o superior** | verificá con `node --version`; si falta, [nodejs.org](https://nodejs.org) |
| **Claude Code** | [claude.com/claude-code](https://claude.com/claude-code) |
| **Tu informe guardado como `.pbip`** | ver más abajo |

---

## Paso a paso

### 1 · Guardá tu informe como PBIP

En Power BI Desktop: `Archivo → Guardar como` → elegí **Proyecto de Power BI (.pbip)**.

¿No aparece la opción? Activala primero:

`Archivo → Opciones y configuración → Opciones → Características de vista previa` →
tildá **Guardar como formato de proyecto** → reiniciá Power BI Desktop.

Al guardar vas a obtener esta estructura:

```text
MiInforme.pbip                 ← este es el archivo que abrís
MiInforme.Report/              ← el informe (lo que edita la skill)
MiInforme.SemanticModel/       ← el modelo de datos (no se toca)
```

### 2 · Descargá esta skill

```bash
git clone https://github.com/clikatechia-ctrl/powerbiskills.git
```

O bajá el ZIP desde el botón verde **Code → Download ZIP** y descomprimilo.

### 3 · Copiala a la carpeta de skills

Copiá la carpeta **`powerbi-pbip-builder`** completa dentro de:

| Sistema | Ruta |
|---|---|
| Windows | `C:\Users\<TU_USUARIO>\.claude\skills\` |
| macOS / Linux | `~/.claude/skills/` |

Tiene que quedar así:

```text
.claude/skills/powerbi-pbip-builder/
├── SKILL.md
├── INSTALAR.md
├── references/
└── assets/
```

> Si la carpeta `.claude\skills` no existe, creala.

### 4 · Abrí Claude Code y confirmá que la ve

Abrí una sesión **nueva** en la carpeta de tu proyecto y escribí `/`. Tiene que aparecer
`powerbi-pbip-builder` en la lista.

### 5 · Dejá que instale sus herramientas

La primera vez, Claude va a correr esto solo (pedile permiso o aceptá cuando lo proponga):

```bash
npm install -g @microsoft/powerbi-report-authoring-cli@latest \
               @microsoft/powerbi-desktop-bridge-cli@latest
```

Son los CLIs **oficiales de Microsoft**. Sirven para consultar qué propiedades acepta cada
visual y para validar el informe antes de abrirlo.

**Sin ellos la skill no funciona bien**, porque Claude tendría que adivinar la estructura
JSON — y adivinar es exactamente lo que hace que un visual desaparezca.

### 6 · Pedile lo que querés

```text
Cerrá Power BI Desktop primero.

En Andina.pbip creá una página "Comercial":
- Arriba 4 tarjetas: ventas, unidades, ticket promedio y pedidos
- Al medio: barras de ventas por vendedor y línea de evolución mensual
- Abajo: tabla por vendedor con formato condicional en el % de cumplimiento
Usá solo medidas que ya existan en el modelo.
```

### 7 · Abrí y mirá el resultado

Claude valida automáticamente, pero **validar no es ver**: un visual puede validar perfecto
y no dibujarse.

Abrí el `.pbip`, revisá cada página y contale qué viste. Ahí se corrige rápido.

---

## Cómo trabajar bien con la skill

**Cerrá Power BI Desktop antes de que Claude escriba.** Con el archivo abierto, Desktop
mantiene bloqueos sobre los archivos y puede pisar los cambios al guardar.

**Decile qué medidas tenés.** Claude sólo puede usar medidas y columnas que existan en tu
modelo. Si pedís algo que requiere DAX nuevo, te lo avisa antes de inventarlo.

**Pasale una imagen de referencia.** Un mock-up, una captura o incluso un dibujo mejora
muchísimo el resultado.

**Si algo no se ve, decilo con detalle.** «Falta la tabla de abajo» o «los colores no se
aplicaron» alcanza. Un hueco donde debería haber un visual significa que Power BI lo
descartó al cargar, y eso tiene causas conocidas y documentadas.

**Exportá a PDF si Claude no puede ver tu pantalla.** `Archivo → Exportar → PDF` y pasale el
archivo. Es la forma más confiable de que revise el resultado real.

**Hacé una copia de `MiInforme.Report` antes de empezar.** Si algo queda raro, restaurás la
copia. El modelo de datos no se toca en ningún momento.

---

## Qué hay adentro

```text
powerbi-pbip-builder/
├── SKILL.md                            instrucciones principales y flujo de trabajo
├── INSTALAR.md                         guía de instalación (copia de la de acá)
├── references/
│   ├── anatomia-pbir.md                estructura de carpetas y archivos del PBIP
│   ├── codificacion.md                 cómo se escribe cada tipo de valor
│   ├── visuales.md                     tipos, roles y objetos de formato
│   ├── formato-condicional.md          gradientes y reglas — la parte más delicada
│   ├── layout.md                       mínimos de tamaño y grilla
│   ├── troubleshooting.md              síntoma → causa → solución
│   └── visuales-html-y-temas.md        visuales de AppSource, temas y HTML por DAX
└── assets/
    ├── pbir-lib.js                     librería de helpers lista para usar
    └── generador-ejemplo.js            generador completo de una página, como plantilla
```

La documentación está escrita para que **Claude** la lea, pero es perfectamente legible para
personas: si querés entender cómo funciona PBIR por dentro, `references/` es un buen lugar
para empezar.

---

## Algunas cosas que la skill ya sabe

Son errores que cuestan horas de encontrar porque **no dan ningún mensaje**:

- El formato condicional necesita `data: [{ dataViewWildcard }]` en el selector. Sin eso la
  regla existe, valida bien y Power BI la ignora en silencio.
- Dentro de una expresión `FillRule`, los colores van crudos. Si los volvés a envolver en
  `expr`, el visual entero desaparece del informe.
- `cardVisual` usa el rol `Data`. Con `Values` o `Fields` la tarjeta sale vacía.
- Un slicer desplegable necesita 76 px de alto como mínimo, o se corta.
- Un gráfico de barras necesita ~28 px por categoría, o sale con scrollbar.
- Un solo objeto de formato malformado impide que **todo** el informe abra, no sólo ese
  visual.

---

## Preguntas frecuentes

**¿Modifica mi modelo de datos?**
No. La skill sólo escribe dentro de `MiInforme.Report/`. Las medidas, relaciones y consultas
de Power Query no se tocan.

**¿Funciona con `.pbix`?**
No. El `.pbix` es un binario. Hay que guardar como `.pbip` (paso 1).

**¿Y si ya tengo un informe hecho?**
Funciona igual. Guardalo como `.pbip` y pedile a Claude que agregue páginas o modifique las
existentes.

**¿Necesito saber programar?**
No para usarla. Sí para leer los `assets/`, que son opcionales.

---

## Créditos

Creado a partir del caso **Distribuidora Andina S.A.** del curso
**NEXT GEN DATA ANALYST** de [ClikaTech](https://clikatech.com.ar).

Se apoya en el
[CLI oficial de autoría de informes de Microsoft](https://www.npmjs.com/package/@microsoft/powerbi-report-authoring-cli).

## Licencia

MIT — usala, modificala y compartila libremente.
