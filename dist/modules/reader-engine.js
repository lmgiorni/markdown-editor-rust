// ==========================================================================
// MOTOR DEL VISOR / LECTOR (RENDERIZADO MARKDOWN, SINCRONIZACIÓN Y NAVEGACIÓN)
// ==========================================================================

let _ctx = {
  DOM: null,
  appState: null,
  invoke: null,
  parseMarkdownToJSON: null,
  renderStructuredTreeVisual: null
};

function getDOM() {
  if (_ctx.DOM) return _ctx.DOM;
  return {
    editor: typeof document !== 'undefined' ? document.getElementById('editor') : null,
    preview: typeof document !== 'undefined' ? document.getElementById('preview') : null,
    previewContainer: typeof document !== 'undefined' ? document.getElementById('preview-container') : null,
    wordCountStatus: typeof document !== 'undefined' ? document.getElementById('word-count-status') : null,
    structuredHeaderBar: typeof document !== 'undefined' ? document.getElementById('structured-header-bar') : null
  };
}

function getAppState() {
  return _ctx.appState || {};
}

// Variables internas del motor de lectura y sincronización
let panelBajoCursor = null;
let highlightTimeoutId = null;
let readerEventsInitialized = false;

/**
 * Inicializa el motor de lectura con dependencias inyectadas y registra eventos interactivos
 */
export function initReaderEngine(injectedCtx = {}) {
  _ctx = { ..._ctx, ...injectedCtx };
  inicializarEventosReader();
}

/**
 * Escapa caracteres HTML para prevenir inyecciones no deseadas en bloques y fórmulas
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Motor central de conversión y renderizado de Markdown a HTML (Marked + KaTeX + notas + callouts)
 */
export function renderMarkdown() {
  const DOM = getDOM();
  const appState = getAppState();
  const markdownText = DOM.editor ? (DOM.editor.value || '') : '';
  
  // Si el modo estructurado está activo, delegar renderizado al árbol en tiempo real
  if (appState.structuredModeActive) {
    if (typeof _ctx.parseMarkdownToJSON === 'function' && typeof _ctx.renderStructuredTreeVisual === 'function') {
      const arbol = _ctx.parseMarkdownToJSON(markdownText);
      _ctx.renderStructuredTreeVisual(arbol);
    }
    return;
  } else {
    if (DOM.structuredHeaderBar) DOM.structuredHeaderBar.style.display = 'none';
    if (DOM.previewContainer) DOM.previewContainer.classList.remove('structured-layout');
  }
  
  // Validar si la biblioteca de conversión se cargó de forma correcta y offline
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false
    });
    
    // 1. Extraer definiciones de notas al pie antes de procesar el texto con marked
    const footnoteDefs = {};
    const footnoteDefRegex = /^\[\^([^\]]+)\]:\s*(.*)$/gm;
    let cleanedMarkdown = markdownText;
    
    let match;
    while ((match = footnoteDefRegex.exec(markdownText)) !== null) {
      const label = match[1];
      const definition = match[2];
      footnoteDefs[label] = definition;
    }
    
    // Quitar las líneas de definiciones para evitar que se rendericen inline como párrafos
    cleanedMarkdown = cleanedMarkdown.replace(/^\[\^([^\]]+)\]:\s*(.*)$/gm, '');

    // 2. Proteger bloques de código (``` y `) antes de procesar cualquier sintaxis extendida
    const mdCodeProtector = [];
    cleanedMarkdown = cleanedMarkdown.replace(/(`{3,}[\s\S]*?`{3,}|`[^`\n]+`)/g, (m) => {
      mdCodeProtector.push(m);
      return `\x00MDCODE_${mdCodeProtector.length - 1}\x00`;
    });

    // 3. Extraer y procesar Fórmulas en Bloque (Block Math: $$ ... $$)
    const mathBlocks = [];
    cleanedMarkdown = cleanedMarkdown.replace(/\$\$([\s\S]*?)\$\$/g, (m, formula) => {
      const raw = formula.trim();
      let rendered = '';
      if (typeof katex !== 'undefined') {
        try {
          rendered = katex.renderToString(raw, { displayMode: true, throwOnError: false });
        } catch (e) {
          rendered = `<span class="katex-display"><span class="math-fallback">${escapeHtml(raw)}</span></span>`;
        }
      } else {
        rendered = `<span class="katex-display"><span class="math-fallback">${escapeHtml(raw)}</span></span>`;
      }
      const blockHtml = `<div class="markdown-math-block math-block">${rendered}</div>`;
      mathBlocks.push(blockHtml);
      return `\n\n\x00MATH_BLOCK_${mathBlocks.length - 1}\x00\n\n`;
    });

    // 4. Extraer y procesar Fórmulas en Línea (Inline Math: $ ... $)
    const mathInlines = [];
    cleanedMarkdown = cleanedMarkdown.replace(/(?<!\$)\$(?!\$)((?:\\\$|[^\$\n])+?)(?<!\$)\$(?!\$)/g, (m, formula) => {
      const raw = formula.trim();
      if (!raw) return m;
      let rendered = '';
      if (typeof katex !== 'undefined') {
        try {
          rendered = katex.renderToString(raw, { displayMode: false, throwOnError: false });
        } catch (e) {
          rendered = `<span class="markdown-math-inline math-inline">${escapeHtml(raw)}</span>`;
        }
      } else {
        rendered = `<span class="markdown-math-inline math-inline">${escapeHtml(raw)}</span>`;
      }
      mathInlines.push(rendered);
      return `\x00MATH_INLINE_${mathInlines.length - 1}\x00`;
    });

    // 5. Pre-procesar ==resaltado==, ^superíndice^ y ~subíndice~
    cleanedMarkdown = cleanedMarkdown.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
    cleanedMarkdown = cleanedMarkdown.replace(/\^([^\^\n]+?)\^/g, '<sup>$1</sup>');
    cleanedMarkdown = cleanedMarkdown.replace(/(?<!~)~([^~\n]+?)~(?!~)/g, '<sub>$1</sub>');

    // Restaurar bloques de código para que marked los traduzca a <pre><code>
    cleanedMarkdown = cleanedMarkdown.replace(/\x00MDCODE_(\d+)\x00/g, (m, idx) => mdCodeProtector[Number(idx)]);

    // Inyectar el HTML traducido en el Visor
    let html = marked.parse(cleanedMarkdown);
    
    // 6. Proteger bloques <pre> y <code> generados por marked
    const codeBlocks = [];
    html = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
      codeBlocks.push(m);
      return `\x00CODE_${codeBlocks.length - 1}\x00`;
    });

    // 7. Procesar referencias de notas al pie [^label]
    html = html.replace(/\[\^([^\]:\n]+)\]/g, (m, label) => {
      return `<sup class="footnote-ref"><a href="#fn-${label}" id="fnref-${label}">[${label}]</a></sup>`;
    });

    // 8. Procesar Bloques de Alerta / Callouts (> [!NOTE], etc.)
    html = html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:<br\s*\/?>|\s*)([\s\S]*?)<\/blockquote>/gi, (m, type, rest) => {
      const upper = type.toUpperCase();
      return `<blockquote class="markdown-callout callout-${upper.toLowerCase()}"><div class="callout-header">${upper}</div><p>${rest}</blockquote>`;
    });

    // 9. Procesar Listas de Definición (dt/dd) tanto con salto simple (<br>) como doble (<p>)
    html = html.replace(/<p>([\s\S]*?)<\/p>/g, (fullMatch, inner) => {
      if (!/(?:^|<br\s*\/?>)\s*:\s+/.test(inner)) return fullMatch;
      const lines = inner.split(/<br\s*\/?>/);
      const hasDef = lines.some(l => /^\s*:\s+/.test(l));
      if (!hasDef) return fullMatch;
      let dlItems = '';
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (/^:\s+/.test(trimmed)) {
          dlItems += `<dd>${trimmed.replace(/^:\s+/, '')}</dd>`;
        } else {
          dlItems += `<dt>${trimmed}</dt>`;
        }
      });
      return `<dl>${dlItems}</dl>`;
    });
    html = html.replace(/<p>([^<]+)<\/p>\s*<p>:\s*(.*?)<\/p>/g, '<dl><dt>$1</dt><dd>$2</dd></dl>');
    html = html.replace(/<\/dl>\s*<dl>/g, '');

    // 10. Restaurar bloques de Math (Bloque e Inline)
    html = html.replace(/<p>\s*\x00MATH_BLOCK_(\d+)\x00\s*<\/p>/g, (m, idx) => mathBlocks[Number(idx)]);
    html = html.replace(/\x00MATH_BLOCK_(\d+)\x00/g, (m, idx) => mathBlocks[Number(idx)]);
    html = html.replace(/\x00MATH_INLINE_(\d+)\x00/g, (m, idx) => mathInlines[Number(idx)]);

    // Restaurar bloques <pre> y <code>
    html = html.replace(/\x00CODE_(\d+)\x00/g, (_, idx) => codeBlocks[Number(idx)]);
    
    // 11. Inyectar la sección de notas al pie al final del HTML si existen
    const footnoteLabels = Object.keys(footnoteDefs);
    if (footnoteLabels.length > 0) {
      let footnotesSection = '<hr class="footnotes-sep"><section class="footnotes"><ol>';
      footnoteLabels.forEach(label => {
        const defHtml = marked.parse(footnoteDefs[label]).trim().replace(/^<p>|<\/p>$/g, '');
        footnotesSection += `<li id="fn-${label}" class="footnote-item">${defHtml} <a href="#fnref-${label}" class="footnote-backref">↩</a></li>`;
      });
      footnotesSection += '</ol></section>';
      html += footnotesSection;
    }
    
    if (DOM.preview) DOM.preview.innerHTML = html;
    
    // Soporte de imágenes locales (relativas y absolutas) mediante el protocolo de activos de Tauri v2
    if (DOM.preview) {
      const imgs = DOM.preview.querySelectorAll('img');
      imgs.forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
          const isAbsoluteWin = /^[a-zA-Z]:/.test(src);
          const isRelative = src.startsWith('./') || src.startsWith('../');
          
          if (isAbsoluteWin || isRelative) {
            let pathCompleto = src;
            
            if (isRelative) {
              if (appState.filePath) {
                const sep = appState.filePath.includes('/') ? '/' : '\\';
                const parts = appState.filePath.split(sep);
                parts.pop();
                const baseDir = parts.join(sep);
                
                if (src.startsWith('./')) {
                  pathCompleto = baseDir + sep + src.substring(2);
                } else if (src.startsWith('../')) {
                  const baseParts = baseDir.split(sep);
                  baseParts.pop();
                  const parentDir = baseParts.join(sep);
                  pathCompleto = parentDir + sep + src.substring(3);
                }
              } else {
                return;
              }
            }
            
            const normalized = pathCompleto.replace(/\\/g, '/');
            
            if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.convertFileSrc) {
              img.src = window.__TAURI__.core.convertFileSrc(normalized);
            } else {
              const parts = normalized.split('/');
              const encodedParts = parts.map((part, index) => {
                if (index === 0 && part.endsWith(':')) return part;
                return encodeURIComponent(part);
              });
              img.src = `https://asset.localhost/${encodedParts.join('/')}`;
            }
          }
        }
      });
    }
  } else {
    if (DOM.preview) DOM.preview.textContent = markdownText;
  }
  
  // Actualizar estadísticas inmediatas de la barra inferior
  if (DOM.wordCountStatus) {
    const palabras = markdownText.trim().split(/\s+/).filter(p => p.length > 0).length;
    const lang = appState.language || 'es';
    let palabraText = '';
    if (lang === 'es') {
      palabraText = palabras === 1 ? 'palabra' : 'palabras';
    } else if (lang === 'en') {
      palabraText = palabras === 1 ? 'word' : 'words';
    } else {
      palabraText = palabras === 1 ? 'verbum' : 'verba';
    }
    DOM.wordCountStatus.textContent = `${palabras} ${palabraText}`;
  }
}

/**
 * Limpia cualquier resaltado temporal activo en el visor
 */
export function limpiarResaltadoTemporal() {
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
  }
  const DOM = getDOM();
  if (DOM.preview) {
    const blocks = DOM.preview.querySelectorAll('.markdown-body > *');
    blocks.forEach(b => b.classList.remove('highlighted-block'));
  }
}

/**
 * Divide el texto del editor en bloques estructurados para sincronización de foco
 */
export function parseEditorBlocks(text) {
  if (typeof text !== 'string') return [];
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 1. Líneas vacías
    if (trimmed === '') {
      i++;
      continue;
    }
    
    // 2. Bloques de código (```)
    if (trimmed.startsWith('```')) {
      const startLine = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        i++;
      }
      if (i < lines.length) i++; // Incluir la línea de cierre
      blocks.push({
        type: 'code',
        startLine,
        endLine: i - 1
      });
      continue;
    }
    
    // 3. Citas de bloque (>)
    if (trimmed.startsWith('>')) {
      const startLine = i;
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        i++;
      }
      blocks.push({
        type: 'blockquote',
        startLine,
        endLine: i - 1
      });
      continue;
    }
    
    // 4. Listas (viñetas o numeración con margen opcional)
    const isList = /^\s*([\-*+]|\d+\.)\s+/.test(line);
    if (isList) {
      const startLine = i;
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed === '') {
          let temp = i + 1;
          while (temp < lines.length && lines[temp].trim() === '') {
            temp++;
          }
          if (temp < lines.length && (/^\s*([\-*+]|\d+\.)\s+/.test(lines[temp]) || /^\s+/.test(lines[temp]))) {
            i = temp;
            continue;
          } else {
            break;
          }
        }
        if (/^\s*([\-*+]|\d+\.)\s+/.test(nextLine) || /^\s+/.test(nextLine)) {
          i++;
        } else {
          break;
        }
      }
      blocks.push({
        type: 'list',
        startLine,
        endLine: i - 1
      });
      continue;
    }
    
    // 5. Títulos (#)
    if (trimmed.startsWith('#')) {
      blocks.push({
        type: 'header',
        startLine: i,
        endLine: i
      });
      i++;
      continue;
    }
    
    // 6. Líneas divisorias (hr)
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({
        type: 'hr',
        startLine: i,
        endLine: i
      });
      i++;
      continue;
    }
    
    // 7. Párrafos / Tablas (agrupación de líneas no vacías consecutivas)
    const startLine = i;
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      if (nextTrimmed === '') break;
      if (/^\s*([\-*+]|\d+\.)\s+/.test(nextLine) || nextTrimmed.startsWith('#') || nextTrimmed.startsWith('>') || nextTrimmed.startsWith('```')) {
        break;
      }
      i++;
    }
    blocks.push({
      type: 'paragraph',
      startLine,
      endLine: i - 1
    });
  }
  
  return blocks;
}

/**
 * Sincroniza visualmente la posición del cursor del editor con el bloque correspondiente del visor
 */
export function sincronizarFocoElemento() {
  const DOM = getDOM();
  if (!DOM.editor || !DOM.preview) return;
  const text = DOM.editor.value || '';
  const cursorSelStart = DOM.editor.selectionStart || 0;
  
  // Encontrar la línea actual del cursor
  const linesBefore = text.substring(0, cursorSelStart).split('\n');
  const currentLineIndex = linesBefore.length - 1;
  
  // Limpiar clases de resaltados anteriores y cancelar cualquier temporizador anterior
  limpiarResaltadoTemporal();
  
  const editorBlocks = parseEditorBlocks(text);
  if (editorBlocks.length === 0) return;
  
  // Encontrar qué bloque de editor contiene la línea actual del cursor
  let activeBlockIndex = -1;
  for (let i = 0; i < editorBlocks.length; i++) {
    const block = editorBlocks[i];
    if (currentLineIndex >= block.startLine && currentLineIndex <= block.endLine) {
      activeBlockIndex = i;
      break;
    }
  }
  
  // Si no se encuentra un bloque activo directo, usamos el más cercano
  if (activeBlockIndex === -1) {
    for (let i = 0; i < editorBlocks.length; i++) {
      if (currentLineIndex < editorBlocks[i].startLine) {
        activeBlockIndex = Math.max(0, i - 1);
        break;
      }
    }
    if (activeBlockIndex === -1) {
      activeBlockIndex = editorBlocks.length - 1;
    }
  }
  
  const blocks = DOM.preview.querySelectorAll('.markdown-body > *');
  if (blocks.length === 0) return;
  
  // Mapear el índice del bloque al visor, garantizando límites
  const targetIndex = Math.min(activeBlockIndex, blocks.length - 1);
  const bestMatch = blocks[targetIndex];
  
  if (bestMatch) {
    bestMatch.classList.add('highlighted-block');
    // Scroll suave hasta tener el elemento visible a nivel de panel
    bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Iniciar temporizador de desvanecimiento (Fade-out automático de 1.5s)
    highlightTimeoutId = setTimeout(() => {
      if (bestMatch) bestMatch.classList.remove('highlighted-block');
    }, 1500);
  }
}

/**
 * Algoritmo matemático de correspondencia de índices entre texto formateado y Markdown original
 */
export function obtenerMapaDeIndices(original) {
  let limpia = '';
  let mapa = []; // mapa[i] nos dará el índice en 'original' del carácter 'i' en 'limpia'
  
  let i = 0;
  while (i < original.length) {
    const char = original[i];
    
    // Saltamos marcas de formato HTML
    if (original.substring(i, i + 3) === '<u>') {
      i += 3;
      continue;
    }
    if (original.substring(i, i + 4) === '</u>') {
      i += 4;
      continue;
    }
    
    // Saltamos marcas de formato Markdown simples
    if (char === '*' || char === '_' || char === '~' || char === '`' || char === '#') {
      i++;
      continue;
    }
    
    // Enlaces de Markdown: omitimos los corchetes y paréntesis/urls del texto limpio
    if (char === '[' || char === ']') {
      i++;
      continue;
    }
    if (char === '(') {
      const endParenthesis = original.indexOf(')', i);
      if (endParenthesis !== -1) {
        i = endParenthesis + 1;
        continue;
      }
    }
    
    // Si no es ninguna marca, conservamos el carácter
    limpia += char;
    mapa.push(i);
    i++;
  }
  
  return { limpia, mapa };
}

/**
 * Sincroniza la selección de texto realizada en el visor hacia el editor textarea correspondiente
 */
export function sincronizarSeleccionReaderAEditor() {
  const DOM = getDOM();
  if (!DOM.editor || !DOM.preview) return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const selectedText = selection.toString();
  if (!selectedText || selectedText.trim().length === 0) return;
  
  // Encontrar el bloque de texto contenedor directo
  const containerElement = selection.anchorNode && selection.anchorNode.parentElement 
    ? selection.anchorNode.parentElement.closest('.markdown-body > *') 
    : null;
  if (!containerElement) return;
  
  const containerText = containerElement.textContent.trim();
  if (containerText.length < 3) return;
  
  // Buscar el bloque correspondiente en el Editor
  const fullText = DOM.editor.value || '';
  const lines = fullText.split('\n');
  
  const cleanSearch = containerText.toLowerCase().substring(0, 40).replace(/[#*`~_\-[\]()]/g, '').trim();
  if (cleanSearch.length < 3) return;
  
  let lineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].replace(/[#*`~_\-[\]()]/g, '').toLowerCase().trim();
    if (cleanLine.includes(cleanSearch) || cleanSearch.includes(cleanLine)) {
      lineIndex = i;
      break;
    }
  }
  
  if (lineIndex === -1) return;
  
  // Calcular el desplazamiento de caracteres acumulados en el editor hasta esta línea
  let charIndexOffset = 0;
  for (let i = 0; i < lineIndex; i++) {
    charIndexOffset += lines[i].length + 1; // +1 por el salto de línea \n
  }
  
  const originalLineText = lines[lineIndex];
  const { limpia, mapa } = obtenerMapaDeIndices(originalLineText);
  
  // Buscar el fragmento de texto seleccionado del Reader en el texto limpio de la línea
  const cleanSelected = selectedText.trim();
  const startInLimpia = limpia.toLowerCase().indexOf(cleanSelected.toLowerCase());
  
  if (startInLimpia !== -1) {
    const startReal = mapa[startInLimpia];
    const endLimpiaIndex = startInLimpia + cleanSelected.length - 1;
    const endReal = mapa[Math.min(endLimpiaIndex, mapa.length - 1)] + 1;
    
    // Seleccionar de forma precisa y silenciosa en el editor
    DOM.editor.focus();
    DOM.editor.setSelectionRange(charIndexOffset + startReal, charIndexOffset + endReal);
  }
}

/**
 * Gestión segura de enlaces en el visor: anclas internas con scroll suave y URLs en navegador del SO
 */
export async function gestionarClicEnlace(e) {
  const DOM = getDOM();
  // Buscar si el objetivo del clic o alguno de sus padres es una etiqueta <a>
  const link = e.target.closest('a');
  if (!link) return;

  // Si tiene el atributo download, permitimos la descarga nativa del archivo
  if (link.hasAttribute('download')) return;

  const href = link.getAttribute('href');
  if (!href) return;

  // 1. Enlaces internos / anclas (ej: #fn-1, #fnref-1, #seccion)
  if (href.startsWith('#')) {
    e.preventDefault();
    const targetId = href.slice(1);
    if (!targetId) return;

    // Buscar el elemento de destino por ID o por atributo name
    let targetEl = null;
    try {
      targetEl = document.getElementById(targetId) || 
        (DOM.preview ? DOM.preview.querySelector(`[name="${CSS.escape(targetId)}"]`) : null) ||
        document.querySelector(`[name="${CSS.escape(targetId)}"]`);
    } catch (_) {
      targetEl = document.getElementById(targetId);
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  // 2. Enlaces externos (http, https, mailto)
  if (/^(https?:\/\/|mailto:)/i.test(href)) {
    e.preventDefault();
    const invoke = _ctx.invoke || (window.__TAURI__ ? window.__TAURI__.core.invoke : null);
    if (invoke) {
      try {
        await invoke('abrir_url_externa', { url: href });
      } catch (err) {
        console.error('Error al abrir URL en el navegador externo:', err);
      }
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
}

/**
 * Registra todos los escuchadores de eventos interactivos del visor y editor
 */
export function inicializarEventosReader() {
  if (readerEventsInitialized) return;
  readerEventsInitialized = true;

  const DOM = getDOM();

  if (DOM.editor && DOM.previewContainer) {
    // Rastrear en qué panel se encuentra físicamente el cursor del usuario
    DOM.editor.addEventListener('mouseenter', () => {
      panelBajoCursor = DOM.editor;
    });
    DOM.previewContainer.addEventListener('mouseenter', () => {
      panelBajoCursor = DOM.previewContainer;
    });

    DOM.editor.addEventListener('mousemove', () => {
      if (panelBajoCursor !== DOM.editor) panelBajoCursor = DOM.editor;
    });
    DOM.previewContainer.addEventListener('mousemove', () => {
      if (panelBajoCursor !== DOM.previewContainer) panelBajoCursor = DOM.previewContainer;
    });

    // Sincronización inmaculada de scroll basada únicamente en la acción del panel activo
    DOM.editor.addEventListener('scroll', () => {
      if (panelBajoCursor === DOM.editor) {
        const maxOrigen = DOM.editor.scrollHeight - DOM.editor.clientHeight;
        const pct = maxOrigen > 0 ? DOM.editor.scrollTop / maxOrigen : 0;
        const maxDestino = DOM.previewContainer.scrollHeight - DOM.previewContainer.clientHeight;
        DOM.previewContainer.scrollTop = pct * maxDestino;
      }
    });

    DOM.previewContainer.addEventListener('scroll', () => {
      if (panelBajoCursor === DOM.previewContainer) {
        const maxOrigen = DOM.previewContainer.scrollHeight - DOM.previewContainer.clientHeight;
        const pct = maxOrigen > 0 ? DOM.previewContainer.scrollTop / maxOrigen : 0;
        const maxDestino = DOM.editor.scrollHeight - DOM.editor.clientHeight;
        DOM.editor.scrollTop = pct * maxDestino;
      }
    });
  }

  if (DOM.preview) {
    // Sincronizar foco inverso (Doble clic en Visor selecciona bloque en el Editor)
    DOM.preview.addEventListener('dblclick', (e) => {
      const targetElement = e.target.closest('.markdown-body > *');
      if (!targetElement) return;
      
      const blocks = DOM.preview.querySelectorAll('.markdown-body > *');
      let targetIndex = -1;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i] === targetElement) {
          targetIndex = i;
          break;
        }
      }
      
      if (targetIndex === -1) return;
      
      const text = DOM.editor ? (DOM.editor.value || '') : '';
      const editorBlocks = parseEditorBlocks(text);
      if (editorBlocks.length === 0) return;
      
      const matchedBlock = editorBlocks[Math.min(targetIndex, editorBlocks.length - 1)];
      if (matchedBlock) {
        const lines = text.split('\n');
        
        // Calcular el inicio en caracteres del bloque
        let startChar = 0;
        for (let i = 0; i < matchedBlock.startLine; i++) {
          startChar += lines[i].length + 1;
        }
        
        // Calcular el fin en caracteres del bloque
        let endChar = startChar;
        for (let i = matchedBlock.startLine; i <= matchedBlock.endLine; i++) {
          endChar += lines[i].length + (i === matchedBlock.endLine ? 0 : 1);
        }
        
        // Seleccionar el bloque en el Editor y hacer foco
        if (DOM.editor) {
          DOM.editor.focus();
          DOM.editor.setSelectionRange(startChar, endChar);
          
          // Desplazar suavemente el textarea
          const lineHeight = 24; // Aproximado
          DOM.editor.scrollTop = Math.max(0, (matchedBlock.startLine * lineHeight) - 100);
        }
        
        // Resaltar visualmente el bloque del visor y aplicar temporizador de desvanecimiento
        limpiarResaltadoTemporal();
        targetElement.classList.add('highlighted-block');
        
        highlightTimeoutId = setTimeout(() => {
          if (targetElement) targetElement.classList.remove('highlighted-block');
        }, 1500);
      }
    });

    // Vincular evento mouseup en el visor para disparar la selección sincronizada
    DOM.preview.addEventListener('mouseup', sincronizarSeleccionReaderAEditor);
  }

  // Escuchar tanto clic izquierdo como clic con la rueda del ratón (auxclick)
  document.addEventListener('click', gestionarClicEnlace);
  document.addEventListener('auxclick', (e) => {
    if (e.button === 1) { // Botón del medio del ratón
      gestionarClicEnlace(e);
    }
  });
}
