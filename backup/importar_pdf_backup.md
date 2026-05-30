# 📑 Respaldo Técnico Completo: Motor de Extracción Consciente de PDF (`Summa Scriptura`)

Este documento contiene el respaldo íntegro de la especificación funcional, los algoritmos, la lógica de diseño y el **código completo de producción (tanto en Rust como en JavaScript)** desarrollado para el sistema de **Extracción Consciente de Datos y Maquetación de PDFs** de *Summa Scriptura*. 

Este archivo ha sido archivado en la carpeta de respaldo por instrucción del Director de Proyecto para su conservación histórica y futura reutilización o consulta.

---

## 🗺️ 1. Especificación del Algoritmo y Prompt de Diseño

El motor de extracción consciente procesaba el PDF no como un simple flujo de texto continuo, sino como un **lienzo geométrico bidimensional** en base a evidencias físicas y tipográficas:
1.  **Cálculo Tipográfico Promedio:** Mide el tamaño de fuente promedio de todo el documento para clasificar con precisión matemática títulos (`font_size > promedio * 1.15`), capítulos o subtítulos centrados.
2.  **Purgado de Ruido Marginar y Repetitivo:** Filtra automáticamente cualquier texto que caiga en los márgenes de cabecera y pie de página (8% superior e inferior de la altura de la página), y elimina textos repetitivos (marcas de agua, autor) comparando coordenadas idénticas entre múltiples páginas.
3.  **Reconstrucción de Tablas por Columnas Virtuales:** Agrupa bloques con la misma coordenada Y, detecta espaciado horizontal (> 20pt) para alinear bloques en columnas virtuales dinámicas y genera tablas Markdown equilibrando celdas vacías (`| |`) y multilínea.
4.  **Ajuste Contextual Look-ahead:** Inspecciona el siguiente renglón para descartar falsos títulos si el texto prosigue en minúsculas en el párrafo corrido.
5.  **Perfiles Adaptativos:** Estándar, Académico (traduce notas al pie a citas `> `), Técnico (escapa almohadillas de código `#`) y Pastoral (escapa numeraciones de versículos).

---

## 🦀 2. Código Completo del Backend (Rust)

A continuación se presenta el código completo que se integró en `src-tauri/src/lib.rs` para capturar la geometría de los caracteres usando `pdf-extract` y `lopdf`:

```rust
// ==========================================================================
// RESPALDO DE ESTRUCTURAS GEOMÉTRICAS Y ACUMULADORES DE PDF (RUST)
// ==========================================================================

use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct TextBlock {
    pub text: String,
    pub font_size: f64,
    pub font_name: String,
    pub x_pos: f64,
    pub y_pos: f64,
    pub width: f64,
    pub page_number: u32,
}

pub struct StructuredOutput {
    pub blocks: Vec<TextBlock>,
    pub current_page: u32,
    pub current_text: String,
    pub current_x: f64,
    pub current_y: f64,
    pub current_width: f64,
    pub current_font_size: f64,
}

impl StructuredOutput {
    pub fn new() -> Self {
        Self {
            blocks: Vec::new(),
            current_page: 1,
            current_text: String::new(),
            current_x: 0.0,
            current_y: 0.0,
            current_width: 0.0,
            current_font_size: 0.0,
        }
    }

    pub fn flush_block(&mut self) {
        if !self.current_text.is_empty() {
            self.blocks.push(TextBlock {
                text: self.current_text.clone(),
                font_size: self.current_font_size,
                font_name: "Normal".to_string(),
                x_pos: self.current_x,
                y_pos: self.current_y,
                width: self.current_width,
                page_number: self.current_page,
            });
            self.current_text.clear();
        }
    }
}

impl pdf_extract::OutputDev for StructuredOutput {
    fn begin_page(&mut self, page_num: u32, _media_box: &pdf_extract::MediaBox, _art_box: Option<(f64, f64, f64, f64)>) -> Result<(), pdf_extract::OutputError> {
        self.current_page = page_num;
        Ok(())
    }

    fn end_page(&mut self) -> Result<(), pdf_extract::OutputError> {
        self.flush_block();
        Ok(())
    }

    fn output_character(&mut self, trm: &pdf_extract::Transform, width: f64, _spacing: f64, font_size: f64, char: &str) -> Result<(), pdf_extract::OutputError> {
        // Obtenemos coordenadas X e Y desde la matriz de transformación
        let x = trm.m31 as f64;
        let y = trm.m32 as f64;

        // Agrupación espacial horizontal en la misma línea (tolerancia de 3pt)
        if (self.current_y - y).abs() < 3.0 
           && (self.current_font_size - font_size).abs() < 0.5 
           && !self.current_text.is_empty() 
        {
            self.current_text.push_str(char);
            self.current_width += width;
        } else {
            self.flush_block();
            self.current_text = char.to_string();
            self.current_x = x;
            self.current_y = y;
            self.current_width = width;
            self.current_font_size = font_size;
        }
        Ok(())
    }

    fn begin_word(&mut self) -> Result<(), pdf_extract::OutputError> {
        Ok(())
    }

    fn end_word(&mut self) -> Result<(), pdf_extract::OutputError> {
        Ok(())
    }

    fn end_line(&mut self) -> Result<(), pdf_extract::OutputError> {
        Ok(())
    }
}

// COMANDO TAURI EN src-tauri/src/lib.rs
#[tauri::command]
pub fn importar_pdf_estructurado() -> Result<Option<Vec<TextBlock>>, String> {
    let file_path = match tauri::api::dialog::FileDialogBuilder::new()
        .add_filter("Documento PDF (*.pdf)", &["pdf"])
        .pick_file() {
            Some(path) => path,
            None => return Ok(None),
        };
        
    let doc = lopdf::Document::load(&file_path)
        .map_err(|e| format!("Error al abrir el PDF con lopdf: {}", e))?;
        
    let mut output = StructuredOutput::new();
    
    pdf_extract::output_doc(&doc, &mut output)
        .map_err(|e| format!("Error al extraer la estructura geométrica del PDF: {}", e))?;
        
    output.flush_block();
    
    Ok(Some(output.blocks))
}
```

---

## 🟨 3. Código Completo del Frontend (JavaScript)

Este es el motor de reconstrucción completo que residía en `dist/utils/pdf-parser.js`:

```javascript
// ==========================================================================
// RESPALDO DE LÓGICA DE RECONSTRUCCIÓN GEOMÉTRICA DE PDF (JAVASCRIPT)
// ==========================================================================

function sanitizarTexto(rawText) {
  if (!rawText) return '';
  let text = rawText;
  
  const ligaduras = {
    '\uFB00': 'ff',
    '\uFB01': 'fi',
    '\uFB02': 'fl',
    '\uFB03': 'ffi',
    '\uFB04': 'ffl',
    '\uFB05': 'ft',
    '\uFB06': 'st',
    'ﬁ': 'fi',
    'ﬂ': 'fl',
    'ﬀ': 'ff',
    'ﬃ': 'ffi',
    'ﬄ': 'ffl',
    'œ': 'oe',
    'Œ': 'OE',
    'æ': 'ae',
    'Æ': 'AE'
  };
  
  for (const [lig, rep] of Object.entries(ligaduras)) {
    text = text.replaceAll(lig, rep);
  }
  
  text = text.replace(/[\uE000-\uF8FF]/g, ''); // Rangos privados
  text = text.replace(/\uFFFD/g, '');          // Reemplazo corrupto
  
  return text.trim();
}

export function reconstruirMaquetacionPDF(pdfText) {
  if (!pdfText) return '';
  const lines = pdfText.split(/\r?\n/).map(l => l.trim());
  const blocks = lines.map((l, idx) => ({
    text: l,
    font_size: 12.0,
    font_name: 'Normal',
    x_pos: 50.0,
    y_pos: 800.0 - (idx * 15.0),
    width: l.length * 6.0,
    page_number: 1
  }));
  return reconstruirMaquetacionPDFConsciente(blocks, 'estandar');
}

export function reconstruirMaquetacionPDFConsciente(blocks, perfil = 'estandar') {
  if (!blocks || blocks.length === 0) return '';
  
  blocks.forEach(b => {
    b.text = sanitizarTexto(b.text);
  });
  
  let activeBlocks = blocks.filter(b => b.text.length > 0);
  if (activeBlocks.length === 0) return '';
  
  // 1. Promedio tipográfico
  const fontSizes = activeBlocks.map(b => b.font_size).filter(s => s > 0);
  const promedioFuente = fontSizes.length > 0 ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length : 12.0;
  
  // 2. Limpieza Geométrica de Ruido
  const yValues = activeBlocks.map(b => b.y_pos);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const pageHeight = maxY - minY || 800.0;
  const marginThresholdTop = maxY - (pageHeight * 0.08); 
  const marginThresholdBottom = minY + (pageHeight * 0.08); 
  
  // Detección de repeticiones en coordenadas idénticas
  const coordFreqMap = {};
  activeBlocks.forEach(b => {
    const coordKey = `${Math.round(b.x_pos / 3.0) * 3}_${Math.round(b.y_pos / 3.0) * 3}_${b.text.toLowerCase()}`;
    if (!coordFreqMap[coordKey]) {
      coordFreqMap[coordKey] = { count: 0, pages: new Set() };
    }
    coordFreqMap[coordKey].count++;
    coordFreqMap[coordKey].pages.add(b.page_number);
  });
  
  let cleanBlocks = activeBlocks.filter(b => {
    if ((b.y_pos > marginThresholdTop || b.y_pos < marginThresholdBottom) && /^(pág\.|pag\.|página|pagina)?\s*\d+\s*$/i.test(b.text)) {
      return false;
    }
    
    const coordKey = `${Math.round(b.x_pos / 3.0) * 3}_${Math.round(b.y_pos / 3.0) * 3}_${b.text.toLowerCase()}`;
    if (coordFreqMap[coordKey] && coordFreqMap[coordKey].pages.size >= 2) {
      if (!/^\d+$/.test(b.text) || b.y_pos > marginThresholdTop || b.y_pos < marginThresholdBottom) {
        return false;
      }
    }
    return true;
  });
  
  const pagesMap = {};
  cleanBlocks.forEach(b => {
    if (!pagesMap[b.page_number]) pagesMap[b.page_number] = [];
    pagesMap[b.page_number].push(b);
  });
  
  const xValues = cleanBlocks.map(b => b.x_pos);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const pageCenter = minX + (maxX - minX) / 2.0 || 300.0;
  
  const processedBlocks = [];
  const sortedPageNumbers = Object.keys(pagesMap).map(Number).sort((a, b) => a - b);
  
  sortedPageNumbers.forEach(pageNo => {
    const pageBlocks = pagesMap[pageNo];
    const lines = [];
    
    pageBlocks.forEach(b => {
      let added = false;
      for (let line of lines) {
        if (Math.abs(line.y - b.y_pos) < 4.0) {
          line.blocks.push(b);
          added = true;
          break;
        }
      }
      if (!added) {
        lines.push({ y: b.y_pos, blocks: [b] });
      }
    });
    
    lines.sort((a, b) => b.y - a.y);
    lines.forEach(line => {
      line.blocks.sort((a, b) => a.x_pos - b.x_pos);
    });
    
    let currentParagraph = [];
    let joinWithoutSpace = false;
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        processedBlocks.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
    };
    
    let activeTableRows = [];
    
    const flushTable = () => {
      if (activeTableRows.length > 0) {
        if (activeTableRows.length >= 1) {
          const xCoords = [];
          activeTableRows.forEach(row => {
            row.forEach(cell => {
              xCoords.push(cell.x_pos);
            });
          });
          
          xCoords.sort((a, b) => a - b);
          const virtualColumns = [];
          xCoords.forEach(x => {
            let found = false;
            for (let col of virtualColumns) {
              if (Math.abs(col.center - x) < 25.0) {
                col.values.push(x);
                col.center = col.values.reduce((s, v) => s + v, 0) / col.values.length;
                found = true;
                break;
              }
            }
            if (!found) {
              virtualColumns.push({ center: x, values: [x] });
            }
          });
          
          virtualColumns.sort((a, b) => a.center - b.center);
          const maxCols = virtualColumns.length;
          
          if (maxCols >= 2) {
            let tableMd = '';
            activeTableRows.forEach((row, idx) => {
              const cells = Array(maxCols).fill('');
              
              row.forEach(block => {
                let closestIdx = 0;
                let minDiff = Infinity;
                virtualColumns.forEach((col, colIdx) => {
                  const diff = Math.abs(col.center - block.x_pos);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = colIdx;
                  }
                });
                
                if (cells[closestIdx]) {
                  cells[closestIdx] += ' ' + block.text;
                } else {
                  cells[closestIdx] = block.text;
                }
              });
              
              tableMd += '| ' + cells.join(' | ') + ' |\n';
              
              if (idx === 0) {
                const separator = Array(maxCols).fill('---');
                tableMd += '| ' + separator.join(' | ') + ' |\n';
              }
            });
            processedBlocks.push(tableMd.trim());
          } else {
            activeTableRows.forEach(row => {
              processedBlocks.push(row.map(b => b.text).join(' '));
            });
          }
        }
        activeTableRows = [];
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineBlocks = line.blocks;
      
      if (lineBlocks.length === 0) continue;
      
      if (lineBlocks.length === 1 && (/^[_\-*]{3,}$/.test(lineBlocks[0].text) || /^[-_]{5,}$/.test(lineBlocks[0].text))) {
        flushParagraph();
        flushTable();
        processedBlocks.push('---');
        continue;
      }
      
      if (perfil === 'academico' && line.y < marginThresholdBottom) {
        const footNoteBlocks = lineBlocks.filter(b => b.font_size < promedioFuente * 0.9);
        if (footNoteBlocks.length > 0) {
          flushParagraph();
          flushTable();
          const noteText = footNoteBlocks.map(b => b.text).join(' ');
          processedBlocks.push(`> **[Nota al Pie]** ${noteText}`);
          continue;
        }
      }
      
      let isTableRow = false;
      if (lineBlocks.length >= 2) {
        let hasSpacing = false;
        for (let k = 0; k < lineBlocks.length - 1; k++) {
          const endCurrent = lineBlocks[k].x_pos + lineBlocks[k].width;
          const startNext = lineBlocks[k+1].x_pos;
          if (startNext - endCurrent > 20.0) {
            hasSpacing = true;
            break;
          }
        }
        if (hasSpacing) isTableRow = true;
      }
      
      if (isTableRow) {
        flushParagraph();
        activeTableRows.push(lineBlocks);
        continue;
      } else {
        if (activeTableRows.length > 0) {
          flushTable();
        }
      }
      
      const firstBlock = lineBlocks[0];
      const listMatch = firstBlock.text.match(/^([•▪\-*+])\s+(.*)$/) || firstBlock.text.match(/^(\d+\.|[a-zA-Z]\.)\s+(.*)$/i);
      
      if (listMatch) {
        flushParagraph();
        const marker = listMatch[1];
        const restOfText = lineBlocks.slice(1).map(b => b.text).join(' ');
        const content = (listMatch[2].trim() + ' ' + restOfText).trim();
        
        let cleanMarker = marker;
        if (marker === '•' || marker === '▪' || marker === '*') {
          cleanMarker = '-';
        }
        
        if (perfil === 'pastoral' && /^\d+\./.test(marker)) {
          processedBlocks.push(`${marker.replace('.', '\\.')} ${content}`);
        } else {
          processedBlocks.push(`${cleanMarker} ${content}`);
        }
        continue;
      }
      
      let isHeader = false;
      const combinedLineText = lineBlocks.map(b => b.text).join(' ');
      
      let cleanTitleText = combinedLineText;
      if (perfil === 'tecnico') {
        cleanTitleText = cleanTitleText.replace(/#/g, '\\#');
      }
      
      const isCapitalized = /^[A-Z0-9\sÁÉÍÓÚÑÜ¿¡!?:.,\-\(\)]+$/.test(combinedLineText) ||
                            /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(combinedLineText);
      const hasKeywords = /^(capítulo|capitulo|sección|seccion|parte|introducción|introduccion|conclusión|conclusion|reglas)\b/i.test(combinedLineText);
      
      if (combinedLineText.length < 75 && !combinedLineText.endsWith('.') && !combinedLineText.endsWith(',') && 
          (firstBlock.font_size > promedioFuente * 1.15 || hasKeywords || isCapitalized)) {
        isHeader = true;
      }
      
      const blockCenter = firstBlock.x_pos + (firstBlock.width / 2.0);
      if (!isHeader && combinedLineText.length < 50 && !combinedLineText.endsWith('.') && 
          Math.abs(blockCenter - pageCenter) < 35.0 && firstBlock.font_size >= promedioFuente) {
        isHeader = true;
      }
      
      if (isHeader && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.blocks && nextLine.blocks.length > 0) {
          const nextFirstChar = nextLine.blocks[0].text.trim().charAt(0);
          if (nextFirstChar && nextFirstChar === nextFirstChar.toLowerCase() && /^[a-záéíóúñ]/.test(nextFirstChar)) {
            isHeader = false;
          }
        }
      }
      
      if (isHeader) {
        flushParagraph();
        
        let headerPrefix = '##';
        if (firstBlock.font_size > promedioFuente * 1.35 || /^(capítulo|capitulo|parte)\b/i.test(combinedLineText)) {
          headerPrefix = '#';
        } else if (firstBlock.font_size < promedioFuente * 1.15) {
          headerPrefix = '###';
        }
        
        processedBlocks.push(`${headerPrefix} ${cleanTitleText}`);
        continue;
      }
      
      let cleanLineText = combinedLineText;
      let currentJoin = joinWithoutSpace;
      joinWithoutSpace = false;
      
      if (cleanLineText.endsWith('-') && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]-$/.test(cleanLineText)) {
        cleanLineText = cleanLineText.slice(0, -1);
        joinWithoutSpace = true;
      }
      
      if (currentParagraph.length > 0) {
        if (currentJoin) {
          currentParagraph[currentParagraph.length - 1] += cleanLineText;
        } else {
          currentParagraph.push(cleanLineText);
        }
      } else {
        currentParagraph.push(cleanLineText);
      }
      
      let shouldFlush = false;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.blocks.length === 0) {
          shouldFlush = true;
        } else {
          if (/[.!?]$/.test(combinedLineText)) {
            shouldFlush = true;
          } else {
            const nextFirst = nextLine.blocks[0];
            const nextIsList = nextFirst.text.match(/^([•▪\-*+])\s+/) || nextFirst.text.match(/^(\d+\.|[a-zA-Z]\.)\s+/i);
            const nextIsHeader = nextLine.blocks.map(b => b.text).join(' ').length < 75 && 
                                 (nextFirst.font_size > promedioFuente * 1.15 || /^(capítulo|capitulo)\b/i.test(nextFirst.text));
            if (nextIsList || nextIsHeader) {
              shouldFlush = true;
            }
          }
        }
      } else {
        shouldFlush = true;
      }
      
      if (shouldFlush) {
        flushParagraph();
      }
    }
    
    flushParagraph();
    flushTable();
  });
  
  return processedBlocks.join('\n\n');
}
```

---

## 💻 4. Respaldo de Modificaciones en la Interfaz (HTML/CSS)

### index.html (Barra de Herramientas):
```html
<select id="select-pdf-profile" title="Perfil de Importación PDF" class="toolbar-select">
  <option value="estandar">Estándar</option>
  <option value="academico">Académico / Doctrinal</option>
  <option value="tecnico">Técnico / Manual</option>
  <option value="pastoral">Pastoral / Institucional</option>
</select>
```

### style.css (Selector Premium):
```css
/* Selector de Perfiles Premium */
.toolbar-select {
  background: var(--bg-card, rgba(30, 30, 40, 0.4));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-muted, #94a3b8);
  padding: 6px 12px;
  height: 36px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  transition: var(--transition-fast);
  margin-left: 6px;
  background-color: rgba(255, 255, 255, 0.01);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.04));
}
.toolbar-select:hover {
  background-color: rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.2);
  color: var(--accent-hover);
}
.toolbar-select:focus {
  border-color: var(--accent-hover);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.15);
}
.toolbar-select option {
  background-color: #121216;
  color: #f1f5f9;
}
```
