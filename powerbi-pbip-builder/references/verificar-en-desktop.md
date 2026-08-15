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

## 3 · Lo que impide abrir es un modelo SIN TABLAS

Un proyecto cuyo `definition/tables/` está vacío **no abre**, y falla en el modo silencioso
del punto 1: Power BI queda en "Sin título", sin error ni diálogo. El síntoma es idéntico
al de un TMDL inválido, y por eso confunde.

Probado en Power BI Desktop 2.156:

| Modelo | Informe | ¿Abre? |
|---|---|---|
| Con tablas | sin ninguna página (`pageOrder: []`) | **Sí.** Carga el modelo y avisa que el informe no tiene páginas |
| `tables/` vacío | con una página | **No.** Queda en "Sin título" |
| `tables/` vacío | sin páginas | **No** |

**Consecuencias prácticas:**

- Una **plantilla PBIP vacía** (andamiaje sin tablas) no abre, y eso es *esperable*: le
  falta el modelo. No pierdas tiempo buscándole la falla al informe.
- Para comprobar un modelo recién escrito **no hace falta agregarle páginas al informe**.
  Escribí las tablas y abrí: si el modelo está sano, abre igual y ya podés consultarlo por
  DAX (punto 4). El aviso de "sin páginas" es molesto, no bloqueante.
- Al informe **igual** ponele al menos una página antes de entregarlo.

> Si escribís JSON del informe, hacelo **sin BOM**. `Out-File -Encoding utf8` de
> PowerShell 5.1 lo agrega. Usá Python, o `[System.IO.File]::WriteAllText` con
> `UTF8Encoding($false)`.

> **Un PBIP recién abierto no tiene datos.** Las tablas existen pero vienen vacías hasta
> que se aprieta *Actualizar*. Un `COUNTROWS` en BLANK no significa que el modelo esté mal;
> significa que todavía no se refrescó.

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
