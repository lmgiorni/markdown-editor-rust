# 📋 Prompt del Sistema: Especificación Funcional del Motor de Reconstrucción de PDF (`pdf-parser.js`)

Este documento contiene la especificación funcional completa, lógica de diseño y algoritmos del módulo **Importador Inteligente de PDF** (`dist/utils/pdf-parser.js`) utilizado en **Summa Scriptura**. Este archivo está estructurado como un **Prompt de Ingeniería de Software** para que puedas dárselo a cualquier Inteligencia Artificial en el futuro si necesitas actualizar, migrar o modificar el comportamiento de este módulo desde un único lugar.

---

## 🎯 Objetivo General
El objetivo de este módulo es recibir una cadena de texto plano extraída físicamente de un archivo PDF (la cual carece por naturaleza de estilos, negritas, alineación de tablas o jerarquía de títulos, y viene fragmentada renglón por renglón) y **reconstruir su maquetación visual original en formato Markdown estándar**. 

El módulo debe garantizar que el texto resultante tenga una estructura de párrafos fluidos y limpios separados por doble salto de línea (`\n\n`), solucionando de forma definitiva la desincronización del visor de lectura (*Read*) en manuscritos de gran extensión.

---

## 🛠️ Especificación del Algoritmo por Fases

Cualquier implementación de este motor de conversión de PDF a Markdown debe ejecutar secuencialmente las siguientes fases sobre el texto de entrada:

### 1. Sanitización de Codificación y Ligaduras (Limpieza de Símbolos Raros)
Para evitar que aparezcan cajas vacías, símbolos de error de codificación o tipografías corruptas en el editor, se deben aplicar las siguientes reglas de reemplazo directo de caracteres:
*   **Mapeo de Ligaduras PDF:** Convertir caracteres especiales de ligadura tipográfica en sus equivalentes normales de texto plano:
    *   `ﬁ` $\rightarrow$ `fi`
    *   `ﬂ` $\rightarrow$ `fl`
    *   `ﬀ` $\rightarrow$ `ff`
    *   `ﬃ` $\rightarrow$ `ffi`
    *   `ﬄ` $\rightarrow$ `ffl`
    *   `œ` $\rightarrow$ `oe`
    *   `Œ` $\rightarrow$ `OE`
    *   `æ` $\rightarrow$ `ae`
    *   `Æ` $\rightarrow$ `AE`
*   **Purgado Unicode de Control:** Remover cualquier carácter perteneciente al rango de uso privado de Unicode (rango hexadecimal `\uE000` a `\uF8FF`) que suelen incrustar algunos creadores de PDF.
*   **Purgado de Caracteres Corruptos:** Buscar y eliminar de forma segura el carácter de reemplazo Unicode `\uFFFD` (el rombo negro con signo de pregunta ``) producido por fallos de lectura de codificación en el lector de PDF de Rust.

---

### 2. Purgado de Ruido Físico (Páginas y Encabezados)
Los PDFs dividen el texto en páginas físicas e imprimen en cada una elementos repetitivos que ensucian el contenido.
*   **Filtro de Números de Página:** Omitir cualquier línea compuesta únicamente por números o términos de paginación (por ejemplo: `Pág. 12`, `página 3`, o simplemente `45` al inicio o final de una página).

---

### 3. Detección Contextual de Cabeceras y Títulos (Look-ahead)
Para rescatar títulos y subtítulos simulando la detección del "tamaño de la fuente" original del PDF, se aplica un análisis contextual en base a reglas de aislamiento:
*   **Filtro Inicial de Cabecera:** Una línea califica potencialmente como título si cumple simultáneamente:
    1.  Longitud corta (menor de 75 caracteres).
    2.  No finaliza con signos de puntuación de continuación (como coma `,` o punto final `.`).
    3.  Está escrita completamente en MAYÚSCULAS o utiliza mayúsculas iniciales (*Title Case*), o bien comienza con palabras clave de jerarquía (como *Capítulo*, *Sección*, *Parte*, *Reglas*, o números de sección como `1.1`).
*   **Descarte Contextual por Look-ahead (Ajuste del Diseñador):** Si la línea calificada pasa el filtro inicial, pero la **siguiente línea consecutiva en el texto inicia con una letra minúscula**, la línea actual se **descarta como título** y se trata como texto común de párrafo.
    *   *Razón:* Los títulos reales están estructuralmente aislados y nunca continúan directamente con una palabra en minúscula en el renglón inmediato. Esta regla simula con precisión la jerarquía visual de un tamaño de fuente mayor.
*   **Formateo Markdown:** Si se confirma como título:
    *   Se le antepone `# ` (títulos de nivel 1) para palabras clave de capítulos principales o textos cortos en mayúsculas.
    *   Se le antepone `### ` (nivel 3) para subsecciones numéricas de tres niveles (ej. `1.1.1`).
    *   Se le antepone `## ` (nivel 2) por defecto para el resto de los títulos detectados.

---

### 4. Detección e Interpretación de Tablas
Los PDFs representan las tablas alineando las columnas mediante múltiples espacios físicos en la misma línea.
*   **Detección de Columnas:** Si una línea contiene columnas de texto separadas por dos o más espacios consecutivos (`\s{2,}`) o tabulaciones (`\t+`), se considera una fila de tabla.
*   **Construcción de Tabla Markdown:**
    *   Se acumulan todas las filas consecutivas que cumplan la condición.
    *   Se identifica el número máximo de columnas (`maxCols`) entre todas las filas acumuladas para equilibrar celdas vacías.
    *   Si se confirma que la tabla tiene 2 o más columnas reales, se formatea en Markdown nativo intercalando barras verticales (`| celda 1 | celda 2 |`).
    *   Se inserta de forma automática la fila de división de cabecera (`| --- | --- |`) inmediatamente debajo de la primera fila.

---

### 5. Normalización de Listas y Viñetas
*   **Identificación:** Detectar líneas que inicien con viñetas comunes de PDF (como `•`, `▪`, `*`, `+`, `-`) o números ordenados seguidos de un punto (como `1.`, `a.`, `A.`).
*   **Normalización:** Convertir las viñetas físicas complejas o símbolos rotos al guion estándar de Markdown (`- `) o mantener la numeración limpia (`1. `), asegurando que el visor renderice listas ordenadas y elegantes de forma nativa.

---

### 6. Reensamblado de Párrafos Continuos (Sync Scroll Fix)
Es el núcleo para solucionar la desincronización de lectura en textos extensos.
*   **Unión Caliente de Renglones:** Las líneas normales de texto de prosa que pertenecen al mismo párrafo deben unirse utilizando un solo espacio en blanco.
*   **Palabras Cortadas por Guion:** Si una línea de prosa finaliza en un guion `-` con una letra antes (ej. `incon-`), se debe eliminar el guion al final y unirla con la siguiente línea **sin añadir espacio**, reconstruyendo la palabra rota (ej. `inconsistencias`).
*   **Cierre de Bloques:** Un párrafo acumulado se da por cerrado y se inyecta en el documento únicamente cuando:
    *   Se encuentra una línea vacía.
    *   La línea actual termina con un signo de puntuación final fuerte (`.`, `!`, `?`).
    *   La siguiente línea inicia claramente un bloque diferente (un título, una lista o una fila de tabla).
*   **Separación Obligatoria:** Cada párrafo o bloque estructurado debe unirse en la salida final con un **doble salto de línea** (`\n\n`). Esto asegura que el analizador de Markdown agrupe los elementos en párrafos discretos coincidentes con el mapeo del editor, logrando que el scroll sincronizado funcione al 100% sin importar la extensión del PDF.

---

## 📂 Archivo de Edición Único
Para realizar cualquier ajuste fino en las heurísticas de conversión, solo debes editar este archivo en el proyecto:
*   [pdf-parser.js](file:///d:/mi_editor_markdown/dist/utils/pdf-parser.js)
