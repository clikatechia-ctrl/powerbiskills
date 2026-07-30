# Cómo instalar y usar esta skill

## Qué es

Una **skill de Claude Code**: un paquete de instrucciones que le enseña a Claude a construir
informes de Power BI escribiendo directamente los archivos del proyecto, en vez de arrastrar
visuales a mano.

Con esto instalado, le podés pedir cosas como:

> *"Armá una página «Resumen Comercial» en mi .pbip: tarjetas de ventas y unidades arriba,
> un gráfico de líneas de ventas por mes al medio, y abajo una tabla por vendedor con
> semáforo de cumplimiento."*

y Claude sabe qué archivos tocar, cómo escribirlos y cómo verificar que quedaron bien.

## Requisitos

- **Power BI Desktop**
- **Node.js 20 o superior** — verificá con `node --version`; si falta, instalalo desde
  [nodejs.org](https://nodejs.org)
- Un proyecto guardado como **PBIP**, no como `.pbix`

### Guardar tu informe como PBIP

En Power BI Desktop: `Archivo → Guardar como` → elegí **Proyecto de Power BI (.pbip)**.

Si no aparece la opción: `Archivo → Opciones y configuración → Opciones → Características
de vista previa` → tildá **Guardar como formato de proyecto**, y reiniciá Desktop.

## Instalación

Copiá la carpeta `powerbi-pbip-builder` completa dentro de:

| Sistema | Ruta |
|---|---|
| Windows | `C:\Users\<TU_USUARIO>\.claude\skills\` |
| macOS / Linux | `~/.claude/skills/` |

Debe quedar así:

```text
.claude/skills/powerbi-pbip-builder/
├── SKILL.md
├── INSTALAR.md
├── references/
└── assets/
```

Abrí una sesión nueva de Claude Code y listo. Podés confirmar que la detectó escribiendo
`/` y buscando `powerbi-pbip-builder` en la lista.

## Herramientas que Claude va a instalar

La primera vez, Claude corre esto solo:

```bash
npm install -g @microsoft/powerbi-report-authoring-cli@latest @microsoft/powerbi-desktop-bridge-cli@latest
```

Son los CLIs **oficiales de Microsoft**. Sirven para consultar qué propiedades acepta cada
visual y para validar el informe antes de abrirlo. Sin ellos, Claude tendría que adivinar la
estructura JSON — y adivinar es exactamente lo que hace que un visual desaparezca.

## Cómo trabajar

1. **Cerrá Power BI Desktop** antes de que Claude escriba. Con el archivo abierto, Desktop
   mantiene bloqueos y puede pisar los cambios al guardar.
2. Pedile la página o el cambio que querés, lo más concreto posible.
3. Claude genera, valida y te avisa.
4. **Abrí el `.pbip` y mirá el resultado.** Validar no es ver: un visual puede validar
   perfecto y no dibujarse.
5. Contale qué viste. Ahí se corrige rápido.

## Consejos que ahorran vueltas

**Decí qué medidas tenés.** Claude sólo puede usar medidas y columnas que existan en tu
modelo. Si pedís algo que requiere DAX nuevo, te lo va a avisar antes de inventarlo.

**Pasale una imagen de referencia.** Un mock-up, una captura o un dibujo mejora muchísimo el
resultado.

**Si algo no se ve, decilo con detalle.** «Falta la tabla de abajo» o «los colores no se
aplicaron» son pistas suficientes para que lo resuelva. Un hueco donde debería haber un
visual significa que Power BI lo descartó al cargar, y eso tiene causas conocidas.

**Exportá a PDF si Claude no puede ver tu pantalla.** `Archivo → Exportar → PDF` y pasale el
archivo. Es la forma más confiable de que revise el resultado real.

## Si algo sale mal

Hacé una copia de la carpeta `<Nombre>.Report` antes de empezar. Si algo queda raro,
restaurás la copia y listo — el modelo de datos no se toca en ningún momento.

El archivo `references/troubleshooting.md` tiene una tabla de síntoma → causa → solución
para los problemas más comunes.
