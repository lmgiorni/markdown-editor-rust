# Manual de Operación: Summa Scriptura

Bienvenido a **Summa Scriptura**, un editor de texto estructurado y Markdown profesional diseñado específicamente para redactores, investigadores y administradores. Este manual detalla las funcionalidades de la interfaz, el comportamiento de las herramientas y el uso de formatos básicos y avanzados.

---

## 🏛️ 1. Estructura de la Interfaz

La aplicación se compone de tres áreas principales diseñadas para trabajar de forma armónica:

1.  **Panel de Escritura (Editor):** Ubicado en la parte izquierda. Permite redactar el contenido utilizando texto enriquecido con atajos y autocompletado estructural.
2.  **Panel de Lectura (Visor / Reader):** Ubicado en la parte derecha. Traduce el texto Markdown en tiempo real a una vista limpia, formateada y elegante con tipografía premium.
3.  **Biblioteca de Componentes (Sidebar Lateral):** Accesible desde el botón de la barra superior. Permite guardar, buscar y reutilizar bloques o plantillas de texto recurrentes (como encabezados oficiales, estructuras de actas o decretos) agilizando la redacción.

---

## 🗂️ 2. Atajos de Formato y Paneles Flotantes

Para facilitar la escritura sin sobrecargar la pantalla, los atajos de formato se dividen en **7 categorías independientes**:

1.  **Texto Básico:** Negrita, Cursiva, Subrayado y Tachado.
2.  **Títulos:** Niveles de encabezados del 1 al 6 (H1 a H6).
3.  **Listas:** Listas de viñetas (desordenadas), listas numeradas (ordenadas) y listas de tareas con casillas de verificación.
4.  **Enlaces y Medios:** Hipervínculos web e inserción de imágenes.
5.  **Código y Matemáticas:** Código en línea, bloques de código sintáctico, y fórmulas matemáticas en LaTeX (tanto en línea como en bloque).
6.  **Bloques y Estructura:** Citas textuales, párrafos, tablas organizadas y líneas divisorias horizontales.
7.  **Elementos Avanzados:** Notas al pie automáticas, enlaces directos de correo y listas de definición de términos.

### 🧭 Operación de los Paneles Flotantes
*   **Apertura:** Haz clic en el botón **Atajos Markdown** (icono de la hoja con la flecha) en la barra superior. Selecciona la categoría que necesitas para abrir su correspondiente panel.
*   **Movilidad (Arrastre):** Puedes arrastrar cualquier panel flotante libremente por tu pantalla haciendo clic y arrastrando desde su cabecera (la zona con el título del panel). Esto te permite acomodarlos en zonas muertas de la pantalla sin interrumpir tu vista.
*   **Minimizar (Colapsar):** Haz clic en el botón de la flecha superior (`^`) en cualquier cabecera. El panel se reducirá mostrando solo su título, lo que te permite "archivarlo" momentáneamente en la pantalla.
*   **Interacción sin bloqueos:** Los fondos de los paneles flotantes son transparentes a los clics. Puedes hacer clic en un atajo para aplicarlo y seguir escribiendo en el editor de inmediato; el cursor no perderá el foco de escritura.
*   **Cierre de Emergencia:** Puedes cerrar todos los paneles flotantes activos al mismo tiempo presionando la tecla `Escape`.

---

## 📝 3. Uso de Formatos Avanzados

Summa Scriptura incluye soporte premium para elementos estructurales complejos de redacción académica y eclesiástica:

### 3.1. Notas al Pie (Footnotes)
*   **Cómo usarlas:** Coloca el cursor donde desees insertar la referencia y presiona el botón **Nota al pie** en la categoría de *Elementos Avanzados*.
*   **Gestión Inteligente:** El sistema detectará automáticamente las notas existentes en tu documento y asignará el siguiente número correlativo de forma única (evitando duplicar números si insertas notas intermedias).
*   **Definición Automática:** Al insertar la nota `[^1]`, se añadirá automáticamente al final del documento una línea de firma: `[^1]: Descripción de la nota 1`.
*   **En el Visor:** En el modo de lectura, las referencias se transforman en números superíndices clickeables. Al hacerles clic, la pantalla se desplaza a la sección inferior de **Notas al pie**. Cada definición cuenta con un botón de retorno (`↩`) que te devuelve exactamente a la línea del texto original donde te encontrabas leyendo.

### 3.2. Listas de Definición (Definition Lists)
Especialmente útil para vocabularios, glosarios y glosas terminológicas.
*   **Cómo usarlas:** Selecciona una palabra que represente el término y haz clic en **Lista de definición**. Se añadirá una línea debajo empezando con dos puntos (`:`) para que redactes su significado.
*   **Sintaxis Markdown:**
    ```markdown
    Término
    : Definición del término
    ```
*   **En el Visor:** Se traduce automáticamente a un formato tabular donde el término se destaca en negrita y su definición aparece indentada y en cursiva de manera uniforme.

### 3.3. Enlaces de Correo
*   **Cómo usarlas:** Selecciona una dirección de correo y haz clic en **Enlace de correo**. Se formateará automáticamente con corchetes angulares: `<contacto@mi-dominio.com>`. El sistema elimina automáticamente espacios accidentales para evitar hipervínculos rotos.

---

## ⚙️ 4. Configuración y Personalización

Haz clic en el icono del engranaje en la barra superior para acceder a los ajustes visuales y lingüísticos de la aplicación:

*   **Tema Visual:** Cambia la paleta de colores de toda la interfaz en tiempo real (temas oscuros, claros, sepia, etc.).
*   **Tipografía y Tamaños:** Configura la fuente tipográfica y el tamaño de letra del Editor, el Visor y el árbol de datos de forma independiente.
*   **Idioma de la Interfaz:** Summa Scriptura se puede traducir de forma instantánea entre **Español**, **Inglés (English)** y **Latín (Latine)**. El cambio se realiza en milisegundos y se guarda en tu configuración persistente.

---

## 💾 5. Flujo de Guardado y Exportación

*   **Guardado Directo:** Presiona `Ctrl + S` para guardar tus cambios en el archivo activo. Si no tiene nombre, se te pedirá seleccionar una ubicación en tu disco físico.
*   **Exportar como HTML:** Genera una página web autónoma que incluye el contenido formateado y es legible en cualquier navegador de internet.
*   **Exportar como PDF:** Ideal para impresión o para compartir documentos de actas, decretos y reportes oficiales.
*   **Exportar como EPUB:** Para lectores de tinta electrónica (e-readers). Al exportar, se te abrirá una ventana para configurar el título del libro, el autor, el idioma del metadato y la imagen de portada.
