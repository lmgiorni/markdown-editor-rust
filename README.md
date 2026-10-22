# Summa Scriptura ✍️

<p align="center">
  <img src="app-icon.png" alt="Summa Scriptura Logo" width="128" />
</p>

**Entorno de autoría, jerarquía de contenido y forjado de datos estructurados.**  
Diseñado para autores, diseñadores de juegos, redactores técnicos y directores de proyecto que requieren concentración absoluta, jerarquía impecable y la capacidad de transformar texto descriptivo en datos estructurados listos para producción.

> 📖 **Documentación Completa:** Para consultar la guía de uso paso a paso de cada módulo y atajo, revisa el [Manual de Usuario](MANUAL.md).

---

## 🧭 ¿Qué es Summa Scriptura y por qué es diferente?

La mayoría de los editores Markdown convencionales nacieron pensados únicamente para tomar notas simples o generar documentación web básica. Por otro lado, las suites ofimáticas tradicionales son pesadas, rígidas y aíslan el texto del flujo de datos de los motores de juego y sistemas de desarrollo.

**Summa Scriptura** fue concebido desde la práctica del diseño de juegos y la gestión de contenido complejo. Resuelve tres necesidades concretas en una sola herramienta:

1. **Escritura pura y concentrada:** Redacción ágil sin elementos que distraigan, con tipografía calibrada y sincronización visual inmediata.
2. **Forjado de datos en tiempo real:** Capacidad de traducir texto y compendios jerárquicos directamente a formatos estructurados (**JSON, XML, YAML y Árbol interactivo**), facilitando la creación de lore, sistemas de reglas, catálogos de ítems y parámetros numéricos sin salir del editor.
3. **Rendimiento nativo y ligereza:** Construido sobre **Rust** y **Tauri 2.0**, eliminando el consumo excesivo de memoria RAM y los retrasos característicos de las aplicaciones montadas en navegadores empaquetados pesados.

---

## ⚡ Capacidades Principales

### 1. Forjado de Datos Estructurados (Modo Árbol / JSON / XML / YAML)
- **Compilador de datos en vivo:** Transforma automáticamente las secciones, listas y propiedades de tu documento Markdown en estructuras de datos normalizadas.
- **Visualizador en árbol:** Permite inspeccionar la jerarquía de tu documento como ramas de datos desplegables.
- **Salida simultánea en JSON, XML y YAML:** Ideal para conectar notas de diseño directamente con bases de datos, motores como Unity/Unreal/Godot o pipelines de producción. Con botón de guardado directo en el formato activo.

### 2. Biblioteca Modular y Plantillas con Variables
- **Panel lateral de biblioteca:** Acceso instantáneo a módulos reutilizables (bloques de estadísticas, perfiles de personajes, tablas de armas) y plantillas completas de diseño.
- **Inyección con variables dinámicas:** Al insertar una plantilla con campos dinámicos (como `{Nombre}`, `{Rango}`, `{Coste}`), la aplicación despliega una ventana emergente para completar los datos antes de inyectar el contenido en el editor.
- **Guardar como plantilla:** Guarda cualquier documento de trabajo en la biblioteca personal con un solo clic.

### 3. Edición, Sincronización y Modos de Visualización
- **Tres modos de visualización:**
  - *Vista Dividida (Split View):* Edición a la izquierda y visor de lectura a la derecha.
  - *Vista Lectura (Read / Preview):* Pantalla completa orientada a la revisión limpia del contenido.
  - *Modo Editor (Focus):* Oculta el visor para concentración total durante la redacción inicial.
- **Sincronización milimétrica de desplazamiento:** Desplazamiento coordinado por porcentaje exacto entre el panel de escritura y el de lectura.
- **Foco de selección bidireccional:**
  - Al seleccionar texto en el editor, el visor de lectura localiza y resalta de inmediato los mismos fragmentos en pantalla.
  - Al hacer clic sobre cualquier párrafo o título en el visor de lectura, el cursor del editor viaja de inmediato a esa línea exacta.

### 4. Soporte Tipográfico y Markdown Ampliado
- **Fórmulas matemáticas completas:** Renderizado matemático de alta fidelidad tanto en línea (`$x^2$`) como en bloques independientes (`$$\sum...$$`) mediante integración con **KaTeX**.
- **Bloques de Alerta (Callouts):** Citas visuales con iconografía y código de color según la intención (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`).
- **Elementos avanzados de publicación:**
  - Bloques plegables interactivos (`<details>` y `<summary>`).
  - Notas al pie con numeración automática (`[^1]`).
  - Listas de definición claras para glosarios y diccionarios de diseño.
  - Formato de texto enriquecido: Resaltado (`==texto==`), superíndice (`^texto^`) y subíndice (`~texto~`).
  - Tablas proporcionales con ancho completo y comentarios ocultos para anotaciones internas del autor.

### 5. Atajos Modulares y Ventanas Flotantes Desacoplables
- **Catálogo de 7 categorías temáticas:** Texto Básico, Títulos, Listas, Enlaces y Medios, Bloques y Estructura, Código y Matemáticas, y Elementos Avanzados.
- **Comportamiento contextual:** Aplicar un formato sobre una palabra la encierra automáticamente; aplicarlo sobre una línea vacía prepara el marcador; volver a pulsar un formato ya aplicado lo retira limpiamente.
- **Desacople a ventanas flotantes:** Cada categoría puede mantenerse en el panel lateral o desacoplarse como una ventana flotante independiente (arrastrable, minimizable y con memoria de posición), ideal para trabajar con monitores secundarios.

### 6. Control de Documentos, Versionado y Archivos Recientes
- **Versionado automático con un clic:** Genera copias de versión incrementales (`_V_001`, `_V_002`...) de forma automática, respaldando el estado anterior en disco.
- **Dígitos de versionado configurables:** Permite elegir entre 2, 3, 4 o 5 dígitos según la escala del proyecto.
- **Gestión de carpeta raíz:** Selección de directorio base para guardar y reubicar documentos fácilmente, con soporte multiplataforma.
- **Historial de documentos recientes:** Acceso rápido mediante `Ctrl + Shift + Clic` en el botón de abrir, con límite configurable entre 5 y 10 archivos y barra de desplazamiento visible.
- **Arrastrar y soltar nativo (Drag & Drop):** Apertura directa de archivos arrastrando documentos `.md`, `.markdown`, `.txt`, `.json`, `.xml` o `.yaml` directamente sobre la interfaz.

### 7. Exportación Multi-Formato Profesional
- **HTML:** Exporta páginas limpias y autocontenidas listas para compartir en la web.
- **PDF:** Documentos listos para impresión o distribución con tipografía cuidada y salto de página optimizado.
- **EPUB:** Genera libros electrónicos completos con detección automática o selección manual de imagen de portada (con previsualización proporcional y optimización de resolución), maquetación seleccionable (Alto Contraste Eink optimizado para lectores de tinta electrónica o Estilo de la Aplicación) y empaquetamiento integral de texto estructurado e imágenes locales.

### 8. Personalización Satinada e Internacionalización
- **Theme Playground:** Ajuste de paleta de color interactivo en vivo, con generación de colores análogos, complementarios, control de opacidad y casillas de guardado rápido.
- **Configuración tipográfica triple:** Permite definir de forma independiente la fuente tipográfica y tamaño del Editor, del Visor de lectura y del Árbol estructurado.
- **Internacionalización dinámica:** Cambio instantáneo entre **Español**, **English** y **Lingua Latina**, con arquitectura de archivos `.json` abierta para incorporar más idiomas.

---

## 🛠️ Especificaciones Técnicas

- **Núcleo de aplicación:** [Rust](https://www.rust-lang.org/) (Seguridad de memoria, velocidad nativa y consumo de recursos mínimo).
- **Entorno de ejecución:** [Tauri 2.0](https://tauri.app/) (Enlace nativo con WebView2 en Windows, WebKit en macOS y WebKitGTK en Linux).
- **Interfaz de usuario:** HTML5, CSS3 satinado moderno con variables dinámicas, Vanilla JavaScript (ES6+ modular, sin frameworks innecesarios).
- **Motor matemático:** KaTeX integrado localmente (funcionamiento 100% offline).
- **Procesamiento de texto:** Motor reactivo propio con soporte para extensiones Markdown de autoría.

---

## 🚀 Compilación y Ejecución Local

### Requisitos
- Compilador de Rust instalado (`rustc` y `cargo`).
- Dependencias básicas del sistema para WebView.

### Modo de prueba (Desarrollo)
Para iniciar la aplicación directamente desde la terminal de Windows (PowerShell):
```powershell
cd d:\mi_editor_markdown
cargo run --manifest-path src-tauri/Cargo.toml
```

### Generación del ejecutable final (.exe en Windows)
Para compilar la versión optimizada lista para usar con doble clic:
```powershell
cd d:\mi_editor_markdown
cargo build --release --manifest-path src-tauri/Cargo.toml
```
El archivo ejecutable se generará en:
`d:\mi_editor_markdown\src-tauri\target\release\app.exe`

> Para detalles sobre empaquetado de instaladores (`.exe` con asistente / `.msi`) y la automatización multiplataforma (Windows, macOS y Linux) mediante GitHub Actions, consulta la guía interna en:  
> [SUMA_SCRIPTURA_COMPILAR_FINAL.md](___PROCESS/_old/SUMA_SCRIPTURA_COMPILAR_FINAL.md)

---

## 📄 Términos de Licencia y Autoría

- **Autor y Dirección de Proyecto:** Leandro Giorni  
- **Año de Creación:** 2026  
- **Modelo de Licencia:** Freeware Propietario con autorización de uso comercial y personal.  

Este software es gratuito y de uso libre para proyectos individuales, académicos y comerciales. Quedan reservados todos los derechos de autoría, propiedad intelectual y código fuente a Leandro Giorni. No se permite la redistribución modificada ni la descompilación del software sin autorización expresa del autor.
