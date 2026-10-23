import { inicializarColorPicker, abrirColorPicker } from './utils/color-picker.js';
// ==========================================================================
// LÓGICA INTERACTIVA PREMIUM - FRONTEND DEL EDITOR DE MARKDOWN (TAURI v2)
// ==========================================================================

import { initLayoutManager, cambiarVista } from './modules/layout-manager.js';
import { initShortcutsManager } from './modules/shortcuts-manager.js';
import { HistorialCambios } from './utils/history-manager.js';
import { parseMarkdownToJSON, convertJSONToXML, buildTreeHTML, convertJSONToMarkdown, convertXMLToJSON, convertJSONToYAML, convertYAMLToJSON } from './utils/data-parser.js';
import { escanearVariablesDePlantilla, obtenerTextoModuloConSangria } from './utils/template-engine.js';
import {
  initEditorEngine,
  insertarSintaxisMarkdown,
  actualizarInsigniasAtajos,
  KEYBOARD_SHORTCUTS
} from './modules/editor-engine.js';
import {
  initExportManager,
  exportarAHTML,
  exportarAPDF,
  exportarAEPUB,
  inicializarExportacionesYTemplates,
  procesarCargaDePlantillaText
} from './modules/export-manager.js';
import { translations, listarIdiomasDisponibles, cargarIdiomaDesdeDisco } from './utils/i18n.js';
import {
  initStructuredEditor,
  inicializarModoEstructurado,
  renderStructuredTreeVisual,
  escapeHTML
} from './modules/structured-editor.js';
import {
  refrescarListaTemas,
  inicializarTemas,
  cargarYAplicarTema,
  inicializarThemePlayground,
  actualizarEstadoThemePlayground,
  refrescarPlaygroundLocal,
  initThemeManager
} from './modules/theme-manager.js';
import {
  initReaderEngine,
  renderMarkdown,
  sincronizarFocoElemento,
  parseEditorBlocks,
  escapeHtml
} from './modules/reader-engine.js';
import {
  initFileManager,
  setSavedState,
  actualizarNombreArchivo,
  habilitarEdicionNombre,
  solicitarConfirmacionSistema,
  nuevoArchivo,
  abrirArchivo,
  abrirArchivoDesdeRuta,
  guardarArchivo,
  guardarComo,
  versionarDocumentoActual,
  reubicarCarpetaDocumento,
  inicializarRutaBaseDocumentos,
  obtenerRutaRaizEfectiva,
  obtenerDirectorioArranqueDialogo,
  actualizarVisualizacionRutaRaiz,
  obtenerArchivosRecientes,
  registrarArchivoReciente,
  renderizarMenuRecientes,
  alternarMenuRecientes,
  cerrarMenuRecientes,
  procesarYCargarDocumento,
  guardarBorradorRecuperacion,
  validarYAbrirArchivoSoltado,
  inicializarDragAndDrop
} from './modules/file-manager.js';
import {
  initUiDialogs,
  abrirModal,
  cerrarModal,
  cerrarModales,
  habilitarArrastreModal,
  dockShortcutsToSidebar,
  undockShortcutsToFloating,
  toggleShortcutsSidebar,
  actualizarEstadisticasDetalladas,
  aplicarConfiguracionVisual,
  cambiarFontEditor,
  cambiarFontReader,
  cambiarFontStructured,
  cambiarFontSizeEditor,
  cambiarFontSizeReader,
  cambiarFontSizeStructured,
  ajustarTamañoGeneral,
  inicializarIdiomas,
  cambiarIdioma,
  actualizarTextosInterfaz,
  actualizarBarraDeEstadoTextos,
  inicializarModalAbout,
  alertNotification
} from './modules/ui-dialogs.js';

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
  btnOpenThemesDir: document.getElementById('btn-open-themes-dir'),
  btnEditTheme: document.getElementById('btn-edit-theme'),
  
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

  // Si el selector de color está activo, detectar si el clic seleccionó otra línea con color
  const modalColorPicker = document.getElementById('modal-color-picker');
  if (modalColorPicker && modalColorPicker.classList.contains('active')) {
    setTimeout(() => {
      const textarea = DOM.editor;
      const start = textarea.selectionStart;
      const allText = textarea.value;
      const lineStart = allText.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = allText.indexOf('\n', start);
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


// Inicio oficial de la aplicación
window.addEventListener('DOMContentLoaded', () => {
  initReaderEngine({
    DOM,
    appState,
    invoke,
    parseMarkdownToJSON,
    renderStructuredTreeVisual
  });
  initFileManager({
    DOM,
    appState,
    invoke,
    alertNotification,
    renderMarkdown,
    inicializarHistorial: () => inicializarHistorial(),
    refrescarListaTemas: (path) => refrescarListaTemas(path),
    refrescarPlaygroundLocal: () => refrescarPlaygroundLocal(),
    actualizarEstadoThemePlayground: () => actualizarEstadoThemePlayground()
  });
  initUiDialogs({
    DOM,
    appState,
    invoke,
    getHistorial: () => historial
  });
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
  
  // Motores e integraciones (Fases 11 & 12)
  initLayoutManager({
    DOM,
    appState,
    renderMarkdown
  });
  initShortcutsManager({
    DOM,
    getHistorial: () => historial,
    nuevoArchivo,
    abrirArchivo,
    guardarArchivo,
    guardarComo,
    insertarSintaxisMarkdown,
    cerrarModales
  });
  initEditorEngine({
    DOM,
    appState,
    renderMarkdown,
    setSavedState,
    abrirModal,
    getHistorial: () => historial
  });
  initExportManager({
    DOM,
    appState,
    invoke,
    alertNotification,
    renderMarkdown,
    setSavedState,
    getHistorial: () => historial
  });
  initStructuredEditor({
    DOM,
    appState,
    invoke,
    alertNotification,
    renderMarkdown
  });
  initThemeManager({
    DOM,
    appState,
    invoke,
    solicitarConfirmacionSistema,
    alertNotification,
    guardarArchivo,
    setSavedState,
    renderMarkdown
  });
  inicializarIdiomas();
  inicializarColorPicker();
});
