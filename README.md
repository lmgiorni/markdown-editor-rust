# Summa Scriptura ✍️

Un entorno de redacción moderno, ultra-ligero y de alto rendimiento en Rust, diseñado especialmente para creadores de contenido que buscan una escritura fluida y libre de distracciones, con la capacidad única de traducir texto jerárquico directamente a datos estructurados (JSON/XML) en tiempo real.

![Estado del Proyecto](https://img.shields.io/badge/Status-In--Development-yellow)
![Plataforma](https://img.shields.io/badge/Platform-Windows-blue)
![Lenguaje](https://img.shields.io/badge/Language-Rust-orange)

## 🌟 Descripción General

Este proyecto nace de la necesidad de crear una herramienta de escritura y forjado de datos que sea **ágil, eficiente y compilada**, evitando el consumo excesivo de recursos común en editores basados en tecnologías web (como Electron). Su enfoque principal es proporcionar un entorno de alta fidelidad donde puedas concentrarte en la creación del contenido y el lore, mientras dispones de una visualización en tiempo real elegante, robusta, con tipografía premium y con un visualizador interactivo de datos estructurados.

## ✨ Características Principales

### 🛠️ Editor y Visualización Sincronizada
- **Vista Dividida (Split View)**: Panel de escritura a la izquierda y renderizado de lectura a la derecha.
- **Sincronización Inteligente de Scrolls**: Desplazamiento coordinado por porcentaje bidireccional y exacto. Si te desplazas en un panel, el otro acompaña de forma proporcional según la extensión del documento.
- **Resaltado y Foco de Selección Quirúrgico**:
  - Al seleccionar texto en el editor, el visor resalta de forma exacta los mismos caracteres, ocultando las marcas visuales de Markdown (como asteriscos de negrita o cursiva) y centrando el texto en pantalla.
  - Al hacer clic en un fragmento de lectura en el visor, el cursor del editor se posiciona y se desplaza automáticamente a esa sección.
- **Renderizado en Tiempo Real**: Actualizaciones inmediatas que incluyen soporte avanzado para:
  - **Tablas Proporcionales**: Celdas elegantes que se expanden automáticamente para aprovechar todo el ancho disponible del panel.
  - **Fórmulas Matemáticas**: Renderizado centrado y con estilo Serif para bloques matemáticos delimitados por `$$`.

### 📐 Modos de Interfaz (Layouts)
- **Split View**: Modo estándar para edición y revisión simultánea.
- **Preview Only (Read)**: Oculta completamente la zona de edición para ofrecer una lectura limpia y fluida.
- **Focus Mode**: Elimina la vista previa para maximizar la concentración en la redacción creativa.

### 💻 Integración Nativa
- **Gestión de Archivos**: Soporte para crear (`Nuevo`), `Abrir` y `Guardar` archivos `.md` directamente desde el explorador del sistema.
- **Barra de Título Dinámica**: Muestra el nombre actual del archivo editable y un indicador visual (`*`) cuando existen cambios pendientes de guardar.
- **Atajos de Teclado**:
  - `Ctrl + N`: Crear un nuevo documento.
  - `Ctrl + O`: Abrir un archivo existente.
  - `Ctrl + S`: Guardar los cambios actuales.

### 📊 Panel de Estadísticas
- Muestra el conteo de palabras, caracteres (con y sin espacios) y enlaces en un panel superior plegable y en una ventana emergente flotante independiente.

## 🎨 Diseño y Estructura Visual

La interfaz ha sido estructurada de izquierda a derecha de forma lógica y balanceada:
1. **Acciones de Archivo**: Botones rápidos de `Nuevo`, `Abrir` y `Guardar` en el extremo izquierdo.
2. **Identidad**: Nombre del archivo editable en el centro.
3. **Modos de Vista**: Botones de `Split`, `Focus` y `Preview` alineados a la derecha de la barra divisoria central.
4. **Herramientas de Apoyo**: Accesos rápidos a comandos de Markdown (`MD`), estadísticas (`Stats`) y configuración (`Config`) en el margen derecho.

### Tipografía Premium y Estabilidad
- El editor implementa un sistema dinámico de fuentes del sistema de Windows (Consolas, Georgia, Arial, Segoe UI).
- Sistema de prevención de fallas (*fallback*): Si alguna tipografía premium no está instalada, el editor utiliza fuentes seguras de fábrica, asegurando un inicio de aplicación 100% estable.

## 🚀 Stack Tecnológico

- **Backend**: [Rust](https://www.rust-lang.org/) (Garantiza seguridad de memoria y velocidad de ejecución).
- **Framework de Aplicación**: [Tauri](https://tauri.app/) (Aplicaciones de escritorio ligeras y nativas usando tecnologías web).
- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript (ES6+).
- **Procesamiento de Texto**: `pulldown-cmark` (Parser de Markdown eficiente conforme a los estándares en Rust) e integraciones personalizadas en JS.
## 🛠️ Instalación y Ejecución

### Requisitos previos
Tener instalado el compilador de Rust (`rustc`) y su gestor de paquetes (`cargo`).

### Pasos para ejecutar
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/lmgiorni/markdown-editor-rust.git
   ```
2. Acceder a la carpeta del proyecto:
   ```bash
   cd markdown-editor-rust
   ```
3. Ejecutar en modo desarrollo:
   ```bash
   cargo run
   ```

## 🗺️ Hoja de Ruta (Roadmap)

- [x] Implementación de soporte para tablas proporcionales elegantes.
- [x] Soporte para fórmulas matemáticas.
- [ ] Exportación directa a PDF y HTML.
- [ ] Sistema de plantillas predefinidas de escritura.
- [ ] Soporte para inserción directa de imágenes locales.

---
*Desarrollado con un enfoque en la eficiencia, la sensatez técnica y el diseño centrado en el usuario.*
