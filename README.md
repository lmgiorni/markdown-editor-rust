# Premium Markdown Editor ✍️

Un editor de Markdown moderno, ligero y de alto rendimiento diseñado para ofrecer una experiencia de escritura libre de distracciones con integración nativa del sistema operativo.

![Estado del Proyecto](https://img.shields.io/badge/Status-In--Development-yellow)
![Plataforma](https://img.shields.io/badge/Platform-Multiplatform-blue)
![Lenguaje](https://img.shields.io/badge/Language-Rust-orange)

## 🌟 Descripción General

Este proyecto nace de la necesidad de crear una herramienta de escritura que sea **ágil, eficiente y compilada**, evitando el consumo excesivo de recursos común en editores basados en tecnologías web (como Electron). El enfoque principal es proporcionar un entorno donde el usuario pueda concentrarse en el contenido mientras dispone de una vista previa profesional y fluida.

## ✨ Características Principales

### 🛠️ Editor y Visualización
- **Vista Dividida (Split-screen)**: Escritura a la izquierda y renderizado instantáneo a la derecha.
- **Sincronización Inteligente**: El desplazamiento del editor se sincroniza automáticamente con la vista previa.
- **Renderizado en Tiempo Real**: Actualizaciones inmediatas sin necesidad de guardar el archivo para ver los cambios.

### 📐 Modos de Interfaz (Layouts)
- **Split View**: Modo estándar para edición y revisión simultánea.
- **Preview Only**: Ideal para lectura limpia, ocultando completamente la zona de edición.
- **Focus Mode**: Elimina la vista previa para maximizar la concentración en el proceso creativo.

### 💻 Integración Nativa
- **Gestión de Archivos**: Soporte nativo para abrir y guardar archivos `.md` directamente desde el disco local.
- **Indicadores de Estado**: La barra de título muestra el nombre del archivo actual y un indicador visual (`*`) cuando existen cambios pendientes de guardar.
- **Atajos de Teclado**: Implementación de comandos estándar:
  - `Ctrl/Cmd + N`: Nuevo archivo.
  - `Ctrl/Cmd + O`: Abrir archivo.
  - `Ctrl/Cmd + S`: Guardar cambios.

## 🎨 Diseño y Estética

La aplicación ha sido concebida bajo estándares de diseño **Premium**:
- **Look & Feel Nativo**: Interfaz limpia con implementaciones de *glassmorphism* y barras laterales organizadas.
- **Temas Adaptativos**: Soporte completo para modo Claro y Oscuro, sincronizándose automáticamente con la configuración del sistema operativo.
- **Tipografía Curada**: Sistema de selección de fuentes optimizadas tanto para el código fuente (Mono) como para la lectura final (Sans/Serif).

## 🚀 Stack Tecnológico

Para garantizar que el software sea liviano y eficiente, se han seleccionado las siguientes tecnologías:
- **Lenguaje**: [Rust](https://www.rust-lang.org/) (Garantiza seguridad de memoria y velocidad de ejecución).
- **Interfaz Gráfica**: `egui` / `eframe` (Framework inmediato y ligero para aplicaciones multiplataforma).
- **Procesamiento MD**: `pulldown-cmark` (Parser de Markdown eficiente y conforme a los estándares).

## 🛠️ Instalación y Ejecución

### Requisitos previos
Tener instalado el compilador de Rust (`rustc`) y su gestor de paquetes (`cargo`).

### Pasos para ejecutar
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/markdown-editor.git
   ```
2. Acceder a la carpeta del proyecto:
   ```bash
   cd markdown-editor
   ```
3. Ejecutar en modo desarrollo:
   ```bash
   cargo run --release
   ```

## 🗺️ Hoja de Ruta (Roadmap)
- [ ] Implementación de soporte para tablas complejas.
- [ ] Exportación a PDF y HTML.
- [ ] Soporte para fórmulas matemáticas mediante LaTeX/KaTeX.
- [ ] Sistema de plantillas predefinidas.

---
*Desarrollado con un enfoque en la eficiencia, la sensatez técnica y el diseño centrado en el usuario.*
