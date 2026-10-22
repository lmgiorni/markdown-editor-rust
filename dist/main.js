import { inicializarColorPicker, abrirColorPicker } from './utils/color-picker.js';
// ==========================================================================
// LÓGICA INTERACTIVA PREMIUM - FRONTEND DEL EDITOR DE MARKDOWN (TAURI v2)
// ==========================================================================

import { HistorialCambios } from './utils/history-manager.js';
import { parseMarkdownToJSON, convertJSONToXML, buildTreeHTML, convertJSONToMarkdown, convertXMLToJSON, convertJSONToYAML, convertYAMLToJSON } from './utils/data-parser.js';
import { escanearVariablesDePlantilla, obtenerTextoModuloConSangria } from './utils/template-engine.js';
import { exportarDocumentoAHTML, exportarDocumentoAPDF, exportarDocumentoAEPUB } from './utils/export-service.js';
import { translations, listarIdiomasDisponibles, cargarIdiomaDesdeDisco } from './utils/i18n.js';

// Configuración y Acceso Seguro al Puente de Tauri
const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;

// Estado Global de la Aplicación (con persistencia en localStorage para configuración)
let appState = {
  filePath: null,             // Ruta completa del archivo en disco
  fileName: 'Sin título',     // Nombre visible del archivo (sin extensión)
  isSaved: true,              // Estado de guardado de los cambios
  activeView: 'split',        // Modo de visualización activa: 'editor', 'split' o 'preview'
  
  structuredModeActive: false, // Indica si la visualización en árbol de datos está activa
  structuredActiveTab: 'tree', // Pestaña del modo estructurado: 'tree', 'json', 'xml'
  currentTemplateText: '',    // Almacena la plantilla en espera de rellenado de variables
  
  // Configuración visual (valores iniciales elegantes)
  editorFont: localStorage.getItem('md-editor-font') || 'Fira Code',
  readerFont: localStorage.getItem('md-reader-font') || 'Inter',
  structuredFont: localStorage.getItem('md-structured-font') || 'Fira Code',
  editorFontSize: parseInt(localStorage.getItem('md-editor-font-size')) || 14,
  readerFontSize: parseInt(localStorage.getItem('md-reader-font-size')) || 15,
  structuredFontSize: parseInt(localStorage.getItem('md-structured-font-size')) || 13,
  activeTheme: localStorage.getItem('md-theme') || 'Cyberpunk-Dark',
  language: localStorage.getItem('md-language') || 'es',
  versioningDigits: parseInt(localStorage.getItem('md-versioning-digits') || '3', 10),
  maxRecentFiles: parseInt(localStorage.getItem('md-max-recent-files') || '5', 10),
  enableParagraphIndent: localStorage.getItem('md-enable-indent') === 'true',
  paragraphIndentSize: parseInt(localStorage.getItem('md-indent-size')) || 24,
  systemDefaultRootFolder: '',
  customRootFolder: localStorage.getItem('md-root-folder') || '',
  lastUsedFolder: localStorage.getItem('md-last-used-folder') || ''
};

// Referencias seguras y completas a Elementos del DOM
const DOM = {
  editor: document.getElementById('editor'),
  preview: document.getElementById('preview'),
  fileInfo: document.getElementById('file-info'),
  fileNameContainer: document.getElementById('file-name-container'),
  documentControlBlock: document.getElementById('document-control-block'),
  btnVersionDoc: document.getElementById('btn-version-doc'),
  btnRelocateDoc: document.getElementById('btn-relocate-doc'),
  selectVersioningDigits: document.getElementById('select-versioning-digits'),
  selectMaxRecentFiles: document.getElementById('select-max-recent-files'),
  inputRootFolder: document.getElementById('input-root-folder'),
  btnChangeRootFolder: document.getElementById('btn-change-root-folder'),
  btnResetRootFolder: document.getElementById('btn-reset-root-folder'),
  statusDot: document.getElementById('status-dot'),
  wordCountStatus: document.getElementById('word-count-status'),
  appContainer: document.getElementById('app-container'),
  previewContainer: document.getElementById('preview-container'),
  activeFilepathDisplay: document.getElementById('active-filepath-display'),
  
  // Botones de la barra de herramientas
  btnNew: document.getElementById('btn-new'),
  btnOpen: document.getElementById('btn-open'),
  btnSave: document.getElementById('btn-save'),
  menuRecentFiles: document.getElementById('menu-recent-files'),
  recentMenuList: document.getElementById('recent-menu-list'),
  recentMenuTitle: document.getElementById('recent-menu-title'),
  btnClearRecent: document.getElementById('btn-clear-recent-files'),
  btnOpenAbout: document.getElementById('btn-open-about'),
  modalAbout: document.getElementById('modal-about'),
  btnCloseAbout: document.getElementById('btn-close-about'),
  btnCloseAboutFooter: document.getElementById('btn-close-about-footer'),
  dndOverlay: document.getElementById('dnd-overlay'),
  
  // Nuevos botones de exportación y desplegable
  btnExport: document.getElementById('btn-export'),
  exportDropdown: document.getElementById('export-dropdown'),
  optExportHtml: document.getElementById('opt-export-html'),
  optExportPdf: document.getElementById('opt-export-pdf'),
  optExportEpub: document.getElementById('opt-export-epub'),
  optSaveTemplate: document.getElementById('opt-save-template'),
  
  // Botones de vistas
  viewEditor: document.getElementById('view-editor'),
  viewSplit: document.getElementById('view-split'),
  viewPreview: document.getElementById('view-preview'),
  
  // Botones para abrir modales
  btnMd: document.getElementById('btn-md'),
  btnStats: document.getElementById('btn-stats'),
  btnConfig: document.getElementById('btn-config'),
  
  // Modales
  modalMd: document.getElementById('modal-md'),
  modalStats: document.getElementById('modal-stats'),
  modalConfig: document.getElementById('modal-config'),
  modalTemplateVars: document.getElementById('modal-template-vars'),
  modalEpubExport: document.getElementById('modal-epub-export'),
  formTemplateVars: document.getElementById('form-template-vars'),
  btnCancelVars: document.getElementById('btn-cancel-vars'),
  btnApplyVars: document.getElementById('btn-apply-vars'),
  
  // Barra Lateral y Ventana de Atajos Markdown
  shortcutsSidebar: document.getElementById('shortcuts-sidebar'),
  btnUndockShortcuts: document.getElementById('btn-undock-shortcuts-sidebar'),
  btnDockShortcutsMaster: document.getElementById('btn-dock-shortcuts-master'),
  btnDockShortcutsSide: document.getElementById('btn-dock-shortcuts-side'),
  btnCloseShortcutsSidebar: document.getElementById('btn-close-shortcuts-sidebar'),
  shortcutsCategoriesWrapper: document.getElementById('shortcuts-categories-wrapper'),
  shortcutsSidebarBody: document.getElementById('shortcuts-sidebar-body'),
  shortcutsMasterBodySlot: document.getElementById('shortcuts-master-body-slot'),

  // Barra Lateral de Componentes (Biblioteca)
  btnComponentsToggle: document.getElementById('btn-components-toggle'),
  componentsSidebar: document.getElementById('components-sidebar'),
  sidebarSearch: document.getElementById('sidebar-search'),
  sidebarList: document.getElementById('sidebar-list'),
  tabModules: document.getElementById('tab-modules'),
  tabTemplates: document.getElementById('tab-templates'),
  
  // Barra Superior del Modo Estructurado
  structuredHeaderBar: document.getElementById('structured-header-bar'),
  
  // Selector de tema
  selectTheme: document.getElementById('select-theme'),
  
  // Selectores e Inputs de Configuración
  selectEditorFont: document.getElementById('select-editor-font'),
  selectReaderFont: document.getElementById('select-reader-font'),
  selectStructuredFont: document.getElementById('select-structured-font'),
  selectLanguage: document.getElementById('select-language'),
  btnOpenLanguagesDir: document.getElementById('btn-open-languages-dir'),
  rangeEditorSize: document.getElementById('range-editor-size'),
  rangeReaderSize: document.getElementById('range-reader-size'),
  rangeStructuredSize: document.getElementById('range-structured-size'),
  valEditorSize: document.getElementById('val-editor-size'),
  valReaderSize: document.getElementById('val-reader-size'),
  valStructuredSize: document.getElementById('val-structured-size'),
  checkParagraphIndent: document.getElementById('check-paragraph-indent'),
  rowParagraphIndentSize: document.getElementById('row-paragraph-indent-size'),
  rangeIndentSize: document.getElementById('range-indent-size'),
  valIndentSize: document.getElementById('val-indent-size'),
  btnFontDec: document.getElementById('btn-font-dec'),
  btnFontInc: document.getElementById('btn-font-inc'),
  
  // Contadores de Estadísticas
  statWords: document.getElementById('stat-words'),
  statCharsNoSpace: document.getElementById('stat-chars-no-space'),
  statCharsWithSpace: document.getElementById('stat-chars-with-space'),
  statLinks: document.getElementById('stat-links'),
  statSelWords: document.getElementById('stat-sel-words'),
  statSelCharsNoSpace: document.getElementById('stat-sel-chars-no-space'),
  statSelCharsWithSpace: document.getElementById('stat-sel-chars-with-space')
};

// ==========================================================================
// GESTOR DE HISTORIAL DE CAMBIOS (UNDO / REDO STACK CON DEBOUNCE PREMIUM)
// ==========================================================================

// Instancia global del historial
let historial = null;

function inicializarHistorial() {
  if (DOM.editor) {
    historial = new HistorialCambios(DOM.editor, () => {
      renderMarkdown();
      setSavedState(false);
      if (DOM.modalStats && DOM.modalStats.classList.contains('active')) {
        actualizarEstadisticasDetalladas();
      }
    });
  }
}

// ==========================================================================
// CONFIGURACIÓN DE APARIENCIA Y VARIABLES TIPOGRÁFICAS (CSS CUSTOM PROPERTIES)
// ==========================================================================
// ==========================================================================

function aplicarConfiguracionVisual() {
  const root = document.documentElement;
  
  // Mapeo dinámico de familias tipográficas a valores válidos de CSS
  const tipografias = {
    'JetBrains Mono': "'JetBrains Mono', 'Fira Code', monospace",
    'Iosevka': "'Iosevka', 'JetBrains Mono', monospace",
    'Google Sans Code': "'Google Sans Code', 'Fira Code', monospace",
    'Consolas': "Consolas, monospace",
    'Fira Code': "'Fira Code', monospace",
    'Courier New': "'Courier New', monospace",
    'Inter': "'Inter', system-ui, -apple-system, sans-serif",
    'Roboto': "'Roboto', sans-serif",
    'Georgia': "Georgia, serif",
    'Merriweather': "'Merriweather', Georgia, serif",
    'Atkinson Hyperlegible': "'Atkinson Hyperlegible', sans-serif"
  };

  const editorFamily = tipografias[appState.editorFont] || tipografias['Fira Code'];
  const readerFamily = tipografias[appState.readerFont] || tipografias['Inter'];
  const structuredFamily = tipografias[appState.structuredFont] || tipografias['Fira Code'];

  root.style.setProperty('--editor-font-family', editorFamily);
  root.style.setProperty('--reader-font-family', readerFamily);
  root.style.setProperty('--structured-font-family', structuredFamily);
  root.style.setProperty('--editor-font-size', `${appState.editorFontSize}px`);
  root.style.setProperty('--reader-font-size', `${appState.readerFontSize}px`);
  root.style.setProperty('--structured-font-size', `${appState.structuredFontSize}px`);
  root.style.setProperty('--reader-paragraph-indent', `${appState.paragraphIndentSize}px`);

  if (DOM.preview) {
    if (appState.enableParagraphIndent) {
      DOM.preview.classList.add('enable-paragraph-indent');
    } else {
      DOM.preview.classList.remove('enable-paragraph-indent');
    }
  }

  // Sincronizar los controles visuales del Modal de Configuración
  if (DOM.selectEditorFont) DOM.selectEditorFont.value = appState.editorFont;
  if (DOM.selectReaderFont) DOM.selectReaderFont.value = appState.readerFont;
  if (DOM.selectStructuredFont) DOM.selectStructuredFont.value = appState.structuredFont;
  if (DOM.selectLanguage) DOM.selectLanguage.value = appState.language;
  if (DOM.selectVersioningDigits) DOM.selectVersioningDigits.value = String(appState.versioningDigits || 3);
  if (DOM.selectMaxRecentFiles) DOM.selectMaxRecentFiles.value = String(appState.maxRecentFiles || 5);
  if (DOM.rangeEditorSize) DOM.rangeEditorSize.value = appState.editorFontSize;
  if (DOM.rangeReaderSize) DOM.rangeReaderSize.value = appState.readerFontSize;
  if (DOM.rangeStructuredSize) DOM.rangeStructuredSize.value = appState.structuredFontSize;
  if (DOM.valEditorSize) DOM.valEditorSize.textContent = `${appState.editorFontSize}px`;
  if (DOM.valReaderSize) DOM.valReaderSize.textContent = `${appState.readerFontSize}px`;
  if (DOM.valStructuredSize) DOM.valStructuredSize.textContent = `${appState.structuredFontSize}px`;
  if (DOM.checkParagraphIndent) DOM.checkParagraphIndent.checked = appState.enableParagraphIndent;
  if (DOM.rangeIndentSize) DOM.rangeIndentSize.value = appState.paragraphIndentSize;
  if (DOM.valIndentSize) DOM.valIndentSize.textContent = `${appState.paragraphIndentSize}px`;
  if (DOM.rowParagraphIndentSize) {
    DOM.rowParagraphIndentSize.style.display = appState.enableParagraphIndent ? 'flex' : 'none';
  }
  
  // Guardar permanentemente en almacenamiento del navegador
  localStorage.setItem('md-editor-font', appState.editorFont);
  localStorage.setItem('md-reader-font', appState.readerFont);
  localStorage.setItem('md-structured-font', appState.structuredFont);
  localStorage.setItem('md-editor-font-size', appState.editorFontSize);
  localStorage.setItem('md-reader-font-size', appState.readerFontSize);
  localStorage.setItem('md-structured-font-size', appState.structuredFontSize);
  localStorage.setItem('md-language', appState.language);
  localStorage.setItem('md-enable-indent', appState.enableParagraphIndent);
  localStorage.setItem('md-indent-size', appState.paragraphIndentSize);
}

// ==========================================================================
// RENDERIZADO Y CONVERSIÓN DE MARKDOWN A HTML (MARKED.JS)
// ==========================================================================

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown() {
  const markdownText = DOM.editor ? (DOM.editor.value || '') : '';
  
  // FASE 12: Si el modo estructurado está activo, renderizar el árbol en tiempo real
  if (appState.structuredModeActive) {
    const arbol = parseMarkdownToJSON(markdownText);
    renderStructuredTreeVisual(arbol);
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
    
    DOM.preview.innerHTML = html;
    
    // Soporte de imágenes locales (relativas y absolutas) mediante el protocolo de activos de Tauri v2
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
  } else {
    DOM.preview.textContent = markdownText;
  }
  
  // Actualizar estadísticas inmediatas de la barra inferior
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

let autosaveTimeout = null;

function guardarBorradorRecuperacion() {
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    if (appState.isSaved) {
      localStorage.removeItem('md-autosave-draft');
      localStorage.removeItem('md-autosave-path');
      localStorage.removeItem('md-autosave-name');
      return;
    }
    localStorage.setItem('md-autosave-draft', DOM.editor.value);
    if (appState.filePath) {
      localStorage.setItem('md-autosave-path', appState.filePath);
    } else {
      localStorage.removeItem('md-autosave-path');
    }
    if (appState.fileName) {
      localStorage.setItem('md-autosave-name', appState.fileName);
    } else {
      localStorage.removeItem('md-autosave-name');
    }
  }, 1000);
}

// Modifica el indicador de cambios sin guardar
function setSavedState(saved) {
  appState.isSaved = saved;
  
  if (saved) {
    DOM.statusDot.className = 'dot-saved';
    DOM.statusDot.setAttribute('title', 'Todos los cambios están guardados en tu disco');
    
    // Limpiar borrador de recuperación automática
    localStorage.removeItem('md-autosave-draft');
    localStorage.removeItem('md-autosave-path');
    localStorage.removeItem('md-autosave-name');

    // Si guardamos un tema, refrescar el Playground de forma instantánea
    if (typeof refrescarPlaygroundLocal === 'function') {
      refrescarPlaygroundLocal();
    }
  } else {
    DOM.statusDot.className = 'dot-unsaved';
    DOM.statusDot.setAttribute('title', 'Tienes cambios sin guardar en tu editor');
    guardarBorradorRecuperacion();
  }
  actualizarNombreArchivo();
  
  // Actualizar visibilidad del Playground si cambió el archivo activo
  if (typeof actualizarEstadoThemePlayground === 'function') {
    actualizarEstadoThemePlayground();
  }
}

// Actualiza el nombre que se visualiza arriba (escondiendo la extensión)
function actualizarNombreArchivo() {
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  
  let display = appState.fileName;
  const lastDot = display.lastIndexOf('.');
  if (lastDot > 0) {
    display = display.substring(0, lastDot);
  }
  
  if (appState.filePath === null) {
    // Si el documento nunca ha sido guardado en disco
    DOM.fileInfo.textContent = appState.isSaved ? `${display}.md` : `${display}.md (${t.status_unsaved})`;
    DOM.activeFilepathDisplay.textContent = t.status_no_file_disk || (lang === 'es' ? 'Sin archivo guardado en disco' : (lang === 'en' ? 'No file saved on disk' : 'Nullum documentum in disco'));
    DOM.statusDot.className = 'dot-unsaved';
    DOM.statusDot.setAttribute('title', lang === 'es' ? 'Sin archivo guardado en disco (en memoria)' : (lang === 'en' ? 'No file saved on disk (in memory)' : 'Nullum documentum in disco'));
  } else {
    const statusText = appState.isSaved ? t.status_saved : t.status_unsaved;
    DOM.fileInfo.textContent = `${display}.md (${statusText})`;
    DOM.activeFilepathDisplay.textContent = appState.filePath;
    
    if (appState.isSaved) {
      DOM.statusDot.className = 'dot-saved';
      DOM.statusDot.setAttribute('title', lang === 'es' ? 'Todos los cambios están guardados en tu disco' : (lang === 'en' ? 'All changes are saved on your disk' : 'Omnes mutationes in disco servatae sunt'));
    } else {
      DOM.statusDot.className = 'dot-unsaved';
      DOM.statusDot.setAttribute('title', lang === 'es' ? 'Tienes cambios sin guardar en tu editor' : (lang === 'en' ? 'You have unsaved changes in your editor' : 'Mutationes non servatas habes in scriptorio'));
    }
  }
}

// ==========================================================================
// EDICIÓN DIRECTA DE NOMBRE DE ARCHIVO (CLICKABLE RENAME)
// ==========================================================================

function habilitarEdicionNombre() {
  // Prevenir duplicaciones de inputs
  if (DOM.fileNameContainer.querySelector('.editable-name-input')) return;

  let actualName = appState.fileName;
  const lastDot = actualName.lastIndexOf('.');
  if (lastDot > 0) {
    actualName = actualName.substring(0, lastDot);
  }
  
  DOM.fileInfo.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = actualName;
  input.className = 'editable-name-input';
  DOM.fileNameContainer.appendChild(input);
  input.focus();
  input.select(); // Selecciona el nombre completo para sobreescritura directa

  // Guardar al pulsar Enter o salir del foco
  function guardarNombreEditado() {
    let nuevoNombre = input.value.trim();
    
    // Quitar extensión si fue escrita a mano
    const lastDotName = nuevoNombre.lastIndexOf('.');
    if (lastDotName > 0) {
      nuevoNombre = nuevoNombre.substring(0, lastDotName);
    }
    
    if (nuevoNombre.length > 0) {
      if (nuevoNombre !== appState.fileName) {
        appState.fileName = nuevoNombre;
        
        // Si ya tenía una ruta en disco, la actualizamos para que al guardar lo escriba en el nuevo nombre
        if (appState.filePath) {
          const sep = appState.filePath.includes('/') ? '/' : '\\';
          const parts = appState.filePath.split(sep);
          parts[parts.length - 1] = nuevoNombre + '.md';
          appState.filePath = parts.join(sep);
        }
        
        setSavedState(false);
      }
    }
    
    // Restaurar visualización
    input.remove();
    DOM.fileInfo.style.display = 'block';
    actualizarNombreArchivo();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardarNombreEditado();
    } else if (e.key === 'Escape') {
      // Cancelar edición
      input.remove();
      DOM.fileInfo.style.display = 'block';
    }
  });

  input.addEventListener('blur', guardarNombreEditado);
}

// ==========================================================================
// OPERACIONES DE DISCO (COMUNICACIÓN IPC CON EL MOTOR RUST BACKEND)
// ==========================================================================


// ==========================================================================
// VENTANA MODAL DE CONFIRMACIÓN DEL SISTEMA (REEMPLAZO DE tauri.localhost says)
// ==========================================================================

function solicitarConfirmacionSistema({ titulo, mensaje, detalle, tipo, btnSaveText, btnDiscardText, btnCancelText }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-system-confirm');
    const titleEl = document.getElementById('confirm-dialog-title');
    const msgEl = document.getElementById('confirm-dialog-message');
    const detailEl = document.getElementById('confirm-dialog-detail');
    const iconEl = document.getElementById('confirm-dialog-icon');
    const btnSave = document.getElementById('btn-confirm-save');
    const btnDiscard = document.getElementById('btn-confirm-discard');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnClose = document.getElementById('btn-close-confirm-dialog');

    if (!modal) {
      resolve('cancel');
      return;
    }

    if (titleEl) titleEl.textContent = titulo || 'Confirmación';
    if (msgEl) msgEl.textContent = mensaje || '';
    if (detailEl) detailEl.textContent = detalle || '';
    if (iconEl) iconEl.textContent = tipo === 'info' ? '💡' : '⚠️';

    if (btnSave) {
      btnSave.textContent = btnSaveText || 'Guardar cambios';
      btnSave.style.display = btnSaveText === false ? 'none' : 'inline-block';
    }
    if (btnDiscard) {
      btnDiscard.textContent = btnDiscardText || 'Descartar cambios';
      btnDiscard.style.display = btnDiscardText === false ? 'none' : 'inline-block';
    }
    if (btnCancel) {
      btnCancel.textContent = btnCancelText || 'Cancelar';
      btnCancel.style.display = btnCancelText === false ? 'none' : 'inline-block';
    }

    modal.classList.add('active');

    const limpiarYResolver = (resultado) => {
      modal.classList.remove('active');
      btnSave?.removeEventListener('click', onSave);
      btnDiscard?.removeEventListener('click', onDiscard);
      btnCancel?.removeEventListener('click', onCancel);
      btnClose?.removeEventListener('click', onCancel);
      modal.removeEventListener('click', onBackdrop);
      resolve(resultado);
    };

    const onSave = () => limpiarYResolver('save');
    const onDiscard = () => limpiarYResolver('discard');
    const onCancel = () => limpiarYResolver('cancel');
    const onBackdrop = (e) => {
      if (e.target === modal) limpiarYResolver('cancel');
    };

    btnSave?.addEventListener('click', onSave);
    btnDiscard?.addEventListener('click', onDiscard);
    btnCancel?.addEventListener('click', onCancel);
    btnClose?.addEventListener('click', onCancel);
    modal.addEventListener('click', onBackdrop);
  });
}

async function nuevoArchivo() {
  if (!appState.isSaved) {
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    const accion = await solicitarConfirmacionSistema({
      titulo: t.confirm_title_new || 'Nuevo Documento',
      mensaje: t.confirm_msg_unsaved_new || 'Tienes cambios pendientes sin guardar. ¿Qué deseas hacer antes de crear un nuevo documento?',
      detalle: 'Si guardas, tus cambios quedarán asegurados en el disco antes de crear el documento vacío.',
      tipo: 'warning',
      btnSaveText: t.confirm_btn_save || 'Guardar cambios',
      btnDiscardText: t.confirm_btn_discard || 'Descartar cambios',
      btnCancelText: t.confirm_btn_cancel || 'Cancelar'
    });

    if (accion === 'cancel') return;
    if (accion === 'save') {
      const guardado = await guardarArchivo();
      if (!guardado) return;
    }
  }
  
  DOM.editor.value = '';
  appState.filePath = null;
  appState.fileName = 'Sin título';
  renderMarkdown();
  setSavedState(true);
  inicializarHistorial();
}

// ==========================================================================
// GESTIÓN DE ARCHIVOS RECIENTES (PERSISTENCIA Y ACCESO RÁPIDO)
// ==========================================================================
function obtenerArchivosRecientes() {
  try {
    const raw = localStorage.getItem('md-recent-files');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function registrarArchivoReciente(name, path) {
  if (!path) return;
  try {
    let list = obtenerArchivosRecientes();
    const normPath = path.replace(/\\/g, '/').toLowerCase();
    list = list.filter(item => item.path && item.path.replace(/\\/g, '/').toLowerCase() !== normPath);
    list.unshift({
      name: name || 'Documento',
      path: path,
      timestamp: Date.now()
    });
    if (list.length > 10) list = list.slice(0, 10);
    localStorage.setItem('md-recent-files', JSON.stringify(list));
  } catch (e) {
    console.warn('Error al registrar archivo reciente:', e);
  }
}

function renderizarMenuRecientes() {
  if (!DOM.recentMenuList) return;
  let list = obtenerArchivosRecientes();
  const maxLimit = appState.maxRecentFiles || 5;
  list = list.slice(0, maxLimit);
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;

  if (list.length === 0) {
    DOM.recentMenuList.innerHTML = `<div class="recent-menu-empty">${t.recent_files_empty || 'No hay documentos recientes'}</div>`;
    return;
  }

  let html = '';
  list.forEach(item => {
    const sep = item.path.includes('/') ? '/' : '\\';
    const parts = item.path.split(sep);
    parts.pop();
    const folder = parts.length > 0 ? parts.join(sep) : item.path;

    html += `<div class="recent-item" data-path="${item.path.replace(/"/g, '&quot;')}">
      <div class="recent-item-icon">📄</div>
      <div class="recent-item-info">
        <span class="recent-item-name">${item.name}</span>
        <span class="recent-item-path" title="${item.path.replace(/"/g, '&quot;')}">${folder}</span>
      </div>
    </div>`;
  });

  DOM.recentMenuList.innerHTML = html;

  DOM.recentMenuList.querySelectorAll('.recent-item').forEach(el => {
    el.addEventListener('click', async () => {
      const targetPath = el.getAttribute('data-path');
      cerrarMenuRecientes();
      if (targetPath) {
        await abrirArchivoDesdeRuta(targetPath);
      }
    });
  });
}

function alternarMenuRecientes(forzar) {
  if (!DOM.menuRecentFiles) return;
  const isVisible = DOM.menuRecentFiles.style.display !== 'none';
  const shouldOpen = typeof forzar === 'boolean' ? forzar : !isVisible;

  if (shouldOpen) {
    renderizarMenuRecientes();
    if (DOM.btnOpen) {
      const rect = DOM.btnOpen.getBoundingClientRect();
      DOM.menuRecentFiles.style.top = `${rect.bottom + 6}px`;
      DOM.menuRecentFiles.style.left = `${rect.left}px`;
    }
    DOM.menuRecentFiles.style.display = 'flex';
  } else {
    DOM.menuRecentFiles.style.display = 'none';
  }
}

function cerrarMenuRecientes() {
  if (DOM.menuRecentFiles) {
    DOM.menuRecentFiles.style.display = 'none';
  }
}

document.addEventListener('click', (e) => {
  if (DOM.menuRecentFiles && DOM.menuRecentFiles.style.display !== 'none') {
    if (!DOM.menuRecentFiles.contains(e.target) && DOM.btnOpen && !DOM.btnOpen.contains(e.target)) {
      cerrarMenuRecientes();
    }
  }
});

if (DOM.btnClearRecent) {
  DOM.btnClearRecent.addEventListener('click', () => {
    localStorage.removeItem('md-recent-files');
    renderizarMenuRecientes();
  });
}

async function procesarYCargarDocumento(fileData) {
  if (!fileData) return;
  const lowerPath = (fileData.path || fileData.name || '').toLowerCase();
  let importedAndConverted = false;
  let finalContent = fileData.content;
  
  if (lowerPath.endsWith('.json')) {
    try {
      const jsonObj = JSON.parse(fileData.content);
      finalContent = convertJSONToMarkdown(jsonObj);
      importedAndConverted = 'JSON';
    } catch (jsonErr) {
      console.error('Error al analizar JSON en importación:', jsonErr);
      alertNotification('El archivo .json tiene errores de estructura y no pudo importarse.', 'error');
      return;
    }
  } else if (lowerPath.endsWith('.xml')) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fileData.content, "text/xml");
      const parserError = xmlDoc.getElementsByTagName("parsererror");
      if (parserError.length > 0) throw new Error(parserError[0].textContent);
      
      const rootName = xmlDoc.documentElement.nodeName;
      const jsonObj = {};
      jsonObj[rootName] = convertXMLToJSON(xmlDoc.documentElement);
      finalContent = convertJSONToMarkdown(jsonObj);
      importedAndConverted = 'XML';
    } catch (xmlErr) {
      console.error('Error al analizar XML en importación:', xmlErr);
      alertNotification('El archivo .xml tiene errores de estructura y no pudo importarse.', 'error');
      return;
    }
  } else if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) {
    try {
      const jsonObj = convertYAMLToJSON(fileData.content);
      finalContent = convertJSONToMarkdown(jsonObj);
      importedAndConverted = 'YAML';
    } catch (yamlErr) {
      console.error('Error al analizar YAML en importación:', yamlErr);
      alertNotification('El archivo YAML tiene errores de estructura y no pudo importarse.', 'error');
      return;
    }
  }

  DOM.editor.value = finalContent;
  
  let name = fileData.name;
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) {
    name = name.substring(0, lastDot);
  }
  appState.fileName = name;
  
  if (importedAndConverted) {
    appState.filePath = null;
    setSavedState(false);
    alertNotification(`Archivo ${importedAndConverted} importado y convertido a Markdown. Guarda el archivo como .md`);
  } else {
    appState.filePath = fileData.path || null;
    setSavedState(true);
    if (fileData.path) {
      registrarArchivoReciente(name, fileData.path);
    }
    alertNotification('Archivo abierto con éxito', 'success');
  }
  
  localStorage.removeItem('md-autosave-draft');
  localStorage.removeItem('md-autosave-path');
  localStorage.removeItem('md-autosave-name');
  
  actualizarNombreArchivo();
  renderMarkdown();
  
  inicializarHistorial();
}

async function abrirArchivoDesdeRuta(filePath) {
  if (!appState.isSaved) {
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    const accion = await solicitarConfirmacionSistema({
      titulo: t.confirm_title_open || 'Abrir Documento',
      mensaje: t.confirm_msg_unsaved_open || 'Tienes cambios pendientes sin guardar. ¿Qué deseas hacer antes de abrir otro documento?',
      detalle: 'Si guardas, tus cambios quedarán asegurados en el disco antes de cargar el nuevo archivo.',
      tipo: 'warning',
      btnSaveText: t.confirm_btn_save || 'Guardar cambios',
      btnDiscardText: t.confirm_btn_discard || 'Descartar cambios',
      btnCancelText: t.confirm_btn_cancel || 'Cancelar'
    });

    if (accion === 'cancel') return;
    if (accion === 'save') {
      const guardado = await guardarArchivo();
      if (!guardado) return;
    }
  }

  if (!invoke) {
    alertNotification('La conexión con el sistema nativo no está disponible fuera de Tauri.', 'error');
    return;
  }

  try {
    const fileData = await invoke('abrir_archivo_desde_ruta', { filePath });
    if (fileData) {
      await procesarYCargarDocumento(fileData);
    }
  } catch (err) {
    console.error('Error al abrir archivo reciente:', err);
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    alertNotification(t.recent_file_not_found || 'El archivo no fue encontrado en la ruta especificada.', 'error');
    
    let list = obtenerArchivosRecientes();
    list = list.filter(item => item.path !== filePath);
    localStorage.setItem('md-recent-files', JSON.stringify(list));
    renderizarMenuRecientes();
  }
}

async function abrirArchivo() {
  if (!appState.isSaved) {
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    const accion = await solicitarConfirmacionSistema({
      titulo: t.confirm_title_open || 'Abrir Documento',
      mensaje: t.confirm_msg_unsaved_open || 'Tienes cambios pendientes sin guardar. ¿Qué deseas hacer antes de abrir otro documento?',
      detalle: 'Si guardas, tus cambios quedarán asegurados en el disco antes de cargar el nuevo archivo.',
      tipo: 'warning',
      btnSaveText: t.confirm_btn_save || 'Guardar cambios',
      btnDiscardText: t.confirm_btn_discard || 'Descartar cambios',
      btnCancelText: t.confirm_btn_cancel || 'Cancelar'
    });

    if (accion === 'cancel') return;
    if (accion === 'save') {
      const guardado = await guardarArchivo();
      if (!guardado) return;
    }
  }

  if (!invoke) {
    alertNotification('La conexión con el sistema de archivos nativo no está disponible fuera de Tauri.', 'error');
    return;
  }

  try {
    const fileData = await invoke('abrir_archivo');
    if (fileData) {
      await procesarYCargarDocumento(fileData);
    }
  } catch (error) {
    console.error('Error al abrir:', error);
    alertNotification('Error al abrir el archivo: ' + error, 'error');
  }
}

async function guardarArchivo() {
  if (!invoke) {
    alertNotification('La comunicación con Tauri no está activa.', 'error');
    return;
  }

  // Si es un archivo nuevo sin ruta, o si no es un archivo .md, redirige a "Guardar como"
  if (!appState.filePath || !appState.filePath.toLowerCase().endsWith('.md')) {
    await guardarComo();
    return;
  }

  try {
    const contenido = DOM.editor.value;
    const pathEscrito = await invoke('guardar_archivo', { path: appState.filePath, content: contenido });
    appState.filePath = pathEscrito;
    
    // Actualizar nombre de archivo por si se sanitizó en disco
    let name = pathEscrito.substring(pathEscrito.lastIndexOf('\\') + 1);
    if (name.includes('/')) name = pathEscrito.substring(pathEscrito.lastIndexOf('/') + 1);
    const lastDot = name.lastIndexOf('.');
    if (lastDot > 0) {
      name = name.substring(0, lastDot);
    }
    appState.fileName = name;
    
    setSavedState(true);
    
    // Limpiar borrador temporal del Playground si aplica
    if (appState.filePath && appState.filePath.includes('themes')) {
      localStorage.removeItem('md-theme-draft-text');
      localStorage.removeItem('md-theme-draft-path');
    }

    alertNotification('Cambios guardados con éxito', 'success');
  } catch (error) {
    console.error('Error al guardar:', error);
    alertNotification('Error al guardar los cambios: ' + error, 'error');
  }
}

// ==========================================================================
// GESTIÓN MULTIPLATAFORMA DE CARPETA RAÍZ Y RUTAS DE TRABAJO
// ==========================================================================

async function inicializarRutaBaseDocumentos() {
  if (invoke) {
    try {
      const rutaBase = await invoke('obtener_ruta_base_documentos');
      if (rutaBase) {
        appState.systemDefaultRootFolder = rutaBase;
        actualizarVisualizacionRutaRaiz();
      }
    } catch (e) {
      console.error('Error al resolver carpeta nativa de documentos:', e);
    }
  }
}

function obtenerRutaRaizEfectiva() {
  return appState.customRootFolder || appState.systemDefaultRootFolder || '';
}

function obtenerDirectorioArranqueDialogo() {
  if (appState.filePath) {
    const sep = appState.filePath.includes('/') ? '/' : '\\';
    const parts = appState.filePath.split(sep);
    parts.pop();
    const folder = parts.join(sep);
    if (folder) return folder;
  }
  if (appState.lastUsedFolder) {
    return appState.lastUsedFolder;
  }
  return obtenerRutaRaizEfectiva();
}

function actualizarVisualizacionRutaRaiz() {
  if (DOM.inputRootFolder) {
    DOM.inputRootFolder.value = obtenerRutaRaizEfectiva();
  }
}

async function guardarComo() {
  if (!invoke) {
    alertNotification('La comunicación con Tauri no está activa.', 'error');
    return;
  }

  try {
    const contenido = DOM.editor.value;
    // Pre-rellenar el diálogo con el nombre del archivo con extensión .md
    const defaultSaveName = appState.fileName.replace(/\s+/g, '_') + '.md';
    const rutaInicial = obtenerDirectorioArranqueDialogo();
    const fileData = await invoke('guardar_como', { 
      defaultName: defaultSaveName, 
      content: contenido,
      defaultPath: rutaInicial || null
    });
    
    if (fileData) {
      appState.filePath = fileData.path;
      const sep = fileData.path.includes('/') ? '/' : '\\';
      const parts = fileData.path.split(sep);
      parts.pop();
      const folderSaved = parts.join(sep);
      if (folderSaved) {
        appState.lastUsedFolder = folderSaved;
        localStorage.setItem('md-last-used-folder', folderSaved);
      }
      
      // Guardar nombre sin la extensión para la barra de menú
      let name = fileData.name;
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        name = name.substring(0, lastDot);
      }
      appState.fileName = name;
      setSavedState(true);
      
      // Limpiar borrador temporal del Playground si aplica
      if (appState.filePath && appState.filePath.includes('themes')) {
        localStorage.removeItem('md-theme-draft-text');
        localStorage.removeItem('md-theme-draft-path');
      }

      alertNotification('Archivo guardado con éxito', 'success');
    }
  } catch (error) {
    console.error('Error al guardar como:', error);
    alertNotification('Error al guardar el archivo: ' + error, 'error');
  }
}

// ==========================================================================
// VERSIONADO AUTOMÁTICO Y REUBICACIÓN DE RUTA DE GUARDADO
// ==========================================================================

async function versionarDocumentoActual() {
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  const digits = appState.versioningDigits || 3;
  const currentContent = DOM.editor.value;

  if (appState.filePath === null) {
    // Caso 1: El documento nunca ha sido guardado en disco
    alertNotification(t.versioning_initial_notice || 'Debes guardar el documento inicial en disco antes de comenzar su versionado.', 'info');
    
    let baseName = appState.fileName;
    const lastDot = baseName.lastIndexOf('.');
    if (lastDot > 0) baseName = baseName.substring(0, lastDot);
    const vMatch = baseName.match(/^(.*?)_V_\d+$/);
    if (vMatch) {
      baseName = vMatch[1];
    }
    const initialVersionName = `${baseName}_V_${'1'.padStart(digits, '0')}.md`;
    
    try {
      if (invoke) {
        const rutaInicial = obtenerDirectorioArranqueDialogo();
        const fileData = await invoke('guardar_como', {
          defaultName: initialVersionName,
          content: currentContent,
          defaultPath: rutaInicial || null
        });
        if (fileData) {
          appState.filePath = fileData.path;
          const sep = fileData.path.includes('/') ? '/' : '\\';
          const parts = fileData.path.split(sep);
          parts.pop();
          const folderSaved = parts.join(sep);
          if (folderSaved) {
            appState.lastUsedFolder = folderSaved;
            localStorage.setItem('md-last-used-folder', folderSaved);
          }
          let name = fileData.name;
          const dotIdx = name.lastIndexOf('.');
          if (dotIdx > 0) name = name.substring(0, dotIdx);
          appState.fileName = name;
          setSavedState(true);
          alertNotification((t.versioning_initial_saved || 'Documento inicial guardado como primera versión: ') + fileData.name, 'success');
        }
      } else {
        descargarArchivo(initialVersionName, currentContent, 'text/markdown');
        appState.fileName = initialVersionName.replace(/\.md$/, '');
        setSavedState(true);
        alertNotification((t.versioning_initial_saved || 'Documento inicial guardado como primera versión: ') + initialVersionName, 'success');
      }
    } catch (err) {
      console.error('Error al guardar versión inicial:', err);
      alertNotification('Error al guardar documento inicial: ' + err, 'error');
    }
    return;
  }

  // Caso 2: El documento ya existe en disco
  try {
    if (invoke) {
      const fileData = await invoke('versionar_documento', {
        filePath: appState.filePath,
        content: currentContent,
        digits: digits
      });
      if (fileData) {
        appState.filePath = fileData.path;
        let name = fileData.name;
        const dotIdx = name.lastIndexOf('.');
        if (dotIdx > 0) name = name.substring(0, dotIdx);
        appState.fileName = name;
        setSavedState(true);
        alertNotification((t.versioning_success || 'Nueva versión creada: ') + fileData.name + (t.versioning_backed_up || ' (versión previa respaldada)'), 'success');
      }
    } else {
      let baseName = appState.fileName;
      const lastDot = baseName.lastIndexOf('.');
      if (lastDot > 0) baseName = baseName.substring(0, lastDot);
      let nextV = 2;
      const vMatch = baseName.match(/^(.*?)_V_(\d+)$/);
      if (vMatch) {
        baseName = vMatch[1];
        nextV = parseInt(vMatch[2], 10) + 1;
      }
      const newName = `${baseName}_V_${String(nextV).padStart(digits, '0')}.md`;
      descargarArchivo(newName, currentContent, 'text/markdown');
      appState.fileName = newName.replace(/\.md$/, '');
      setSavedState(true);
      alertNotification((t.versioning_success || 'Nueva versión creada: ') + newName, 'success');
    }
  } catch (err) {
    console.error('Error al versionar documento:', err);
    alertNotification('Error al versionar documento: ' + err, 'error');
  }
}

async function reubicarCarpetaDocumento() {
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  const currentContent = DOM.editor.value;

  try {
    if (invoke) {
      const rutaInicial = obtenerDirectorioArranqueDialogo();
      const folder = await invoke('seleccionar_carpeta', { rutaInicial: rutaInicial || null });
      if (!folder) return; // Cancelado por el usuario
      
      appState.lastUsedFolder = folder;
      localStorage.setItem('md-last-used-folder', folder);
      
      let fileName = appState.fileName;
      if (!fileName.endsWith('.md')) fileName += '.md';
      fileName = fileName.replace(/\s+/g, '_');
      
      const separator = folder.includes('/') ? '/' : '\\';
      const cleanFolder = folder.endsWith('/') || folder.endsWith('\\') ? folder.slice(0, -1) : folder;
      const newPath = `${cleanFolder}${separator}${fileName}`;
      
      const savedPath = await invoke('guardar_archivo', {
        path: newPath,
        content: currentContent
      });
      
      appState.filePath = savedPath || newPath;
      let name = fileName;
      const dotIdx = name.lastIndexOf('.');
      if (dotIdx > 0) name = name.substring(0, dotIdx);
      appState.fileName = name;
      setSavedState(true);
      alertNotification((t.relocate_success || 'Nueva ruta establecida: ') + (savedPath || newPath), 'success');
    } else {
      alertNotification('La selección de carpetas del sistema solo está disponible en la aplicación de escritorio.', 'info');
    }
  } catch (err) {
    console.error('Error al reubicar documento:', err);
    alertNotification('Error al cambiar carpeta de destino: ' + err, 'error');
  }
}

// ==========================================================================
// CONTROL DE VISTAS (PANELES E IMPRESIONES)
// ==========================================================================

function cambiarVista(vista) {
  appState.activeView = vista;
  
  // Limpiar layouts anteriores
  DOM.appContainer.className = '';
  
  DOM.viewEditor.classList.remove('active');
  DOM.viewSplit.classList.remove('active');
  DOM.viewPreview.classList.remove('active');
  
  if (vista === 'editor') {
    DOM.appContainer.classList.add('only-editor');
    DOM.viewEditor.classList.add('active');
  } else if (vista === 'preview') {
    DOM.appContainer.classList.add('only-preview');
    DOM.viewPreview.classList.add('active');
  } else {
    DOM.appContainer.classList.add('split-view');
    DOM.viewSplit.classList.add('active');
  }
  
  // Reposicionar el visor de Markdown al cambiar de vista para que coincida
  renderMarkdown();
}

// ==========================================================================
// LÓGICA DE DIÁLOGOS EMERGENTES (MODALES PREMIUM Y DESENFOQUE)
// ==========================================================================

function abrirModal(modal) {
  if (!modal) return;
  
  if (modal.classList.contains('active')) {
    cerrarModal(modal);
    return;
  }
  
  modal.classList.add('active');
  
  // Traer el modal actual al frente de los demás
  const box = modal.querySelector('.modal-box');
  if (box) {
    document.querySelectorAll('.modal-box').forEach(b => b.style.zIndex = '100');
    box.style.zIndex = '101';
    
    // Posicionamiento en cascada inicial para ventanas flotantes
    if (modal.classList.contains('floating-window') && !box.dataset.initializedPosition) {
      const defaultPositions = {
        'modal-md-basic': { top: 140, left: 30 },
        'modal-md-headings': { top: 140, left: 310 },
        'modal-md-lists': { top: 140, left: 590 },
        'modal-md-media': { top: 400, left: 30 },
        'modal-md-code': { top: 400, left: 310 },
        'modal-md-structure': { top: 400, left: 590 },
        'modal-md-advanced': { top: 270, left: 870 }
      };
      
      const pos = defaultPositions[modal.id];
      if (pos) {
        // Asegurarse de que entren en los límites de la pantalla del usuario
        const left = Math.max(20, Math.min(pos.left, window.innerWidth - 280));
        const top = Math.max(80, Math.min(pos.top, window.innerHeight - 300));
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = 'scale(1) translateY(0)';
        box.dataset.initializedPosition = 'true';
      }
    }
  }
  
  // Si abrimos el modal de estadísticas, forzamos su actualización
  if (modal === DOM.modalStats) {
    actualizarEstadisticasDetalladas();
  }
}

function cerrarModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  
  if (modal === DOM.modalMd) {
    dockShortcutsToSidebar();
  } else if (modal.id && modal.id.startsWith('modal-md-')) {
    // Si cerramos una ventana flotante individual, re-expandimos su categoría en el panel maestro
    const cat = modal.id.replace('modal-md-', '');
    const card = document.querySelector(`.shortcuts-category-card[data-category="${cat}"]`);
    if (card) {
      card.classList.remove('collapsed');
      const collapseBtn = card.querySelector('.btn-collapse-cat');
      if (collapseBtn) {
        collapseBtn.setAttribute('title', 'Minimizar categoría');
      }
    }
  }
  
  // Devolver el foco al editor para mantener el flujo de escritura fluido
  DOM.editor.focus();
}

function cerrarModales() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    cerrarModal(modal);
  });
}

// Configurar los manejadores de cierre de todos los modales (sin cerrar al hacer clic en overlay)
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  // Cierre por el botón 'X' o por el botón 'Cerrar'
  overlay.querySelectorAll('.modal-close-btn, .btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => cerrarModal(overlay));
  });

  // Habilitar botón de colapsar / minimizar panel
  overlay.querySelectorAll('.modal-collapse-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar arrastre o elevación de z-index
      const modalBox = overlay.querySelector('.modal-box');
      if (modalBox) {
        modalBox.classList.toggle('collapsed');
        btn.title = modalBox.classList.contains('collapsed') ? 'Expandir panel' : 'Minimizar panel';
      }
    });
  });

  // Habilitar elevación de z-index al hacer clic en cualquier parte del modal box
  const box = overlay.querySelector('.modal-box');
  if (box) {
    box.addEventListener('mousedown', () => {
      document.querySelectorAll('.modal-box').forEach(b => b.style.zIndex = '100');
      box.style.zIndex = '101';
    });
  }
});

// Función física de arrastre (Drag & Drop) para los modales flotantes (Optimizado para 60 FPS)
function habilitarArrastreModal(modalOverlay) {
  if (!modalOverlay) return;
  const modalBox = modalOverlay.querySelector('.modal-box');
  if (!modalBox) return;
  const header = modalBox.querySelector('.modal-header');
  if (!header) return;
  
  let xOffset = 0;
  let yOffset = 0;
  let isDragging = false;
  let maxX = 0;
  let maxY = 0;
  
  header.addEventListener('mousedown', dragStart);
  
  function dragStart(e) {
    // Evitar arrastre al hacer clic en botones de cierre, colapso o controles interactivos
    if (e.target.closest('.modal-close-btn') || e.target.closest('.modal-collapse-btn') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    
    // Elevar profundidad del modal arrastrado
    document.querySelectorAll('.modal-box').forEach(b => b.style.zIndex = '100');
    modalBox.style.zIndex = '101';
    
    // Obtener la posición inicial del puntero y precalcular dimensiones una sola vez
    const rect = modalBox.getBoundingClientRect();
    xOffset = e.clientX - rect.left;
    yOffset = e.clientY - rect.top;
    
    maxX = window.innerWidth - rect.width;
    maxY = window.innerHeight - rect.height;
    
    isDragging = true;
    modalBox.classList.add('dragging');
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    let left = e.clientX - xOffset;
    let top = e.clientY - yOffset;
    
    // Limitar el movimiento usando valores precalculados (evita layout thrashing de getBoundingClientRect)
    left = Math.max(0, Math.min(left, maxX));
    top = Math.max(0, Math.min(top, maxY));
    
    modalBox.style.left = left + 'px';
    modalBox.style.top = top + 'px';
    
    // Anular cualquier propiedad transform del CSS que altere la posición
    modalBox.style.transform = 'scale(1) translateY(0)';
  }
  
  function dragEnd() {
    isDragging = false;
    modalBox.classList.remove('dragging');
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragEnd);
  }
}

// Inicializar el arrastre en todos los modales
window.addEventListener('DOMContentLoaded', () => {
  habilitarArrastreModal(DOM.modalMd);
  habilitarArrastreModal(DOM.modalStats);
  habilitarArrastreModal(DOM.modalConfig);
  
  // Habilitar arrastre en las nuevas ventanas flotantes de categorías
  document.querySelectorAll('.floating-window').forEach(overlay => {
    habilitarArrastreModal(overlay);
  });

  // Registrar eventos en los botones de categoría
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      const targetModal = document.getElementById(`modal-md-${category}`);
      if (targetModal) {
        abrirModal(targetModal);
      }
    });
  });

  // Inicializar los listeners estáticos del modo estructurado
  inicializarModoEstructurado();
});

// ==========================================================================
// LÓGICA DE INYECCIÓN DE ATAJOS MARKDOWN (MODAL MD)
// ==========================================================================

const isMac = typeof navigator !== 'undefined' && (/Mac|iPhone|iPod|iPad/i.test(navigator.platform) || /Macintosh|Mac OS X/i.test(navigator.userAgent));

const KEYBOARD_SHORTCUTS = {
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

function actualizarInsigniasAtajos() {
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

function insertarSintaxisMarkdown(tipo) {
  if (historial) {
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

// ==========================================================================
// GESTIÓN DE ACOPLE / DESACOPLE DEL PANEL DE ATAJOS MARKDOWN
// ==========================================================================

function dockShortcutsToSidebar() {
  const sidebar = DOM.shortcutsSidebar || document.getElementById('shortcuts-sidebar');
  const wrapper = DOM.shortcutsCategoriesWrapper || document.getElementById('shortcuts-categories-wrapper');
  const sidebarBody = DOM.shortcutsSidebarBody || document.getElementById('shortcuts-sidebar-body');
  
  if (wrapper && sidebarBody && !sidebarBody.contains(wrapper)) {
    sidebarBody.appendChild(wrapper);
  }
  if (DOM.modalMd && DOM.modalMd.classList.contains('active')) {
    DOM.modalMd.classList.remove('active');
  }
}

function undockShortcutsToFloating() {
  const sidebar = DOM.shortcutsSidebar || document.getElementById('shortcuts-sidebar');
  const wrapper = DOM.shortcutsCategoriesWrapper || document.getElementById('shortcuts-categories-wrapper');
  const masterSlot = DOM.shortcutsMasterBodySlot || document.getElementById('shortcuts-master-body-slot');
  
  if (sidebar) {
    sidebar.classList.add('collapsed');
  }
  if (DOM.btnMd) {
    DOM.btnMd.classList.remove('active');
  }
  
  if (wrapper && masterSlot) {
    masterSlot.appendChild(wrapper);
  }
  abrirModal(DOM.modalMd);
  alertNotification('Panel de atajos desacoplado a ventana flotante', 'info');
}

function toggleShortcutsSidebar() {
  const sidebar = DOM.shortcutsSidebar || document.getElementById('shortcuts-sidebar');
  if (!sidebar) return;
  
  // Si la ventana flotante está abierta, cerrarla y traer el contenido a la barra lateral
  if (DOM.modalMd && DOM.modalMd.classList.contains('active')) {
    dockShortcutsToSidebar();
    sidebar.classList.remove('collapsed');
    DOM.btnMd.classList.add('active');
    return;
  }
  
  dockShortcutsToSidebar();
  
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  DOM.btnMd.classList.toggle('active', !isCollapsed);
}

// Listeners de desacople, reacople y cierre del panel de atajos
if (DOM.btnUndockShortcuts) {
  DOM.btnUndockShortcuts.addEventListener('click', undockShortcutsToFloating);
}

if (DOM.btnDockShortcutsMaster) {
  DOM.btnDockShortcutsMaster.addEventListener('click', () => {
    dockShortcutsToSidebar();
    if (DOM.shortcutsSidebar) {
      DOM.shortcutsSidebar.classList.remove('collapsed');
      DOM.btnMd.classList.add('active');
    }
  });
}

if (DOM.btnCloseShortcutsSidebar) {
  DOM.btnCloseShortcutsSidebar.addEventListener('click', () => {
    if (DOM.shortcutsSidebar) {
      DOM.shortcutsSidebar.classList.add('collapsed');
      DOM.btnMd.classList.remove('active');
    }
  });
}

if (DOM.btnDockShortcutsSide) {
  DOM.btnDockShortcutsSide.addEventListener('click', () => {
    if (DOM.shortcutsSidebar) {
      const isRight = DOM.shortcutsSidebar.classList.toggle('dock-right');
      try {
        localStorage.setItem('shortcuts_dock_side', isRight ? 'right' : 'left');
      } catch (e) {}
    }
  });
}

// Restaurar posición guardada de acoplamiento lateral (Izquierda / Derecha)
try {
  const savedSide = localStorage.getItem('shortcuts_dock_side');
  if (savedSide === 'right' && DOM.shortcutsSidebar) {
    DOM.shortcutsSidebar.classList.add('dock-right');
  }
} catch (e) {}

// ==========================================================================
// CÁLCULO DE ESTADÍSTICAS EN TIEMPO REAL (MODAL STATS)
// ==========================================================================

function actualizarEstadisticasDetalladas() {
  const fullText = DOM.editor.value;
  
  // 1. Estadísticas globales del archivo
  const totalWords = fullText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const totalCharsNoSpace = fullText.replace(/\s/g, '').length;
  const totalCharsWithSpace = fullText.length;
  
  // Contar enlaces reales buscando etiquetas 'a' en el visor renderizado
  const totalLinks = DOM.preview.querySelectorAll('a').length;
  
  // 2. Estadísticas de selección inteligente (Editor y Reader)
  let selText = '';
  
  // Si el foco está en el editor, priorizar la selección del editor
  if (document.activeElement === DOM.editor) {
    const start = DOM.editor.selectionStart;
    const end = DOM.editor.selectionEnd;
    if (start !== undefined && end !== undefined && start !== end) {
      selText = fullText.substring(start, end);
    }
  }
  
  // Si sigue vacía, intentar obtener la selección del visor (Reader)
  if (!selText) {
    const selection = window.getSelection();
    if (selection) {
      selText = selection.toString();
    }
  }
  
  const selWords = selText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const selCharsNoSpace = selText.replace(/\s/g, '').length;
  const selCharsWithSpace = selText.length;
  
  // Escribir los resultados en el DOM
  DOM.statWords.textContent = totalWords;
  DOM.statCharsNoSpace.textContent = totalCharsNoSpace;
  DOM.statCharsWithSpace.textContent = totalCharsWithSpace;
  DOM.statLinks.textContent = totalLinks;
  
  DOM.statSelWords.textContent = selWords;
  DOM.statSelCharsNoSpace.textContent = selCharsNoSpace;
  DOM.statSelCharsWithSpace.textContent = selCharsWithSpace;
}

// ==========================================================================
// GESTIÓN DE CONFIGURACIÓN TIPOGRÁFICA (MODAL CONFIG)
// ==========================================================================

function cambiarFontEditor(nuevaFont) {
  appState.editorFont = nuevaFont;
  aplicarConfiguracionVisual();
}

function cambiarFontReader(nuevaFont) {
  appState.readerFont = nuevaFont;
  aplicarConfiguracionVisual();
}

function cambiarFontStructured(nuevaFont) {
  appState.structuredFont = nuevaFont;
  aplicarConfiguracionVisual();
  if (appState.structuredModeActive) {
    renderMarkdown();
  }
}

function cambiarFontSizeEditor(nuevoSize) {
  appState.editorFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
}

function cambiarFontSizeReader(nuevoSize) {
  appState.readerFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
}

function cambiarFontSizeStructured(nuevoSize) {
  appState.structuredFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
  if (appState.structuredModeActive) {
    renderMarkdown();
  }
}

// Lógica para botones de aumento y reducción combinados +1 | -1
function ajustarTamañoGeneral(factor) {
  const nuevoEditorSize = appState.editorFontSize + factor;
  const nuevoReaderSize = appState.readerFontSize + factor;
  const nuevoStructuredSize = appState.structuredFontSize + factor;
  
  // Mantener los valores siempre dentro del rango estricto (10px a 24px)
  if (nuevoEditorSize >= 10 && nuevoEditorSize <= 24) {
    appState.editorFontSize = nuevoEditorSize;
  }
  if (nuevoReaderSize >= 10 && nuevoReaderSize <= 24) {
    appState.readerFontSize = nuevoReaderSize;
  }
  if (nuevoStructuredSize >= 10 && nuevoStructuredSize <= 24) {
    appState.structuredFontSize = nuevoStructuredSize;
  }
  
  aplicarConfiguracionVisual();
}

// Registrar eventos para los controles de configuración
if (DOM.selectEditorFont) {
  DOM.selectEditorFont.addEventListener('change', (e) => cambiarFontEditor(e.target.value));
}
if (DOM.selectReaderFont) {
  DOM.selectReaderFont.addEventListener('change', (e) => cambiarFontReader(e.target.value));
}
if (DOM.selectStructuredFont) {
  DOM.selectStructuredFont.addEventListener('change', (e) => cambiarFontStructured(e.target.value));
}
if (DOM.rangeEditorSize) {
  DOM.rangeEditorSize.addEventListener('input', (e) => cambiarFontSizeEditor(e.target.value));
}
if (DOM.rangeReaderSize) {
  DOM.rangeReaderSize.addEventListener('input', (e) => cambiarFontSizeReader(e.target.value));
}
if (DOM.rangeStructuredSize) {
  DOM.rangeStructuredSize.addEventListener('input', (e) => cambiarFontSizeStructured(e.target.value));
}
if (DOM.btnFontDec) {
  DOM.btnFontDec.addEventListener('click', () => ajustarTamañoGeneral(-1));
}
if (DOM.btnFontInc) {
  DOM.btnFontInc.addEventListener('click', () => ajustarTamañoGeneral(1));
}

if (DOM.checkParagraphIndent) {
  DOM.checkParagraphIndent.addEventListener('change', (e) => {
    appState.enableParagraphIndent = e.target.checked;
    aplicarConfiguracionVisual();
  });
}
if (DOM.rangeIndentSize) {
  DOM.rangeIndentSize.addEventListener('input', (e) => {
    appState.paragraphIndentSize = parseInt(e.target.value, 10);
    aplicarConfiguracionVisual();
  });
}
let listaIdiomasCargados = [];

async function inicializarIdiomas() {
  if (!DOM.selectLanguage) return;

  try {
    listaIdiomasCargados = await listarIdiomasDisponibles(invoke);
    DOM.selectLanguage.innerHTML = '';

    if (!listaIdiomasCargados || listaIdiomasCargados.length === 0) {
      DOM.selectLanguage.innerHTML = '<option value="es">Español</option>';
      return;
    }

    listaIdiomasCargados.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.code;
      opt.textContent = item.name;
      opt.dataset.filePath = item.filePath || '';
      if (item.code === appState.language) {
        opt.selected = true;
      }
      DOM.selectLanguage.appendChild(opt);
    });

    // Cargar desde disco el idioma guardado
    const idiomaActivo = listaIdiomasCargados.find(i => i.code === appState.language) || listaIdiomasCargados[0];
    if (idiomaActivo) {
      appState.language = idiomaActivo.code;
      if (idiomaActivo.filePath) {
        await cargarIdiomaDesdeDisco(idiomaActivo.code, idiomaActivo.filePath, invoke);
      }
      actualizarTextosInterfaz(appState.language);
    }
  } catch (err) {
    console.error('Error al inicializar idiomas dinámicos:', err);
  }
}

if (DOM.selectLanguage) {
  DOM.selectLanguage.addEventListener('change', (e) => cambiarIdioma(e.target.value));
}

if (DOM.btnOpenLanguagesDir) {
  DOM.btnOpenLanguagesDir.addEventListener('click', () => {
    if (invoke) {
      invoke('abrir_carpeta_idiomas').catch(err => {
        console.error('Error al abrir la carpeta de idiomas:', err);
      });
    }
  });
}

async function cambiarIdioma(lang) {
  appState.language = lang;
  localStorage.setItem('md-language', lang);
  if (DOM.selectLanguage) DOM.selectLanguage.value = lang;

  const item = listaIdiomasCargados.find(i => i.code === lang);
  if (item && item.filePath) {
    await cargarIdiomaDesdeDisco(item.code, item.filePath, invoke);
  }
  actualizarTextosInterfaz(lang);
}

function actualizarTextosInterfaz(lang) {
  const t = translations[lang];
  if (!t) return;

  // 1. Barra de Herramientas (tooltips)
  const setTooltip = (el, text) => { if (el) el.setAttribute('title', text); };
  setTooltip(DOM.btnNew, t.title_new);
  setTooltip(DOM.btnOpen, t.tooltip_open_with_recent || t.title_open);
  setTooltip(DOM.btnSave, t.title_save);
  setTooltip(DOM.btnVersionDoc, t.tooltip_version_doc);
  setTooltip(DOM.btnRelocateDoc, t.tooltip_relocate_doc);
  setTooltip(DOM.btnChangeRootFolder, t.tooltip_change_root);
  setTooltip(DOM.btnResetRootFolder, t.tooltip_reset_root);
  setTooltip(DOM.btnExport, t.title_export);
  setTooltip(DOM.btnComponentsToggle, t.title_btn_library);
  setTooltip(DOM.viewEditor, t.title_view_editor);
  setTooltip(DOM.viewSplit, t.title_view_split);
  setTooltip(DOM.viewPreview, t.title_view_preview);
  setTooltip(DOM.btnMd, t.title_btn_md);
  setTooltip(DOM.btnStats, t.title_btn_stats);
  setTooltip(DOM.btnConfig, t.title_btn_config);

  // 2. Elementos de Exportación (dropdown)
  const setSpanText = (el, text) => { if (el) { const span = el.querySelector('span'); if (span) span.textContent = text; } };
  setSpanText(DOM.optExportHtml, t.text_export_html);
  setSpanText(DOM.optExportPdf, t.text_export_pdf);
  setSpanText(DOM.optExportEpub, t.text_export_epub);
  setSpanText(DOM.optSaveTemplate, t.text_save_template);

  // 3. Biblioteca
  const sidebarTitle = document.querySelector('#components-sidebar .sidebar-header h3');
  if (sidebarTitle) sidebarTitle.textContent = t.lib_title;
  if (DOM.tabModules) DOM.tabModules.textContent = t.lib_tab_modules;
  if (DOM.tabTemplates) DOM.tabTemplates.textContent = t.lib_tab_templates;
  const newCompBtn = document.getElementById('btn-new-component');
  if (newCompBtn) newCompBtn.textContent = t.lib_new_btn;
  if (DOM.sidebarSearch) DOM.sidebarSearch.setAttribute('placeholder', lang === 'es' ? 'Buscar componente...' : (lang === 'en' ? 'Search component...' : 'Quaerere elementum...'));

  // 4. Títulos de Modales
  const setModalHeader = (el, text) => { if (el) { const h3 = el.querySelector('.modal-header h3'); if (h3) h3.textContent = text; } };
  setModalHeader(DOM.modalMd, t.md_categories_title);
  setModalHeader(DOM.modalStats, t.stats_title);
  setModalHeader(DOM.modalConfig, t.config_title);
  setModalHeader(DOM.modalEpubExport, t.epub_title);
  setModalHeader(DOM.modalTemplateVars, t.vars_title);
  const modalColorPicker = document.getElementById('modal-color-picker');
  if (modalColorPicker && t.color_picker_title) setModalHeader(modalColorPicker, t.color_picker_title);

  // Theme Playground & Color Picker
  const playgroundTitle = document.getElementById('playground-title');
  if (playgroundTitle && t.playground_title) playgroundTitle.textContent = t.playground_title;
  const btnApplyTheme = document.getElementById('btn-apply-theme-global');
  if (btnApplyTheme && t.playground_apply) btnApplyTheme.textContent = t.playground_apply;
  const btnApplyColor = document.getElementById('btn-apply-color-picker');
  if (btnApplyColor && t.color_picker_btn_apply) btnApplyColor.textContent = t.color_picker_btn_apply;
  const btnCancelColor = document.getElementById('btn-cancel-color-picker');
  if (btnCancelColor && t.color_picker_btn_cancel) btnCancelColor.textContent = t.color_picker_btn_cancel;
  const btnSaveSlot = document.getElementById('btn-save-to-palette');
  if (btnSaveSlot && t.color_picker_save_slot) btnSaveSlot.textContent = '+ ' + t.color_picker_save_slot;
  const ctxComp = document.getElementById('ctx-palette-complementary');
  if (ctxComp && t.color_picker_ctx_complementary) ctxComp.textContent = t.color_picker_ctx_complementary;
  const ctxAna = document.getElementById('ctx-palette-analogous');
  if (ctxAna && t.color_picker_ctx_analogous) ctxAna.textContent = t.color_picker_ctx_analogous;

  // 5. Títulos de Categorías y Paneles Flotantes
  const setCategoryTitle = (cat, text) => {
    document.querySelectorAll(`[data-category-title="${cat}"]`).forEach(titleEl => {
      titleEl.textContent = text;
    });
  };
  setCategoryTitle('basic', t.md_title_basic || t.md_cat_basic);
  setCategoryTitle('headings', t.md_title_headings || t.md_cat_headings);
  setCategoryTitle('lists', t.md_title_lists || t.md_cat_lists);
  setCategoryTitle('media', t.md_title_media || t.md_cat_media);
  setCategoryTitle('code', t.md_title_code || t.md_cat_code);
  setCategoryTitle('structure', t.md_title_structure || t.md_cat_structure);
  setCategoryTitle('advanced', t.md_title_advanced || t.md_cat_advanced);

  const setFloatingHeaderAndFooter = (id, title, help) => {
    const modal = document.getElementById(id);
    if (modal) {
      const h3 = modal.querySelector('.modal-header h3');
      if (h3) h3.textContent = title;
      const footerSpan = modal.querySelector('.shortcut-help-footer span');
      if (footerSpan) footerSpan.textContent = help;
    }
  };
  setFloatingHeaderAndFooter('modal-md-basic', t.md_title_basic, t.help_basic);
  setFloatingHeaderAndFooter('modal-md-headings', t.md_title_headings, t.help_headings);
  setFloatingHeaderAndFooter('modal-md-lists', t.md_title_lists, t.help_lists);
  setFloatingHeaderAndFooter('modal-md-media', t.md_title_media, t.help_media);
  setFloatingHeaderAndFooter('modal-md-code', t.md_title_code, t.help_code);
  setFloatingHeaderAndFooter('modal-md-structure', t.md_title_structure, t.help_structure);
  setFloatingHeaderAndFooter('modal-md-advanced', t.md_title_advanced, t.help_advanced);

  // 6. Botones de Atajos (leídos íntegramente desde los archivos de configuración de idioma con fallback automático)
  const esDict = translations.es || {};
  const currentDict = translations[lang] || translations[appState.language] || t || esDict;
  const getTrans = (key) => (currentDict && currentDict[key]) || (t && t[key]) || (translations[lang] && translations[lang][key]) || esDict[key] || '';

  const shortcutTranslations = {
    'bold': { text: getTrans('btn_bold'), title: getTrans('tip_bold') },
    'italic': { text: getTrans('btn_italic'), title: getTrans('tip_italic') },
    'underline': { text: getTrans('btn_underline'), title: getTrans('tip_underline') },
    'strikethrough': { text: getTrans('btn_strikethrough'), title: getTrans('tip_strikethrough') },
    'highlight': { text: getTrans('btn_highlight'), title: getTrans('tip_highlight') },
    'superscript': { text: getTrans('btn_superscript'), title: getTrans('tip_superscript') },
    'subscript': { text: getTrans('btn_subscript'), title: getTrans('tip_subscript') },
    'h1': { text: getTrans('btn_h1'), title: getTrans('tip_h1') },
    'h2': { text: getTrans('btn_h2'), title: getTrans('tip_h2') },
    'h3': { text: getTrans('btn_h3'), title: getTrans('tip_h3') },
    'h4': { text: getTrans('btn_h4'), title: getTrans('tip_h4') },
    'h5': { text: getTrans('btn_h5'), title: getTrans('tip_h5') },
    'h6': { text: getTrans('btn_h6'), title: getTrans('tip_h6') },
    'ul': { text: getTrans('btn_ul'), title: getTrans('tip_ul') },
    'ol': { text: getTrans('btn_ol'), title: getTrans('tip_ol') },
    'task': { text: getTrans('btn_task'), title: getTrans('tip_task') },
    'link': { text: getTrans('btn_link'), title: getTrans('tip_link') },
    'image': { text: getTrans('btn_image'), title: getTrans('tip_image') },
    'email': { text: getTrans('btn_email'), title: getTrans('tip_email') },
    'inline-code': { text: getTrans('btn_inline_code'), title: getTrans('tip_inline_code') },
    'code-block': { text: getTrans('btn_code_block'), title: getTrans('tip_code_block') },
    'inline-math': { text: getTrans('btn_inline_math'), title: getTrans('tip_inline_math') },
    'block-math': { text: getTrans('btn_block_math'), title: getTrans('tip_block_math') },
    'blockquote': { text: getTrans('btn_blockquote'), title: getTrans('tip_blockquote') },
    'callout': { text: getTrans('btn_callout'), title: getTrans('tip_callout') },
    'table': { text: getTrans('btn_table'), title: getTrans('tip_table') },
    'hr': { text: getTrans('btn_hr'), title: getTrans('tip_hr') },
    'comment': { text: getTrans('btn_comment'), title: getTrans('tip_comment') },
    'footnote': { text: getTrans('btn_footnote'), title: getTrans('tip_footnote') },
    'definition-list': { text: getTrans('btn_def_list'), title: getTrans('tip_def_list') },
    'details': { text: getTrans('btn_details'), title: getTrans('tip_details') }
  };

  document.querySelectorAll('.md-shortcut-btn').forEach(btn => {
    const syntax = btn.getAttribute('data-syntax');
    const trans = shortcutTranslations[syntax];
    if (trans) {
      const labelEl = btn.querySelector('.shortcut-label');
      if (labelEl && trans.text) {
        labelEl.textContent = trans.text;
      } else if (trans.text) {
        btn.textContent = trans.text;
      }
      if (trans.title) {
        btn.setAttribute('title', trans.title);
      }
    }
  });

  const masterShortcutsTitle = document.querySelector('#modal-md .modal-header h3');
  if (masterShortcutsTitle) masterShortcutsTitle.textContent = t.title_shortcuts_panel;
  const sidebarShortcutsTitle = document.querySelector('#shortcuts-sidebar .shortcuts-sidebar-title');
  if (sidebarShortcutsTitle) sidebarShortcutsTitle.textContent = t.title_shortcuts_panel;
  
  const btnDockMaster = document.getElementById('btn-dock-shortcuts-master');
  if (btnDockMaster) btnDockMaster.setAttribute('title', t.tooltip_dock_sidebar);
  const btnUndockSidebar = document.getElementById('btn-undock-shortcuts-sidebar');
  if (btnUndockSidebar) btnUndockSidebar.setAttribute('title', t.tooltip_tearoff_panel);
  const btnDockSide = document.getElementById('btn-dock-shortcuts-side');
  if (btnDockSide) btnDockSide.setAttribute('title', t.tooltip_dock_side);

  document.querySelectorAll('.btn-tearoff-cat').forEach(b => {
    b.setAttribute('title', t.tooltip_tearoff_cat);
  });

  document.querySelectorAll('.btn-collapse-cat').forEach(b => {
    const card = b.closest('.shortcuts-category-card');
    const isCollapsed = card && card.classList.contains('collapsed');
    b.setAttribute('title', isCollapsed ? t.tooltip_expand_cat : t.tooltip_collapse_cat);
  });

  actualizarInsigniasAtajos();

  // 7. Etiquetas de Configuración
  const setLabelText = (selector, text) => { const el = document.querySelector(selector); if (el) el.textContent = text; };
  setLabelText('[for="select-editor-font"]', t.config_font_editor);
  setLabelText('[for="select-reader-font"]', t.config_font_reader);
  setLabelText('[for="select-structured-font"]', t.config_font_tree);
  setLabelText('[for="range-editor-size"]', t.config_size_editor);
  setLabelText('[for="range-reader-size"]', t.config_size_reader);
  setLabelText('[for="check-paragraph-indent"]', t.config_paragraph_indent);
  setLabelText('[for="range-indent-size"]', t.config_indent_size);
  setLabelText('[for="range-structured-size"]', t.config_size_tree);
  setLabelText('[for="select-theme"]', t.config_theme);
  setLabelText('[for="select-language"]', t.config_lang);
  setLabelText('[for="select-max-recent-files"]', t.config_max_recent_files);
  setLabelText('#title-sec-typography', t.config_section_typography);
  setLabelText('#title-sec-interface', t.config_section_interface);
  setLabelText('#title-sec-files', t.config_section_files);
  setLabelText('#lbl-adjust-general', t.config_adjust_general);
  if (DOM.selectMaxRecentFiles) {
    const opts = DOM.selectMaxRecentFiles.options;
    if (opts && opts.length >= 6) {
      opts[0].textContent = t.recent_files_count_5_default || '5 archivos (Predeterminado)';
      opts[1].textContent = t.recent_files_count_6 || '6 archivos';
      opts[2].textContent = t.recent_files_count_7 || '7 archivos';
      opts[3].textContent = t.recent_files_count_8 || '8 archivos';
      opts[4].textContent = t.recent_files_count_9 || '9 archivos';
      opts[5].textContent = t.recent_files_count_10 || '10 archivos';
    }
  }
  
  // Textos de Recientes y Acerca de...
  const recentTitleEl = document.getElementById('recent-menu-title');
  if (recentTitleEl && t.recent_files_title) recentTitleEl.textContent = t.recent_files_title;
  const btnClearRecEl = document.getElementById('btn-clear-recent-files');
  if (btnClearRecEl && t.recent_files_clear) btnClearRecEl.textContent = t.recent_files_clear;
  const textBtnAboutEl = document.getElementById('text-btn-about');
  if (textBtnAboutEl && t.btn_about) textBtnAboutEl.textContent = t.btn_about;
  const aboutModalTitleEl = document.getElementById('about-modal-title');
  if (aboutModalTitleEl && t.about_title) aboutModalTitleEl.textContent = t.about_title;
  const aboutLblVersionEl = document.getElementById('about-lbl-version');
  if (aboutLblVersionEl && t.about_version) aboutLblVersionEl.textContent = t.about_version;
  const aboutLblYearEl = document.getElementById('about-lbl-year');
  if (aboutLblYearEl && t.about_year) aboutLblYearEl.textContent = t.about_year;
  const aboutCopyrightEl = document.getElementById('about-copyright-text');
  if (aboutCopyrightEl && t.about_copyright) aboutCopyrightEl.textContent = t.about_copyright;
  const aboutDescEl = document.getElementById('about-desc-text');
  if (aboutDescEl && t.about_description) aboutDescEl.textContent = t.about_description;
  const aboutLicenseTitleEl = document.getElementById('about-license-title');
  if (aboutLicenseTitleEl && t.about_license_title) aboutLicenseTitleEl.innerHTML = '<span>⚖️</span> ' + t.about_license_title;
  const aboutLicenseTypeEl = document.getElementById('about-license-type');
  if (aboutLicenseTypeEl && t.about_license_type) aboutLicenseTypeEl.textContent = t.about_license_type;
  const aboutLicenseDescEl = document.getElementById('about-license-desc');
  if (aboutLicenseDescEl && t.about_license_desc) aboutLicenseDescEl.textContent = t.about_license_desc;
  const dndTitleEl = document.getElementById('dnd-overlay-title');
  if (dndTitleEl && t.dnd_overlay_msg) dndTitleEl.textContent = t.dnd_overlay_msg;
  const btnCloseAboutFooter = document.getElementById('btn-close-about-footer');
  if (btnCloseAboutFooter && t.btn_close) btnCloseAboutFooter.textContent = t.btn_close;

  if (DOM.btnFontDec) DOM.btnFontDec.textContent = lang === 'es' ? 'Tamaño Fuente -1' : (lang === 'en' ? 'Font Size -1' : 'Magnitudo Fontis -1');
  if (DOM.btnFontInc) DOM.btnFontInc.textContent = lang === 'es' ? 'Tamaño Fuente +1' : (lang === 'en' ? 'Font Size +1' : 'Magnitudo Fontis +1');
  setLabelText('.config-row-buttons label', lang === 'es' ? 'Ajuste General de Tamaño' : (lang === 'en' ? 'Global Font Size Adjust' : 'Ajustatio Generalis Magnitudinis'));

  // 8. Etiquetas de Modal EPUB
  setLabelText('#modal-epub-export label[for="epub-title"]', t.epub_field_title);
  setLabelText('#modal-epub-export label[for="epub-author"]', t.epub_field_author);
  setLabelText('#modal-epub-export label[for="epub-language"]', t.epub_field_lang);
  setLabelText('#modal-epub-export label[for="epub-cover"]', t.epub_field_cover);
  if (DOM.btnConfirmEpub) DOM.btnConfirmEpub.textContent = t.epub_btn_generate;
  const epubCancel = document.querySelector('#modal-epub-export .modal-footer .btn-close-modal');
  if (epubCancel) epubCancel.textContent = t.btn_cancel;

  // 9. Estadísticas
  const setStatCardLabel = (id, labelText) => {
    const el = document.getElementById(id);
    if (el && el.nextElementSibling) el.nextElementSibling.textContent = labelText;
  };
  setStatCardLabel('stat-words', t.stats_words);
  setStatCardLabel('stat-chars-no-space', t.stats_chars_no_space);
  setStatCardLabel('stat-chars-with-space', t.stats_chars_space);
  setStatCardLabel('stat-links', t.stats_links);
  setStatCardLabel('stat-sel-words', lang === 'es' ? 'Palabras seleccionadas' : (lang === 'en' ? 'Selected words' : 'Verba selecta'));
  setStatCardLabel('stat-sel-chars-no-space', lang === 'es' ? 'Caract. seleccionados (sin esp.)' : (lang === 'en' ? 'Selected chars (no spaces)' : 'Characteres selecti (sine spatiis)'));
  setStatCardLabel('stat-sel-chars-with-space', lang === 'es' ? 'Caract. seleccionados (con esp.)' : (lang === 'en' ? 'Selected chars (with spaces)' : 'Characteres selecti (cum spatiis)'));

  // 10. Modales del sistema
  const statsSelectionTitle = document.querySelector('#modal-stats .modal-body h4');
  if (statsSelectionTitle) statsSelectionTitle.textContent = t.stats_selection_title;

  const varsDesc = document.querySelector('#modal-template-vars .modal-body p');
  if (varsDesc) varsDesc.textContent = t.vars_desc;
  if (DOM.btnApplyVars) DOM.btnApplyVars.textContent = t.vars_btn_apply;
  if (DOM.btnCancelVars) DOM.btnCancelVars.textContent = t.btn_cancel;

  const configCloseBtn = document.querySelector('#modal-config .modal-box .btn-close-modal');
  if (configCloseBtn) configCloseBtn.textContent = t.btn_close;

  // 11. Barra de Estado
  actualizarBarraDeEstadoTextos();

  // 12. Recargar componentes de la barra lateral si está visible
  if (DOM.componentsSidebar && !DOM.componentsSidebar.classList.contains('collapsed')) {
    cargarComponentesSidebar();
  }

  // 13. Forzar repintado del visor (necesario para el modo estructurado y dinámicos)
  renderMarkdown();
}

// ==========================================================================
// DRAG & DROP NATIVO Y MODAL ACERCA DE...
// ==========================================================================
async function validarYAbrirArchivoSoltado(pathOrName, fileObj = null) {
  const fileName = (pathOrName || '').split(/[\\/]/).pop() || '';
  const lower = fileName.toLowerCase();
  const allowed = ['.md', '.markdown', '.txt', '.json', '.xml', '.yaml', '.yml'];
  const isAllowed = allowed.some(ext => lower.endsWith(ext));
  
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  
  if (!isAllowed) {
    alertNotification(t.dnd_format_unsupported || 'Formato no compatible. Formatos permitidos: .md, .markdown, .txt, .json, .xml, .yaml', 'error');
    return;
  }

  if (!appState.isSaved) {
    const accion = await solicitarConfirmacionSistema({
      titulo: t.confirm_title_open || 'Abrir Documento',
      mensaje: t.confirm_msg_unsaved_open || 'Tienes cambios pendientes sin guardar. ¿Qué deseas hacer antes de abrir otro documento?',
      detalle: 'Si guardas, tus cambios quedarán asegurados en el disco antes de cargar el nuevo archivo.',
      tipo: 'warning',
      btnSaveText: t.confirm_btn_save || 'Guardar cambios',
      btnDiscardText: t.confirm_btn_discard || 'Descartar cambios',
      btnCancelText: t.confirm_btn_cancel || 'Cancelar'
    });

    if (accion === 'cancel') return;
    if (accion === 'save') {
      const guardado = await guardarArchivo();
      if (!guardado) return;
    }
  }

  // Si tenemos ruta en disco y puente nativo Tauri
  if (pathOrName && (pathOrName.includes('/') || pathOrName.includes('\\')) && invoke) {
    await abrirArchivoDesdeRuta(pathOrName);
    return;
  }

  // Fallback para archivo en memoria (objeto File del navegador)
  if (fileObj) {
    try {
      const content = await fileObj.text();
      await procesarYCargarDocumento({ name: fileObj.name, path: fileObj.path || '', content });
    } catch (err) {
      console.error('Error al leer archivo soltado:', err);
      alertNotification('Error al leer el archivo arrastrado: ' + (err.message || err), 'error');
    }
  }
}

function inicializarDragAndDrop() {
  const overlay = DOM.dndOverlay;
  let dragCounter = 0;

  // 1. Integración Nativa con Eventos de Ventana de Tauri v2
  if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
    window.__TAURI__.event.listen('archivo-arrastre-inicio', () => {
      if (overlay) overlay.style.display = 'flex';
    }).catch(() => {});

    window.__TAURI__.event.listen('archivo-arrastre-fin', () => {
      if (overlay) overlay.style.display = 'none';
    }).catch(() => {});

    window.__TAURI__.event.listen('archivo-arrastrado', async (event) => {
      if (overlay) overlay.style.display = 'none';
      const filePath = typeof event.payload === 'string' ? event.payload : (event.payload && event.payload.path);
      if (filePath) {
        await validarYAbrirArchivoSoltado(filePath);
      }
    }).catch(() => {});
  }

  // 2. Soporte para API Drag & Drop HTML5 estándar (en WebView2 o navegador)
  ['dragenter', 'dragover'].forEach(evt => {
    window.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (overlay) overlay.style.display = 'flex';
    });
    if (DOM.editor) {
      DOM.editor.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (overlay) overlay.style.display = 'none';
    }
  });

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    if (overlay) overlay.style.display = 'none';

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = file.path || '';
      if (filePath) {
        await validarYAbrirArchivoSoltado(filePath);
      } else {
        await validarYAbrirArchivoSoltado(file.name, file);
      }
    }
  };

  window.addEventListener('drop', handleDrop);
  if (DOM.editor) {
    DOM.editor.addEventListener('drop', handleDrop);
  }
}

function inicializarModalAbout() {
  if (DOM.modalAbout) {
    habilitarArrastreModal(DOM.modalAbout);
  }
  if (DOM.btnOpenAbout && DOM.modalAbout) {
    DOM.btnOpenAbout.addEventListener('click', () => {
      abrirModal(DOM.modalAbout);
    });
  }
  if (DOM.btnCloseAbout && DOM.modalAbout) {
    DOM.btnCloseAbout.addEventListener('click', () => {
      cerrarModal(DOM.modalAbout);
    });
  }
  if (DOM.btnCloseAboutFooter && DOM.modalAbout) {
    DOM.btnCloseAboutFooter.addEventListener('click', () => {
      cerrarModal(DOM.modalAbout);
    });
  }
  if (DOM.modalAbout) {
    DOM.modalAbout.addEventListener('click', (e) => {
      if (e.target === DOM.modalAbout) {
        cerrarModal(DOM.modalAbout);
      }
    });
  }
}

inicializarDragAndDrop();
inicializarModalAbout();

function actualizarBarraDeEstadoTextos() {
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  if (!t) return;

  actualizarNombreArchivo();
}

let panelBajoCursor = null;

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

// Sincronización interactiva de foco por línea activa con resaltado temporal premium
let highlightTimeoutId = null;

function limpiarResaltadoTemporal() {
  if (highlightTimeoutId) {
    clearTimeout(highlightTimeoutId);
    highlightTimeoutId = null;
  }
  const blocks = DOM.preview.querySelectorAll('.markdown-body > *');
  blocks.forEach(b => b.classList.remove('highlighted-block'));
}

// Divide el texto del editor en bloques con estructura Markdown
function parseEditorBlocks(text) {
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

function sincronizarFocoElemento() {
  const text = DOM.editor.value;
  const cursorSelStart = DOM.editor.selectionStart;
  
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

// Sincronizar foco inverso (Doble clic en Visor selecciona línea del Editor)
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
  
  const text = DOM.editor.value;
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
    DOM.editor.focus();
    DOM.editor.setSelectionRange(startChar, endChar);
    
    // Desplazar suavemente el textarea
    const lineHeight = 24; // Aproximado
    DOM.editor.scrollTop = Math.max(0, (matchedBlock.startLine * lineHeight) - 100);
    
    // Resaltar visualmente el bloque del visor y aplicar temporizador de desvanecimiento
    limpiarResaltadoTemporal();
    targetElement.classList.add('highlighted-block');
    
    highlightTimeoutId = setTimeout(() => {
      if (targetElement) targetElement.classList.remove('highlighted-block');
    }, 1500);
  }
});

// ==========================================================================
// ALGORITMO MATEMÁTICO DE CORRESPONDENCIA DE ÍNDICES MD Y SELECCIÓN DUAL
// ==========================================================================

function obtenerMapaDeIndices(original) {
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

function sincronizarSeleccionReaderAEditor() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const selectedText = selection.toString();
  if (!selectedText || selectedText.trim().length === 0) return;
  
  // Encontrar el bloque de texto contenedor directo
  const containerElement = selection.anchorNode.parentElement.closest('.markdown-body > *');
  if (!containerElement) return;
  
  const containerText = containerElement.textContent.trim();
  if (containerText.length < 3) return;
  
  // Buscar el bloque correspondiente en el Editor
  const fullText = DOM.editor.value;
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

// Vincular evento mouseup en el visor para disparar la selección sincronizada
DOM.preview.addEventListener('mouseup', sincronizarSeleccionReaderAEditor);


// Registrar eventos de teclado y ratón en el editor para el resaltado y estadísticas en tiempo real
DOM.editor.addEventListener('keyup', () => {
  sincronizarFocoElemento();
  if (DOM.modalStats.classList.contains('active')) {
    actualizarEstadisticasDetalladas();
  }
});

DOM.editor.addEventListener('click', () => {
  sincronizarFocoElemento();
  if (DOM.modalStats.classList.contains('active')) {
    actualizarEstadisticasDetalladas();
  }
});

// Ajuste automático de selección y Detección de Colores Hex/RGBA para el Color Picker
DOM.editor.addEventListener('dblclick', () => {
  setTimeout(() => {
    const textarea = DOM.editor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const allText = textarea.value;
    const text = allText.substring(start, end);
    
    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed !== text) {
      const leadingCount = text.match(/^\s*/)[0].length;
      const trailingCount = text.match(/\s*$/)[0].length;
      textarea.setSelectionRange(start + leadingCount, end - trailingCount);
    }

    // Detección inteligente de valor de color Hexadecimal o RGBA
    const lineStart = allText.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = allText.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = allText.length;
    const line = allText.substring(lineStart, lineEnd);
    const offsetInLine = start - lineStart;

    const colorRegex = /(#[0-9a-fA-F]{3,8}|rgba?\s*\([^)]+\))/g;
    let match;
    while ((match = colorRegex.exec(line)) !== null) {
      const mStart = match.index;
      const mEnd = match.index + match[0].length;
      if (offsetInLine >= mStart && offsetInLine <= mEnd) {
        const absStart = lineStart + mStart;
        const absEnd = lineStart + mEnd;
        const colorFound = match[0];

        textarea.setSelectionRange(absStart, absEnd);

        abrirColorPicker(colorFound, (nuevoColor) => {
          textarea.setRangeText(nuevoColor, absStart, absEnd, 'select');
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          setSavedState(false);
          if (typeof refrescarPlaygroundLocal === 'function') {
            refrescarPlaygroundLocal();
          }
        });
        break;
      }
    }
  }, 0);
});

// Finalizar sesión de escritura al pulsar espacios, saltos de línea o tabuladores (consolidación por palabra)
DOM.editor.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
    if (historial) {
      historial.finalizarSesionEscritura();
    }
  }
});

// ==========================================================================
// INICIALIZACIÓN, ATADOS DE TECLADO Y ARRANQUE DE LA APP
// ==========================================================================

// Monitoreo de entradas de texto en tiempo real
DOM.editor.addEventListener('input', () => {
  renderMarkdown();
  if (appState.isSaved) {
    setSavedState(false);
  } else {
    guardarBorradorRecuperacion();
  }
  if (historial) {
    historial.registrarEscritura();
  }
  if (DOM.modalStats.classList.contains('active')) {
    actualizarEstadisticasDetalladas();
  }
});

// Actualizar estadísticas al vuelo al cambiar la selección en el editor o en el visor de lectura
document.addEventListener('selectionchange', () => {
  if (DOM.modalStats.classList.contains('active')) {
    actualizarEstadisticasDetalladas();
  }
});

// Manejadores de los botones de la Barra superior
DOM.btnNew.addEventListener('click', nuevoArchivo);
DOM.btnOpen.addEventListener('click', (e) => {
  if (e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    alternarMenuRecientes();
  } else {
    cerrarMenuRecientes();
    abrirArchivo();
  }
});

// Guardar normal, o Guardar Como si se pulsa con Ctrl+Shift
DOM.btnSave.addEventListener('click', (e) => {
  if (e.ctrlKey && e.shiftKey) {
    guardarComo();
  } else {
    guardarArchivo();
  }
});

// Cambios de vistas
DOM.viewEditor.addEventListener('click', () => cambiarVista('editor'));
DOM.viewSplit.addEventListener('click', () => cambiarVista('split'));
DOM.viewPreview.addEventListener('click', () => cambiarVista('preview'));

// Diálogos modales
DOM.btnMd.addEventListener('click', toggleShortcutsSidebar);
DOM.btnStats.addEventListener('click', () => abrirModal(DOM.modalStats));
DOM.btnConfig.addEventListener('click', () => abrirModal(DOM.modalConfig));

// Click sobre el nombre de archivo superior para renombrarlo
DOM.fileNameContainer.addEventListener('click', habilitarEdicionNombre);

if (DOM.btnVersionDoc) {
  DOM.btnVersionDoc.addEventListener('click', versionarDocumentoActual);
}
if (DOM.btnRelocateDoc) {
  DOM.btnRelocateDoc.addEventListener('click', reubicarCarpetaDocumento);
}

if (DOM.selectVersioningDigits) {
  DOM.selectVersioningDigits.value = String(appState.versioningDigits || 3);
  DOM.selectVersioningDigits.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10) || 3;
    appState.versioningDigits = val;
    localStorage.setItem('md-versioning-digits', String(val));
  });
}

if (DOM.selectMaxRecentFiles) {
  DOM.selectMaxRecentFiles.value = String(appState.maxRecentFiles || 5);
  DOM.selectMaxRecentFiles.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10) || 5;
    appState.maxRecentFiles = val;
    localStorage.setItem('md-max-recent-files', String(val));
    renderizarMenuRecientes();
  });
}

if (DOM.btnChangeRootFolder) {
  DOM.btnChangeRootFolder.addEventListener('click', async () => {
    if (invoke) {
      const actual = obtenerRutaRaizEfectiva();
      const seleccionada = await invoke('seleccionar_carpeta', { rutaInicial: actual || null });
      if (seleccionada) {
        appState.customRootFolder = seleccionada;
        localStorage.setItem('md-root-folder', seleccionada);
        actualizarVisualizacionRutaRaiz();
        const lang = appState.language || 'es';
        const t = translations[lang] || translations.es;
        alertNotification((t.root_folder_changed || 'Carpeta raíz actualizada: ') + seleccionada, 'success');
      }
    }
  });
}

if (DOM.btnResetRootFolder) {
  DOM.btnResetRootFolder.addEventListener('click', () => {
    appState.customRootFolder = '';
    localStorage.removeItem('md-root-folder');
    actualizarVisualizacionRutaRaiz();
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    alertNotification((t.root_folder_reset || 'Carpeta raíz restablecida a: ') + appState.systemDefaultRootFolder, 'info');
  });
}

// ==========================================================================
// DESPLAZAMIENTO GESTUAL POR ARRASTRE FÍSICO CON INERCIA (DRAG TO SCROLL)
// ==========================================================================

let isScrollingDrag = false;
let lastY = 0;
let lastTime = 0;
let scrollVelocity = 0; // Velocidad instantánea en px/ms
let inertiaFrameId = null;
const scrollFriction = 0.975; // Coeficiente de desaceleración premium (deslizamiento más duradero)
let velocityHistory = []; // Registro de velocidades recientes para suavizado

function aplicarInerciaScroll() {
  if (Math.abs(scrollVelocity) > 0.01) {
    scrollVelocity *= scrollFriction; // Aplicar fricción
    DOM.previewContainer.scrollTop -= scrollVelocity * 16; // 16ms por frame promedio
    inertiaFrameId = requestAnimationFrame(aplicarInerciaScroll);
  } else {
    scrollVelocity = 0;
    DOM.previewContainer.style.cursor = 'auto';
  }
}

DOM.previewContainer.addEventListener('mousedown', (e) => {
  // Solo clic izquierdo
  if (e.button !== 0) return;
  
  // Si hace clic sobre enlaces, botones o elementos de entrada, no arrastramos
  if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) return;
  
  isScrollingDrag = true;
  lastY = e.clientY;
  lastTime = Date.now();
  scrollVelocity = 0;
  velocityHistory = []; // Reiniciar historial
  
  // Cancelar inercia anterior si existe
  if (inertiaFrameId) {
    cancelAnimationFrame(inertiaFrameId);
    inertiaFrameId = null;
  }
  
  DOM.previewContainer.style.cursor = 'grab';
});

DOM.previewContainer.addEventListener('mousemove', (e) => {
  if (!isScrollingDrag) return;
  
  // Si el usuario está seleccionando texto, cancelamos el gesto de arrastre
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    isScrollingDrag = false;
    DOM.previewContainer.style.cursor = 'auto';
    return;
  }
  
  const currentY = e.clientY;
  const currentTime = Date.now();
  
  const dy = currentY - lastY;
  const dt = currentTime - lastTime;
  
  // Mover el panel de lectura proporcionalmente al desplazamiento relativo
  DOM.previewContainer.scrollTop -= dy * 1.2;
  
  // Calcular velocidad instantánea (px/ms)
  if (dt > 0) {
    const instVelocity = dy / dt;
    velocityHistory.push(instVelocity);
    if (velocityHistory.length > 5) {
      velocityHistory.shift(); // Conservar las últimas 5 velocidades
    }
  }
  
  lastY = currentY;
  lastTime = currentTime;
  DOM.previewContainer.style.cursor = 'grabbing';
});

const detenerArrastreScroll = () => {
  if (isScrollingDrag) {
    isScrollingDrag = false;
    DOM.previewContainer.style.cursor = 'auto';
    
    // Promediar el historial de velocidades recientes para dar inercia fluida y orgánica
    if (velocityHistory.length > 0) {
      scrollVelocity = velocityHistory.reduce((sum, v) => sum + v, 0) / velocityHistory.length;
    } else {
      scrollVelocity = 0;
    }
    
    // Iniciar física de inercia si el mouse se soltó con velocidad
    if (Math.abs(scrollVelocity) > 0.02) {
      inertiaFrameId = requestAnimationFrame(aplicarInerciaScroll);
    }
  }
};

DOM.previewContainer.addEventListener('mouseup', detenerArrastreScroll);
DOM.previewContainer.addEventListener('mouseleave', detenerArrastreScroll);

// ==========================================================================
// RESTRICCIÓN FÍSICA FLUIDA DE VENTANAS FLOTANTES (MODALES RESIZE)
// ==========================================================================

function constrenirModalAPantalla(modalBox) {
  if (!modalBox) return;
  
  // Si nunca se ha arrastrado (no tiene left/top definidos en el estilo en línea), se mantiene centrado por CSS nativo
  if (!modalBox.style.left && !modalBox.style.top) return;
  
  const rect = modalBox.getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  
  let left = parseFloat(modalBox.style.left) || 0;
  let top = parseFloat(modalBox.style.top) || 0;
  
  // Limitar suavemente dentro del área visible de la aplicación, respetando márgenes
  const padding = 16;
  const maxLeft = Math.max(padding, winWidth - rect.width - padding);
  const maxTop = Math.max(padding, winHeight - rect.height - padding);
  
  const newLeft = Math.max(padding, Math.min(left, maxLeft));
  const newTop = Math.max(padding, Math.min(top, maxTop));
  
  // Aplicar solo si cambian los valores
  if (newLeft !== left || newTop !== top) {
    modalBox.style.left = `${newLeft}px`;
    modalBox.style.top = `${newTop}px`;
  }
}

// Escuchar el cambio de tamaño de la ventana principal de forma fluida
window.addEventListener('resize', () => {
  [DOM.modalMd, DOM.modalStats, DOM.modalConfig, DOM.modalEpubExport, DOM.modalAbout].forEach(overlay => {
    if (overlay && overlay.classList.contains('active')) {
      const modalBox = overlay.querySelector('.modal-box');
      if (modalBox) {
        constrenirModalAPantalla(modalBox);
      }
    }
  });
});

// ==========================================================================
// DETECTORES DE CURSOR INTELIGENTE EN BARRAS DE SCROLL
// ==========================================================================

function registrarCursorEnScrollbar(container) {
  let isDraggingScroll = false;
  
  container.addEventListener('mousemove', (e) => {
    if (isDraggingScroll) return;
    
    const rect = container.getBoundingClientRect();
    const isOverScrollbar = (e.clientX >= rect.right - 14) && (e.clientX <= rect.right);
    
    if (isOverScrollbar) {
      container.style.cursor = 'pointer';
    } else {
      if (container === DOM.previewContainer && isScrollingDrag) {
        container.style.cursor = 'grabbing';
      } else {
        container.style.cursor = 'auto';
      }
    }
  });
  
  container.addEventListener('mousedown', (e) => {
    const rect = container.getBoundingClientRect();
    const isOverScrollbar = (e.clientX >= rect.right - 14) && (e.clientX <= rect.right);
    
    if (isOverScrollbar) {
      isDraggingScroll = true;
      container.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing'; // Forzar cursor global durante el arrastre
    }
  });
  
  window.addEventListener('mouseup', () => {
    if (isDraggingScroll) {
      isDraggingScroll = false;
      container.style.cursor = 'auto';
      document.body.style.cursor = 'auto';
    }
  });
}

// Atajos globales de Teclado nativos
window.addEventListener('keydown', (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;
  
  // Ctrl + Z: Deshacer (solo si el editor está enfocado)
  if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
    if (document.activeElement === DOM.editor) {
      e.preventDefault();
      if (historial) {
        historial.deshacer();
      }
      return;
    }
  }
  
  // Ctrl + Y o Ctrl + Shift + Z: Rehacer (solo si el editor está enfocado)
  if (isCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    if (document.activeElement === DOM.editor) {
      e.preventDefault();
      if (historial) {
        historial.rehacer();
      }
      return;
    }
  }

  // Ctrl + N: Nuevo
  if (isCtrl && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    nuevoArchivo();
  }
  
  // Ctrl + O: Abrir
  if (isCtrl && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    abrirArchivo();
  }
  
  // Ctrl + S: Guardar
  if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    guardarArchivo();
  }
  
  // Ctrl + Shift + S: Guardar Como (cuando no está enfocado el editor)
  if (isCtrl && e.shiftKey && e.key.toLowerCase() === 's' && document.activeElement !== DOM.editor) {
    e.preventDefault();
    guardarComo();
  }

  // Atajos de Formato Markdown en el Editor
  if (document.activeElement === DOM.editor) {
    const key = e.key.toLowerCase();
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    // Encabezados 1 a 6: Ctrl + 1..6 (o Cmd + 1..6)
    if (isCtrl && !isAlt && !isShift && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      insertarSintaxisMarkdown('h' + e.key);
      return;
    }
    // Negrita: Ctrl + B
    if (isCtrl && !isAlt && !isShift && key === 'b') {
      e.preventDefault();
      insertarSintaxisMarkdown('bold');
      return;
    }
    // Cursiva: Ctrl + I
    if (isCtrl && !isAlt && !isShift && key === 'i') {
      e.preventDefault();
      insertarSintaxisMarkdown('italic');
      return;
    }
    // Subrayado: Ctrl + U
    if (isCtrl && !isAlt && !isShift && key === 'u') {
      e.preventDefault();
      insertarSintaxisMarkdown('underline');
      return;
    }
    // Tachado: Ctrl + Shift + S en editor
    if (isCtrl && !isAlt && isShift && key === 's') {
      e.preventDefault();
      insertarSintaxisMarkdown('strikethrough');
      return;
    }
    // Resaltado: Ctrl + H
    if (isCtrl && !isAlt && !isShift && key === 'h') {
      e.preventDefault();
      insertarSintaxisMarkdown('highlight');
      return;
    }
    // Superíndice: Ctrl + .
    if (isCtrl && !isAlt && !isShift && e.key === '.') {
      e.preventDefault();
      insertarSintaxisMarkdown('superscript');
      return;
    }
    // Subíndice: Ctrl + ,
    if (isCtrl && !isAlt && !isShift && e.key === ',') {
      e.preventDefault();
      insertarSintaxisMarkdown('subscript');
      return;
    }
    // Código en línea: Ctrl + K (sin shift)
    if (isCtrl && !isAlt && !isShift && key === 'k') {
      e.preventDefault();
      insertarSintaxisMarkdown('inline-code');
      return;
    }
    // Bloque de código: Ctrl + Shift + K
    if (isCtrl && !isAlt && isShift && key === 'k') {
      e.preventDefault();
      insertarSintaxisMarkdown('code-block');
      return;
    }
    // Fórmula en línea: Alt + K
    if (isAlt && !isCtrl && !isShift && key === 'k') {
      e.preventDefault();
      insertarSintaxisMarkdown('inline-math');
      return;
    }
    // Bloque matemático: Alt + Shift + K
    if (isAlt && !isCtrl && isShift && key === 'k') {
      e.preventDefault();
      insertarSintaxisMarkdown('block-math');
      return;
    }
    // Comentario oculto: Ctrl + /
    if (isCtrl && !isAlt && (e.key === '/' || e.key === '7')) {
      e.preventDefault();
      insertarSintaxisMarkdown('comment');
      return;
    }
    // Bloque de alerta: Ctrl + Shift + A
    if (isCtrl && !isAlt && isShift && key === 'a') {
      e.preventDefault();
      insertarSintaxisMarkdown('callout');
      return;
    }
    // Tabla: Ctrl + T
    if (isCtrl && !isAlt && !isShift && key === 't') {
      e.preventDefault();
      insertarSintaxisMarkdown('table');
      return;
    }
    // Lista de tareas: Ctrl + Shift + T
    if (isCtrl && !isAlt && isShift && key === 't') {
      e.preventDefault();
      insertarSintaxisMarkdown('task');
      return;
    }
    // Lista ordenada: Ctrl + Shift + O
    if (isCtrl && !isAlt && isShift && key === 'o') {
      e.preventDefault();
      insertarSintaxisMarkdown('ol');
      return;
    }
    // Cita en bloque: Ctrl + Shift + Q
    if (isCtrl && !isAlt && isShift && key === 'q') {
      e.preventDefault();
      insertarSintaxisMarkdown('blockquote');
      return;
    }
    // Enlace web: Ctrl + Shift + L
    if (isCtrl && !isAlt && isShift && key === 'l') {
      e.preventDefault();
      insertarSintaxisMarkdown('link');
      return;
    }
    // Imagen: Ctrl + Shift + I
    if (isCtrl && !isAlt && isShift && key === 'i') {
      e.preventDefault();
      insertarSintaxisMarkdown('image');
      return;
    }
    // Correo: Ctrl + Shift + M
    if (isCtrl && !isAlt && isShift && key === 'm') {
      e.preventDefault();
      insertarSintaxisMarkdown('email');
      return;
    }
    // Nota al pie: Ctrl + Shift + F
    if (isCtrl && !isAlt && isShift && key === 'f') {
      e.preventDefault();
      insertarSintaxisMarkdown('footnote');
      return;
    }
    // Lista de definición: Ctrl + Shift + D
    if (isCtrl && !isAlt && isShift && key === 'd') {
      e.preventDefault();
      insertarSintaxisMarkdown('definition-list');
      return;
    }
    // Bloque plegable: Ctrl + Alt + D
    if (isCtrl && isAlt && !isShift && key === 'd') {
      e.preventDefault();
      insertarSintaxisMarkdown('details');
      return;
    }
    // Línea divisoria: Alt + Shift + S
    if (isAlt && !isCtrl && isShift && key === 's') {
      e.preventDefault();
      insertarSintaxisMarkdown('hr');
      return;
    }
  }
  
  // Escape: Cerrar modales abiertos
  if (e.key === 'Escape') {
    cerrarModales();
  }
});

// Inicio oficial de la aplicación
window.addEventListener('DOMContentLoaded', () => {
  aplicarConfiguracionVisual();
  inicializarRutaBaseDocumentos();
  actualizarTextosInterfaz(appState.language || 'es');
  
  // Sistema de Recuperación Automática (Auto-Recovery)
  const autosavedDraft = localStorage.getItem('md-autosave-draft');
  const autosavedPath = localStorage.getItem('md-autosave-path');
  const autosavedName = localStorage.getItem('md-autosave-name');
  
  if (autosavedDraft) {
    DOM.editor.value = autosavedDraft;
    if (autosavedPath) {
      appState.filePath = autosavedPath;
    }
    if (autosavedName) {
      appState.fileName = autosavedName;
    }
    setSavedState(false);
  } else {
    setSavedState(true);
  }
  
  renderMarkdown();
  
  // Registrar cursores en las barras de scroll
  registrarCursorEnScrollbar(DOM.editor);
  registrarCursorEnScrollbar(DOM.previewContainer);
  
  // FUNCIONALIDAD PREMIUM TAB-TO-INDENT
  DOM.editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const textarea = DOM.editor;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const originalText = textarea.value;
      
      // Registrar estado en el historial antes del cambio
      if (historial) {
        historial.registrarCambioAntesDeFormato();
      }
      
      const isShift = e.shiftKey;
      
      if (start !== end) {
        // Caso 1: Bloque seleccionado (Indentación/Desindentación multilínea)
        let inicioSeleccion = originalText.lastIndexOf('\n', start - 1);
        if (inicioSeleccion === -1) {
          inicioSeleccion = 0;
        } else {
          inicioSeleccion += 1;
        }
        
        let finSeleccion = originalText.indexOf('\n', end);
        if (finSeleccion === -1) {
          finSeleccion = originalText.length;
        }
        
        const textoSeleccionado = originalText.substring(inicioSeleccion, finSeleccion);
        const lineas = textoSeleccionado.split('\n');
        
        let lineasProcesadas = [];
        let cambiosLongitud = 0;
        
        if (!isShift) {
          // Indentar: añadir un \t a cada línea
          lineasProcesadas = lineas.map(linea => {
            if (linea.length > 0 || lineas.length === 1) {
              cambiosLongitud += 1;
              return '\t' + linea;
            }
            return linea;
          });
        } else {
          // Desindentar: quitar un \t o hasta 4 espacios
          lineasProcesadas = lineas.map(linea => {
            if (linea.startsWith('\t')) {
              cambiosLongitud -= 1;
              return linea.substring(1);
            } else if (linea.startsWith('    ')) {
              cambiosLongitud -= 4;
              return linea.substring(4);
            } else {
              const espacios = linea.match(/^ {1,3}/);
              if (espacios) {
                const len = espacios[0].length;
                cambiosLongitud -= len;
                return linea.substring(len);
              }
            }
            return linea;
          });
        }
        
        const nuevoTextoBloque = lineasProcesadas.join('\n');
        textarea.setRangeText(nuevoTextoBloque, inicioSeleccion, finSeleccion, 'select');
        
        // Reajustar la selección manteniendo el bloque enfocado de forma óptima
        const offsetInicio = !isShift ? 1 : (lineas[0].startsWith('\t') ? -1 : (lineas[0].startsWith('    ') ? -4 : 0));
        textarea.setSelectionRange(Math.max(inicioSeleccion, start + offsetInicio), Math.max(inicioSeleccion, end + cambiosLongitud));
        
      } else {
        // Caso 2: Sin selección (Insertar un único tabulador \t en posición del cursor)
        if (!isShift) {
          textarea.setRangeText('\t', start, start, 'end');
        } else {
          // Shift + Tab sin selección: Quitar sangría de la línea actual
          let inicioLinea = originalText.lastIndexOf('\n', start - 1);
          if (inicioLinea === -1) {
            inicioLinea = 0;
          } else {
            inicioLinea += 1;
          }
          
          const lineaActual = originalText.substring(inicioLinea, start);
          if (lineaActual.startsWith('\t')) {
            textarea.setRangeText('', inicioLinea, inicioLinea + 1, 'select');
            textarea.setSelectionRange(Math.max(inicioLinea, start - 1), Math.max(inicioLinea, start - 1));
          } else if (lineaActual.startsWith('    ')) {
            textarea.setRangeText('', inicioLinea, inicioLinea + 4, 'select');
            textarea.setSelectionRange(Math.max(inicioLinea, start - 4), Math.max(inicioLinea, start - 4));
          }
        }
      }
      
      renderMarkdown();
      setSavedState(false);
      
      if (historial) {
        historial.registrarCambioDespuesDeFormato();
      }
    }
  });
  
  // Añadir un mensaje explicativo al visor si el editor está vacío
  if (DOM.editor.value.trim() === '') {
    DOM.editor.value = `# ¡Bienvenido a tu Editor de Markdown Premium! 🚀

Este es tu nuevo espacio de escritura histórica y gestión. Todo lo que escribas aquí se traducirá al instante con un aspecto tipográfico ultra-premium en el panel derecho.

### Características Especiales:
- **Emojis a todo color** incorporados nativamente: 🐉 🔥 ⚔️ 🛡️
- **Estadísticas de texto**: Haz clic en el botón **Stats** de la derecha para conocer palabras, caracteres e incluso detalles del texto que tengas seleccionado.
- **Tipografías personalizadas**: Configura fuentes independientes para escritura y lectura con el botón **Config**.
- **Atajos Markdown**: Usa el botón **MD** para inyectar sintaxis de forma interactiva.
- **Sincronización avanzada**: Desplázate por el texto y haz doble clic sobre los párrafos en el panel derecho para ver cómo el cursor se posiciona automáticamente en el editor.

*¡Comienza a escribir y experimenta una fluidez absoluta!*`;
    renderMarkdown();
  }

  // Inicializar el historial unificado una vez cargados todos los contenidos
  inicializarHistorial();
  
  // Inicializar menú contextual del Visor e integraciones (Fases 11 & 12)
  inicializarMenuContextualVisor();
  inicializarExportacionesYTemplates();
  inicializarSidebarComponentes();
  inicializarTemas();
  inicializarThemePlayground();
  inicializarIdiomas();
  inicializarColorPicker();
});

// ==========================================================================
// ==========================================================================
// DELEGACIÓN LIMPIA DE EXPORTACIONES, MOTOR DE DATOS ESTRUCTURADOS Y PLANTILLAS
// ==========================================================================

// 1. FUNCIONES DE EXPORTACIÓN (FASE 11) - DELEGADAS EN EXPORT-SERVICE
async function exportarAHTML() {
  await exportarDocumentoAHTML(
    appState.fileName,
    DOM.editor.value,
    appState.readerFont,
    invoke,
    alertNotification
  );
}

function exportarAPDF() {
  exportarDocumentoAPDF(appState.fileName, DOM.editor.value, appState.readerFont, alertNotification);
}

async function exportarAEPUB() {
  await exportarDocumentoAEPUB(
    appState.fileName,
    DOM.editor.value,
    appState.readerFont,
    invoke,
    alertNotification,
    appState.filePath
  );
}

// 2. RENDERS DEL MODO ESTRUCTURADO (FASE 12) - DELEGADAS EN DATA-PARSER
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let ultimoArbolParseado = null;

function inicializarModoEstructurado() {
  const btnToMd = document.getElementById('btn-tree-to-md');
  const btnTabTree = document.getElementById('btn-tree-tab-tree');
  const btnTabJson = document.getElementById('btn-tree-tab-json');
  const btnTabXml = document.getElementById('btn-tree-tab-xml');
  const btnTabYaml = document.getElementById('btn-tree-tab-yaml');
  const btnExportActive = document.getElementById('btn-tree-export-active');



  if (btnToMd) {
    btnToMd.addEventListener('click', () => {
      appState.structuredModeActive = false;
      if (DOM.structuredHeaderBar) DOM.structuredHeaderBar.style.display = 'none';
      if (DOM.previewContainer) DOM.previewContainer.classList.remove('structured-layout');
      renderMarkdown();
    });
  }

  if (btnTabTree) {
    btnTabTree.addEventListener('click', () => {
      appState.structuredActiveTab = 'tree';
      renderMarkdown();
    });
  }

  if (btnTabJson) {
    btnTabJson.addEventListener('click', () => {
      appState.structuredActiveTab = 'json';
      renderMarkdown();
    });
  }

  if (btnTabXml) {
    btnTabXml.addEventListener('click', () => {
      appState.structuredActiveTab = 'xml';
      renderMarkdown();
    });
  }

  if (btnTabYaml) {
    btnTabYaml.addEventListener('click', () => {
      appState.structuredActiveTab = 'yaml';
      renderMarkdown();
    });
  }

  if (btnExportActive) {
    btnExportActive.addEventListener('click', () => {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      if (!ultimoArbolParseado || appState.structuredActiveTab === 'tree') return;
      if (!invoke) {
        alertNotification(t.struct_web_export_unavailable, 'error');
        return;
      }

      const activeTab = appState.structuredActiveTab;
      if (activeTab === 'json') {
        const jsonStr = JSON.stringify(ultimoArbolParseado, null, 2).replace(/\\"/g, '"');
        invoke('exportar_archivo', {
          defaultName: `${appState.fileName.replace(/\s+/g, '_')}.json`,
          content: jsonStr,
          extension: 'json',
          filterName: 'JSON',
          directoryType: 'templates'
        }).then(res => {
          if (res) alertNotification('JSON ' + t.struct_export_success + res, 'success');
        }).catch(err => {
          alertNotification(t.struct_export_error + 'JSON: ' + err, 'error');
        });
      } else if (activeTab === 'xml') {
        const xmlStr = convertJSONToXML(ultimoArbolParseado, appState.fileName);
        invoke('exportar_archivo', {
          defaultName: `${appState.fileName.replace(/\s+/g, '_')}.xml`,
          content: xmlStr,
          extension: 'xml',
          filterName: 'XML',
          directoryType: 'templates'
        }).then(res => {
          if (res) alertNotification('XML ' + t.struct_export_success + res, 'success');
        }).catch(err => {
          alertNotification(t.struct_export_error + 'XML: ' + err, 'error');
        });
      } else if (activeTab === 'yaml') {
        const yamlStr = convertJSONToYAML(ultimoArbolParseado);
        invoke('exportar_archivo', {
          defaultName: `${appState.fileName.replace(/\s+/g, '_')}.yaml`,
          content: yamlStr,
          extension: 'yaml',
          filterName: 'YAML',
          directoryType: 'templates'
        }).then(res => {
          if (res) alertNotification('YAML ' + t.struct_export_success + res, 'success');
        }).catch(err => {
          alertNotification(t.struct_export_error + 'YAML: ' + err, 'error');
        });
      }
    });
  }
  if (false && btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      if (!ultimoArbolParseado) return;
      if (!invoke) {
        alertNotification(t.struct_web_export_unavailable, 'error');
        return;
      }
      const jsonStr = JSON.stringify(ultimoArbolParseado, null, 2).replace(/\\"/g, '"');
      invoke('exportar_archivo', {
        defaultName: `${appState.fileName.replace(/\s+/g, '_')}.json`,
        content: jsonStr,
        extension: 'json',
        filterName: 'JSON',
        directoryType: 'templates'
      }).then(res => {
        if (res) alertNotification('JSON ' + t.struct_export_success + res, 'success');
      }).catch(err => {
        alertNotification(t.struct_export_error + 'JSON: ' + err, 'error');
      });
    });
  }

  if (false) {
    btnExportXml.addEventListener('click', () => {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      if (!ultimoArbolParseado) return;
      if (!invoke) {
        alertNotification(t.struct_web_export_unavailable, 'error');
        return;
      }
      const xmlStr = convertJSONToXML(ultimoArbolParseado, appState.fileName);
      invoke('exportar_archivo', {
        defaultName: `${appState.fileName.replace(/\s+/g, '_')}.xml`,
        content: xmlStr,
        extension: 'xml',
        filterName: 'XML',
        directoryType: 'templates'
      }).then(res => {
        if (res) alertNotification('XML ' + t.struct_export_success + res, 'success');
      }).catch(err => {
        alertNotification(t.struct_export_error + 'XML: ' + err, 'error');
      });
    });
  }

  if (false) {
    btnExportYaml.addEventListener('click', () => {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      if (!ultimoArbolParseado) return;
      if (!invoke) {
        alertNotification(t.struct_web_export_unavailable, 'error');
        return;
      }
      const yamlStr = convertJSONToYAML(ultimoArbolParseado);
      invoke('exportar_archivo', {
        defaultName: `${appState.fileName.replace(/\s+/g, '_')}.yaml`,
        content: yamlStr,
        extension: 'yaml',
        filterName: 'YAML',
        directoryType: 'templates'
      }).then(res => {
        if (res) alertNotification('YAML ' + t.struct_export_success + res, 'success');
      }).catch(err => {
        alertNotification(t.struct_export_error + 'YAML: ' + err, 'error');
      });
    });
  }
}

// 2. RENDERS DEL MODO ESTRUCTURADO (FASE 12) - DELEGADAS EN DATA-PARSER
function renderStructuredTreeVisual(obj) {
  ultimoArbolParseado = obj;
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;

  // 1. Mostrar la barra estructurada superior
  if (DOM.structuredHeaderBar) DOM.structuredHeaderBar.style.display = 'flex';
  if (DOM.previewContainer) DOM.previewContainer.classList.add('structured-layout');

  const isTree = appState.structuredActiveTab === 'tree';
  const isJson = appState.structuredActiveTab === 'json';
  const isXml = appState.structuredActiveTab === 'xml';
  const isYaml = appState.structuredActiveTab === 'yaml';

  // 2. Actualizar las clases active-tab en la barra superior estática
  const btnTabTree = document.getElementById('btn-tree-tab-tree');
  const btnTabJson = document.getElementById('btn-tree-tab-json');
  const btnTabXml = document.getElementById('btn-tree-tab-xml');
  const btnTabYaml = document.getElementById('btn-tree-tab-yaml');

  if (btnTabTree) btnTabTree.classList.toggle('active-tab', isTree);
  if (btnTabJson) btnTabJson.classList.toggle('active-tab', isJson);
  if (btnTabXml) btnTabXml.classList.toggle('active-tab', isXml);
  if (btnTabYaml) btnTabYaml.classList.toggle('active-tab', isYaml);

  // 3. Traducir textos dinámicos de la barra superior estructurada (badge, tooltip y botón salir/jerarquía)
  const badgeActive = document.getElementById('struct-badge-active');
  const btnToMd = document.getElementById('btn-tree-to-md');
  const btnExportActive = document.getElementById('btn-tree-export-active');



  if (badgeActive) badgeActive.textContent = t.struct_badge_active || t.struct_active_badge;
  if (btnToMd) {
    btnToMd.textContent = t.struct_btn_exit || 'Salir';
    btnToMd.setAttribute('title', t.struct_btn_read_mode_title);
  }
  if (btnTabTree) {
    btnTabTree.innerHTML = `📂 ${t.struct_btn_hierarchy || 'Jerarquía'}`;
    btnTabTree.setAttribute('title', t.struct_btn_tree_tab_title);
  }
  if (btnTabJson) {
    btnTabJson.setAttribute('title', t.struct_btn_json_tab_title);
  }
  if (btnTabXml) {
    btnTabXml.setAttribute('title', t.struct_btn_xml_tab_title);
  }
  if (btnTabYaml) {
    btnTabYaml.setAttribute('title', t.struct_btn_yaml_tab_title);
  }

  const labelTreeSave = document.getElementById('label-tree-save');
  if (btnExportActive) {
    if (isTree) {
      btnExportActive.disabled = true;
      btnExportActive.classList.add('disabled');
      btnExportActive.setAttribute('title', t.struct_save_disabled_title || 'Selecciona un formato (JSON, XML o YAML) para guardar');
      if (labelTreeSave) labelTreeSave.textContent = t.struct_btn_save || 'Guardar';
    } else {
      btnExportActive.disabled = false;
      btnExportActive.classList.remove('disabled');
      let formatTitle = '';
      if (isJson) formatTitle = t.struct_btn_json_export_title || 'Guardar directamente como archivo .json en tu ordenador';
      else if (isXml) formatTitle = t.struct_btn_xml_export_title || 'Guardar directamente como archivo .xml en tu ordenador';
      else if (isYaml) formatTitle = t.struct_btn_yaml_export_title || 'Guardar directamente como archivo .yaml en tu ordenador';
      btnExportActive.setAttribute('title', formatTitle);
    }
  }
  /* OLD_CODE_REMOVED
    }
  }
  if (false) {
      if (labelTreeSave) labelTreeSave.textContent = t.struct_btn_save || 'Guardar';
    }
  }
  if (false) {
  }
  if (btnExportActive) {
    btnExportActive.addEventListener('click', () => {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      if (!ultimoArbolParseado || appState.structuredActiveTab === 'tree') return;
      if (!invoke) {
        alertNotification(t.struct_web_export_unavailable, 'error');
        return;
      }

      const activeTab = appState.structuredActiveTab;
      if (activeTab === 'json') {
        const jsonStr = JSON.stringify(ultimoArbolParseado, null, 2).replace(/\\"/g, '"');
        invoke('exportar_archivo', {
          defaultName: `${appState.fileName.replace(/\s+/g, '_')}.json`,
          content: jsonStr,
          extension: 'json',
          filterName: 'JSON',
          directoryType: 'templates'
        }).then(res => {
          if (res) alertNotification('JSON ' + t.struct_export_success + res, 'success');
        }).catch(err => {
          alertNotification(t.struct_export_error + 'JSON: ' + err, 'error');
        });
      } else if (activeTab === 'xml') {
        const xmlStr = convertJSONToXML(ultimoArbolParseado, appState.fileName);
        invoke('exportar_archivo', {
          defaultName: `${appState.fileName.replace(/\s+/g, '_')}.xml`,
          content: xmlStr,
          extension: 'xml',
          filterName: 'XML',
          directoryType: 'templates'
        }).then(res => {
          if (res) alertNotification('XML ' + t.struct_export_success + res, 'success');
        }).catch(err => {
          alertNotification(t.struct_export_error + 'XML: ' + err, 'error');
        });
      } else if (activeTab === 'yaml') {
        const yamlStr = convertJSONToYAML(ultimoArbolParseado);
        invoke('exportar_archivo', {
          defaultName: `${appState.fileName.replace(/\s+/g, '_')}.yaml`,
          content: yamlStr,
          extension: 'yaml',
          filterName: 'YAML',
          directoryType: 'templates'
        }).then(res => {
          if (res) alertNotification('YAML ' + t.struct_export_success + res, 'success');
        }).catch(err => {
          alertNotification(t.struct_export_error + 'YAML: ' + err, 'error');
        });
      }
    });
  }
  if (false && btnExportJson) {
    btnExportJson.setAttribute('title', t.struct_btn_json_export_title);
  }
  if (btnTabXml) {
    btnTabXml.setAttribute('title', t.struct_btn_xml_tab_title);
  }
  if (false) {
    btnExportXml.setAttribute('title', t.struct_btn_xml_export_title);
  }
  if (btnTabYaml) {
    btnTabYaml.setAttribute('title', t.struct_btn_yaml_tab_title);
  }
  if (false) {
    btnExportYaml.setAttribute('title', t.struct_btn_yaml_export_title);
  }

  }

  */
  // 4. Renderizar contenido de datos
  let contentHtml = '';
  if (isTree) {
    contentHtml = `<div class="tree-root-container">${buildTreeHTML(obj)}</div>`;
  } else if (isJson) {
    const jsonStr = JSON.stringify(obj, null, 2).replace(/\\"/g, '"');
    contentHtml = `<pre class="structured-code-preview"><code>${escapeHTML(jsonStr)}</code></pre>`;
  } else if (isXml) {
    const xmlStr = convertJSONToXML(obj, appState.fileName);
    contentHtml = `<pre class="structured-code-preview"><code>${escapeHTML(xmlStr)}</code></pre>`;
  } else if (isYaml) {
    const yamlStr = convertJSONToYAML(obj);
    contentHtml = `<pre class="structured-code-preview"><code>${escapeHTML(yamlStr)}</code></pre>`;
  }

  DOM.preview.innerHTML = contentHtml;
}

// 3. ALERTA FLOTANTE PREMIUM
function alertNotification(mensaje, tipo = 'info') {
  const oldToast = document.getElementById('premium-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.id = 'premium-toast';
  toast.style.position = 'fixed';
  toast.style.bottom = '40px';
  toast.style.right = '40px';
  toast.style.background = 'rgba(15, 15, 20, 0.95)';
  
  if (tipo === 'error') {
    toast.style.border = '1px solid rgba(239, 68, 68, 0.6)';
  } else if (tipo === 'success') {
    toast.style.border = '1px solid rgba(16, 185, 129, 0.6)';
  } else {
    toast.style.border = '1px solid rgba(139, 92, 246, 0.4)';
  }
  
  toast.style.borderRadius = '10px';
  toast.style.padding = '12px 24px';
  toast.style.color = '#ffffff';
  toast.style.fontFamily = 'Inter, sans-serif';
  toast.style.fontSize = '13px';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
  toast.style.backdropFilter = 'blur(8px)';
  toast.style.zIndex = '9999';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  toast.style.transform = 'translateY(10px)';
  toast.style.opacity = '0';
  
  const icon = tipo === 'error' ? '❌' : tipo === 'success' ? '✅' : '✨';
  toast.innerHTML = `<span style="margin-right:8px;">${icon}</span> ${mensaje}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 10);
  
  setTimeout(() => {
    toast.style.transform = 'translateY(10px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// 4. MENÚ CONTEXTUAL PERSONALIZADO (CLIC DERECHO VISOR)
function inicializarMenuContextualVisor() {
  let menu = document.getElementById('visor-context-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'visor-context-menu';
    menu.className = 'custom-context-menu';
    menu.style.display = 'none';
    document.body.appendChild(menu);
  }
  
  DOM.preview.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (appState.activeView === 'editor') return;
    
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    
    const seleccion = window.getSelection().toString();
    const tieneSeleccion = seleccion.trim().length > 0;
    
    const label = appState.structuredModeActive ? t.ctx_disable_struct : t.ctx_enable_struct;
    const icon = appState.structuredModeActive 
      ? `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`
      : `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="21" x2="9" y2="9"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>`;
      
    menu.innerHTML = `
      <button class="context-menu-item" id="ctx-copy" ${tieneSeleccion ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'}>
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>${t.ctx_copy}</span>
      </button>
      <button class="context-menu-item" id="ctx-select-all">
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        <span>${t.ctx_select_all}</span>
      </button>
      <button class="context-menu-item" id="ctx-export-module" ${tieneSeleccion ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'}>
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        <span>${t.ctx_export_module}</span>
      </button>
      <div class="dropdown-divider"></div>
      <button class="context-menu-item" id="ctx-toggle-structured">
        ${icon}
        <span>${label}</span>
      </button>
      <div class="dropdown-divider"></div>
      <button class="context-menu-item" id="ctx-export-html">
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <span>${t.ctx_export_html}</span>
      </button>
      <button class="context-menu-item" id="ctx-export-pdf">
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8v4h8v-4z"></path></svg>
        <span>${t.ctx_export_pdf}</span>
      </button>
    `;
    
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.display = 'flex';
    
    if (tieneSeleccion) {
      document.getElementById('ctx-copy').addEventListener('click', () => {
        menu.style.display = 'none';
        navigator.clipboard.writeText(seleccion);
        alertNotification(t.ctx_copy_notification);
      });
      
      document.getElementById('ctx-export-module').addEventListener('click', async () => {
        menu.style.display = 'none';
        if (!invoke) {
          alertNotification(t.struct_web_export_unavailable, 'error');
          return;
        }
        try {
          const baseName = appState.fileName && appState.fileName !== 'Sin título' ? appState.fileName : 'nuevo_modulo';
          const defaultSaveName = baseName.replace(/\s+/g, '_') + '.md';
          const fileData = await invoke('guardar_como', { 
            defaultName: defaultSaveName, 
            content: seleccion, 
            directoryType: 'modules' 
          });
          if (fileData) {
            alertNotification(t.ctx_export_module_success + fileData.name, 'success');
            if (DOM.componentsSidebar && !DOM.componentsSidebar.classList.contains('collapsed')) {
              cargarComponentesSidebar();
            }
          }
        } catch (err) {
          alertNotification(t.ctx_export_module_error + err, 'error');
        }
      });
    }
    
    document.getElementById('ctx-select-all').addEventListener('click', () => {
      menu.style.display = 'none';
      const range = document.createRange();
      range.selectNodeContents(DOM.preview);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      alertNotification(t.ctx_select_all_notification);
    });
    
    document.getElementById('ctx-toggle-structured').addEventListener('click', () => {
      menu.style.display = 'none';
      appState.structuredModeActive = !appState.structuredModeActive;
      if (appState.structuredModeActive) {
        const arbol = parseMarkdownToJSON(DOM.editor.value);
        renderStructuredTreeVisual(arbol);
      } else {
        renderMarkdown();
      }
    });
    
    document.getElementById('ctx-export-html').addEventListener('click', () => {
      menu.style.display = 'none';
      exportarAHTML();
    });
    
    document.getElementById('ctx-export-pdf').addEventListener('click', () => {
      menu.style.display = 'none';
      exportarAPDF();
    });
  });
  
  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });
}

// 5. EVENT LISTENERS DE EXPORTACIONES, DESPLEGABLE Y PLANTILLAS (INTERFAZ)
function inicializarExportacionesYTemplates() {
  DOM.btnExport.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.exportDropdown.classList.toggle('show');
  });
  
  document.addEventListener('click', () => {
    DOM.exportDropdown.classList.remove('show');
  });
  
  DOM.optExportHtml.addEventListener('click', () => {
    DOM.exportDropdown.classList.remove('show');
    exportarAHTML();
  });
  
  DOM.optExportPdf.addEventListener('click', () => {
    DOM.exportDropdown.classList.remove('show');
    exportarAPDF();
  });
  
  DOM.optExportEpub.addEventListener('click', () => {
    DOM.exportDropdown.classList.remove('show');
    exportarAEPUB();
  });
  
  // Guardar Plantilla
  DOM.optSaveTemplate.addEventListener('click', async () => {
    DOM.exportDropdown.classList.remove('show');
    const content = DOM.editor.value;
    if (content.trim() === '') {
      alertNotification('Escribe algo en tu editor antes de guardarlo como plantilla');
      return;
    }
    
    if (invoke) {
      const defaultSaveName = appState.fileName.replace(/\s+/g, '_') + '.md';
      const fileData = await invoke('guardar_como', { defaultName: defaultSaveName, content: content, directoryType: 'templates' });
      if (fileData) {
        alertNotification('Plantilla guardada con éxito');
      }
    } else {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = appState.fileName.replace(/\s+/g, '_') + '.md';
      a.click();
      URL.revokeObjectURL(url);
      alertNotification('Plantilla descargada con éxito');
    }
  });
  

  // Listeners de Cierre de Modales
  const closeBtnVars = DOM.modalTemplateVars ? DOM.modalTemplateVars.querySelector('.modal-close-btn') : null;
  if (closeBtnVars) {
    closeBtnVars.addEventListener('click', () => {
      DOM.modalTemplateVars.classList.remove('active');
    });
  }
  if (DOM.btnCancelVars) {
    DOM.btnCancelVars.addEventListener('click', () => {
      if (DOM.modalTemplateVars) DOM.modalTemplateVars.classList.remove('active');
    });
  }
  if (DOM.modalTemplateVars) {
    DOM.modalTemplateVars.addEventListener('click', (e) => {
      if (e.target === DOM.modalTemplateVars) DOM.modalTemplateVars.classList.remove('active');
    });
  }

  DOM.btnApplyVars.addEventListener('click', () => {
    let replacedText = appState.currentTemplateText;
    const inputs = DOM.formTemplateVars.querySelectorAll('.config-input-text');
    inputs.forEach(input => {
      const varName = input.getAttribute('data-var');
      const varVal = input.value;
      const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
      replacedText = replacedText.replace(regex, varVal);
    });
    
    if (historial) {
      historial.registrarCambioAntesDeFormato();
    }
    
    DOM.editor.value = replacedText;
    renderMarkdown();
    setSavedState(false);
    DOM.modalTemplateVars.classList.remove('active');
    alertNotification('Plantilla inyectada con éxito');
    
    if (historial) {
      historial.registrarCambioDespuesDeFormato();
    }
  });
}

function procesarCargaDePlantillaText(text) {
  const variables = escanearVariablesDePlantilla(text);
  
  if (variables.length > 0) {
    appState.currentTemplateText = text;
    DOM.formTemplateVars.innerHTML = '';
    variables.forEach(vName => {
      const row = document.createElement('div');
      row.className = 'config-row';
      row.style.flexDirection = 'column';
      row.style.alignItems = 'flex-start';
      row.style.gap = '6px';
      
      const label = document.createElement('label');
      label.textContent = vName.replace(/_/g, ' ');
      label.style.fontSize = '12px';
      label.style.fontWeight = '600';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'config-select config-input-text';
      input.setAttribute('data-var', vName);
      input.placeholder = `Ingresa valor para ${vName}`;
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.padding = '8px 12px';
      input.style.borderRadius = '8px';
      input.style.border = '1px solid rgba(255,255,255,0.08)';
      input.style.background = 'rgba(255,255,255,0.02)';
      input.style.color = '#ffffff';
      
      row.appendChild(label);
      row.appendChild(input);
      DOM.formTemplateVars.appendChild(row);
    });
    
    DOM.modalTemplateVars.classList.add('active');
  } else {
    if (historial) {
      historial.registrarCambioAntesDeFormato();
    }
    DOM.editor.value = text;
    renderMarkdown();
    setSavedState(false);
    alertNotification('Plantilla cargada con éxito');
    if (historial) {
      historial.registrarCambioDespuesDeFormato();
    }
  }
}

function insertarTextoModuloConSangria(moduloTexto) {
  const alignedText = obtenerTextoModuloConSangria(moduloTexto, DOM.editor.value, DOM.editor.selectionStart);
  
  if (historial) {
    historial.registrarCambioAntesDeFormato();
  }
  
  const textarea = DOM.editor;
  const start = textarea.selectionStart;
  textarea.setRangeText(alignedText, start, start, 'select');
  const nuevaPosCursor = start + alignedText.length;
  textarea.setSelectionRange(nuevaPosCursor, nuevaPosCursor);
  
  renderMarkdown();
  setSavedState(false);
  textarea.focus();
  alertNotification('Módulo integrado con éxito en la jerarquía');
  
  if (historial) {
    historial.registrarCambioDespuesDeFormato();
  }
}

// ==========================================================================
// BIBLIOTECA LATERAL DE COMPONENTES (PLANTILLAS Y MÓDULOS v4.0)
// ==========================================================================
let listadoComponentesEnriquecidos = [];
let sidebarActiveType = 'modules'; // 'modules' o 'templates'

function inicializarSidebarComponentes() {
  if (!DOM.btnComponentsToggle) return;

  DOM.btnComponentsToggle.addEventListener('click', () => {
    DOM.componentsSidebar.classList.toggle('collapsed');
    const isCollapsed = DOM.componentsSidebar.classList.contains('collapsed');
    if (!isCollapsed) {
      cargarComponentesSidebar();
    }
  });

  DOM.tabModules.addEventListener('click', () => {
    DOM.tabTemplates.classList.remove('active');
    DOM.tabModules.classList.add('active');
    sidebarActiveType = 'modules';
    cargarComponentesSidebar();
  });

  DOM.tabTemplates.addEventListener('click', () => {
    DOM.tabModules.classList.remove('active');
    DOM.tabTemplates.classList.add('active');
    sidebarActiveType = 'templates';
    cargarComponentesSidebar();
  });

  DOM.sidebarSearch.addEventListener('input', () => {
    renderizarComponentesFiltrados();
  });
}

async function cargarComponentesSidebar() {
  if (!invoke) return;

  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  DOM.sidebarList.innerHTML = `<div style="color: #64748b; font-size: 12px; padding: 12px; text-align: center;">${t.lib_loading}</div>`;
  listadoComponentesEnriquecidos = [];

  try {
    const activos = await invoke('listar_activos', { tipo: sidebarActiveType });
    if (!activos || activos.length === 0) {
      const msgNoAssets = t.lib_no_assets ? t.lib_no_assets.replace('{tipo}', sidebarActiveType) : `No hay activos en /assets/${sidebarActiveType}/`;
      DOM.sidebarList.innerHTML = `<div style="color: #64748b; font-size: 12px; padding: 12px; text-align: center;">${msgNoAssets}</div>`;
      return;
    }

    const promesas = activos.map(async (activo) => {
      try {
        const text = await invoke('leer_activo', { filePath: activo.filePath });
        
        // Extraer categoría y descripción
        const lines = text.split('\n');
        let firstLine = '';
        for (let line of lines) {
          if (line.trim().length > 0) {
            firstLine = line.trim();
            break;
          }
        }

        let categoria = t.lib_default_category || 'General';
        let descripcion = t.lib_default_desc || 'Sin descripción disponible.';
        const metaRegex = /^#\s*([a-zA-Z0-9_#-]+)\s*`([^`]+)`/;
        const match = firstLine.match(metaRegex);
        if (match) {
          categoria = match[1].replace(/_/g, ' ');
          descripcion = match[2];
        }

        const nombreMenu = activo.fileName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/\s+/g, ' ').trim();

        return {
          fileName: activo.fileName,
          filePath: activo.filePath,
          nombreMenu,
          categoria,
          descripcion,
          text
        };
      } catch (err) {
        console.error('Error individual de componente:', err);
        return null;
      }
    });

    const resultados = await Promise.all(promesas);
    listadoComponentesEnriquecidos = resultados.filter(r => r !== null);
    renderizarComponentesFiltrados();

  } catch (err) {
    console.error('Error al listar componentes:', err);
    DOM.sidebarList.innerHTML = `<div style="color: #ef4444; font-size: 12px; padding: 12px; text-align: center;">Error: ${err}</div>`;
  }
}

function renderizarComponentesFiltrados() {
  const query = DOM.sidebarSearch.value.toLowerCase().trim();
  DOM.sidebarList.innerHTML = '';

  const filtrados = listadoComponentesEnriquecidos.filter(comp => {
    if (query.length > 0) {
      const coincideNombre = comp.nombreMenu.toLowerCase().includes(query);
      const coincideDesc = comp.descripcion.toLowerCase().includes(query);
      const coincideCat = comp.categoria.toLowerCase().includes(query);
      return coincideNombre || coincideDesc || coincideCat;
    }
    return true;
  });

  if (filtrados.length === 0) {
    const lang = appState.language || 'es';
    const t = translations[lang] || translations.es;
    DOM.sidebarList.innerHTML = `<div style="color: #64748b; font-size: 12px; padding: 12px; text-align: center;">${t.lib_no_results}</div>`;
    return;
  }

  filtrados.forEach(comp => {
    const card = document.createElement('div');
    card.className = 'sidebar-card';
    card.innerHTML = `
      <span class="sidebar-card-title">${comp.nombreMenu}</span>
      <span class="sidebar-card-category">${comp.categoria}</span>
      <span class="sidebar-card-desc">${comp.descripcion}</span>
    `;

    card.addEventListener('click', () => {
      if (sidebarActiveType === 'templates') {
        procesarCargaDePlantillaText(comp.text);
      } else {
        insertarTextoModuloConSangria(comp.text);
      }
    });

    DOM.sidebarList.appendChild(card);
  });
}

// ==========================================================================
// SISTEMA DINÁMICO DE TEMAS (JSON v4.0)
// ==========================================================================
async function inicializarTemas() {
  if (!DOM.selectTheme) return;

  try {
    const temas = await invoke('listar_temas');
    DOM.selectTheme.innerHTML = '';

    if (!temas || temas.length === 0) {
      DOM.selectTheme.innerHTML = '<option value="">Sin temas disponibles</option>';
      return;
    }

    temas.forEach(tema => {
      const opt = document.createElement('option');
      opt.value = tema.filePath;
      opt.textContent = tema.themeName.replace(/-/g, ' ');
      if (tema.themeName === appState.activeTheme) {
        opt.selected = true;
      }
      DOM.selectTheme.appendChild(opt);
    });

    DOM.selectTheme.addEventListener('change', async (e) => {
      const filePath = e.target.value;
      if (filePath) {
        await cargarYAplicarTema(filePath);
      }
    });

    // Cargar y aplicar el tema guardado al iniciar
    const temaActivo = temas.find(t => t.themeName === appState.activeTheme) || temas[0];
    if (temaActivo) {
      await cargarYAplicarTema(temaActivo.filePath);
    }

  } catch (err) {
    console.error('Error al inicializar temas:', err);
  }
}

async function cargarYAplicarTema(filePath) {
  try {
    const mdText = await invoke('leer_tema', { filePath });
    const parsedData = parseMarkdownToJSON(mdText);
    
    // Buscar de manera tolerante a fallos el nodo del tema y su sección de colores
    const tema = parsedData.Tema || parsedData.tema || parsedData;
    const colorsSection = tema.colors || tema.Colores || tema.colores || tema;
    const themeName = tema.themeName || tema.themename || appState.activeTheme;
    
    if (colorsSection) {
      // Función recursiva para aplanar cualquier agrupación jerárquica hecha por el usuario
      const extractedColors = {};
      const extractLeafs = (current) => {
        if (current && typeof current === 'object' && !Array.isArray(current)) {
          Object.entries(current).forEach(([k, v]) => {
            if (typeof v === 'string') {
              extractedColors[k] = v;
            } else {
              extractLeafs(v);
            }
          });
        }
      };
      
      extractLeafs(colorsSection);
      
      const root = document.documentElement;
      Object.entries(extractedColors).forEach(([variable, valor]) => {
        root.style.setProperty(`--${variable}`, valor);
      });

      appState.activeTheme = themeName;
      localStorage.setItem('md-theme', themeName);
    }
  } catch (err) {
    console.error('Error al aplicar el tema:', err);
    alertNotification('No se pudo aplicar el tema seleccionado: ' + err, 'error');
  }
}

// ==========================================================================
// ENTORNO DE DISEÑO FLOTANTE: THEME PLAYGROUND (v4.4)
// ==========================================================================
function inicializarThemePlayground() {
  const btnEditTheme = document.getElementById('btn-edit-theme');
  const playgroundBox = document.getElementById('modal-theme-playground');
  const btnClosePlayground = document.getElementById('btn-close-playground');
  const dragHandle = document.getElementById('playground-drag-handle');
  const resizeHandle = document.getElementById('playground-resize-handle');
  const btnApplyThemeGlobal = document.getElementById('btn-apply-theme-global');
  
  if (!btnEditTheme || !playgroundBox) return;

  // 1. Botón Lápiz: Carga directa del tema en el editor
  btnEditTheme.addEventListener('click', async () => {
    const selectedThemePath = DOM.selectTheme.value;
    if (!selectedThemePath) {
      alertNotification('Por favor, selecciona un tema primero', 'info');
      return;
    }

    // Advertencia de cambios sin guardar
    if (!appState.isSaved) {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      const accion = await solicitarConfirmacionSistema({
        titulo: t.confirm_title_theme || 'Editar Tema Visual',
        mensaje: t.confirm_msg_unsaved_theme || 'Tienes cambios sin guardar en tu documento actual. ¿Deseas guardarlos antes de abrir el tema para edición?',
        detalle: '[Guardar cambios] Guardará y abrirá el tema.\n[Descartar cambios] Abrirá el tema descartando cambios actuales.',
        tipo: 'warning',
        btnSaveText: t.confirm_btn_save || 'Guardar cambios',
        btnDiscardText: t.confirm_btn_discard || 'Descartar cambios',
        btnCancelText: t.confirm_btn_cancel || 'Cancelar'
      });

      if (accion === 'cancel') return;
      if (accion === 'save') {
        const guardado = await guardarArchivo();
        if (!guardado) return;
      }
    }

    try {
      const savedDraftPath = localStorage.getItem('md-theme-draft-path');
      const savedDraftText = localStorage.getItem('md-theme-draft-text');
      
      let mdText = '';
      let recovered = false;
      
      if (savedDraftPath === selectedThemePath && savedDraftText) {
        const lang = appState.language || 'es';
        const t = translations[lang] || translations.es;
        const accion = await solicitarConfirmacionSistema({
          titulo: t.confirm_title_draft || 'Recuperar Borrador',
          mensaje: t.confirm_msg_draft_theme || 'Se detectó un borrador sin guardar para este tema visual. ¿Deseas recuperarlo para continuar donde quedaste?',
          detalle: 'Puedes reanudar tu edición anterior o comenzar desde el tema original guardado en disco.',
          tipo: 'info',
          btnSaveText: t.confirm_btn_recover || 'Recuperar borrador',
          btnDiscardText: t.confirm_btn_load_orig || 'Cargar original',
          btnCancelText: t.confirm_btn_cancel || 'Cancelar'
        });

        if (accion === 'cancel') return;
        if (accion === 'save') {
          mdText = savedDraftText;
          recovered = true;
        }
      }
      
      if (!mdText) {
        mdText = await invoke('leer_tema', { filePath: selectedThemePath });
      }
      
      // Cargar en el editor
      DOM.editor.value = mdText;
      
      // Obtener el nombre del tema
      const sep = selectedThemePath.includes('/') ? '/' : '\\';
      const parts = selectedThemePath.split(sep);
      const themeFileName = parts[parts.length - 1];
      
      // Actualizar estado del archivo abierto
      appState.filePath = selectedThemePath;
      appState.fileName = themeFileName;
      
      // Si se recuperó un borrador, se marca como no guardado
      if (recovered) {
        setSavedState(false);
      } else {
        setSavedState(true);
      }
      
      renderMarkdown();
      
      // Cerrar el modal de configuración de apariencia
      if (DOM.modalConfig) {
        DOM.modalConfig.classList.remove('active');
      }
      
      alertNotification('Tema cargado en el editor. Se ha abierto el Theme Playground.', 'success');
      
      // Forzar mostrar el Playground
      actualizarEstadoThemePlayground();
      
    } catch (err) {
      console.error('Error al editar el tema:', err);
      alertNotification('No se pudo cargar el tema para edición: ' + err, 'error');
    }
  });

  // 2. Botón de cerrar visualizador
  btnClosePlayground.addEventListener('click', () => {
    playgroundBox.classList.remove('active');
    if (DOM.modalConfig) {
      DOM.modalConfig.classList.add('active');
    }
  });

  // 3. Arrastre de la ventana flotante (Mousedown, Mousemove, Mouseup)
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.closest('.playground-close-btn')) return; // Evitar arrastre si pulsas cerrar
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = playgroundBox.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    playgroundBox.style.left = `${initialLeft}px`;
    playgroundBox.style.top = `${initialTop}px`;
    playgroundBox.style.right = 'auto'; // Cancelar anclaje de la derecha
    
    dragHandle.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    playgroundBox.style.left = `${initialLeft + dx}px`;
    playgroundBox.style.top = `${initialTop + dy}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      dragHandle.style.cursor = 'move';
    }
  });

  // 4. Redimensionado de la ventana flotante (Escalado manual)
  let isResizing = false;
  let startWidth, startHeight;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = playgroundBox.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const newWidth = Math.max(320, Math.min(600, startWidth + dx));
    const newHeight = Math.max(400, Math.min(800, startHeight + dy));
    
    playgroundBox.style.width = `${newWidth}px`;
    playgroundBox.style.height = `${newHeight}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
    }
  });

  // 5. Botón de aplicar tema globalmente
  btnApplyThemeGlobal.addEventListener('click', () => {
    if (appState.filePath && appState.filePath.includes('themes')) {
      cargarYAplicarTema(appState.filePath);
      alertNotification('¡Tema aplicado globalmente al sistema!', 'success');
    }
  });

  // 6. Listener del editor para foco contextual
  DOM.editor.addEventListener('keyup', () => {
    actualizarFocoContextualPlayground();
  });

  DOM.editor.addEventListener('click', () => {
    actualizarFocoContextualPlayground();
  });
}

// Verifica si estamos editando un tema y muestra/oculta el Playground
function actualizarEstadoThemePlayground() {
  const playgroundBox = document.getElementById('modal-theme-playground');
  if (!playgroundBox) return;

  if (appState.filePath && appState.filePath.includes('themes')) {
    playgroundBox.classList.add('active');
    refrescarPlaygroundLocal();
  } else {
    playgroundBox.classList.remove('active');
  }
}

// Inteligencia de foco: Resalta el elemento en la ventana flotante según la línea del cursor
function actualizarFocoContextualPlayground() {
  const playgroundBox = document.getElementById('modal-theme-playground');
  if (!playgroundBox || !playgroundBox.classList.contains('active')) return;

  const textarea = DOM.editor;
  const text = textarea.value;
  const cursorPosition = textarea.selectionStart;
  
  // Encontrar la línea actual
  const linesBefore = text.substring(0, cursorPosition).split('\n');
  const currentLineIndex = linesBefore.length - 1;
  const lines = text.split('\n');
  const currentLineText = lines[currentLineIndex] || '';

  // Limpiar resaltados previos en el Playground
  const highlighted = playgroundBox.querySelectorAll('.playground-highlight-pulse');
  highlighted.forEach(el => el.classList.remove('playground-highlight-pulse'));

  // Buscar coincidencia de variable en la línea
  const propRegex = /\*\*(bg-[a-zA-Z-]+|text-[a-zA-Z-]+|border-[a-zA-Z-]+|accent[a-zA-Z-]*)\*\*/i;
  const match = currentLineText.match(propRegex);
  if (match) {
    const variableName = match[1].toLowerCase().trim();
    
    // Mapear variables específicas a elementos specimen
    let specimenId = null;

    if (variableName.includes('badge-int')) specimenId = 'specimen-badge-int';
    else if (variableName.includes('badge-float')) specimenId = 'specimen-badge-float';
    else if (variableName.includes('badge-bool')) specimenId = 'specimen-badge-bool';
    else if (variableName.includes('badge-str')) specimenId = 'specimen-badge-str';
    else if (variableName.includes('code-inline')) specimenId = 'specimen-code';
    else if (variableName.includes('blockquote')) specimenId = 'specimen-blockquote';
    else if (variableName.includes('table-header')) specimenId = 'specimen-th';
    else if (variableName.includes('table-zebra')) specimenId = 'specimen-tr-even';
    else if (variableName.includes('strong')) specimenId = 'specimen-strong';
    else if (variableName.includes('reader') || variableName === 'text-reader') specimenId = 'specimen-p';
    else if (variableName === 'bg-app' || variableName === 'bg-panel') specimenId = 'specimen-reader';
    else if (variableName.includes('accent') || variableName.includes('accent-color')) specimenId = 'specimen-accent-btn';
    else if (variableName.includes('input')) specimenId = 'specimen-input';

    if (specimenId) {
      const element = document.getElementById(specimenId);
      if (element) {
        element.classList.add('playground-highlight-pulse');
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }
}

// Refresca los estilos de forma local ÚNICAMENTE para la ventana flotante
function refrescarPlaygroundLocal() {
  const playgroundBox = document.getElementById('modal-theme-playground');
  if (!playgroundBox || !playgroundBox.classList.contains('active')) return;

  // Salvar borrador temporal en localStorage como medida de seguridad contra pérdidas
  if (appState.filePath && appState.filePath.includes('themes')) {
    localStorage.setItem('md-theme-draft-text', DOM.editor.value);
    localStorage.setItem('md-theme-draft-path', appState.filePath);
  }

  try {
    const mdText = DOM.editor.value;
    const parsedData = parseMarkdownToJSON(mdText);
    
    const tema = parsedData.Tema || parsedData.tema || parsedData;
    const colorsSection = tema.colors || tema.Colores || tema.colores || tema;
    
    if (colorsSection) {
      const extractedColors = {};
      const extractLeafs = (current) => {
        if (current && typeof current === 'object' && !Array.isArray(current)) {
          Object.entries(current).forEach(([k, v]) => {
            if (typeof v === 'string') {
              extractedColors[k] = v;
            } else {
              extractLeafs(v);
            }
          });
        }
      };
      
      extractLeafs(colorsSection);
      
      // Aplicar variables CSS de forma local ÚNICAMENTE en el contenedor del Playground
      Object.entries(extractedColors).forEach(([variable, valor]) => {
        playgroundBox.style.setProperty(`--${variable}`, valor);
      });
      
      const indicator = document.getElementById('playground-status-text');
      if (indicator) {
        indicator.textContent = 'Borrador local actualizado';
        indicator.style.color = '#10b981'; // Verde suave
        setTimeout(() => {
          indicator.textContent = 'Visualizando borrador local';
          indicator.style.color = '';
        }, 2000);
      }
    }
  } catch (err) {
    console.error('Error al refrescar localmente el Playground:', err);
  }
}


// ==========================================================================
// GESTION SEGURA DE ENLACES: APERTURA EXTERNA Y DESPLAZAMIENTO INTERNO
// ==========================================================================
async function gestionarClicEnlace(e) {
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

// Escuchar tanto clic izquierdo como clic con la rueda del ratón (auxclick)
document.addEventListener('click', gestionarClicEnlace);
document.addEventListener('auxclick', (e) => {
  if (e.button === 1) { // Botón del medio del ratón
    gestionarClicEnlace(e);
  }
});
