# Contexto del Proyecto: Premium Markdown Editor

## Descripción General
Editor de Markdown moderno y ligero desarrollado en Rust para Windows, enfocado en el alto rendimiento y una experiencia de escritura sin distracciones. Evita tecnologías basadas en web (como Electron) para minimizar el consumo de recursos.

## Stack Tecnológico
- **Lenguaje**: Rust
- **Lenguaje**: Rust / JavaScript / HTML / CSS
- **GUI Framework**: Tauri (WebView)
- **Frontend**: Vanilla JS (ES6+) con CSS nativo y Glassmorphism
- **Backend (Rust)**: Manejo de archivos, parseo avanzado e interacción con el OS

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
- `src-tauri/src/main.rs` y `lib.rs`: Backend en Rust, configuración de Tauri y comandos IPC.
- `dist/`: Frontend de la aplicación.
  - `index.html`: Estructura principal y UI (Layout, Modal).
  - `style.css`: Estilos de la aplicación.
  - `main.js`: Lógica principal del editor y comunicación con Rust.
  - `utils/`: Módulos de lógica (ej. `data-parser.js`, `template-engine.js`).

## Roadmap / Pendientes
- Exportación a PDF y HTML.
- Sistema de plantillas.
- Inserción directa de imágenes locales.
