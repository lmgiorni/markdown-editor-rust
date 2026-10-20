# Summa Scriptura: Guía del Ecosistema de Temas Visuales

Este documento explica de forma detallada la arquitectura, estructura y lógica operativa del motor de **Temas Visuales** y de su editor en vivo integrado, el **Theme Playground**.

---

## 🎨 1. ¿Cómo funcionan los Temas Visuales?

La aplicación Summa Scriptura utiliza una arquitectura híbrida donde los archivos de configuración de apariencia se definen directamente en formato **Markdown**. Esto permite que los archivos de temas sean legibles, fáciles de compartir y completamente editables con el propio programa.

### A. Estructura de un Archivo de Tema (`.md`)
Cada tema visual es un archivo Markdown estructurado que se almacena en el directorio local de la aplicación: `<app_data_dir>/assets/themes/Nombre-Tema.md`.

El archivo debe seguir la siguiente estructura de nodos jerárquicos:

```markdown
# Tema `Esquema de colores [Nombre] para la interfaz`
	**themeName**: [Nombre del Tema]

	# colors `Parámetros de estilo estructurados`
		
		## Interfaz General `Fondo, bordes y acento de la app`
			**bg-app**: #0b0b0e
			**bg-panel**: #111116
			**bg-toolbar**: #0c0e16
			**bg-sidebar**: #111116
			**bg-modal**: rgba(23, 28, 42, 0.95)
			**bg-input**: rgba(255, 255, 255, 0.02)
			**bg-code**: #161b29
			**border-subtle**: rgba(255, 255, 255, 0.08)
			**border-focus**: rgba(188, 19, 254, 0.45)
			**accent**: #bc13fe
			**accent-color**: #bc13fe
			**accent-hover**: #d946ef

		## Textos de Edición `Colores para la interfaz del editor`
			**text-main**: #f1f5f9
			**text-muted**: #64748b
			**text-editor**: #cbd5e1

		## Visor de Lectura `Colores aplicables en el modo Read`
			**bg-reader**: #0b0b0e
			**text-reader**: #cbd5e1
			**text-strong**: #f1f5f9
			**text-code-inline**: #f472b6
			**bg-blockquote**: rgba(139, 92, 246, 0.03)
			**bg-table-header**: rgba(255, 255, 255, 0.02)
			**bg-table-zebra**: rgba(255, 255, 255, 0.01)

		## Badges de Datos `Insignias de tipo de dato en modo estructurado`
			**bg-badge-int**: rgba(16, 185, 129, 0.1)
			**text-badge-int**: #34d399
			...
```

### B. El Motor de Interpretación (JS)
Cuando seleccionas un tema en el panel de configuración, se ejecuta la función `cargarYAplicarTema(filePath)`:

1. **Lectura Nativa:** Rust lee el archivo `.md` de la carpeta de temas de la aplicación a través del comando `leer_tema`.
2. **Conversión a Datos:** El texto se procesa mediante `parseMarkdownToJSON()`, traduciendo la jerarquía de títulos e indentaciones en un objeto de datos de Javascript.
3. **Aplanamiento Recursivo:** El motor busca el nodo `# colors` y ejecuta un algoritmo recursivo (`extractLeafs`) que localiza todas las claves tipadas (las propiedades en negrita) y sus correspondientes valores de color.
4. **Inyección en el CSS Global:** Las variables extraídas se inyectan en tiempo de ejecución en el elemento raíz del DOM (`:root` / `document.documentElement`):
   ```javascript
   Object.entries(extractedColors).forEach(([variable, valor]) => {
     root.style.setProperty(`--${variable}`, valor);
   });
   ```
5. **Persistencia:** Se guarda el nombre del tema activo en `localStorage` (bajo la clave `md-theme`) para mantenerlo configurado en el próximo inicio del programa.

---

## 🛠️ 2. El Editor de Temas: Theme Playground

El **Theme Playground** es un entorno interactivo y flotante diseñado para editar los temas de forma ágil sin necesidad de salir del editor principal.

```
 [Editor de Texto]               [Theme Playground (Flotante)]
    │                                 │
    ├── (Escribe / Mueve Cursor) ─────┼──> Sincroniza y resalta el specimen
    │                                 │    correspondiente al color editado.
    │                                 │
    └── (Guardar tema en disco) <─────└──> Previsualiza cambios locales en 
                                           caliente y aplica el tema global.
```

### A. ¿Cómo se activa?
Al abrir el panel de configuración (`#modal-config`) y pulsar el botón del **lápiz (✏️)** al lado del selector de temas:
1. El programa lee el archivo `.md` del tema y carga su contenido completo en el editor principal (`#editor`), convirtiendo el tema en el archivo activo.
2. El sistema actualiza el estado de archivo abierto (`appState.filePath` y `appState.fileName`) al tema actual.
3. Se cierra el panel de configuración y se abre la ventana flotante del **Theme Playground** (`#modal-theme-playground`).

### B. Lógica del Entorno Flotante
*   **Diseño Interactivo:** Es una ventana con transparencia (glassmorphism) que se superpone a la vista dividida. El usuario puede arrastrarla desde su cabecera o redimensionar su tamaño desde la esquina inferior derecha para no entorpecer el espacio del editor.
*   **Muestrario de Specimen (Elementos de Prueba):** El panel contiene maquetas a escala de todos los elementos representativos de la interfaz de lectura: párrafos ordinarios, palabras destacadas en negrita, bloques de código, tablas y badges de tipos de datos estructurados (enteros, booleanos, flotantes).

### C. Características de Automatización del Playground

#### 1. Previsualización de Cambios en Caliente (Borrador Local)
Cada vez que el usuario escribe o modifica una línea de color en el editor, el evento de teclado dispara de manera inmediata la función `refrescarPlaygroundLocal()`.
*   Esta función toma el texto actual del editor, extrae los colores y los aplica **exclusivamente** sobre el contenedor flotante del Playground (`playgroundBox.style.setProperty(...)`).
*   Esto permite ver los resultados de los cambios cromáticos en las maquetas specimen en tiempo real antes de decidir aplicarlo globalmente al resto del editor.

#### 2. Inteligencia de Foco Contextual (Caret Sincronización)
Cuando haces clic o mueves el cursor del texto por las líneas del tema, el sistema ejecuta la función `actualizarFocoContextualPlayground()`:
*   Analiza el texto de la línea actual. Si detecta la presencia de una variable cromática (por ejemplo, `**bg-badge-int**`), asocia dicha variable con su maqueta specimen correspondiente en la ventana flotante (en este caso, `#specimen-badge-int`).
*   Añade de forma automática un efecto de pulsación de luz (`.playground-highlight-pulse`) al specimen y se desplaza mediante scroll dinámico para centrarlo en la ventana de previsualización. Esto te permite saber exactamente qué elemento visual estás configurando al posicionar el cursor sobre su línea.

### D. Aplicación y Guardado de Cambios
*   **Aplicación Temporal Global:** El botón **"Aplicar al Sistema"** dentro de la ventana de Playground lee el texto editado en el editor y actualiza las variables CSS de toda la aplicación en caliente, actualizando instantáneamente los paneles laterales, barras de herramientas y menús contextuales.
*   **Guardar Cambios:** Como el tema se encuentra cargado en el editor de texto principal, puedes presionar `Ctrl + S` o el botón de guardar de la barra de herramientas principal. Rust guardará los cambios modificando directamente el archivo `.md` del tema en el disco.
*   **Seguro de Borradores Temporales (LocalStorage):** 
    *   Como protección ante cierres inesperados o accidentales de la aplicación, el sistema almacena de forma automática un borrador local del texto del tema en tiempo real (`md-theme-draft-text` y `md-theme-draft-path`) en el `localStorage` del navegador.
    *   Si el usuario cierra la aplicación sin guardar el archivo en disco, la próxima vez que abra dicho tema para edición desde la configuración, aparecerá un mensaje de confirmación preguntando si desea recuperar el borrador no guardado.
    *   Si se acepta la recuperación, el texto se restaura en el editor y el archivo se marca inmediatamente como "modificado" (`*`) para recordar al usuario que tiene cambios pendientes de guardar en disco.
    *   Una vez que el usuario guarda los cambios de forma exitosa en el disco (mediante el botón de guardar o guardar como), el borrador temporal se limpia automáticamente del almacenamiento local.
