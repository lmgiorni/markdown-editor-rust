# Especificación Técnica: Sistema de Localización Modular (i18n)

Este documento detalla la arquitectura, el diseño y la implementación técnica del motor de localización modular (i18n) en la aplicación **Summa Scriptura**.

---

## 1. Filosofía de Diseño

El sistema de localización de Summa Scriptura fue diseñado bajo las siguientes premisas:
*   **Modularidad y Desacoplamiento**: Los idiomas existen como archivos JSON independientes en disco (`assets/languages/`), idéntico al modelo de Temas y Componentes.
*   **Autonomía del Usuario**: Cualquier usuario o traductor puede crear, editar o corregir idiomas con un simple bloc de notas sin tocar el código fuente del programa.
*   **Detección Dinámica en Runtime**: Al arrancar, el motor escanea los archivos disponibles y puebla el selector de idiomas de la ventana de configuración automáticamente.
*   **Sin Parpadeos (Zero-Flicker)**: El cambio de idioma se realiza en caliente en milisegundos, actualizando los elementos del DOM de forma selectiva.
*   **Persistencia**: El idioma seleccionado se conserva entre sesiones mediante `localStorage`.
*   **Acceso Directo**: Se incluye un botón de acceso directo en la configuración para abrir la carpeta de idiomas en el Explorador de Windows.

---

## 2. Componentes del Sistema

```
[assets/languages/*.json] ──> [Rust / Tauri (listar_idiomas, leer_idioma)]
                                          │
                                          ▼
                                [i18n.js & main.js] ──> [index.html (Configuración Dinámica)]
                                          │
                                          └──> [Vista de Lectura / Modo Estructurado / Sidebar]
```

### 2.1. Archivos de Idioma en Disco (`assets/languages/`)
Cada idioma es un archivo `.json` independiente nombrado con su código (ej. `es.json`, `en.json`, `la.json`).
Estructura de metadatos:
```json
{
  "meta_language_code": "es",
  "meta_language_name": "Español",
  "title_new": "Crear Nuevo Documento",
  ...
}
```

### 2.2. Motor Nativo (Rust / Tauri)
Ubicación: `src-tauri/src/lib.rs`
*   `listar_idiomas`: Escanea `assets/languages/`, extrae el campo `meta_language_name` y retorna la lista ordenada.
*   `leer_idioma`: Lee el contenido en texto del archivo seleccionado.
*   `abrir_carpeta_idiomas`: Abre la carpeta en el Explorador de archivos del sistema operativo.

### 2.3. Gestor de Localización Frontend (`i18n.js`)
Ubicación: `dist/utils/i18n.js`
*   `translations`: Objeto con diccionarios en memoria y fallback por si se ejecuta en navegador web o antes de la lectura asíncrona.
*   `listarIdiomasDisponibles`: Invoca `listar_idiomas` de Tauri.
*   `cargarIdiomaDesdeDisco`: Carga el archivo `.json`, lo fusiona en memoria y actualiza el diccionario activo.

### 2.4. La Interfaz de Selección (`index.html`)
Ubicación: `dist/index.html`
*   El selector `<select id="select-language">` se rellena dinámicamente con los idiomas detectados.
*   Botón `<button id="btn-open-languages-dir">📂</button>` para abrir la carpeta directamente en el Explorador.

---

## 3. Flujo Lógico y Ciclo de Vida

1. **Inicialización al Arranque:**
   - Se consulta `localStorage` para obtener el último idioma elegido (por defecto `es`).
   - `inicializarIdiomas()` obtiene la lista de archivos mediante `listar_idiomas` y genera las opciones del menú.
   - Lee el archivo `.json` correspondiente desde disco y ejecuta `actualizarTextosInterfaz(lang)` para traducir toda la interfaz.
2. **Cambio de Idioma:**
   - Al seleccionar otra opción en el desplegable, `cambiarIdioma(lang)` lee el archivo `.json` asociado desde disco, actualiza el estado, guarda en `localStorage` y refresca inmediatamente la pantalla.

---

## 4. Cómo Añadir o Modificar un Idioma

1. En la ventana de **Configuración**, haz clic en el botón **📂** al lado del selector de idiomas para abrir la carpeta.
2. Para corregir una frase: Abre el archivo correspondiente (ej. `es.json`) en cualquier editor de texto, cambia el valor deseado y guarda el archivo.
3. Para crear un idioma nuevo (ej. Francés):
   - Duplica `es.json` y renómbralo a `fr.json`.
   - Cambia `"meta_language_code": "fr"` y `"meta_language_name": "Français"`.
   - Traduce los textos que desees.
   - Al reiniciar Summa Scriptura, "Français" aparecerá automáticamente en la lista de idiomas disponibles.
