# Summa Scriptura - Arquitectura del Sistema

## Descripción General

Summa Scriptura es un editor de Markdown moderno y ligero desarrollado en Rust para Windows, enfocado en alto rendimiento y experiencia de escritura sin distracciones. Evita tecnologías basadas en web (como Electron) para minimizar el consumo de recursos.

## Stack Tecnológico

- **Backend**: Rust con Tauri v2
- **Frontend**: HTML5, CSS3 modular moderno y JavaScript vanilla estructurado en módulos ES
- **Motor matemático**: KaTeX integrado localmente (funcionamiento 100% offline)
- **Procesamiento de texto**: Motor reactivo propio con soporte para extensiones Markdown de autoría

## Estructura del Código

### Backend (src-tauri/)
El backend está implementado en Rust usando Tauri v2, proporcionando una capa de comunicación entre la interfaz gráfica y el sistema operativo. Los principales componentes son:

- `src-tauri/src/main.rs`: Punto de entrada principal
- `src-tauri/src/lib.rs`: Definición de comandos Tauri y lógica de negocio
- `src-tauri/tauri.conf.json`: Configuración de la aplicación Tauri

### Frontend (dist/)
El frontend está estructurado en una arquitectura modular:

#### Archivos Principales
- `dist/main.js`: Orquestador principal ligero. Configura el estado global, inyecta dependencias e inicializa los motores.
- `dist/style.css`: Hoja principal que importa de forma ordenada todos los submódulos CSS.

#### Módulos JavaScript (dist/modules/)
- `file-manager.js`: Gestión de archivos (Abrir, Guardar, Guardar Como, Drag & Drop, Auto-recuperación y Bloque de Control de Documento con versionado secuencial)
- `editor-engine.js`: Manejo del área de escritura, atajos de formato, sangría automática por párrafo e indentación con tabulador
- `reader-engine.js`: Renderizado de Markdown en tiempo real, integración KaTeX para fórmulas matemáticas y sincronización bidireccional de scroll con el editor
- `structured-editor.js`: Modo Estructurado interactivo (renderizado en árbol navegable, JSON, YAML y XML)
- `export-manager.js`: Exportación a HTML autónomo, PDF para impresión, plantillas con variables dinámicas y EPUB
- `theme-manager.js`: Detección, carga, edición y previsualización de temas visuales mediante el Theme Playground
- `ui-dialogs.js`: Ventanas modales (Acerca de, Configuración, Estadísticas de texto, Biblioteca lateral de Componentes y Menú Contextual del visor)

#### Utilidades JavaScript (dist/utils/)
- `color-picker.js`: Selector de color profesional con cálculo de armonías (complementario, análogo, etc.) y guardado de paletas en disco
- `i18n.js`: Sistema de traducción dinámico y multi-idioma (Español, Inglés, Latín y soporte para nuevos idiomas cargados desde assets/languages/)
- `data-parser.js`: Parser bidireccional de Markdown a estructuras de datos JSON/YAML/XML
- `template-engine.js`: Escaneo y reemplazo de variables de plantillas, respetando sangrías

#### Estilos CSS (dist/styles/)
- `base.css`: Reset, variables tipográficas y bases globales.
- `layout.css`: Estructura general de rejilla, paneles divididos y barras de herramientas.
- `editor.css`: Área de escritura y cursores de scroll.
- `reader.css`: Motor de lectura, estilos tipográficos, KaTeX y notas al pie.
- `modals.css`: Ventanas emergentes, diálogos de confirmación, atajos y biblioteca lateral.
- `structured.css`: Vistas de árbol, jerarquías de contenido y menús contextuales.
- `playground.css`: Entorno del Taller de Temas Visuales (Theme Playground).
- `color-picker.css`: Selector cromático flotante con paletas y armonías.

## Componentes Principales

### 1. Gestión de Archivos
- Operaciones básicas (Nuevo, Abrir, Guardar)
- Indicador de cambios no guardados (`*`)
- Versionado automático con un clic (`_V_001`, `_V_002`...)
- Historial de documentos recientes
- Arrastrar y soltar nativo (Drag & Drop)

### 2. Editor de Markdown
- Sincronización milimétrica de desplazamiento entre editor y visor
- Fórmulas matemáticas completas con KaTeX
- Bloques de Alerta (Callouts)
- Elementos avanzados de publicación (notas al pie, tablas proporcionales, etc.)
- Atajos modulares y ventanas flotantes desacoplables

### 3. Modo Estructurado
- Compilador de datos en vivo
- Visualizador en árbol
- Salida simultánea en JSON, XML y YAML

### 4. Biblioteca Modular
- Panel lateral de biblioteca con módulos reutilizables
- Inyección con variables dinámicas
- Guardar como plantilla

### 5. Exportación Multi-Formato
- HTML: páginas limpias y autocontenidas
- PDF: documentos listos para impresión
- EPUB: libros electrónicos completos

### 6. Personalización Satinada
- Theme Playground con ajuste de paleta de color interactivo
- Configuración tipográfica triple (Editor, Visor, Árbol estructurado)
- Internacionalización dinámica (Español, English, Lingua Latina)

## Interacción entre Componentes

1. **Flujo Principal**: 
   - El archivo `main.js` inicializa todos los módulos
   - Los módulos se comunican entre sí a través de funciones compartidas y el estado global
   - Las interacciones del usuario son capturadas por el motor de editor y procesadas por los módulos correspondientes

2. **Comunicación Backend-Frontend**:
   - Se utiliza Tauri para la comunicación IPC (Inter-Process Communication)
   - Los comandos Rust se invocan desde JavaScript usando `window.__TAURI__.core.invoke`
   - El backend maneja operaciones de archivo, versionado y exportación

3. **Sincronización de Estado**:
   - El estado global (`appState`) se mantiene en memoria y persiste en localStorage
   - Los cambios se propagan entre componentes a través de funciones compartidas
   - El sistema de historial permite deshacer/rehacer acciones

## Características Distintivas

- **Entorno 100% offline**: Sin dependencias externas para funcionamiento básico
- **Rendimiento nativo y ligereza**: Construido sobre Rust y Tauri 2.0
- **Personalización extensa**: Temas, tipografía y configuración de idioma
- **Versionado automático**: Generación de copias de versión incrementales
- **Sangría clásica y tab-to-indent**: Capacidad de sangrar la primera línea de cada párrafo
- **Taller de temas visuales**: Selector cromático interactivo con generación de armonías