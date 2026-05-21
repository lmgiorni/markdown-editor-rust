# Contexto del Proyecto: Premium Markdown Editor

## Descripción General
Editor de Markdown moderno y ligero desarrollado en Rust para Windows, enfocado en el alto rendimiento y una experiencia de escritura sin distracciones. Evita tecnologías basadas en web (como Electron) para minimizar el consumo de recursos.

## Stack Tecnológico
- **Lenguaje**: Rust
- **GUI Framework**: `egui` / `eframe` (Immediate Mode GUI)
- **Markdown Parser**: `pulldown-cmark`
- **Diálogos de Archivo**: `rfd`
- **Imágenes**: `image`

## Características Implementadas
- **Vistas de Interfaz**: 
  - `Split View`: Editor y previsualización lado a lado.
  - `Focus Mode`: Solo editor.
  - `Preview Only`: Solo lectura.
- **Sincronización**: Scroll bidireccional proporcional y resaltado exacto de caracteres entre el editor y el visor.
- **Renderizado Avanzado**: Soporte para tablas proporcionales y fórmulas matemáticas ($\text{LaTeX}$).
- **Gestión de Archivos**: Operaciones básicas (Nuevo, Abrir, Guardar) con indicador de cambios no guardados (`*`).
- **Estadísticas**: Conteo de palabras, caracteres y enlaces.

## Estructura del Código
- `src/main.rs`: Punto de entrada y bucle principal de la aplicación.
- `src/app.rs`: Estado global (`MarkdownApp`) y configuración de fuentes.
- `src/markdown_renderer.rs`: Lógica de conversión de Markdown a elementos visuales.
- `src/ui/`: Componentes de interfaz:
  - `toolbar_ui.rs`: Barra de herramientas superior.
  - `panels_ui.rs`: Paneles laterales, estadísticas y configuración.
  - `editor_preview_ui.rs`: Panel central de edición y previsualización.

## Roadmap / Pendientes
- Exportación a PDF y HTML.
- Sistema de plantillas.
- Inserción directa de imágenes locales.
