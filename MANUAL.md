# Manual de Operación y Guía de Uso: Summa Scriptura ✍️

**Autor y Dirección de Proyecto:** Leandro Giorni  
**Versión de la Aplicación:** 1.0.0  
**Licencia:** Freeware Propietario (Uso libre para fines personales y comerciales)  

---

## 🏛️ 1. Introducción y Filosofía de la Herramienta

**Summa Scriptura** es un entorno de autoría profesional, jerarquía de contenido y forjado de datos estructurados. Ha sido diseñado específicamente para autores, diseñadores de videojuegos, redactores técnicos y directores de proyectos que necesitan trabajar con fluidez, sin distracciones y con la capacidad única de **transformar texto narrativo y compendios de reglas en datos utilizables en producción** (como bases de datos o motores de juego).

A diferencia de los editores convencionales basados en navegadores empaquetados pesados, Summa Scriptura está construido sobre **Rust nativo** y **Tauri 2.0**, lo que garantiza:
- **Arranque instantáneo y consumo mínimo de memoria RAM.**
- **Independencia absoluta de internet:** todo funciona al 100% en modo local y fuera de línea.
- **Seguridad en tus archivos:** trabajo directo sobre tu sistema de archivos en formatos estándar y abiertos (`.md`, `.json`, `.xml`, `.yaml`, `.txt`).

---

## 🖥️ 2. Estructura General de la Interfaz

La aplicación organiza sus herramientas en zonas de trabajo claras y equilibradas:

```
┌────────────────────────────────────────────────────────────────────────┐
│ BARRA SUPERIOR (Archivos, Versionado, Vistas, Atajos, Datos, Ajustes)  │
├───────────────────────────────┬────────────────────────────────────────┤
│                               │                                        │
│     PANEL DE ESCRITURA        │         PANEL DE LECTURA               │
│          (Editor)             │        (Visor / Reader)                │
│                               │                                        │
├───────────────────────────────┴────────────────────────────────────────┤
│ BARRA DE ESTADO (Ruta de archivo, estado de guardado, contador texto) │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Barra Superior de Herramientas
- **Operaciones de Archivo:** Botones directos para crear un documento (`Nuevo`), `Abrir` archivos existentes y `Guardar` cambios (`Ctrl + S`).
- **Bloque de Control Documental:** 
  - Muestra el nombre actual del documento (hacer clic sobre él permite renombrarlo directamente).
  - Botón de **Versionado Automático (`+`)**: Crea una nueva versión del documento preservando la anterior.
  - Botón de **Reubicación de Carpeta**: Permite mover o guardar el archivo en un nuevo directorio de trabajo.
- **Selector de Modos de Vista:**
  - **Vista Dividida (*Split View*):** Modo predeterminado para escribir a la izquierda y ver el resultado formateado a la derecha.
  - **Modo Editor (*Focus*):** Oculta el visor para máxima concentración en la escritura inicial.
  - **Modo Lectura (*Read / Preview*):** Oculta el editor para leer o revisar el documento maquetado a pantalla completa.
- **Herramientas de Apoyo:**
  - **Atajos Markdown (`MD`):** Abre el panel lateral o ventanas flotantes con todas las herramientas de formato.
  - **Estadísticas de Texto (`Stats`):** Despliega el recuento de palabras, caracteres y enlaces, tanto globales como de la selección activa.
  - **Biblioteca de Componentes:** Panel con módulos reutilizables y plantillas de diseño con variables.
  - **Modo Estructurado (Árbol de Datos):** Transforma la visualización del texto a un Árbol interactivo, JSON, XML y YAML.
  - **Configuración del Editor (Engranaje):** Ajustes tipográficos, temas visuales, idiomas y preferencias del sistema.

### 2.2. Barra de Estado Inferior
Ubicada en la base de la pantalla, indica en tiempo real:
- **Círculo indicador de guardado:** Verde cuando todos los cambios están guardados en disco; rojo cuando hay modificaciones pendientes en memoria.
- **Ruta física del archivo activo** o aviso de documento sin guardar.
- **Contador dinámico de palabras y caracteres.**

---

## 🔄 3. Sincronización Inteligente y Selección Bidireccional

Para facilitar la revisión fluida de documentos extensos, Summa Scriptura incorpora sincronización física en dos direcciones:

1. **Desplazamiento Coordinado (Scroll por Porcentaje):**
   Al mover la rueda del ratón o desplazarte en el panel de escritura, el visor de lectura acompaña de manera proporcional y exacta, sin saltos bruscos. Lo mismo ocurre si te desplazas dentro del visor de lectura.
2. **Resaltado de Selección Quirúrgico:**
   - Si seleccionas una frase o párrafo en el editor, el visor de lectura localiza inmediatamente ese mismo fragmento, lo centra en pantalla y lo resalta visualmente en color violeta satinado, ocultando los símbolos de formato (asteriscos, corchetes) para mostrar el texto limpio.
   - Si haces clic sobre cualquier párrafo, título o tabla en el visor de lectura, el cursor del editor viaja de forma instantánea a esa línea exacta para que puedas editarla sin perder tiempo buscando.

---

## 🌳 4. Forjado de Datos Estructurados (Modo Árbol / JSON / XML / YAML)

Una de las características diferenciales de Summa Scriptura es su capacidad para **interpretar el texto Markdown como una base de datos estructurada en tiempo real**.

### 4.1. ¿Cómo se activa?
Haz clic en el botón con el icono de organigrama / árbol en la barra superior. El panel derecho cambiará del visor de lectura tradicional al **Visualizador de Datos Estructurados**.

### 4.2. Las Cuatro Pestañas de Datos
En la parte superior del panel de datos dispones de cuatro pestañas de visualización y trabajo:

1. **🌳 Jerarquía (Árbol / Tree View):**  
   Representa tu documento como un árbol de nodos desplegable. Cada nivel de título (H1, H2, H3...) se convierte en una rama contenedora y cada lista de propiedades en atributos de datos. Puedes expandir y colapsar secciones interactivamente para auditar la jerarquía de un compendio, sistema de reglas o documento complejo.
2. **JSON:**  
   Muestra el contenido serializado en formato JSON estándar en tiempo real. Ideal para inspeccionar la estructura de objetos, matrices y valores tipados.
3. **XML:**  
   Presenta los datos en formato de marcado jerárquico XML, listo para herramientas de desarrollo clásicas, motores de configuración o intercambio de datos.
4. **YAML:**  
   Genera una representación limpia en YAML, formato ampliamente preferido en el diseño de videojuegos (Unity, Godot, Unreal) y archivos de configuración por su extrema legibilidad y ausencia de llaves o corchetes superfluos.

> **Botón de Guardado Directo:** Junto a las pestañas se ubica el botón **«💾 Guardar»**, que te permite exportar y descargar directamente el archivo generado en el formato activo (`.json`, `.xml` o `.yaml`) en la carpeta de tu elección.

### 4.3. Cómo redactar para que el motor extraiga datos automáticamente
El motor analiza la sangría, los encabezados y los formatos clave-valor comunes:
```markdown
# Personaje: Guerrero Nórdico
- **Clase:** Tanque / Defensor
- **Vida Base:** 120
- **Fuerza:** 18
- **Habilidades:**
  - Golpe Terrestre (Nivel 1)
  - Rugido de Batalla (Nivel 3)
```
Al redactar de este modo, el sistema convierte automáticamente el título en una entidad y las listas en pares de propiedad-valor (`Clase = "Tanque"`, `Vida Base = 120`), listos para ser consumidos por programadores o motores de juego.

---

## 📚 5. Biblioteca de Componentes y Plantillas con Variables

Ubicada en el panel lateral desplegable, la biblioteca permite estandarizar y reutilizar estructuras frecuentes de texto.

### 5.1. Módulos y Plantillas
- **Módulos:** Fragmentos breves y recurrentes (por ejemplo: un bloque de estadísticas de combate, un encabezado oficial, una ficha técnica de arma o un formato de diálogo).
- **Plantillas:** Documentos completos prediseñados (Documento de Diseño de Juego / GDD, Ficha completa de personaje, Acta de reunión, Capítulo narrativo).

### 5.2. Sistema de Variables Dinámicas (`{Variable}`)
Las plantillas pueden contener marcadores entre llaves, por ejemplo:
```markdown
## Ficha de Criatura: {Nombre_Criatura}
- **Nivel de Peligro:** {Nivel}
- **Hábitat Principal:** {Habitat}
- **Recompensa:** {Oro} monedas de oro
```
**Comportamiento inteligente:**  
Al hacer clic para insertar una plantilla con variables en tu documento, se abrirá automáticamente una ventana emergente titulada **«Completar Variables de Plantilla»**. Podrás rellenar los valores en campos de texto claros y, al pulsar **Aceptar**, el texto se inyectará en el editor con todos los datos reemplazados de forma limpia.

### 5.3. Guardar tus propios Componentes
- Puedes pulsar el botón **«+ Nuevo Componente»** dentro del panel lateral para crear y catalogar nuevos módulos.
- También puedes desplegar el menú de exportación y seleccionar **«Guardar como Plantilla (MD)»** para almacenar el documento actual en tu catálogo personal.

---

## 🗂️ 6. Atajos de Formato y Sistema de Ventanas Flotantes

Los atajos de formato de Summa Scriptura están diseñados para agilizar la redacción sin interrumpir el flujo creativo.

### 6.1. Las 7 Categorías de Formato
1. **Texto Básico:**
   - **Negrita** (`**texto**`), **Cursiva** (`*texto*`), **Subrayado** (`<u>texto</u>`), **Tachado** (`~~texto~~`), **Resaltado** (`==texto==`), **Superíndice** (`^texto^`) y **Subíndice** (`~texto~`).
2. **Títulos:**
   - Encabezados desde **H1 hasta H6**. Si el cursor está en una línea, cambia el nivel del título automáticamente.
3. **Listas:**
   - Listas desordenadas con viñetas (`- `), listas ordenadas (`1. `) y listas de tareas interactivas (`- [ ] `).
4. **Enlaces y Medios:**
   - **Enlace Web:** Inserta `[Texto](URL)` seleccionando automáticamente la palabra `URL` para que escribas la dirección de inmediato. Si tenías texto seleccionado, lo utiliza como enlace.
   - **Imagen:** Inserta `![Texto descriptivo](URL)` seleccionando automáticamente la dirección de imagen.
   - **Enlace de Correo:** Inserta `<correo@ejemplo.com>`. Si seleccionas un correo electrónico previo, lo encierra directamente.
5. **Código y Matemáticas:**
   - **Código en línea:** Encierra términos técnicos entre comillas invertidas (`` `código` ``).
   - **Bloque de código:** Crea bloques con formato sintáctico delimitados por tres comillas invertidas.
   - **Fórmula en línea:** Notación matemática en KaTeX delimitada por signos de dólar (`$E = mc^2$`).
   - **Fórmula en bloque:** Fórmulas centradas y complejas delimitadas por doble dólar (`$$\int_{0}^{\infty} ...$$`).
6. **Bloques y Estructura:**
   - **Cita en Bloque:** Inserta el marcador de cita (`> `).
   - **Bloques de Alerta (Callouts):** Citas con formato visual destacado para notas, consejos y advertencias (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.).
   - **Línea Divisoria:** Inserta una regla horizontal (`---`) separando párrafos automáticamente.
   - **Tabla Proporcional:** Inserta una estructura de tabla Markdown estilizada que se adapta al 100% del ancho del visor.
   - **Comentario Oculto:** Anotaciones internas del autor (`<!-- comentario -->`) que no se muestran en el visor de lectura.
7. **Elementos Avanzados:**
   - **Nota al pie (Footnote):** Inserta la referencia `[^1]` en el cursor y agrega automáticamente la definición correspondiente al final del documento. En el visor de lectura genera enlaces de salto interactivo con botón de retorno (`↩`).
   - **Lista de Definición:** Formato para glosarios y diccionarios:
     ```markdown
     Concepto
     : Explicación o definición detallada del concepto.
     ```
   - **Bloque Plegable:** Bloques desplegables interactivos utilizando `<details>` y `<summary>` para ocultar spoilers o detalles secundarios.

### 6.2. Comportamiento Inteligente de Conmutación (Toggle)
- Si aplicas un formato sobre una palabra, la encierra de inmediato sin necesidad de seleccionarla manualmente.
- Si vuelves a hacer clic sobre un formato ya aplicado en esa palabra o línea (por ejemplo, pulsar H1 sobre una línea que ya es H1), **el formato se elimina por completo**, devolviendo el texto a su estado base.

### 6.3. Operación de las Ventanas Flotantes Desacoplables
Puedes consultar los atajos en la barra lateral o **desacoplarlos a ventanas flotantes**:
- **Desacoplar Categoría:** Haz clic en el botón de desacople junto a cualquier categoría para convertirla en una ventana flotante independiente.
- **Desacoplar Panel Maestro:** El botón de desacople de la cabecera abre una ventana flotante con todas las categorías juntas.
- **Movilidad Total:** Haz clic en la cabecera de cualquier ventana flotante para arrastrarla a cualquier lugar de la pantalla (o a un segundo monitor).
- **Minimizar (Colapsar):** El botón de flecha (`^`) colapsa la ventana a solo su barra de título, permitiendo tenerla a mano sin ocupar espacio visual.
- **Cierre Rápido:** Presiona la tecla `Escape` en cualquier momento para cerrar todas las ventanas flotantes y modales abiertos.

---

## 📁 7. Control de Documentos, Versionado y Archivos Recientes

Summa Scriptura incorpora herramientas nativas para garantizar que nunca pierdas información y puedas moverte entre proyectos con agilidad:

### 7.1. Sistema de Versionado Automático (`+`)
Al pulsar el botón **`(+)`** en la barra superior:
1. El archivo actual en disco se respalda con un sufijo de versión correlativo (por ejemplo: `MiDocumento_V_001.md`).
2. El editor pasa a trabajar sobre la siguiente versión (`MiDocumento_V_002.md`).
3. La barra de estado y el título se actualizan de inmediato con una notificación de confirmación.
- **Configuración de dígitos:** En la ventana de configuración puedes elegir si deseas versiones de **2 dígitos** (`_V_01`), **3 dígitos** (`_V_001`), **4 dígitos** (`_V_0001`) o **5 dígitos**.

### 7.2. Reubicación de Documentos
El botón de carpeta junto al título permite trasladar el archivo de trabajo a otro directorio de tu equipo sin necesidad de abrir el explorador de archivos ni hacer copias manuales.

### 7.3. Menú de Archivos Recientes
- **Cómo abrirlo:** Mantén presionadas las teclas `Ctrl + Shift` en tu teclado y haz un **clic sobre el botón Abrir** en la barra superior. Si haces clic normal (sin presionar `Ctrl + Shift`), se abrirá el diálogo habitual del explorador del sistema.
- **Límite configurable:** Desde la ventana de configuración puedes fijar el límite de documentos recientes entre **5 y 10 archivos**.
- **Barra de desplazamiento:** Cuando el historial supera los 5 archivos, la ventana emergente muestra una barra de desplazamiento satinada claramente visible para navegar por el listado.
- **Limpieza de historial:** El menú incluye un botón discreto para vaciar el historial en cualquier momento.

### 7.4. Arrastrar y Soltar Archivos (Drag & Drop)
Puedes tomar cualquier archivo desde el explorador de archivos de Windows y soltarlo directamente sobre la interfaz de Summa Scriptura. La aplicación detecta el archivo y lo abre al instante.  
*Formatos admitidos:* `.md`, `.markdown`, `.txt`, `.json`, `.xml`, `.yaml`.

---

## 📤 8. Exportación Multi-Formato Profesional

Desde el desplegable de **Exportar** en la barra superior puedes generar tres tipos de archivos finales:

1. **Exportar como HTML:**
   Genera una página web limpia, estilizada y autocontenida que conserva la estética satinada de lectura, lista para publicar en la web o enviar por correo electrónico.
2. **Exportar como PDF:**
   Abre el diálogo nativo de impresión y generación de PDF del sistema operativo, configurado con estilos optimizados para impresión en papel (márgenes cuidados, saltos de página inteligentes y tipografía de alta legibilidad).
3. **Exportar como EPUB:**
   Genera un libro electrónico estándar (`.epub`) compatible con lectores de tinta electrónica y aplicaciones de lectura (Kindle, Kobo, Apple Books, etc.). Al seleccionarlo, se despliega una ventana de maquetación que ofrece dos modalidades:
   - **Alto Contraste (Eink):** Fondo blanco puro y texto negro absoluto, optimizado al máximo para e-readers de tinta electrónica sin fatiga visual.
   - **Estilo de la Aplicación:** Respeta la atmósfera satinada, los colores y las fuentes tipográficas activas de Summa Scriptura.  
   *Empaquetamiento integral:* El exportador empaqueta automáticamente el contenido XHTML estructurado y todas las imágenes locales referenciadas en el documento dentro del archivo final.

---

## 🎨 9. Personalización Visual e Internacionalización

El icono de engranaje en la barra superior abre la ventana de **Editor Settings** (*Configuración de la Aplicación*):

### 9.1. Tipografías Independientes
Permite asignar familias tipográficas y tamaños independientes para:
- **Editor Font:** Tipografía del área de escritura (ej. *Fira Code*, *JetBrains Mono*, *Iosevka*, *Consolas*).
- **Reader Font:** Tipografía del visor de lectura (ej. *Inter*, *Roboto*, *Georgia*, *Merriweather*).
- **Structured Code Font:** Tipografía del Árbol de datos estructurados, JSON, XML y YAML.

### 9.2. Ajustes de Lectura y Espaciado
- **Editor Font Size:** Deslizador para ajustar el tamaño del texto del editor (de 10px a 24px).
- **Reader Font Size:** Deslizador para el tamaño de lectura.
- **Reader Line Height:** Control del interlineado para lecturas densas o espaciadas.
- **Reader Content Width:** Ancho máximo del contenedor de texto (permite centrar el texto como en un libro o expandirlo a todo el ancho del monitor).

### 9.3. Theme Playground y Selector Cromático
Junto al selector de temas visuales se encuentra el botón de la paleta de colores (`🎨`), que abre el **Theme Playground**:
- Permite modificar interactivamente los colores principales de la aplicación (acento, fondos, bordes).
- Incluye cálculo automático de **colores análogos y complementarios** mediante clic derecho en las muestras de color.
- Control de opacidad y casillas de memoria para guardar combinaciones favoritas.

### 9.4. Idioma de la Interfaz
Summa Scriptura soporta cambio de idioma instantáneo entre:
- **Español**
- **English** (Inglés)
- **Lingua Latina** (Latín clásico)

El selector incluye un botón de carpeta (`📂`) que abre el directorio local donde residen los archivos `.json` de traducción. Puedes copiar cualquiera de estos archivos para crear tus propias traducciones a otros idiomas.

### 9.5. Ventana «Acerca de Summa Scriptura»
Ubicada en la parte inferior de la configuración, detalla el número de versión, el año de creación, los créditos de autoría a **Leandro Giorni** y los términos de licencia freeware.

---

## ⌨️ 10. Tabla Resumen de Atajos de Teclado y Ratón

| Atajo / Acción | Función |
| :--- | :--- |
| `Ctrl + N` | Crear un nuevo documento vacío. |
| `Ctrl + O` | Abrir un archivo desde el explorador del sistema. |
| `Ctrl + Shift + Clic` *(en botón Abrir)* | Desplegar el menú emergente de archivos recientes. |
| `Ctrl + S` | Guardar los cambios del documento actual. |
| `Ctrl + Shift + S` *(o Ctrl + Shift + Clic en Guardar)* | Guardar Como (elegir nueva ruta o nombre). |
| `Ctrl + F` | Abrir el buscador de texto en el editor. |
| `Escape` | Cerrar todas las ventanas flotantes, diálogos y menús activos. |

---

## 📌 11. Buenas Prácticas Recomendadas

1. **Nombres de archivo:** Guarda siempre el documento inicial antes de comenzar a trabajar para que el sistema de versionado automático (`+`) y el historial de recientes puedan registrarlo correctamente.
2. **Uso en monitores múltiples:** Desacopla las ventanas de atajos que uses con frecuencia (por ejemplo, *Código y Matemáticas* o *Bloques y Estructura*) y colócalas en tu pantalla secundaria para mantener la pantalla principal limpia para escribir.
3. **Módulos reutilizables:** Cuando redactes una tabla o estructura que vayas a repetir a menudo, guárdala como módulo en la Biblioteca lateral. Ahorrarás horas de trabajo en proyectos de gran envergadura.
