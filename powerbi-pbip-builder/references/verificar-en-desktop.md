# Verificar de verdad: abrir el PBIP y consultarlo

Validar no es ver, y **ver la ventana abierta no es haber abierto el proyecto**. Power BI
Desktop puede arrancar, mostrarse contento y no haber cargado nada. Esta referencia es el
procedimiento para saber, sin adivinar, si un `.pbip` abre y si sus números cierran.

---

## 1 · La señal de que abrió es el título de la ventana

No alcanza con que el proceso exista. Power BI arranca **igual** cuando no puede abrir el
archivo: se queda en un informe nuevo y vacío, sin cartel de error, sin diálogo, sin log.

```powershell
Get-Process PBIDesktop | Select-Object Id, MainWindowTitle
```

| Título | Qué significa |
|---|---|
| `Sin título - Power BI Desktop` | **No abrió el proyecto.** Está en un informe nuevo. |
| `<Nombre del proyecto>` | Abrió. |

Esperá en bucle hasta 2–3 minutos: un proyecto grande tarda, y el título cambia recién al
final.

```bash
for i in $(seq 1 30); do
  t=$(powershell.exe -NoProfile -Command \
      "(Get-Process PBIDesktop -EA SilentlyContinue | Select -First 1 -Exp MainWindowTitle)")
  case "$t" in *MiProyecto*) echo "ABRIO"; break;; esac
  sleep 5
done
```

> El CLI del puente miente en este punto: `powerbi-desktop open` puede devolver
> `"status": "launched"` y `"bridgeStatus": "connected"` con el proyecto **sin abrir**.
> Reporta que lanzó el proceso y que el puente respondió, no que el archivo cargó.
> Confirmá siempre con el título.

---

## 2 · Si Power BI vino de la Microsoft Store

El CLI del puente no lo encuentra solo: busca en `Program Files` y en `WindowsApps` por
nombre corto, y la instalación de la Store vive en una carpeta con versión y hash.

```powershell
Get-AppxPackage *PowerBI* | Select-Object InstallLocation
# -> C:\Program Files\WindowsApps\Microsoft.MicrosoftPowerBIDesktop_<version>_x64__8wekyb3d8bbwe

$env:PBI_DESKTOP_PATH = "C:\Program Files\WindowsApps\Microsoft.MicrosoftPowerBIDesktop_<version>_x64__8wekyb3d8bbwe\bin\PBIDesktop.exe"
```

Sin esa variable: `DESKTOP_EXE_NOT_FOUND`. Ojo que la ruta cambia con cada actualización.

Alternativa que no necesita la variable: `Start-Process "C:\ruta\Proyecto.pbip"`, que usa
la asociación de archivos de Windows.

---

## 3 · Un comentario `//` en model.tmdl impide abrir el proyecto

**Esta es la que más caro sale, porque el archivo se ve perfecto.**

Un solo comentario `//` en `model.tmdl` o en `relationships.tmdl` y Power BI Desktop se
queda en "Sin título": no abre, no da error, no abre ningún diálogo. Con los comentarios
sacados, el mismo proyecto abre en 25 segundos.

```tmdl
// Cada tabla nueva necesita su línea 'ref table' acá abajo.   ← ESTO ROMPE EL PROYECTO
annotation __PBI_TimeIntelligenceEnabled = 0
```

**Las descripciones `///` sí funcionan** — en tablas, columnas, medidas y expresiones — y
conviene usarlas: son las que después se ven como descripción del campo en Power BI. Lo
que rompe son los comentarios de nivel de modelo.

> Es una trampa especialmente fácil de pisar cuando una plantilla trae comentarios a modo
> de instrucción para quien la complete. Esa guía bien intencionada es justo lo que impide
> abrir el archivo.

Probado en Power BI Desktop 2.156, aislando una variable por vez:

| Situación | ¿Abre? |
|---|---|
| Modelo completo, con un `//` en `model.tmdl` | **No** — "Sin título", sin error |
| El mismo, sin comentarios | **Sí**, 25 s |
| `definition/tables/` vacío | **No** |
| Modelo sano, informe sin páginas (`pageOrder: []`) | Abre, **pero** ver el punto 3 bis |

## 3 bis · Un informe sin páginas abre, pero deja la interfaz inservible

Con el modelo sano y `pageOrder: []`, Power BI abre y carga el modelo —se puede consultar
por DAX— pero la ventana muestra *"No se encontró ActivePageName. El informe no tiene
páginas. Los informes deben tener al menos una página"* y **no deja llegar a la vista de
Modelo**. Para cualquiera que tenga que mirar el resultado en pantalla, eso es tan
bloqueante como no abrir.

**Si estás construyendo sólo el modelo, dejale al informe una página en blanco.** Alcanza
con esto, sin ningún visual:

```json
// pages/<id>/page.json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  "name": "<id>", "displayName": "Modelo", "displayOption": "FitToPage",
  "height": 900, "width": 1280
}
```

y en `pages.json`, ese id en `pageOrder` **y** en `activePageName`.

> Escribí esos JSON **sin BOM**. `Out-File -Encoding utf8` de PowerShell 5.1 lo agrega.
> Usá Python, o `[System.IO.File]::WriteAllText` con `UTF8Encoding($false)`.

> Si escribís JSON del informe, hacelo **sin BOM**. `Out-File -Encoding utf8` de
> PowerShell 5.1 lo agrega. Usá Python, o `[System.IO.File]::WriteAllText` con
> `UTF8Encoding($false)`.

> **Un PBIP recién abierto no tiene datos.** Las tablas existen pero vienen vacías hasta
> que se aprieta *Actualizar*. Un `COUNTROWS` en BLANK no significa que el modelo esté mal;
> significa que todavía no se refrescó. Las tablas **calculadas** (un calendario en DAX) sí
> traen datos, porque no dependen del origen externo: si el calendario tiene filas y las
> demás no, es exactamente eso.

---

## 4 · Consultar el modelo con DAX real

Con el proyecto abierto, Power BI levanta un motor tabular local. Consultarlo es la única
forma de comprobar que las tablas cargaron, que las relaciones filtran y que las medidas
dan los números que tienen que dar.

**Encontrar el puerto:**

```powershell
$pid_ = (Get-Process msmdsrv).Id
Get-NetTCPConnection -OwningProcess $pid_ -State Listen | Select-Object -Exp LocalPort -Unique
```

**Conectarse.** Usá el proveedor **OLE DB MSOLAP**, que ya está registrado en cualquier
máquina con Power BI:

```powershell
$cs = "Provider=MSOLAP;Data Source=localhost:$puerto"
$cn = New-Object System.Data.OleDb.OleDbConnection($cs)
$cn.Open()
# el catalogo es un GUID, no tiene nombre lindo
$bd = $cn.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Catalogs, $null).Rows[0]["CATALOG_NAME"]
$cn.Close()

$cn = New-Object System.Data.OleDb.OleDbConnection("$cs;Initial Catalog=$bd")
$cn.Open()
$cmd = $cn.CreateCommand()
$cmd.CommandText = "EVALUATE ROW(""Ventas"", [Ventas], ""Tickets"", [Tickets])"
$rd = $cmd.ExecuteReader()
```

> **No pierdas tiempo con ADOMD.** El `Microsoft.PowerBI.AdomdClient.dll` que trae la
> instalación de la Store no expone sus tipos con `Add-Type` en PowerShell 5.1: `New-Object`
> falla con "No se encuentra el tipo". OLE DB anda a la primera.

**El error que hay que saber leer:**

```
DAX Evaluate queries work only on databases which have at least one table.
```

Significa que **el proyecto no cargó**. La conexión al motor funciona; lo que está vacío es
el modelo. Volvé al punto 1: casi seguro la ventana dice "Sin título".

**Refrescar sin tocar la pantalla.** No hace falta apretar *Actualizar* a mano: el mismo
canal acepta comandos TMSL, así que se puede refrescar el modelo y consultarlo en la misma
sesión sin robarle el foco a nadie.

```powershell
$cmd.CommandText = '{"refresh":{"type":"full","objects":[{"database":"' + $bd + '"}]}}'
$cmd.ExecuteNonQuery()
```

> **Escribí el `.ps1` con BOM UTF-8** (`encoding="utf-8-sig"` desde Python). PowerShell 5.1
> lee los scripts sin BOM como ANSI, y una consulta DAX que menciona `Dim_Calendario[Año]`
> llega al motor como `A??o` y falla con *"Column 'A??o' cannot be found"*. Parece un error
> del modelo y es del archivo.

**Consultas útiles para el control:**

```dax
// filas por tabla
EVALUATE UNION(
    ROW("Tabla", "Fact_Ventas", "Filas", COUNTROWS(Fact_Ventas)),
    ROW("Tabla", "Dim_Sucursal", "Filas", COUNTROWS(Dim_Sucursal))
)

// numeros de control de un periodo, contra lo que contaste aparte
EVALUATE CALCULATETABLE(
    ROW("Ventas", [Ventas], "Tickets", [Tickets]),
    Dim_Calendario[Año] = 2026, Dim_Calendario[Número de mes] = 7
)
```

---

## 5 · Ver la ventana sin robarle el foco al usuario

Una captura de pantalla completa sirve de poco si Power BI quedó atrás de otra ventana.
Capturá la ventana por handle, con `PrintWindow` y el flag `2`
(`PW_RENDERFULLCONTENT`, el que funciona con WPF):

```csharp
[DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
// ... GetWindowRect, Bitmap, Graphics.GetHdc()
PrintWindow(handle, hdc, 2);
```

Funciona con la ventana en segundo plano y no interrumpe lo que la persona esté haciendo.

---

## 6 · Cuando no abre: bisecar contra un proyecto conocido-bueno

Power BI no deja logs útiles de por qué no abrió. Bisecar es más rápido que buscarlos, pero
sólo si tenés un **banco de pruebas confiable**: un proyecto que sabés que abre.

1. Copiá el proyecto conocido-bueno a `_probe`.
2. Reemplazale **una sola parte** por la tuya (por ejemplo, toda la carpeta
   `.SemanticModel/definition`).
3. Abrí y mirá el título.

Eso separa de una sola pasada si el problema está en el informe o en el modelo. Después
seguí bisecando adentro de la mitad culpable: sacá tablas, dejá una sola, cambiá
`model.tmdl` por el de referencia.

Automatizá el ciclo (armar variante → abrir → leer título) en un script. Cada iteración
tarda 2–3 minutos y a mano se hace insoportable.

**Antes de empezar a bisecar, corré la prueba de control**: abrí el proyecto conocido-bueno
tal cual. Si *ése* tampoco abre, el problema es del entorno y no de tu código.
