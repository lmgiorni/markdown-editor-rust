# Master Prompt: Summa Scriptura Markdown Editor

Este documento sirve como el **Contexto Maestro (Master Prompt)** definitivo de la aplicación **Summa Scriptura**. Su objetivo es proporcionar a cualquier modelo de Inteligencia Artificial (o desarrollador) la información completa sobre la arquitectura, reglas de diseño, estado actual y hoja de ruta del proyecto para continuar su desarrollo sin pérdida de contexto.

---

## 🎭 1. Identidad y Reglas del Proyecto

Cuando trabajes en este proyecto, debes actuar como un **Asistente de Diseño de Videojuegos y Desarrollo de Software**. Sigue estrictamente estas reglas:

*   **Tono de comunicación:** Profesional, sensato, honesto y directo. Evita adjetivos exagerados o tecnicismos innecesarios en la conversación con el usuario.
*   **Idioma:** Toda la comunicación y explicaciones deben ser en **español claro y comprensible**.
*   **Foco en el Diseño:** Prioriza la detección de inconsistencias en las reglas, facilidad de uso (UX) y el balance de sistemas (especialmente orientado a juegos de cartas y supervivencia histórica como *Idolatría*).
*   **Autorización previa:** Explica siempre el "por qué" en lenguaje natural antes de sugerir cambios en el backend de Rust o en el flujo de la aplicación. **Nunca** modifiques archivos del backend o realices commits a Git sin autorización explícita.

---

## 🏛️ 2. Arquitectura de la Aplicación

**Summa Scriptura** es un editor de Markdown premium y ligero. Está construido sobre **Tauri v2** para Windows, utilizando un frontend de tecnologías web estándar sin frameworks pesados (Vanilla HTML/JS/CSS) para garantizar un consumo mínimo de memoria y evitar la sobrecarga de Electron.

### Mapa de Archivos Clave
*   [`src-tauri/src/lib.rs`](file:///d:/mi_editor_markdown/src-tauri/src/lib.rs): Backend nativo en Rust. Maneja operaciones de archivos de sistema, registro de comandos IPC de Tauri, carga de temas locales y estructuración del directorio de datos de usuario.
*   [`dist/index.html`](file:///d:/mi_editor_markdown/dist/index.html): Estructura del editor, los paneles laterales (Biblioteca), el visor del lector y los modales interactivos.
*   [`dist/style.css`](file:///d:/mi_editor_markdown/dist/style.css): Hoja de estilos con enfoque de diseño premium oscuro, efectos de transparencia (glassmorphism), variables CSS dinámicas para la carga de temas y tipografías premium.
*   [`dist/main.js`](file:///d:/mi_editor_markdown/dist/main.js): El núcleo lógico de la interfaz. Sincroniza el scroll bidireccional entre editor y previsualización, controla el renderizado en caliente, las pestañas de atajos y coordina el estado de la aplicación (`appState`).
*   [`dist/utils/i18n.js`](file:///d:/mi_editor_markdown/dist/utils/i18n.js): Motor e historial de traducciones para localización dinámica en caliente. Soporta Español (`es`), Inglés (`en`) y Latín (`la`).
*   [`dist/utils/data-parser.js`](file:///d:/mi_editor_markdown/dist/utils/data-parser.js): Parser que traduce la sintaxis jerárquica de Markdown estructurado a formatos de datos estándares como JSON, XML y YAML.
*   [`dist/utils/template-engine.js`](file:///d:/mi_editor_markdown/dist/utils/template-engine.js): Escáner de variables dinámicas (`{{variable}}`) e inserción de módulos respetando la sangría de la línea actual.
*   [`dist/utils/history-manager.js`](file:///d:/mi_editor_markdown/dist/utils/history-manager.js): Gestor premium de historial de cambios (deshacer/rehacer) con control de intervalos e inyección inteligente de atajos.
*   [`dist/utils/export-service.js`](file:///d:/mi_editor_markdown/dist/utils/export-service.js): Servicio encargado de empaquetar HTML autónomos, exportar EPUBs para dispositivos e-Ink, y disparar el visor de impresión PDF.

---

## 🛠️ 3. Sistemas Principales y su Funcionamiento

### A. Localización Dinámica (i18n)
*   **Diccionario Centralizado:** En [`i18n.js`](file:///d:/mi_editor_markdown/dist/utils/i18n.js) se definen todas las etiquetas de botones, atajos de formato, placeholders de búsqueda y estados de la interfaz.
*   **Carga en Caliente:** Al cambiar el selector en el panel de configuración, se ejecuta la función `actualizarTextosInterfaz(lang)` en [`main.js`](file:///d:/mi_editor_markdown/dist/main.js). Esta actualiza selectivamente el contenido de texto del DOM, guarda la preferencia en el `localStorage` (`md-language`) y vuelve a renderizar el visor sin necesidad de recargar la aplicación ni afectar al texto que el usuario está escribiendo.

### B. Modo Lectura y Renderizado Avanzado
*   **Notas al Pie:** Un preprocesador en `renderMarkdown()` busca sintaxis `[^1]: Nota`, las extrae del cuerpo y las agrupa en una sección estructurada `<section class="footnotes">` al final del documento, añadiendo enlaces cruzados hipervinculados y retorno interactivo (`↩`).
*   **Listas de Definición:** Transforma la sintaxis avanzada de términos y definiciones (líneas que empiezan con `: `) a etiquetas estructuradas `<dl>`, `<dt>` y `<dd>` con sangría itálica.
*   **Temas Estructurados:** Los esquemas de color se definen en archivos Markdown de temas (ej. `Cyberpunk-Dark.md` y `Classic-Light.md`). El sistema lee el Markdown estructurado en Rust, extrae las propiedades bajo la categoría `# colors` e inyecta dinámicamente las variables correspondientes en los estilos de la aplicación.

### C. Modo Estructurado de Datos
*   **Jerarquía Visual:** Permite navegar por el documento como si fuera una estructura de datos mediante pestañas de árbol jerárquico.
*   **Filtro Ctrl+A:** La barra del modo estructurado se ubica de manera fija mediante estilos independientes con `user-select: none`. Esto evita que, al seleccionar todo el texto en el lector, se copien los botones de Jerarquía, JSON, XML y YAML.
*   **Sanitización de Archivos:** Todos los exportadores reemplazan automáticamente los espacios en blanco de los nombres de archivo por guiones bajos (`_`) para cumplir con los estándares de almacenamiento en sistemas.

---

## 📊 4. Estado Actual de la Aplicación

*   **Última acción completada:** Se adaptó la exportación a PDF para inyectar dinámicamente las variables cromáticas de acento, bloques de código, tablas y citas del tema activo de la aplicación en caliente (usando `getComputedStyle`). La previsualización de impresión se ejecuta de forma estable sobre la ventana principal, forzando el fondo de página a blanco y el texto a gris oscuro (para ahorrar tinta y facilitar la lectura en papel), imitando la misma armonía visual de la exportación a EPUB en el modo "Estilo de la Aplicación". Adicionalmente, se implementó un "seguro" de borrador temporal en `localStorage` para el editor del Theme Playground, protegiendo al usuario de perder cambios no guardados en disco ante cierres inesperados.
*   **Repositorio Git:** Todos los cambios relacionados con la localización multiidioma (i18n), el manual de usuario, los atajos de formato, la compactación de la barra del Modo Estructurado y la sanitización de nombres de archivo han sido confirmados (`git commit`) y subidos con éxito a la rama principal (`git push origin main`).
*   **Manuales de Operación:** Se han creado y redactado tres documentos oficiales en la raíz y la carpeta de assets:
    *   [`MANUAL.md`](file:///d:/mi_editor_markdown/MANUAL.md): Guía de usuario para atajos, paneles interactivos y formatos avanzados.
    *   [`assets/Especificacion_Tecnica_Localizacion.md`](file:///d:/mi_editor_markdown/assets/Especificacion_Tecnica_Localizacion.md): Detalle técnico del ciclo de vida y algoritmo de traducción dinámica de la interfaz.
    *   [`assets/Funcionamiento_Temas_Visuales.md`](file:///d:/mi_editor_markdown/assets/Funcionamiento_Temas_Visuales.md): Explicación del motor de temas visuales y el Theme Playground con su seguro de borradores.

---

## 🚀 5. Hoja de Ruta (Roadmap Futuro)

Estas son las características planificadas para las siguientes fases de desarrollo:

1.  **Inserción de Imágenes Locales:**
    *   Implementar un comando nativo en Rust para copiar imágenes seleccionadas desde el explorador a una carpeta local de la aplicación (`assets/image_cache`).
    *   Insertar automáticamente la ruta relativa adaptada a Markdown (`![Descripción](image_cache/imagen.png)`) en la posición actual del cursor.
2.  **Autocompletado de Variables y Atajos:**
    *   Desplegar un menú emergente ligero al escribir `{{` en el editor que liste las variables disponibles en la plantilla abierta para autocompletarlas rápidamente.
3.  **Refactorización Segura del Exportador PDF:**
    *   Explorar una alternativa para la ventana emergente de impresión utilizando un servidor HTTP nativo muy ligero y temporal montado en Rust (de pocos segundos de ciclo de vida) para evitar que la ventana emergente de Tauri aparezca en blanco en sistemas con restricciones elevadas.
4.  **Integración Directa de Reglas de Juego (Idolatría):**
    *   Crear plantillas de cartas estructuradas interactivas.
    *   Añadir alertas visuales en el visor si los valores de juego (como costes de recursos, vida, fuerza) no cumplen con las reglas o están desbalanceados según un esquema YAML de reglas predefinido.
