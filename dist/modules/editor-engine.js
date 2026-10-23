// ==========================================================================
// MÓDULO DE FORMATEO Y ESCRITURA MARKDOWN (EDITOR ENGINE - TAURI v2)
// ==========================================================================

import { translations } from '../utils/i18n.js';

let ctx = {
  DOM: {},
  appState: {},
  renderMarkdown: null,
  setSavedState: null,
  abrirModal: null,
  getHistorial: null
};

export function initEditorEngine(options = {}) {
  ctx = { ...ctx, ...options };
  inicializarAtajosMarkdown();
  actualizarInsigniasAtajos();
}

function getDOM() {
  return {
    editor: (ctx.DOM && ctx.DOM.editor) || document.getElementById('editor')
  };
}

function getAppState() {
  return ctx.appState || window.appState || {};
}

function getHistorial() {
  if (typeof ctx.getHistorial === 'function') return ctx.getHistorial();
  return ctx.historial || null;
}

function abrirModal(modalEl) {
  if (typeof ctx.abrirModal === 'function') {
    ctx.abrirModal(modalEl);
  } else if (modalEl) {
    modalEl.classList.add('active');
  }
}

function renderMarkdown() {
  if (typeof ctx.renderMarkdown === 'function') {
    ctx.renderMarkdown();
  }
}

function setSavedState(state) {
  if (typeof ctx.setSavedState === 'function') {
    ctx.setSavedState(state);
  }
}



export const isMac = typeof navigator !== 'undefined' && (/Mac|iPhone|iPod|iPad/i.test(navigator.platform) || /Macintosh|Mac OS X/i.test(navigator.userAgent));

export const KEYBOARD_SHORTCUTS = {
  'h1': { mac: '⌘1', win: 'Ctrl+1' },
  'h2': { mac: '⌘2', win: 'Ctrl+2' },
  'h3': { mac: '⌘3', win: 'Ctrl+3' },
  'h4': { mac: '⌘4', win: 'Ctrl+4' },
  'h5': { mac: '⌘5', win: 'Ctrl+5' },
  'h6': { mac: '⌘6', win: 'Ctrl+6' },
  'bold': { mac: '⌘B', win: 'Ctrl+B' },
  'italic': { mac: '⌘I', win: 'Ctrl+I' },
  'underline': { mac: '⌘U', win: 'Ctrl+U' },
  'strikethrough': { mac: '⇧⌘S', win: 'Ctrl+Shift+S' },
  'highlight': { mac: '⌘H', win: 'Ctrl+H' },
  'superscript': { mac: '⌘^', win: 'Ctrl+.' },
  'subscript': { mac: '⌘_', win: 'Ctrl+,' },
  'ul': { mac: '⌃U', win: 'Ctrl+U' },
  'ol': { mac: '⇧⌃U', win: 'Ctrl+Shift+O' },
  'task': { mac: '⇧⌘T', win: 'Ctrl+Shift+T' },
  'link': { mac: '⇧⌘L', win: 'Ctrl+Shift+L' },
  'image': { mac: '⇧⌘I', win: 'Ctrl+Shift+I' },
  'email': { mac: '⇧⌘M', win: 'Ctrl+Shift+M' },
  'blockquote': { mac: '⇧⌘B', win: 'Ctrl+Shift+Q' },
  'callout': { mac: '⇧⌘A', win: 'Ctrl+Shift+A' },
  'hr': { mac: '⌥⇧S', win: 'Alt+Shift+S' },
  'table': { mac: '⌘T', win: 'Ctrl+T' },
  'comment': { mac: '⌘/', win: 'Ctrl+/' },
  'code-block': { mac: '⇧⌘K', win: 'Ctrl+Shift+K' },
  'inline-code': { mac: '⌘K', win: 'Ctrl+K' },
  'inline-math': { mac: '⌃K', win: 'Alt+K' },
  'block-math': { mac: '⇧⌃K', win: 'Alt+Shift+K' },
  'footnote': { mac: '⇧⌘F', win: 'Ctrl+Shift+F' },
  'definition-list': { mac: '⇧⌘D', win: 'Ctrl+Shift+D' },
  'details': { mac: '⌥⌘D', win: 'Ctrl+Alt+D' }
};

export function actualizarInsigniasAtajos() {
  document.querySelectorAll('.shortcut-badge').forEach(badge => {
    const syntax = badge.getAttribute('data-syntax');
    if (syntax && KEYBOARD_SHORTCUTS[syntax]) {
      badge.textContent = isMac ? KEYBOARD_SHORTCUTS[syntax].mac : KEYBOARD_SHORTCUTS[syntax].win;
    }
  });
}

function obtenerLimitesLinea(text, pos) {
  let lineStart = text.lastIndexOf('\n', pos - 1);
  lineStart = lineStart === -1 ? 0 : lineStart + 1;
  let lineEnd = text.indexOf('\n', pos);
  if (lineEnd === -1) lineEnd = text.length;
  return { lineStart, lineEnd, lineText: text.substring(lineStart, lineEnd) };
}

function obtenerLimitesBloqueLineas(text, start, end) {
  const effectiveEnd = (end > start && text.charAt(end - 1) === '\n') ? end - 1 : end;
  const { lineStart } = obtenerLimitesLinea(text, start);
  const { lineEnd } = obtenerLimitesLinea(text, effectiveEnd);
  return { lineStart, lineEnd, blockText: text.substring(lineStart, lineEnd) };
}

function esDelimitadorExternoValido(text, s, e, open, close) {
  if (s < open.length || e + close.length > text.length) return false;
  if (text.substring(s - open.length, s) !== open) return false;
  if (text.substring(e, e + close.length) !== close) return false;

  // Evitar confundir * con ** (a menos que sea ***)
  if (open === '*') {
    const before2 = s >= 2 ? text.charAt(s - 2) : '';
    const before3 = s >= 3 ? text.charAt(s - 3) : '';
    if (before2 === '*' && before3 !== '*') return false;
    const after2 = e + 1 < text.length ? text.charAt(e + 1) : '';
    const after3 = e + 2 < text.length ? text.charAt(e + 2) : '';
    if (after2 === '*' && after3 !== '*') return false;
  }
  // Evitar confundir ~ con ~~ (a menos que sea ~~~)
  if (open === '~') {
    const before2 = s >= 2 ? text.charAt(s - 2) : '';
    const before3 = s >= 3 ? text.charAt(s - 3) : '';
    if (before2 === '~' && before3 !== '~') return false;
    const after2 = e + 1 < text.length ? text.charAt(e + 1) : '';
    const after3 = e + 2 < text.length ? text.charAt(e + 2) : '';
    if (after2 === '~' && after3 !== '~') return false;
  }
  // Evitar confundir ` con ```
  if (open === '`') {
    if (s >= 2 && text.charAt(s - 2) === '`') return false;
    if (e + 1 < text.length && text.charAt(e + 1) === '`') return false;
  }
  // Evitar confundir $ con $$
  if (open === '$') {
    if (s >= 2 && text.charAt(s - 2) === '$') return false;
    if (e + 1 < text.length && text.charAt(e + 1) === '$') return false;
  }
  return true;
}

function tieneDelimitadorInternoValido(str, open, close) {
  if (str.length < open.length + close.length) return false;
  if (!str.startsWith(open) || !str.endsWith(close)) return false;

  if (open === '*') {
    if (str.startsWith('**') && !str.startsWith('***')) return false;
    if (str.endsWith('**') && !str.endsWith('***')) return false;
  }
  if (open === '~') {
    if (str.startsWith('~~') && !str.startsWith('~~~')) return false;
    if (str.endsWith('~~') && !str.endsWith('~~~')) return false;
  }
  if (open === '`') {
    if (str.startsWith('``')) return false;
    if (str.endsWith('``')) return false;
  }
  if (open === '$') {
    if (str.startsWith('$$')) return false;
    if (str.endsWith('$$')) return false;
  }
  return true;
}

export function insertarSintaxisMarkdown(tipo) {
  const historial = getHistorial(); if (historial) {
    historial.registrarCambioAntesDeFormato();
  }

  const t = translations[appState.language] || translations.es || {};
  const textarea = DOM.editor;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalText = textarea.value;
  const rawSelection = originalText.substring(start, end);
  
  const leadingSpaces = rawSelection.match(/^\s*/)[0];
  const trailingSpaces = rawSelection.match(/\s*$/)[0];
  const selectedText = rawSelection.trim();
  const leadingLength = leadingSpaces.length;
  const trailingLength = trailingSpaces.length;

  const finalizar = () => {
    renderMarkdown();
    setSavedState(false);
    DOM.editor.focus();
    if (historial) {
      historial.registrarCambioDespuesDeFormato();
    }
  };

  // =========================================================================
  // 1. CATEGORÍA: HEADINGS (H1 - H6) CON TOGGLE
  // =========================================================================
  const headingMap = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ' };
  if (headingMap[tipo]) {
    const headingPrefix = headingMap[tipo];
    const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);
    const match = lineText.match(/^(#{1,6}\s+)/);

    let nuevoTexto = '';
    let offset = 0;

    if (match && match[1] === headingPrefix) {
      // Toggle Off: ya tiene exactamente el mismo Heading -> quitarlo por completo
      nuevoTexto = lineText.substring(headingPrefix.length);
      offset = -headingPrefix.length;
    } else if (match) {
      // Ya tiene otro Heading distinto -> reemplazar nivel
      const oldPrefix = match[1];
      nuevoTexto = headingPrefix + lineText.substring(oldPrefix.length);
      offset = headingPrefix.length - oldPrefix.length;
    } else {
      // No tiene Heading -> aplicarlo al inicio de la línea
      nuevoTexto = headingPrefix + lineText;
      offset = headingPrefix.length;
    }

    textarea.setRangeText(nuevoTexto, lineStart, lineEnd, 'select');
    if (start === end) {
      const newCursor = Math.max(lineStart, Math.min(lineStart + nuevoTexto.length, start + offset));
      textarea.setSelectionRange(newCursor, newCursor);
    } else {
      const newSelStart = Math.max(lineStart, start + offset);
      const newSelEnd = Math.max(newSelStart, Math.min(lineStart + nuevoTexto.length, end + offset));
      textarea.setSelectionRange(newSelStart, newSelEnd);
    }
    finalizar();
    return;
  }

  // =========================================================================
  // 2. CATEGORÍA: BASIC TEXT + COMENTARIO OCULTO (INLINE WRAPPERS)
  // =========================================================================
  const basicWrappers = {
    'bold': { open: '**', close: '**' },
    'italic': { open: '*', close: '*' },
    'underline': { open: '<u>', close: '</u>' },
    'strikethrough': { open: '~~', close: '~~' },
    'highlight': { open: '==', close: '==' },
    'superscript': { open: '^', close: '^' },
    'subscript': { open: '~', close: '~' },
    'comment': { open: '<!-- ', close: ' -->' }
  };

  if (basicWrappers[tipo]) {
    const { open, close } = basicWrappers[tipo];

    if (rawSelection.length > 0) {
      const selStart = start + leadingLength;
      const selEnd = end - trailingLength;
      const cleanSel = originalText.substring(selStart, selEnd);

      // Caso 1A: La selección ya incluye los tags por dentro -> Quitar tags
      if (tieneDelimitadorInternoValido(cleanSel, open, close)) {
        const unwrapped = cleanSel.substring(open.length, cleanSel.length - close.length);
        textarea.setRangeText(unwrapped, selStart, selEnd, 'select');
        textarea.setSelectionRange(selStart, selStart + unwrapped.length);
        finalizar();
        return;
      }

      // Caso 1B: Los tags están inmediatamente por fuera de la selección -> Quitar tags
      if (esDelimitadorExternoValido(originalText, selStart, selEnd, open, close)) {
        textarea.setRangeText(cleanSel, selStart - open.length, selEnd + close.length, 'select');
        const newPos = selStart - open.length;
        textarea.setSelectionRange(newPos, newPos + cleanSel.length);
        finalizar();
        return;
      }

      // Caso 1C: Aplicar formato a la selección
      const wrapped = open + cleanSel + close;
      textarea.setRangeText(wrapped, selStart, selEnd, 'select');
      textarea.setSelectionRange(selStart + open.length, selStart + open.length + cleanSel.length);
      finalizar();
      return;
    } else {
      // Sin selección (start === end)
      // Caso 2A: El cursor está justo en medio de tags vacíos (ej. **|**) -> Quitar tags
      if (esDelimitadorExternoValido(originalText, start, start, open, close)) {
        textarea.setRangeText('', start - open.length, start + close.length, 'end');
        finalizar();
        return;
      }

      // Caso 2B: Verificar si el cursor está en medio o pegado a una palabra
      const wordCharRegex = /[\p{L}\p{N}_]/u;
      let wStart = start;
      let wEnd = start;
      while (wStart > 0 && wordCharRegex.test(originalText.charAt(wStart - 1))) {
        wStart--;
      }
      while (wEnd < originalText.length && wordCharRegex.test(originalText.charAt(wEnd))) {
        wEnd++;
      }

      if (wStart < wEnd) {
        // El cursor está en una palabra: comprobar si la palabra ya tiene este formato
        if (esDelimitadorExternoValido(originalText, wStart, wEnd, open, close)) {
          const word = originalText.substring(wStart, wEnd);
          textarea.setRangeText(word, wStart - open.length, wEnd + close.length, 'select');
          const newCursor = Math.max(wStart - open.length, start - open.length);
          textarea.setSelectionRange(newCursor, newCursor);
          finalizar();
          return;
        } else {
          // Encerrar la palabra completa con el formato
          const word = originalText.substring(wStart, wEnd);
          const wrappedWord = open + word + close;
          textarea.setRangeText(wrappedWord, wStart, wEnd, 'select');
          const newCursor = start + open.length;
          textarea.setSelectionRange(newCursor, newCursor);
          finalizar();
          return;
        }
      }

      // Caso 2C: Comprobar si el cursor está dentro de un bloque en la misma línea ya envuelto por open...close
      const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);
      const relPos = start - lineStart;
      const beforeCursor = lineText.substring(0, relPos);
      const afterCursor = lineText.substring(relPos);
      const lastOpen = beforeCursor.lastIndexOf(open);
      const firstClose = afterCursor.indexOf(close);
      if (lastOpen !== -1 && firstClose !== -1) {
        const absOpenStart = lineStart + lastOpen;
        const absInnerStart = absOpenStart + open.length;
        const absInnerEnd = start + firstClose;
        if (esDelimitadorExternoValido(originalText, absInnerStart, absInnerEnd, open, close)) {
          const innerContent = originalText.substring(absInnerStart, absInnerEnd);
          textarea.setRangeText(innerContent, absOpenStart, absInnerEnd + close.length, 'select');
          const newCursor = Math.max(absOpenStart, start - open.length);
          textarea.setSelectionRange(newCursor, newCursor);
          finalizar();
          return;
        }
      }

      // Caso 2D: Espacio vacío -> insertar apertura y cierre y posicionar cursor al medio
      const textInsert = open + close;
      textarea.setRangeText(textInsert, start, start, 'select');
      textarea.setSelectionRange(start + open.length, start + open.length);
      finalizar();
      return;
    }
  }

  // =========================================================================
  // 3. CATEGORÍA: LISTAS (UL, OL, TASK) AL INICIO DE LÍNEA Y CON TOGGLE
  // =========================================================================
  if (tipo === 'ul' || tipo === 'ol' || tipo === 'task') {
    const { lineStart, lineEnd, blockText } = obtenerLimitesBloqueLineas(originalText, start, end);
    const lineas = blockText.split('\n');

    const regexTask = /^(\s*)(-\s+\[[ xX]\]\s+)/;
    const regexUl = /^(\s*)([-*+]\s+)(?!\[[ xX]\])/;
    const regexOl = /^(\s*)(\d+\.\s+)/;
    const regexAnyList = /^(\s*)(-\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/;

    const esTarget = (l) => {
      if (tipo === 'task') return regexTask.test(l);
      if (tipo === 'ul') return regexUl.test(l);
      if (tipo === 'ol') return regexOl.test(l);
      return false;
    };

    const nonEmptyLines = lineas.filter(l => l.trim().length > 0);
    const checkPool = nonEmptyLines.length > 0 ? nonEmptyLines : lineas;
    const todasTienenTarget = checkPool.length > 0 && checkPool.every(esTarget);

    let nuevasLineas;
    if (todasTienenTarget) {
      // Toggle Off: Quitar el tag de lista de las líneas
      nuevasLineas = lineas.map(l => {
        if (tipo === 'task') return l.replace(regexTask, '$1');
        if (tipo === 'ul') return l.replace(regexUl, '$1');
        if (tipo === 'ol') return l.replace(regexOl, '$1');
        return l;
      });
    } else {
      // Aplicar (o reemplazar otro tipo de lista previo) al inicio de cada línea
      let count = 1;
      nuevasLineas = lineas.map(l => {
        if (lineas.length > 1 && l.trim().length === 0) return l;
        const prefix = tipo === 'ul' ? '- ' : (tipo === 'task' ? '- [ ] ' : `${count++}. `);
        if (regexAnyList.test(l)) {
          return l.replace(regexAnyList, `$1${prefix}`);
        }
        return prefix + l;
      });
    }

    const finalBlock = nuevasLineas.join('\n');
    const diff = finalBlock.length - blockText.length;
    textarea.setRangeText(finalBlock, lineStart, lineEnd, 'select');
    if (start === end) {
      const newPos = Math.max(lineStart, Math.min(lineStart + finalBlock.length, start + diff));
      textarea.setSelectionRange(newPos, newPos);
    } else {
      textarea.setSelectionRange(lineStart, lineStart + finalBlock.length);
    }
    finalizar();
    return;
  }

  // =========================================================================
  // 4. CATEGORÍA: LINKS & MEDIA (WEB LINK, IMAGE, EMAIL) CON TOGGLE
  // =========================================================================
  if (tipo === 'link' || tipo === 'image') {
    const isImage = tipo === 'image';
    const textPh = isImage ? (t.ph_image_alt || 'texto_alternativo') : (t.ph_link_text || 'texto');
    const urlPh = isImage ? (t.ph_image_url || 'url_imagen') : (t.ph_link_url || 'url');
    const openBracket = isImage ? '![' : '[';

    // 1. Verificar Toggle: ¿El cursor o la selección ya está dentro o cubriendo este tag en la línea actual?
    const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);
    const tagRegex = isImage ? /!\[([^\]]*)\]\(([^)]*)\)/g : /(?<!!)\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = tagRegex.exec(lineText)) !== null) {
      const mStart = lineStart + match.index;
      const mEnd = mStart + match[0].length;
      if ((start >= mStart && end <= mEnd) || (start <= mStart && end >= mEnd)) {
        const innerLabel = match[1];
        const innerUrl = match[2];
        let replacement = '';
        if (innerLabel === textPh && innerUrl === urlPh) {
          replacement = '';
        } else if (innerUrl && innerUrl !== urlPh) {
          replacement = innerUrl;
        } else {
          replacement = innerLabel;
        }
        textarea.setRangeText(replacement, mStart, mEnd, 'select');
        textarea.setSelectionRange(mStart, mStart + replacement.length);
        finalizar();
        return;
      }
    }

    // 2. Si hay texto seleccionado: usar la selección en reemplazo de la palabra URL
    if (rawSelection.length > 0) {
      const selStart = start + leadingLength;
      const selEnd = end - trailingLength;
      const formatted = `${openBracket}${textPh}](${selectedText})`;
      textarea.setRangeText(formatted, selStart, selEnd, 'select');
      // Dejar seleccionado el texto descriptivo por si desea editarlo, o listo
      const labelStart = selStart + openBracket.length;
      textarea.setSelectionRange(labelStart, labelStart + textPh.length);
      finalizar();
      return;
    }

    // 3. En espacio vacío: insertar tag y seleccionar SOLO la palabra URL dentro de los paréntesis
    const inserted = `${openBracket}${textPh}](${urlPh})`;
    textarea.setRangeText(inserted, start, start, 'select');
    const urlSelectStart = start + openBracket.length + textPh.length + 2; // después de "]("
    const urlSelectEnd = urlSelectStart + urlPh.length; // antes de ")"
    textarea.setSelectionRange(urlSelectStart, urlSelectEnd);
    finalizar();
    return;
  }

  if (tipo === 'email') {
    const emailPh = t.ph_email || 'correo@ejemplo.com';

    // 1. Verificar Toggle: ¿El cursor o selección está en un <correo>?
    const { lineStart, lineText } = obtenerLimitesLinea(originalText, start);
    const emailRegex = /<([^<>\s]+@[^<>\s]+)>/g;
    let match;
    while ((match = emailRegex.exec(lineText)) !== null) {
      const mStart = lineStart + match.index;
      const mEnd = mStart + match[0].length;
      if ((start >= mStart && end <= mEnd) || (start <= mStart && end >= mEnd)) {
        const innerEmail = match[1];
        const replacement = innerEmail === emailPh ? '' : innerEmail;
        textarea.setRangeText(replacement, mStart, mEnd, 'select');
        textarea.setSelectionRange(mStart, mStart + replacement.length);
        finalizar();
        return;
      }
    }

    // 2. Con texto seleccionado: asumir que es un correo y encerrarlo en <...>, seleccionando el correo adentro
    if (rawSelection.length > 0) {
      const selStart = start + leadingLength;
      const selEnd = end - trailingLength;
      const cleanEmail = selectedText.replace(/^[<\s]+|[>\s]+$/g, '');
      const inserted = `<${cleanEmail}>`;
      textarea.setRangeText(inserted, selStart, selEnd, 'select');
      textarea.setSelectionRange(selStart + 1, selStart + 1 + cleanEmail.length);
      finalizar();
      return;
    }

    // 3. En espacio vacío: insertar <correo@ejemplo.com> y seleccionar SOLO correo@ejemplo.com dentro de <>
    const inserted = `<${emailPh}>`;
    textarea.setRangeText(inserted, start, start, 'select');
    textarea.setSelectionRange(start + 1, start + 1 + emailPh.length);
    finalizar();
    return;
  }

  // =========================================================================
  // 5. CATEGORÍA: BLOCKS & STRUCTURE (BLOCKQUOTE, CALLOUT, HR, TABLE)
  // =========================================================================
  if (tipo === 'blockquote') {
    const { lineStart, lineEnd, blockText } = obtenerLimitesBloqueLineas(originalText, start, end);
    const lineas = blockText.split('\n');
    const regexQuote = /^(\s*)>\s?/;

    const nonEmpty = lineas.filter(l => l.trim().length > 0);
    const pool = nonEmpty.length > 0 ? nonEmpty : lineas;
    const todasSonCita = pool.length > 0 && pool.every(l => regexQuote.test(l) && !/^\s*>\s*\[![A-Z]+\]/i.test(l));

    let nuevasLineas;
    if (todasSonCita) {
      // Toggle Off: quitar "> "
      nuevasLineas = lineas.map(l => l.replace(regexQuote, '$1'));
    } else {
      // Aplicar "> " al inicio de cada línea
      nuevasLineas = lineas.map(l => {
        if (lineas.length > 1 && l.trim().length === 0) return l;
        return regexQuote.test(l) ? l : `> ${l}`;
      });
    }

    const finalBlock = nuevasLineas.join('\n');
    const diff = finalBlock.length - blockText.length;
    textarea.setRangeText(finalBlock, lineStart, lineEnd, 'select');
    if (start === end) {
      const newPos = Math.max(lineStart, Math.min(lineStart + finalBlock.length, start + diff));
      textarea.setSelectionRange(newPos, newPos);
    } else {
      textarea.setSelectionRange(lineStart, lineStart + finalBlock.length);
    }
    finalizar();
    return;
  }

  if (tipo === 'callout') {
    const { lineStart, lineEnd } = obtenerLimitesBloqueLineas(originalText, start, end);
    const allLines = originalText.split('\n');
    // Encontrar índices de línea
    let startLineIdx = originalText.substring(0, lineStart).split('\n').length - 1;
    let endLineIdx = originalText.substring(0, lineEnd).split('\n').length - 1;

    // Expandir hacia arriba y abajo si estamos dentro de un bloque "> " que comienza con "> [!..."
    let topIdx = startLineIdx;
    while (topIdx > 0 && /^\s*>/.test(allLines[topIdx]) && /^\s*>/.test(allLines[topIdx - 1])) {
      topIdx--;
    }
    if (/^\s*>\s*\[![A-Z]+\]/i.test(allLines[topIdx])) {
      let botIdx = Math.max(endLineIdx, topIdx);
      while (botIdx + 1 < allLines.length && /^\s*>/.test(allLines[botIdx + 1])) {
        botIdx++;
      }
      // Calcular posiciones absolutas de topIdx..botIdx
      const absStart = topIdx === 0 ? 0 : allLines.slice(0, topIdx).join('\n').length + 1;
      const absEnd = allLines.slice(0, botIdx + 1).join('\n').length;
      const contentLines = allLines.slice(topIdx + 1, botIdx + 1).map(l => l.replace(/^(\s*)>\s?/, '$1'));
      const restored = contentLines.join('\n');
      textarea.setRangeText(restored, absStart, absEnd, 'select');
      textarea.setSelectionRange(absStart, absStart + restored.length);
      finalizar();
      return;
    }

    // No estaba en un Callout -> Aplicarlo al inicio de la línea o párrafo
    const blockText = originalText.substring(lineStart, lineEnd);
    if (blockText.trim().length === 0) {
      const insert = '> [!NOTE]\n> ';
      textarea.setRangeText(insert, lineStart, lineEnd, 'select');
      const pos = lineStart + insert.length;
      textarea.setSelectionRange(pos, pos);
    } else {
      const lineas = blockText.split('\n').map(l => /^\s*>\s?/.test(l) ? l : `> ${l}`);
      const finalBlock = '> [!NOTE]\n' + lineas.join('\n');
      textarea.setRangeText(finalBlock, lineStart, lineEnd, 'select');
      textarea.setSelectionRange(lineStart + '> [!NOTE]\n> '.length, lineStart + finalBlock.length);
    }
    finalizar();
    return;
  }

  if (tipo === 'hr') {
    const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);

    // Toggle Off Caso 1: La línea actual es "---"
    if (lineText.trim() === '---') {
      const deleteEnd = (lineEnd < originalText.length && originalText.charAt(lineEnd) === '\n') ? lineEnd + 1 : lineEnd;
      textarea.setRangeText('', lineStart, deleteEnd, 'select');
      textarea.setSelectionRange(lineStart, lineStart);
      finalizar();
      return;
    }

    // Toggle Off Caso 2: La línea inmediatamente superior es "---"
    if (lineStart >= 4) {
      const prevLine = obtenerLimitesLinea(originalText, lineStart - 1);
      if (prevLine.lineText.trim() === '---') {
        const removedLen = lineStart - prevLine.lineStart;
        textarea.setRangeText('', prevLine.lineStart, lineStart, 'select');
        const newPos = Math.max(prevLine.lineStart, start - removedLen);
        textarea.setSelectionRange(newPos, newPos);
        finalizar();
        return;
      }
    }

    // Aplicar HR: si la línea está vacía se inserta "---", si tiene texto se inserta "---\n" al inicio de la línea
    if (lineText.trim().length === 0) {
      textarea.setRangeText('---', lineStart, lineEnd, 'select');
      textarea.setSelectionRange(lineStart + 3, lineStart + 3);
    } else {
      textarea.setRangeText('---\n', lineStart, lineStart, 'select');
      textarea.setSelectionRange(start + 4, start + 4);
    }
    finalizar();
    return;
  }

  if (tipo === 'table') {
    const h1 = t.ph_table_h1 || 'Encabezado 1';
    const h2 = t.ph_table_h2 || 'Encabezado 2';
    const c1 = t.ph_table_c1 || 'Celda 1';
    const c2 = t.ph_table_c2 || 'Celda 2';
    const sep1 = '-'.repeat(Math.max(12, h1.length));
    const sep2 = '-'.repeat(Math.max(12, h2.length));
    const tableStr = `| ${h1.padEnd(sep1.length)} | ${h2.padEnd(sep2.length)} |\n| ${sep1} | ${sep2} |\n| ${c1.padEnd(sep1.length)} | ${c2.padEnd(sep2.length)} |`;
    textarea.setRangeText(tableStr, start, end, 'end');
    finalizar();
    return;
  }

  // =========================================================================
  // 6. CATEGORÍA: CODE & MATH (INLINE-CODE, INLINE-MATH, CODE-BLOCK, BLOCK-MATH)
  // =========================================================================
  if (tipo === 'inline-code' || tipo === 'inline-math') {
    const marker = tipo === 'inline-code' ? '`' : '$';

    // Con selección previa
    if (rawSelection.length > 0) {
      const selStart = start + leadingLength;
      const selEnd = end - trailingLength;
      const cleanSel = originalText.substring(selStart, selEnd);

      if (tieneDelimitadorInternoValido(cleanSel, marker, marker)) {
        const unwrapped = cleanSel.substring(marker.length, cleanSel.length - marker.length);
        textarea.setRangeText(unwrapped, selStart, selEnd, 'select');
        textarea.setSelectionRange(selStart, selStart + unwrapped.length);
        finalizar();
        return;
      }
      if (esDelimitadorExternoValido(originalText, selStart, selEnd, marker, marker)) {
        textarea.setRangeText(cleanSel, selStart - marker.length, selEnd + marker.length, 'select');
        const newPos = selStart - marker.length;
        textarea.setSelectionRange(newPos, newPos + cleanSel.length);
        finalizar();
        return;
      }

      const wrapped = marker + cleanSel + marker;
      textarea.setRangeText(wrapped, selStart, selEnd, 'select');
      textarea.setSelectionRange(selStart + marker.length, selStart + marker.length + cleanSel.length);
      finalizar();
      return;
    }

    // Sin selección
    // 1. ¿Está justo entre dos marcadores vacíos (`|` o $|$)?
    if (esDelimitadorExternoValido(originalText, start, start, marker, marker)) {
      textarea.setRangeText('', start - marker.length, start + marker.length, 'end');
      finalizar();
      return;
    }

    const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);

    // 2. Si la línea está vacía -> insertar par en el cursor
    if (lineText.trim().length === 0) {
      textarea.setRangeText(marker + marker, start, start, 'select');
      textarea.setSelectionRange(start + marker.length, start + marker.length);
      finalizar();
      return;
    }

    // 3. Si la línea tiene texto: comprobar si la línea ya está envuelta al inicio y al final con el marcador
    const leadLineSpaces = lineText.match(/^\s*/)[0];
    const trailLineSpaces = lineText.match(/\s*$/)[0];
    const trimmedLine = lineText.trim();
    const contentStart = lineStart + leadLineSpaces.length;
    const contentEnd = lineEnd - trailLineSpaces.length;

    if (tieneDelimitadorInternoValido(trimmedLine, marker, marker)) {
      // Toggle Off en toda la línea
      const unwrapped = trimmedLine.substring(marker.length, trimmedLine.length - marker.length);
      textarea.setRangeText(unwrapped, contentStart, contentEnd, 'select');
      const newCursor = Math.max(contentStart, Math.min(contentStart + unwrapped.length, start - marker.length));
      textarea.setSelectionRange(newCursor, newCursor);
      finalizar();
      return;
    }

    // También comprobar si el cursor está dentro de un fragmento `...` o $...$ dentro de la línea
    const relPos = start - lineStart;
    const before = lineText.substring(0, relPos);
    const after = lineText.substring(relPos);
    const lastOpen = before.lastIndexOf(marker);
    const firstClose = after.indexOf(marker);
    if (lastOpen !== -1 && firstClose !== -1) {
      const absInnerStart = lineStart + lastOpen + marker.length;
      const absInnerEnd = start + firstClose;
      if (esDelimitadorExternoValido(originalText, absInnerStart, absInnerEnd, marker, marker)) {
        const inner = originalText.substring(absInnerStart, absInnerEnd);
        textarea.setRangeText(inner, absInnerStart - marker.length, absInnerEnd + marker.length, 'select');
        const newCursor = Math.max(absInnerStart - marker.length, start - marker.length);
        textarea.setSelectionRange(newCursor, newCursor);
        finalizar();
        return;
      }
    }

    // Aplicar marcador al inicio y al final del texto de la línea
    const wrappedLine = marker + trimmedLine + marker;
    textarea.setRangeText(wrappedLine, contentStart, contentEnd, 'select');
    const newCursor = start + marker.length;
    textarea.setSelectionRange(newCursor, newCursor);
    finalizar();
    return;
  }

  if (tipo === 'code-block' || tipo === 'block-math') {
    const isCode = tipo === 'code-block';
    const openFence = isCode ? '```javascript\n' : '$$\n';
    const closeFence = isCode ? '\n```' : '\n$$';
    const blockRegex = isCode
      ? /```[^\n]*\n([\s\S]*?)\n```/g
      : /\$\$\n([\s\S]*?)\n\$\$/g;

    // 1. Verificar Toggle: ¿El cursor o selección ya se encuentra dentro o cubriendo un bloque?
    let match;
    while ((match = blockRegex.exec(originalText)) !== null) {
      const mStart = match.index;
      const mEnd = mStart + match[0].length;
      if ((start >= mStart && end <= mEnd) || (start <= mStart && end >= mEnd)) {
        const innerContent = match[1];
        textarea.setRangeText(innerContent, mStart, mEnd, 'select');
        textarea.setSelectionRange(mStart, mStart + innerContent.length);
        finalizar();
        return;
      }
    }

    // 2. Si hay selección previa: envolver la selección
    if (rawSelection.length > 0) {
      const selStart = start + leadingLength;
      const selEnd = end - trailingLength;
      const wrapped = openFence + selectedText + closeFence;
      textarea.setRangeText(wrapped, selStart, selEnd, 'select');
      textarea.setSelectionRange(selStart + openFence.length, selStart + openFence.length + selectedText.length);
      finalizar();
      return;
    }

    // 3. Sin selección: revisar si hay texto en la línea actual
    const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);
    if (lineText.trim().length === 0) {
      const emptyBlock = openFence + closeFence;
      textarea.setRangeText(emptyBlock, start, start, 'select');
      textarea.setSelectionRange(start + openFence.length, start + openFence.length);
    } else {
      // Abrir tag al inicio de la línea y cerrarlo al final de la línea
      const wrappedLine = openFence + lineText + closeFence;
      textarea.setRangeText(wrappedLine, lineStart, lineEnd, 'select');
      const newCursor = start + openFence.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }
    finalizar();
    return;
  }

  // =========================================================================
  // 7. CATEGORÍA: ADVANCED ELEMENTS (FOOTNOTE, DEFINITION-LIST, DETAILS)
  // =========================================================================
  if (tipo === 'footnote') {
    const descBase = t.ph_footnote_desc || 'Descripción de la nota';
    const { lineStart, lineEnd, lineText } = obtenerLimitesLinea(originalText, start);

    // 1. Verificar Toggle:
    // Caso A: ¿Está el cursor en una línea de definición "[^n]: ..."?
    const defLineMatch = lineText.match(/^\[\^(\d+)\]:\s*(.*)$/);
    // Caso B: ¿Contiene la línea actual o la selección una llamada "[^n]"?
    const refInLineMatch = lineText.match(/\[\^(\d+)\]/);

    const toggleNum = defLineMatch ? defLineMatch[1] : (refInLineMatch ? refInLineMatch[1] : null);
    if (toggleNum !== null) {
      let newDoc = originalText;
      // Eliminar la definición [^n]: ...
      const removeDefRegex = new RegExp(`\\n*\\[\\^${toggleNum}\\]:[^\\n]*`, 'g');
      newDoc = newDoc.replace(removeDefRegex, '');
      // Eliminar la referencia [^n]
      const removeRefRegex = new RegExp(`\\[\\^${toggleNum}\\]`, 'g');
      newDoc = newDoc.replace(removeRefRegex, '');
      textarea.value = newDoc;
      const safePos = Math.min(start, newDoc.length);
      textarea.setSelectionRange(safePos, safePos);
      finalizar();
      return;
    }

    // 2. Calcular el siguiente número disponible de nota al pie
    const numbers = Array.from(originalText.matchAll(/\[\^(\d+)\]/g)).map(m => parseInt(m[1], 10));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const marker = `[^${nextNum}]`;

    // 3. Insertar [^n] al final de la selección (sin borrarla) o al final de la línea actual
    const insertPos = rawSelection.length > 0 ? (end - trailingLength) : lineEnd;
    textarea.setRangeText(marker, insertPos, insertPos, 'end');

    // 4. Agregar la definición al final del documento y dejar seleccionado "Descripción de la nota N"
    const updatedText = textarea.value;
    const descWithNum = `${descBase} ${nextNum}`;
    const defPrefix = `[^${nextNum}]: `;
    const hasNewLine = updatedText.endsWith('\n');
    const extraBreak = updatedText.length > 0 && !hasNewLine ? '\n\n' : (updatedText.endsWith('\n\n') ? '' : '\n');
    const fullDoc = updatedText + extraBreak + defPrefix + descWithNum;
    textarea.value = fullDoc;

    const selDescStart = fullDoc.length - descWithNum.length;
    const selDescEnd = fullDoc.length;
    textarea.setSelectionRange(selDescStart, selDescEnd);
    finalizar();
    return;
  }

  if (tipo === 'definition-list') {
    const termPh = t.ph_def_term || 'Término';
    const descPh = t.ph_def_desc || 'Definición';

    let { lineStart, lineEnd, blockText } = obtenerLimitesBloqueLineas(originalText, start, end);

    // Si es una sola línea que no empieza con ": ", mirar si la línea inmediatamente siguiente empieza con ": "
    if (!blockText.includes('\n') && !/^\s*:\s+/.test(blockText) && lineEnd < originalText.length) {
      const nextLine = obtenerLimitesLinea(originalText, lineEnd + 1);
      if (/^\s*:\s+/.test(nextLine.lineText)) {
        lineEnd = nextLine.lineEnd;
        blockText = originalText.substring(lineStart, lineEnd);
      }
    }
    // Si estamos en la línea ": Definición", incluir también la línea del término arriba si existe
    if (!blockText.includes('\n') && /^\s*:\s+/.test(blockText) && lineStart > 0) {
      const prevLine = obtenerLimitesLinea(originalText, lineStart - 1);
      if (prevLine.lineText.trim().length > 0 && !/^\s*:\s+/.test(prevLine.lineText)) {
        lineStart = prevLine.lineStart;
        blockText = originalText.substring(lineStart, lineEnd);
      }
    }

    const lineas = blockText.split('\n');
    const tieneDefinicion = lineas.some(l => /^\s*:\s+/.test(l));

    if (tieneDefinicion) {
      // Toggle Off:
      // Si es el bloque por defecto intacto "Término\n: Definición" -> borrar todo
      if (lineas.length === 2 && lineas[0].trim() === termPh && lineas[1].trim() === `: ${descPh}`) {
        textarea.setRangeText('', lineStart, lineEnd, 'select');
        textarea.setSelectionRange(lineStart, lineStart);
      } else if (lineas.length === 2 && lineas[1].trim() === `: ${descPh}`) {
        // Si la segunda línea era solo el placeholder ": Definición", dejar únicamente el término original
        textarea.setRangeText(lineas[0], lineStart, lineEnd, 'select');
        textarea.setSelectionRange(lineStart + lineas[0].length, lineStart + lineas[0].length);
      } else {
        // Quitar el prefijo ": " de las líneas de definición
        const limpias = lineas.map(l => l.replace(/^(\s*):\s+/, '$1')).join('\n');
        textarea.setRangeText(limpias, lineStart, lineEnd, 'select');
        textarea.setSelectionRange(lineStart, lineStart + limpias.length);
      }
      finalizar();
      return;
    }

    // Aplicar Lista de Definición:
    if (blockText.trim().length === 0) {
      // Caso 1: Línea vacía -> insertar "Término\n: Definición" y seleccionar "Término"
      const tpl = `${termPh}\n: ${descPh}`;
      textarea.setRangeText(tpl, lineStart, lineEnd, 'select');
      textarea.setSelectionRange(lineStart, lineStart + termPh.length);
    } else if (lineas.length === 1) {
      // Caso 2: Una sola línea con texto -> esa línea es el Término, añadir debajo "\n: Definición" y seleccionar "Definición"
      const suffixDef = `\n: ${descPh}`;
      textarea.setRangeText(suffixDef, lineEnd, lineEnd, 'select');
      const defStart = lineEnd + 3; // después de "\n: "
      textarea.setSelectionRange(defStart, defStart + descPh.length);
    } else {
      // Caso 3: Múltiples líneas seleccionadas -> primera línea es Término, las siguientes llevan ": "
      const formateadas = lineas.map((l, idx) => {
        if (l.trim().length === 0) return l;
        if (idx === 0) return l;
        return /^\s*:\s+/.test(l) ? l : `: ${l}`;
      }).join('\n');
      textarea.setRangeText(formateadas, lineStart, lineEnd, 'select');
      textarea.setSelectionRange(lineStart, lineStart + formateadas.length);
    }
    finalizar();
    return;
  }

  if (tipo === 'details') {
    const titlePh = t.ph_details_title || 'Título';
    const contentPh = t.ph_details_content || 'Contenido...';

    // 1. Verificar Toggle: ¿Está el cursor o selección dentro de un bloque <details>...</details>?
    const detailsRegex = /<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)\s*<\/details>/gi;
    let match;
    while ((match = detailsRegex.exec(originalText)) !== null) {
      const mStart = match.index;
      const mEnd = mStart + match[0].length;
      if ((start >= mStart && end <= mEnd) || (start <= mStart && end >= mEnd)) {
        const summaryText = match[1].trim();
        const innerContent = match[2].trim();
        let restored = '';
        if (summaryText === titlePh && innerContent === contentPh) {
          restored = '';
        } else if (innerContent === contentPh) {
          restored = summaryText;
        } else {
          restored = innerContent;
        }
        textarea.setRangeText(restored, mStart, mEnd, 'select');
        textarea.setSelectionRange(mStart, mStart + restored.length);
        finalizar();
        return;
      }
    }

    const openTag = '<details>\n<summary>';
    const midTag = '</summary>\n\n';
    const closeTag = '\n\n</details>';

    // 2. Si hay selección previa: envolver la selección como contenido y seleccionar el Título
    if (rawSelection.length > 0) {
      const selStart = start + leadingLength;
      const selEnd = end - trailingLength;
      const block = openTag + titlePh + midTag + selectedText + closeTag;
      textarea.setRangeText(block, selStart, selEnd, 'select');
      const titleStart = selStart + openTag.length;
      textarea.setSelectionRange(titleStart, titleStart + titlePh.length);
      finalizar();
      return;
    }

    // 3. Sin selección: revisar si el cursor está en una línea o párrafo con texto
    const { lineText } = obtenerLimitesLinea(originalText, start);
    if (lineText.trim().length > 0) {
      // Encontrar los límites del párrafo actual (líneas contiguas no vacías)
      const allLines = originalText.split('\n');
      const curLineIdx = originalText.substring(0, start).split('\n').length - 1;
      let pTop = curLineIdx;
      let pBot = curLineIdx;
      while (pTop > 0 && allLines[pTop - 1].trim().length > 0) pTop--;
      while (pBot + 1 < allLines.length && allLines[pBot + 1].trim().length > 0) pBot++;

      const paraStart = pTop === 0 ? 0 : allLines.slice(0, pTop).join('\n').length + 1;
      const paraEnd = allLines.slice(0, pBot + 1).join('\n').length;
      const paraText = originalText.substring(paraStart, paraEnd);

      const block = openTag + titlePh + midTag + paraText + closeTag;
      textarea.setRangeText(block, paraStart, paraEnd, 'select');
      const titleStart = paraStart + openTag.length;
      textarea.setSelectionRange(titleStart, titleStart + titlePh.length);
      finalizar();
      return;
    }

    // 4. En línea vacía: insertar plantilla y seleccionar Título
    const template = openTag + titlePh + midTag + contentPh + closeTag;
    textarea.setRangeText(template, start, start, 'select');
    const focusStart = start + openTag.length;
    textarea.setSelectionRange(focusStart, focusStart + titlePh.length);
    finalizar();
    return;
  }
}

export function inicializarAtajosMarkdown() {
// Registrar eventos en la cuadrícula de botones Markdown
document.querySelectorAll('.md-shortcut-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const syntax = btn.getAttribute('data-syntax');
    if (syntax) {
      insertarSintaxisMarkdown(syntax);
    }
  });
});

// Desacople de categoría individual a ventana flotante con auto-minimizado en el panel maestro
document.querySelectorAll('.btn-tearoff-cat').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const cat = btn.getAttribute('data-category');
    const modalId = `modal-md-${cat}`;
    const targetModal = document.getElementById(modalId);
    if (targetModal) {
      abrirModal(targetModal);
      
      // Minimizar automáticamente la categoría en la barra lateral o panel general
      const card = btn.closest('.shortcuts-category-card');
      if (card) {
        card.classList.add('collapsed');
        const collapseBtn = card.querySelector('.btn-collapse-cat');
        if (collapseBtn) {
          collapseBtn.setAttribute('title', 'Expandir categoría');
        }
      }
    }
  });
});

// Colapsar / expandir categoría individual mediante su botón
document.querySelectorAll('.btn-collapse-cat').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = btn.closest('.shortcuts-category-card');
    if (card) {
      card.classList.toggle('collapsed');
      const isCollapsed = card.classList.contains('collapsed');
      btn.setAttribute('title', isCollapsed ? 'Expandir categoría' : 'Minimizar categoría');
    }
  });
});

// Permitir colapsar / expandir al hacer clic en la cabecera de la categoría
document.querySelectorAll('.shortcuts-category-header').forEach(header => {
  header.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const card = header.closest('.shortcuts-category-card');
    if (card) {
      card.classList.toggle('collapsed');
      const collapseBtn = card.querySelector('.btn-collapse-cat');
      if (collapseBtn) {
        const isCollapsed = card.classList.contains('collapsed');
        collapseBtn.setAttribute('title', isCollapsed ? 'Expandir categoría' : 'Minimizar categoría');
      }
    }
  });
});


}
