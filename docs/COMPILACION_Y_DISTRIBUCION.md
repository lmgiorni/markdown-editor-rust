# Summa Scriptura — Guía Maestra de Compilación, Iconografía y Distribución Multiplataforma

**Autor:** Leandro Giorni  
**Proyecto:** Summa Scriptura (Editor Markdown de Jerarquía y Fluidez Creativa)  
**Entorno técnico:** Tauri 2.0 (Rust) + Frontend Web Satinado (HTML5 / Vanilla CSS / ES6)  
**Fecha:** Octubre 2026  

---

## 1. Enlace de Contribución Voluntaria (Donationware / Mecenazgo Opcional)

### ¿Qué es el modelo Donationware?
Es un modelo ético y tradicional en el desarrollo de software independiente. Significa que:
- La aplicación es **100% gratuita y completa**. No contiene funciones recortadas, marcas de agua, publicidad invasiva, cuentas obligatorias ni fechas de caducidad.
- El usuario tiene libertad plena para utilizarla en proyectos personales o comerciales (según los términos establecidos en la ventana *Acerca de...*).
- Se ofrece un **enlace discreto y voluntario** para que los usuarios, escritores o estudios de desarrollo que obtengan valor real del programa puedan agradecer y apoyar el tiempo dedicado al proyecto mediante una pequeña contribución económica (propina digital).

### ¿A qué plataformas hace referencia?
Las plataformas más consolidadas, seguras y profesionales para este fin son:

1. **Ko-fi** (*Recomendada*): Muy popular entre diseñadores de juegos, escritores y programadores. Permite recibir pagos puntuales ("Invítame un café" de \$3, \$5, etc.) o suscripciones mensuales sin cobrar comisión fija sobre donaciones directas. Se vincula con PayPal o Stripe.
2. **Buy Me a Coffee**: Prácticamente idéntica a Ko-fi, con una interfaz muy visual, sencilla y amigable para el donante.
3. **PayPal.me**: Un enlace directo y personal (ejemplo: `paypal.me/tu_usuario`) donde cualquier persona con cuenta de PayPal o tarjeta de crédito puede enviarte fondos directamente.
4. **Patreon**: Orientada a mecenazgo recurrente si en el futuro decides compartir avances exclusivos, devlogs de tus juegos o paquetes de plantillas de diseño.

### ¿Cómo se integra en la aplicación?
Dentro de la ventana flotante **Acerca de Summa Scriptura**, justo al lado de la información de versión y derechos de autor, se incluye un botón elegante y sutil con un ícono (como una taza de café o un corazón) y el texto:
> *«Invitar un café al autor»* o *«Apoyar el proyecto»*

Al hacer clic, se abre de forma transparente el navegador predeterminado del sistema operativo con la página de tu perfil de contribución.

---

## 2. Sistema de Iconografía de la Aplicación

Para que el sistema operativo muestre el ícono de Summa Scriptura en todos sus estados (escritorio, barra de tareas, explorador de archivos, menú inicio, instalador), se requiere un conjunto de imágenes en resoluciones específicas.

### El "Arte Maestro" (Master Artwork)
No necesitas diseñar manualmente cada uno de los tamaños pequeños. Solo necesitas diseñar **un único archivo maestro**:

- **Nombre sugerido:** `app-icon.png`
- **Formato:** PNG de 32 bits con transparencia (canal alfa).
- **Dimensiones:** **1024 × 1024 píxeles** (o mínimo 512 × 512 píxeles).
- **Margen de seguridad:** Se recomienda dejar entre un **8% y 10% de espacio vacío** alrededor del símbolo principal. Esto garantiza que cuando macOS o Android apliquen máscaras redondeadas o circulares, no corten los bordes de tu ilustración.

---

### Tamaños y Usos en los Sistemas Operativos

Tauri toma tu imagen maestra de 1024×1024 y genera automáticamente la batería de íconos requeridos en la carpeta `src-tauri/icons/`:

| Archivo | Dimensiones | Sistema Operativo | Dónde se muestra |
| :--- | :--- | :--- | :--- |
| `icon.ico` | Contenedor multi-resolución (16, 24, 32, 48, 64, 128, 256 px) | **Windows** | Acceso directo en el Escritorio, Explorador de archivos de Windows y Barra de Tareas. |
| `icon.icns` | Contenedor Apple (16, 32, 64, 128, 256, 512, 1024 px) | **macOS** | Dock de macOS, Finder, Launchpad y diálogo "Acerca de este Mac". |
| `32x32.png` | 32 × 32 px | **Windows / Linux** | Ícono de ventana pequeña y bandeja del sistema (Systray). |
| `128x128.png` | 128 × 128 px | **Linux** | Lanzador de aplicaciones en entornos GNOME, KDE y menús de distribución. |
| `128x128@2x.png` | 256 × 256 px | **macOS / Linux** | Pantallas de alta densidad de píxeles (pantallas Retina / 4K). |
| `icon.png` | 512 × 512 px | **Linux / Web** | Tiendas de aplicaciones de Linux (Flathub / Snapcraft) y paquetes AppImage. |
| `Square...Logo.png` | Múltiples formatos cuadrados | **Windows Store (MSIX)** | Mosaicos del Menú Inicio en Windows 10 y Windows 11. |

---

### Comando para generar todos los íconos automáticamente

Una vez que tengas tu diseño en `app-icon.png` (en la raíz o en una carpeta de recursos), Tauri cuenta con una herramienta oficial que genera todos los archivos anteriores con un solo comando en la terminal:

```bash
# Estando en la carpeta raíz del proyecto:
npx @tauri-apps/cli icon ruta/a/tu/app-icon.png
```
*(Este comando reemplaza de inmediato todos los archivos dentro de `src-tauri/icons/` con los formatos correctos y optimizados).*

---

## 3. Compilación e Instaladores: La Realidad Multiplataforma

### ¿Se debe compilar en cada plataforma por separado?
**Sí.** 
A diferencia de las aplicaciones web puras (que corren dentro de un navegador), Summa Scriptura utiliza **Tauri**, lo que significa que el "motor" del programa está escrito en **Rust nativo** y se enlaza directamente con los componentes profundos de cada sistema operativo:
- En **Windows** utiliza el motor nativo **WebView2** de Microsoft.
- En **macOS** utiliza el motor nativo **WebKit** de Apple.
- En **Linux** utiliza las librerías nativas **WebKitGTK**.

Por este motivo, **una computadora con Windows no puede compilar directamente un archivo ejecutable nativo para macOS (`.dmg`) ni para Linux (`.AppImage`)**, ya que carece de las librerías del kernel de Apple y del compilador de Linux.

---

### Plataformas Objetivo y Tipos de Instaladores

| Plataforma | Arquitectura | Tipos de Instalador que se generan |
| :--- | :--- | :--- |
| **Windows** | 64-bit (x64) y ARM64 | **1. Instalador NSIS (`.exe`):** Asistente tradicional con creación de accesos directos y desinstalador.<br>**2. Paquete MSI (`.msi`):** Instalador estándar corporativo.<br>**3. Ejecutable Portable (`.exe`):** No requiere instalación, listo para abrir con doble clic. |
| **macOS** | Apple Silicon (M1/M2/M3/M4) e Intel (x64) | **1. Imagen de Disco (`.dmg`):** La ventana clásica donde el usuario arrastra Summa Scriptura a la carpeta *Aplicaciones*.<br>**2. Paquete de Aplicación (`.app`):** Paquete autónomo ejecutable. |
| **Linux** | 64-bit (x64) | **1. AppImage:** Ejecutable universal que corre en cualquier distribución (Ubuntu, Fedora, Arch, Mint) con solo darle doble clic.<br>**2. Paquete Debian (`.deb`):** Para instalación nativa en Ubuntu y derivados. |

---

## 4. Métodos para Generar las Compilaciones

Tienes dos formas de encarar la distribución final:

---

### Método A: Compilación Local en tu Computadora (Solo Windows)

Este método te permite generar el instalador y el ejecutable final para Windows en tu propia máquina:

#### 1. Generar el ejecutable optimizado (`.exe` standalone)
Si solo quieres el archivo `.exe` para probarlo o distribuirlo sin instalador:
```powershell
cd d:\mi_editor_markdown
cargo build --release --manifest-path src-tauri/Cargo.toml
```
El ejecutable resultante estará en:
`d:\mi_editor_markdown\src-tauri\target\release\app.exe`

#### 2. Generar el instalador completo de Windows (`.exe` con asistente / `.msi`)
Para generar el instalador que un usuario final descarga e instala:
```powershell
cd d:\mi_editor_markdown
npx @tauri-apps/cli build
```
*(Si no tienes configurado Node en esa consola, puedes usar `cargo tauri build` tras instalar `cargo install tauri-cli`).*

El instalador final se guardará automáticamente en:
`d:\mi_editor_markdown\src-tauri\target\release\bundle\nsis\SummaScriptura_0.1.0_x64-setup.exe`

---

### Método B: Compilación Automatizada en la Nube con GitHub Actions (Recomendado para Multiplataforma)

En la industria de desarrollo de software independiente, nadie compra 3 computadoras distintas para compilar. Se utiliza **GitHub Actions**, un servicio gratuito de GitHub que enciende servidores virtuales en la nube para compilar simultáneamente en los tres sistemas.

#### ¿Cómo funciona?
1. Creas un archivo de configuración en tu proyecto: `.github/workflows/release.yml`.
2. Cada vez que publicas una nueva versión en GitHub (por ejemplo, creando una etiqueta o "Tag" como `v1.0.0`), GitHub automáticamente:
   - Enciende un servidor con **Windows** y compila el instalador `.exe` y `.msi`.
   - Enciende un servidor con **macOS** y compila el instalador `.dmg`.
   - Enciende un servidor con **Linux** y compila el archivo `.AppImage` y `.deb`.
3. Al cabo de 5 a 8 minutos, GitHub publica una página de descarga ("Release") con todos los instaladores listos para que cualquier persona del mundo los descargue.

---

### Plantilla de Automatización GitHub Actions (`release.yml`)

Cuando decidas activar la compilación multiplataforma en tu repositorio de GitHub, solo debes crear el archivo `.github/workflows/release.yml` con el siguiente contenido:

```yaml
name: "Compilación y Publicación de Summa Scriptura"

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - name: Descargar repositorio
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Instalar Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Instalar dependencias de Linux (WebKitGTK)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Compilar instaladores con Tauri
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Summa Scriptura ${{ github.ref_name }}'
          releaseBody: 'Descarga el instalador correspondiente a tu sistema operativo.'
          releaseDraft: false
          prerelease: false
          args: ${{ matrix.args }}
```

---

## 5. Lista de Verificación para el Lanzamiento Oficial (Release Checklist)

Antes de compilar la versión definitiva que entregarás a los usuarios, verifica estos cuatro puntos clave:

1. **Número de Versión:**
   - Asegúrate de actualizar el campo `"version": "1.0.0"` en el archivo `src-tauri/tauri.conf.json`.
   - Verifica que coincida con el número mostrado en la ventana *Acerca de...* de `dist/index.html`.
2. **Íconos Reemplazados:**
   - Haber sustituido la batería de íconos genéricos en `src-tauri/icons/` por el arte oficial de Summa Scriptura.
3. **Nombre del Producto e Identificador:**
   - Confirmar que en `src-tauri/tauri.conf.json` los valores de `"productName": "SummaScriptura"` y `"identifier": "com.summascriptura.editor"` sean los definitivos.
4. **Prueba de Instalación Limpia:**
   - Probar el archivo instalador `.exe` en una computadora limpia o máquina virtual para comprobar que crea los accesos directos, inicia correctamente y desinstala sin dejar residuos indeseados.
