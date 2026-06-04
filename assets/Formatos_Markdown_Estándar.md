# **Guía Completa de Formatos Markdown Estándar**

## **Introducción**

Este documento proporciona una clasificación completa y descripción de todos los formatos estándar de Markdown según el estándar CommonMark 0.30, diseñado para ser utilizado como referencia en editores de texto.

---

## **1. Formato de Texto Básico**

### **Negrita (Bold)**
- **Sintaxis:** `**texto**` o `__texto__`
- **Descripción:** Aplica formato negrita al texto seleccionado
- **Ejemplo:** `**Este es negrita**` → **Este es negrita**

### **Cursiva (Italic)**
- **Sintaxis:** `*texto*` o `_texto_`
- **Descripción:** Aplica formato cursiva al texto seleccionado
- **Ejemplo:** `*Este es cursiva*` → *Este es cursiva*

### **Subrayado (Underline)**
- **Sintaxis:** `<u>texto</u>` (extensión HTML)
- **Descripción:** Subraya el texto seleccionado
- **Nota:** No es parte del estándar CommonMark, pero ampliamente soportado

### **Tachado (Strikethrough)**
- **Sintaxis:** `~~texto~~`
- **Descripción:** Tacha el texto seleccionado
- **Nota:** Extensión de GitHub Flavored Markdown

---

## **2. Enlaces y Medios**

### **Enlaces (Link)**
- **Sintaxis:** `[texto](url)` o `<url>`
- **Descripción:** Crea un enlace a una dirección URL
- **Ejemplo:** `[Google](https://www.google.com)` → [Google](https://www.google.com)

### **Imágenes (Image)**
- **Sintaxis:** `![alt-text](url "title")`
- **Descripción:** Inserta una imagen desde una URL
- **Ejemplo:** `![Logo](logo.png "Logo del sitio")`

---

## **3. Estructura de Datos**

### **Tablas (Table)**
- **Sintaxis:**
```markdown
| Columna 1 | Columna 2 |
|-------------|-------------|
| Celda 1   | Celda 2     |
```
- **Descripción:** Crea una tabla con encabezados y celdas

### **Regla Horizontal (Horizontal rule)**
- **Sintaxis:** `---`, `***`, o `___`
- **Descripción:** Inserta una línea horizontal separadora
- **Ejemplo:** `---` → --- 

---

## **4. Listas**

### **Lista Desordenada (Unordered list)**
- **Sintaxis:**
```markdown
- Elemento 1
- Elemento 2
  - Subelemento
```
- **Descripción:** Crea una lista con viñetas

### **Lista Ordenada (Ordered list)**
- **Sintaxis:**
```markdown
1. Primer elemento
2. Segundo elemento
3. Tercer elemento
```
- **Descripción:** Crea una lista numerada

### **Lista de Tareas (Task list)**
- **Sintaxis:**
```markdown
- [ ] Tarea pendiente
- [x] Tarea completada
```
- **Descripción:** Lista con casillas de verificación

---

## **5. Citas y Bloques**

### **Cita (Blockquote)**
- **Sintaxis:** `> Texto de cita`
- **Descripción:** Crea un bloque de texto citado
- **Ejemplo:** 
```
> Esto es una cita
> de múltiples líneas
```

### **Párrafo (Paragraph)**
- **Sintaxis:** Texto normal separado por líneas vacías
- **Descripción:** Bloque de texto que se interpreta como párrafo

---

## **6. Código y Matemáticas**

### **Código en Línea (Inline code)**
- **Sintaxis:** `` `código` ``
- **Descripción:** Muestra código en línea con formato monoespaciado
- **Ejemplo:** `` `console.log("hola")` `` → `console.log("hola")`

### **Bloque de Código (Code block)**
- **Sintaxis:**
```markdown
```
código
```
```
- **Descripción:** Muestra código en bloque con formato monoespaciado

### **Código con Lenguaje (Code block with language)**
- **Sintaxis:**
```markdown
```javascript
function hello() {
  return "Hola";
}
```
```
- **Descripción:** Bloque de código con identificación de lenguaje para resaltado

### **Matemáticas en Línea (Inline math)**
- **Sintaxis:** `$f(x) = x^2$`
- **Descripción:** Muestra fórmulas matemáticas en línea

### **Bloque Matemático (Block math)**
- **Sintaxis:**
```markdown
$$
\frac{d}{dx}\left(\int_{0}^{x} f(t)\,dt\right) = f(x)
$$
```
- **Descripción:** Muestra fórmulas matemáticas en bloque

---

## **7. Jerarquía de Títulos**

### **Encabezado 1 (Heading 1)**
- **Sintaxis:** `# Título`
- **Descripción:** Encabezado principal

### **Encabezado 2 (Heading 2)**
- **Sintaxis:** `## Título`
- **Descripción:** Subencabezado de nivel 2

### **Encabezado 3 (Heading 3)**
- **Sintaxis:** `### Título`
- **Descripción:** Subencabezado de nivel 3

### **Encabezado 4 (Heading 4)**
- **Sintaxis:** `#### Título`
- **Descripción:** Subencabezado de nivel 4

### **Encabezado 5 (Heading 5)**
- **Sintaxis:** `##### Título`
- **Descripción:** Subencabezado de nivel 5

### **Encabezado 6 (Heading 6)**
- **Sintaxis:** `###### Título`
- **Descripción:** Subencabezado de nivel 6

---

## **8. Elementos Avanzados Estándar**

### **HTML Block**
- **Sintaxis:** Contenido HTML directo
- **Descripción:** Permite insertar bloques HTML completos

### **Raw HTML**
- **Sintaxis:** `<div>contenido</div>`
- **Descripción:** Inserta contenido HTML sin procesar

### **Definition List**
- **Sintaxis:**
```markdown
Term 1
: Definition 1

Term 2
: Definition 2
```
- **Descripción:** Lista de definiciones con términos y descripciones

### **Footnote**
- **Sintaxis:** `[^1]` y `[^1]: Nota al pie`
- **Descripción:** Crea notas al pie de página

### **Nested List**
- **Sintaxis:**
```markdown
- Elemento 1
  - Subelemento 1
  - Subelemento 2
```
- **Descripción:** Listas anidadas con indentación

### **Autolink**
- **Sintaxis:** `<https://www.example.com>`
- **Descripción:** Enlaces automáticos a URLs

### **Email Autolink**
- **Sintaxis:** `<user@example.com>`
- **Descripción:** Enlaces automáticos a correos electrónicos

### **Inline HTML**
- **Sintaxis:** `<em>texto</em>`
- **Descripción:** Contenido HTML inline

### **Entity Reference**
- **Sintaxis:** `&copy;` o `&#169;`
- **Descripción:** Referencias a entidades HTML

### **Numeric Character Reference**
- **Sintaxis:** `&#8220;` o `&#x201C;`
- **Descripción:** Referencias numéricas de caracteres Unicode

---

## **9. Consideraciones Especiales**

### **Compatibilidad**
- La mayoría de estos elementos son parte del estándar CommonMark 0.30
- Algunos elementos como `Footnote` y `Underline` son extensiones ampliamente soportadas
- Los editores deben garantizar compatibilidad con implementaciones estándar

### **Recomendaciones para Editores**
1. **Soporte completo:** Implementar todos los formatos estándar
2. **Validación:** Verificar sintaxis antes de procesamiento
3. **Compatibilidad:** Mantener compatibilidad con GitHub Flavored Markdown
4. **Documentación:** Proporcionar ayuda contextual para cada formato

---

## **10. Tabla Resumen de Funcionalidades**

| Categoría | Elementos |
|---------|-----------|
| Texto Básico | Bold, Italic, Underline, Strikethrough |
| Enlaces/Medios | Link, Image |
| Estructura | Table, Horizontal rule |
| Listas | Unordered, Ordered, Task list |
| Citas | Blockquote, Paragraph |
| Código | Inline code, Code block, Math |
| Títulos | Heading 1-6 |
| Avanzado | HTML block, Raw HTML, Definition list, Footnote, Nested list |

---

## **Conclusión**

Esta guía proporciona una referencia completa de todos los formatos estándar de Markdown según CommonMark 0.30, ideal para implementación en editores de texto profesionales. Todos los elementos mencionados son compatibles con las especificaciones estándar y pueden ser utilizados sin riesgo de incompatibilidad en sistemas modernos.

---

*Versión: 1.0 - Documento de referencia estándar*