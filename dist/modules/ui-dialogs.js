// ==========================================================================
// GESTOR DE DIÁLOGOS Y VENTANAS MODALES (UI, ESTADÍSTICAS, CONFIGURACIÓN Y MENÚS)
// ==========================================================================

import { translations, listarIdiomasDisponibles, cargarIdiomaDesdeDisco } from '../utils/i18n.js';
import { obtenerTextoModuloConSangria } from '../utils/template-engine.js';
import { parseMarkdownToJSON } from '../utils/data-parser.js';
import { renderMarkdown } from './reader-engine.js';
import { renderStructuredTreeVisual } from './structured-editor.js';
import { exportarAHTML, exportarAPDF, procesarCargaDePlantillaText } from './export-manager.js';
import { actualizarNombreArchivo, setSavedState } from './file-manager.js';
import { refrescarListaTemas } from './theme-manager.js';
import { fontManager } from './font-manager.js';

let _ctx = {
  DOM: null,
  appState: null,
  invoke: null,
  getHistorial: null
};

let uiEventsInitialized = false;
let listaIdiomasCargados = [];

// Variables de estado de la biblioteca lateral de componentes
let listadoComponentesEnriquecidos = [];
let sidebarActiveType = 'modules';

function getDOM() {
  if (_ctx.DOM) return _ctx.DOM;
  return {
    editor: typeof document !== 'undefined' ? document.getElementById('editor') : null,
    preview: typeof document !== 'undefined' ? document.getElementById('preview') : null,
    previewContainer: typeof document !== 'undefined' ? document.getElementById('preview-container') : null,
    btnMd: typeof document !== 'undefined' ? document.getElementById('btn-md') : null,
    btnStats: typeof document !== 'undefined' ? document.getElementById('btn-stats') : null,
    btnConfig: typeof document !== 'undefined' ? document.getElementById('btn-config') : null,
    modalMd: typeof document !== 'undefined' ? document.getElementById('modal-md') : null,
    modalStats: typeof document !== 'undefined' ? document.getElementById('modal-stats') : null,
    modalConfig: typeof document !== 'undefined' ? document.getElementById('modal-config') : null,
    modalAbout: typeof document !== 'undefined' ? document.getElementById('modal-about') : null,
    btnOpenAbout: typeof document !== 'undefined' ? document.getElementById('btn-open-about') : null,
    btnCloseAbout: typeof document !== 'undefined' ? document.getElementById('btn-close-about') : null,
    btnCloseAboutFooter: typeof document !== 'undefined' ? document.getElementById('btn-close-about-footer') : null,
    shortcutsSidebar: typeof document !== 'undefined' ? document.getElementById('shortcuts-sidebar') : null,
    btnUndockShortcuts: typeof document !== 'undefined' ? document.getElementById('btn-undock-shortcuts-sidebar') : null,
    btnDockShortcutsMaster: typeof document !== 'undefined' ? document.getElementById('btn-dock-shortcuts-master') : null,
    btnDockShortcutsSide: typeof document !== 'undefined' ? document.getElementById('btn-dock-shortcuts-side') : null,
    btnCloseShortcutsSidebar: typeof document !== 'undefined' ? document.getElementById('btn-close-shortcuts-sidebar') : null,
    shortcutsCategoriesWrapper: typeof document !== 'undefined' ? document.getElementById('shortcuts-categories-wrapper') : null,
    shortcutsSidebarBody: typeof document !== 'undefined' ? document.getElementById('shortcuts-sidebar-body') : null,
    shortcutsMasterBodySlot: typeof document !== 'undefined' ? document.getElementById('shortcuts-master-body-slot') : null,
    statWords: typeof document !== 'undefined' ? document.getElementById('stat-words') : null,
    statCharsNoSpace: typeof document !== 'undefined' ? document.getElementById('stat-chars-no-space') : null,
    statCharsWithSpace: typeof document !== 'undefined' ? document.getElementById('stat-chars-with-space') : null,
    statLinks: typeof document !== 'undefined' ? document.getElementById('stat-links') : null,
    statSelWords: typeof document !== 'undefined' ? document.getElementById('stat-sel-words') : null,
    statSelCharsNoSpace: typeof document !== 'undefined' ? document.getElementById('stat-sel-chars-no-space') : null,
    statSelCharsWithSpace: typeof document !== 'undefined' ? document.getElementById('stat-sel-chars-with-space') : null,
    selectEditorFont: typeof document !== 'undefined' ? document.getElementById('select-editor-font') : null,
    selectReaderFont: typeof document !== 'undefined' ? document.getElementById('select-reader-font') : null,
    selectStructuredFont: typeof document !== 'undefined' ? document.getElementById('select-structured-font') : null,
    rangeEditorSize: typeof document !== 'undefined' ? document.getElementById('range-editor-size') : null,
    valEditorSize: typeof document !== 'undefined' ? document.getElementById('val-editor-size') : null,
    rangeReaderSize: typeof document !== 'undefined' ? document.getElementById('range-reader-size') : null,
    valReaderSize: typeof document !== 'undefined' ? document.getElementById('val-reader-size') : null,
    rangeStructuredSize: typeof document !== 'undefined' ? document.getElementById('range-structured-size') : null,
    valStructuredSize: typeof document !== 'undefined' ? document.getElementById('val-structured-size') : null,
    btnFontDec: typeof document !== 'undefined' ? document.getElementById('btn-font-dec') : null,
    btnFontInc: typeof document !== 'undefined' ? document.getElementById('btn-font-inc') : null,
    checkParagraphIndent: typeof document !== 'undefined' ? document.getElementById('check-paragraph-indent') : null,
    rangeIndentSize: typeof document !== 'undefined' ? document.getElementById('range-indent-size') : null,
    valIndentSize: typeof document !== 'undefined' ? document.getElementById('val-indent-size') : null,
    rowParagraphIndentSize: typeof document !== 'undefined' ? document.getElementById('row-paragraph-indent-size') : null,
    selectLanguage: typeof document !== 'undefined' ? document.getElementById('select-language') : null,
    btnOpenLanguagesDir: typeof document !== 'undefined' ? document.getElementById('btn-open-languages-dir') : null,
    btnOpenThemesDir: typeof document !== 'undefined' ? document.getElementById('btn-open-themes-dir') : null,
    btnComponentsToggle: typeof document !== 'undefined' ? document.getElementById('btn-components-toggle') : null,
    componentsSidebar: typeof document !== 'undefined' ? document.getElementById('components-sidebar') : null,
    sidebarSearch: typeof document !== 'undefined' ? document.getElementById('sidebar-search') : null,
    sidebarList: typeof document !== 'undefined' ? document.getElementById('sidebar-list') : null,
    tabModules: typeof document !== 'undefined' ? document.getElementById('tab-modules') : null,
    tabTemplates: typeof document !== 'undefined' ? document.getElementById('tab-templates') : null,
    btnComponentsClose: typeof document !== 'undefined' ? document.getElementById('btn-components-close') : null
  };
}

function getAppState() {
  return _ctx.appState || {};
}

function getInvoke() {
  return _ctx.invoke || (typeof window !== 'undefined' && window.__TAURI__ ? window.__TAURI__.core.invoke : null);
}

/**
 * Notificación flotante emergente tipo Toast
 */
export function alertNotification(mensaje, tipo = 'info') {
  const oldToast = document.getElementById('premium-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'premium-toast';
  toast.className = `premium-toast toast-${tipo}`;
  
  const icon = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${mensaje}</span>`;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Abre una ventana modal emergente elevando su nivel de visualización
 */
export function abrirModal(modal) {
  if (!modal) return;
  const DOM = getDOM();
  
  if (modal.classList.contains('active')) {
    cerrarModal(modal);
    return;
  }
  
  modal.classList.add('active');
  
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
        const left = Math.max(20, Math.min(pos.left, window.innerWidth - 280));
        const top = Math.max(80, Math.min(pos.top, window.innerHeight - 300));
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.transform = 'scale(1) translateY(0)';
        box.dataset.initializedPosition = 'true';
      }
    }
  }
  
  if (modal === DOM.modalStats) {
    actualizarEstadisticasDetalladas();
  }
}

/**
 * Cierra una ventana modal emergente devolviendo el foco al editor
 */
export function cerrarModal(modal) {
  if (!modal) return;
  const DOM = getDOM();
  modal.classList.remove('active');
  
  if (modal === DOM.modalMd) {
    dockShortcutsToSidebar();
  } else if (modal.id && modal.id.startsWith('modal-md-')) {
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
  
  if (DOM.editor) {
    DOM.editor.focus();
  }
}

/**
 * Cierra todas las ventanas modales abiertas simultáneamente
 */
export function cerrarModales() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    cerrarModal(modal);
  });
}

/**
 * Permite el arrastre físico fluido con el puntero en la cabecera de las ventanas modales
 */
export function habilitarArrastreModal(modalOverlay) {
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
    if (e.target.closest('.modal-close-btn') || e.target.closest('.modal-collapse-btn') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
    
    document.querySelectorAll('.modal-box').forEach(b => b.style.zIndex = '100');
    modalBox.style.zIndex = '101';
    
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
    
    left = Math.max(0, Math.min(left, maxX));
    top = Math.max(0, Math.min(top, maxY));
    
    modalBox.style.left = left + 'px';
    modalBox.style.top = top + 'px';
    modalBox.style.transform = 'scale(1) translateY(0)';
  }
  
  function dragEnd() {
    isDragging = false;
    modalBox.classList.remove('dragging');
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragEnd);
  }
}

/**
 * Limita la posición de una ventana modal flotante dentro de los límites visibles de la pantalla
 */
export function constrenirModalAPantalla(modalBox) {
  if (!modalBox) return;
  if (!modalBox.style.left && !modalBox.style.top) return;
  
  const rect = modalBox.getBoundingClientRect();
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  
  let left = parseFloat(modalBox.style.left) || 0;
  let top = parseFloat(modalBox.style.top) || 0;
  
  const padding = 16;
  const maxLeft = Math.max(padding, winWidth - rect.width - padding);
  const maxTop = Math.max(padding, winHeight - rect.height - padding);
  
  const newLeft = Math.max(padding, Math.min(left, maxLeft));
  const newTop = Math.max(padding, Math.min(top, maxTop));
  
  if (newLeft !== left || newTop !== top) {
    modalBox.style.left = `${newLeft}px`;
    modalBox.style.top = `${newTop}px`;
  }
}

/**
 * Acopla el panel de atajos Markdown dentro de la barra lateral
 */
export function dockShortcutsToSidebar() {
  const DOM = getDOM();
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

/**
 * Desacopla el panel de atajos Markdown convirtiéndolo en una ventana flotante independiente
 */
export function undockShortcutsToFloating() {
  const DOM = getDOM();
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

/**
 * Alterna la visibilidad de la barra lateral de atajos Markdown
 */
export function toggleShortcutsSidebar() {
  const DOM = getDOM();
  const sidebar = DOM.shortcutsSidebar || document.getElementById('shortcuts-sidebar');
  if (!sidebar) return;
  
  if (DOM.modalMd && DOM.modalMd.classList.contains('active')) {
    dockShortcutsToSidebar();
    sidebar.classList.remove('collapsed');
    if (DOM.btnMd) DOM.btnMd.classList.add('active');
    return;
  }
  
  dockShortcutsToSidebar();
  
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  if (DOM.btnMd) DOM.btnMd.classList.toggle('active', !isCollapsed);
}

/**
 * Calcula y actualiza las estadísticas en tiempo real del documento y texto seleccionado
 */
export function actualizarEstadisticasDetalladas() {
  const DOM = getDOM();
  if (!DOM.editor) return;
  const fullText = DOM.editor.value || '';
  
  // 1. Estadísticas globales del archivo
  const totalWords = fullText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const totalCharsNoSpace = fullText.replace(/\s/g, '').length;
  const totalCharsWithSpace = fullText.length;
  
  const totalLinks = DOM.preview ? DOM.preview.querySelectorAll('a').length : 0;
  
  // 2. Estadísticas de selección inteligente (Editor y Reader)
  let selText = '';
  
  if (document.activeElement === DOM.editor) {
    const start = DOM.editor.selectionStart;
    const end = DOM.editor.selectionEnd;
    if (start !== undefined && end !== undefined && start !== end) {
      selText = fullText.substring(start, end);
    }
  }
  
  if (!selText) {
    const selection = window.getSelection();
    if (selection) {
      selText = selection.toString();
    }
  }
  
  const selWords = selText.trim().split(/\s+/).filter(w => w.length > 0).length;
  const selCharsNoSpace = selText.replace(/\s/g, '').length;
  const selCharsWithSpace = selText.length;
  
  if (DOM.statWords) DOM.statWords.textContent = totalWords;
  if (DOM.statCharsNoSpace) DOM.statCharsNoSpace.textContent = totalCharsNoSpace;
  if (DOM.statCharsWithSpace) DOM.statCharsWithSpace.textContent = totalCharsWithSpace;
  if (DOM.statLinks) DOM.statLinks.textContent = totalLinks;
  
  if (DOM.statSelWords) DOM.statSelWords.textContent = selWords;
  if (DOM.statSelCharsNoSpace) DOM.statSelCharsNoSpace.textContent = selCharsNoSpace;
  if (DOM.statSelCharsWithSpace) DOM.statSelCharsWithSpace.textContent = selCharsWithSpace;
}

/**
 * Aplica las variables tipográficas CSS y configuración visual a nivel de documento
 */
export function aplicarConfiguracionVisual() {
  const DOM = getDOM();
  const appState = getAppState();
  const root = document.documentElement;
  
  const editorFamily = fontManager.getFontFamily(appState.editorFont, 'editor');
  const readerFamily = fontManager.getFontFamily(appState.readerFont, 'reader');
  const structuredFamily = fontManager.getFontFamily(appState.structuredFont, 'structured');

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
  if (DOM.rangeEditorSize) DOM.rangeEditorSize.value = appState.editorFontSize;
  if (DOM.valEditorSize) DOM.valEditorSize.textContent = `${appState.editorFontSize}px`;
  if (DOM.rangeReaderSize) DOM.rangeReaderSize.value = appState.readerFontSize;
  if (DOM.valReaderSize) DOM.valReaderSize.textContent = `${appState.readerFontSize}px`;
  if (DOM.rangeStructuredSize) DOM.rangeStructuredSize.value = appState.structuredFontSize;
  if (DOM.valStructuredSize) DOM.valStructuredSize.textContent = `${appState.structuredFontSize}px`;
  if (DOM.checkParagraphIndent) DOM.checkParagraphIndent.checked = appState.enableParagraphIndent;
  if (DOM.rangeIndentSize) DOM.rangeIndentSize.value = appState.paragraphIndentSize;
  if (DOM.valIndentSize) DOM.valIndentSize.textContent = `${appState.paragraphIndentSize}px`;
  if (DOM.rowParagraphIndentSize) {
    DOM.rowParagraphIndentSize.style.display = appState.enableParagraphIndent ? 'flex' : 'none';
  }
  
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

export function cambiarFontEditor(nuevaFont) {
  const appState = getAppState();
  appState.editorFont = nuevaFont;
  aplicarConfiguracionVisual();
}

export function cambiarFontReader(nuevaFont) {
  const appState = getAppState();
  appState.readerFont = nuevaFont;
  aplicarConfiguracionVisual();
}

export function cambiarFontStructured(nuevaFont) {
  const appState = getAppState();
  appState.structuredFont = nuevaFont;
  aplicarConfiguracionVisual();
  if (appState.structuredModeActive) {
    renderMarkdown();
  }
}

export function cambiarFontSizeEditor(nuevoSize) {
  const appState = getAppState();
  appState.editorFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
}

export function cambiarFontSizeReader(nuevoSize) {
  const appState = getAppState();
  appState.readerFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
}

export function cambiarFontSizeStructured(nuevoSize) {
  const appState = getAppState();
  appState.structuredFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
  if (appState.structuredModeActive) {
    renderMarkdown();
  }
}

export function ajustarTamañoGeneral(factor) {
  const appState = getAppState();
  const nuevoEditorSize = appState.editorFontSize + factor;
  const nuevoReaderSize = appState.readerFontSize + factor;
  const nuevoStructuredSize = appState.structuredFontSize + factor;
  
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

/**
 * Inicializa la lista de idiomas disponibles y sincroniza el idioma seleccionado
 */
export async function inicializarIdiomas() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();
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

export async function cambiarIdioma(lang) {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();

  appState.language = lang;
  localStorage.setItem('md-language', lang);
  if (DOM.selectLanguage) DOM.selectLanguage.value = lang;

  const item = listaIdiomasCargados.find(i => i.code === lang);
  if (item && item.filePath) {
    await cargarIdiomaDesdeDisco(item.code, item.filePath, invoke);
  }
  actualizarTextosInterfaz(lang);
}

export function actualizarBarraDeEstadoTextos() {
  const appState = getAppState();
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  if (!t) return;

  actualizarNombreArchivo();
}

/**
 * Traduce reactivamente todos los elementos de la interfaz con atributo data-i18n
 */
export function actualizarTextosInterfaz(lang) {
  const DOM = getDOM();
  const appState = getAppState();
  const t = translations[lang];
  if (!t) return;

  const esDict = translations.es || {};
  const currentDict = translations[lang] || translations[appState.language] || t || esDict;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = (currentDict && currentDict[key]) || (t && t[key]) || esDict[key];
    if (key && val) {
      el.textContent = val;
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = (currentDict && currentDict[key]) || (t && t[key]) || esDict[key];
    if (key && val) {
      el.setAttribute('title', val);
    }
  });

  actualizarBarraDeEstadoTextos();

  if (DOM.componentsSidebar && !DOM.componentsSidebar.classList.contains('collapsed')) {
    cargarComponentesSidebar();
  }

  renderMarkdown();
}

/**
 * Inicializa la ventana modal Acerca de...
 */
export function inicializarModalAbout() {
  const DOM = getDOM();
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

/**
 * Inicializa el menú contextual personalizado al hacer clic derecho en el visor
 */
export function inicializarMenuContextualVisor() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();

  let menu = document.getElementById('visor-context-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'visor-context-menu';
    menu.className = 'custom-context-menu';
    menu.style.display = 'none';
    document.body.appendChild(menu);
  }
  
  if (DOM.preview) {
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
          <span>${t.ctx_copy || 'Copiar'}</span>
        </button>
        <button class="context-menu-item" id="ctx-select-all">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
          <span>${t.ctx_select_all || 'Seleccionar todo'}</span>
        </button>
        <button class="context-menu-item" id="ctx-export-module" ${tieneSeleccion ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'}>
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          <span>${t.ctx_export_module || 'Exportar como Módulo...'}</span>
        </button>
        <div class="dropdown-divider"></div>
        <button class="context-menu-item" id="ctx-toggle-structured">
          ${icon}
          <span>${label || 'Alternar Modo Estructurado'}</span>
        </button>
        <div class="dropdown-divider"></div>
        <button class="context-menu-item" id="ctx-export-html">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span>${t.ctx_export_html || 'Exportar a HTML...'}</span>
        </button>
        <button class="context-menu-item" id="ctx-export-pdf">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8v4h8v-4z"></path></svg>
          <span>${t.ctx_export_pdf || 'Exportar a PDF...'}</span>
        </button>
      `;
      
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.style.display = 'flex';
      
      if (tieneSeleccion) {
        const btnCopy = document.getElementById('ctx-copy');
        if (btnCopy) {
          btnCopy.addEventListener('click', () => {
            menu.style.display = 'none';
            navigator.clipboard.writeText(seleccion);
            alertNotification(t.ctx_copy_notification || 'Texto copiado al portapapeles', 'info');
          });
        }
        
        const btnExportMod = document.getElementById('ctx-export-module');
        if (btnExportMod) {
          btnExportMod.addEventListener('click', async () => {
            menu.style.display = 'none';
            if (!invoke) {
              alertNotification(t.struct_web_export_unavailable || 'Exportación no disponible en entorno web', 'error');
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
                alertNotification((t.ctx_export_module_success || 'Módulo exportado con éxito en: ') + fileData.name, 'success');
                if (DOM.componentsSidebar && !DOM.componentsSidebar.classList.contains('collapsed')) {
                  cargarComponentesSidebar();
                }
              }
            } catch (err) {
              alertNotification((t.ctx_export_module_error || 'Error al exportar módulo: ') + err, 'error');
            }
          });
        }
      }
      
      const btnSelAll = document.getElementById('ctx-select-all');
      if (btnSelAll) {
        btnSelAll.addEventListener('click', () => {
          menu.style.display = 'none';
          const range = document.createRange();
          range.selectNodeContents(DOM.preview);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          alertNotification(t.ctx_select_all_notification || 'Contenido del visor seleccionado', 'info');
        });
      }
      
      const btnToggleStruct = document.getElementById('ctx-toggle-structured');
      if (btnToggleStruct) {
        btnToggleStruct.addEventListener('click', () => {
          menu.style.display = 'none';
          appState.structuredModeActive = !appState.structuredModeActive;
          if (appState.structuredModeActive) {
            const arbol = parseMarkdownToJSON(DOM.editor ? DOM.editor.value : '');
            renderStructuredTreeVisual(arbol);
          } else {
            renderMarkdown();
          }
        });
      }
      
      const btnExportHtml = document.getElementById('ctx-export-html');
      if (btnExportHtml) {
        btnExportHtml.addEventListener('click', () => {
          menu.style.display = 'none';
          exportarAHTML();
        });
      }
      
      const btnExportPdf = document.getElementById('ctx-export-pdf');
      if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
          menu.style.display = 'none';
          exportarAPDF();
        });
      }
    });
  }
  
  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });
}

/**
 * Inserta texto de módulo respetando el nivel de sangría del cursor en el editor
 */
export function insertarTextoModuloConSangria(moduloTexto) {
  const DOM = getDOM();
  if (!DOM.editor) return;

  const alignedText = obtenerTextoModuloConSangria(moduloTexto, DOM.editor.value, DOM.editor.selectionStart);
  
  const historial = typeof _ctx.getHistorial === 'function' ? _ctx.getHistorial() : null;
  if (historial) {
    historial.registrarCambioAntesDeFormato();
  }

  const start = DOM.editor.selectionStart;
  const end = DOM.editor.selectionEnd;
  DOM.editor.setRangeText(alignedText, start, end, 'end');
  
  renderMarkdown();
  setSavedState(false);
  
  if (historial) {
    historial.registrarCambioDespuesDeFormato();
  }
  
  DOM.editor.focus();
}

/**
 * Inicializa la barra lateral de la biblioteca de componentes (Módulos y Plantillas)
 */
export function inicializarSidebarComponentes() {
  const DOM = getDOM();

  if (DOM.btnComponentsToggle) {
    DOM.btnComponentsToggle.addEventListener('click', () => {
      if (!DOM.componentsSidebar) return;
      DOM.componentsSidebar.classList.toggle('collapsed');
      const isOpen = !DOM.componentsSidebar.classList.contains('collapsed');
      DOM.btnComponentsToggle.classList.toggle('active', isOpen);
      if (isOpen) {
        cargarComponentesSidebar();
        if (DOM.sidebarSearch) DOM.sidebarSearch.focus();
      }
    });
  }

  if (DOM.btnComponentsClose) {
    DOM.btnComponentsClose.addEventListener('click', () => {
      if (DOM.componentsSidebar) {
        DOM.componentsSidebar.classList.add('collapsed');
      }
      if (DOM.btnComponentsToggle) {
        DOM.btnComponentsToggle.classList.remove('active');
      }
    });
  }

  if (DOM.tabModules) {
    DOM.tabModules.addEventListener('click', () => {
      sidebarActiveType = 'modules';
      DOM.tabModules.classList.add('active');
      if (DOM.tabTemplates) DOM.tabTemplates.classList.remove('active');
      cargarComponentesSidebar();
    });
  }

  if (DOM.tabTemplates) {
    DOM.tabTemplates.addEventListener('click', () => {
      sidebarActiveType = 'templates';
      DOM.tabTemplates.classList.add('active');
      if (DOM.tabModules) DOM.tabModules.classList.remove('active');
      cargarComponentesSidebar();
    });
  }

  if (DOM.sidebarSearch) {
    DOM.sidebarSearch.addEventListener('input', () => {
      renderizarComponentesFiltrados();
    });
  }
}

/**
 * Carga los componentes (módulos o plantillas) desde disco mediante Tauri
 */
export async function cargarComponentesSidebar() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();

  if (!DOM.sidebarList) return;
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;

  DOM.sidebarList.innerHTML = `<div style="color: #64748b; font-size: 12px; padding: 12px; text-align: center;">${t.lib_loading || 'Cargando componentes...'}</div>`;
  listadoComponentesEnriquecidos = [];

  if (!invoke) {
    DOM.sidebarList.innerHTML = `<div style="color: #ef4444; font-size: 12px; padding: 12px; text-align: center;">${t.lib_offline || 'Entorno web: activos no disponibles.'}</div>`;
    return;
  }

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
    DOM.sidebarList.innerHTML = `<div style="color: #ef4444; font-size: 12px; padding: 12px; text-align: center;">${t.lib_error || 'Error al listar componentes:'} ${err}</div>`;
  }
}

/**
 * Filtra y renderiza las tarjetas de componentes en la barra lateral
 */
export function renderizarComponentesFiltrados() {
  const DOM = getDOM();
  const appState = getAppState();
  if (!DOM.sidebarList) return;
  const query = DOM.sidebarSearch ? DOM.sidebarSearch.value.trim().toLowerCase() : '';

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

/**
 * Inicializa todos los escuchadores de eventos interactivos para modales, paneles y configuración
 */
export function inicializarEventosUiDialogs() {
  if (uiEventsInitialized) return;
  uiEventsInitialized = true;

  const DOM = getDOM();

  // Configurar los manejadores de cierre de todos los modales
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.querySelectorAll('.modal-close-btn, .btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => cerrarModal(overlay));
    });

    overlay.querySelectorAll('.modal-collapse-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modalBox = overlay.querySelector('.modal-box');
        if (modalBox) {
          modalBox.classList.toggle('collapsed');
          btn.title = modalBox.classList.contains('collapsed') ? 'Expandir panel' : 'Minimizar panel';
        }
      });
    });

    const box = overlay.querySelector('.modal-box');
    if (box) {
      box.addEventListener('mousedown', () => {
        document.querySelectorAll('.modal-box').forEach(b => b.style.zIndex = '100');
        box.style.zIndex = '101';
      });
    }
  });

  // Habilitar arrastre en modales principales y ventanas flotantes
  if (DOM.modalMd) habilitarArrastreModal(DOM.modalMd);
  if (DOM.modalStats) habilitarArrastreModal(DOM.modalStats);
  if (DOM.modalConfig) habilitarArrastreModal(DOM.modalConfig);
  
  document.querySelectorAll('.floating-window').forEach(overlay => {
    habilitarArrastreModal(overlay);
  });

  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      const targetModal = document.getElementById(`modal-md-${category}`);
      if (targetModal) {
        abrirModal(targetModal);
      }
    });
  });

  // Listeners de desacople, reacople y cierre del panel de atajos
  if (DOM.btnUndockShortcuts) {
    DOM.btnUndockShortcuts.addEventListener('click', undockShortcutsToFloating);
  }

  if (DOM.btnDockShortcutsMaster) {
    DOM.btnDockShortcutsMaster.addEventListener('click', () => {
      dockShortcutsToSidebar();
      if (DOM.shortcutsSidebar) {
        DOM.shortcutsSidebar.classList.remove('collapsed');
        if (DOM.btnMd) DOM.btnMd.classList.add('active');
      }
    });
  }

  if (DOM.btnCloseShortcutsSidebar) {
    DOM.btnCloseShortcutsSidebar.addEventListener('click', () => {
      if (DOM.shortcutsSidebar) {
        DOM.shortcutsSidebar.classList.add('collapsed');
        if (DOM.btnMd) DOM.btnMd.classList.remove('active');
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

  try {
    const savedSide = localStorage.getItem('shortcuts_dock_side');
    if (savedSide === 'right' && DOM.shortcutsSidebar) {
      DOM.shortcutsSidebar.classList.add('dock-right');
    }
  } catch (e) {}

  // Controles de Configuración Tipográfica
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
      const appState = getAppState();
      appState.enableParagraphIndent = e.target.checked;
      aplicarConfiguracionVisual();
    });
  }
  if (DOM.rangeIndentSize) {
    DOM.rangeIndentSize.addEventListener('input', (e) => {
      const appState = getAppState();
      appState.paragraphIndentSize = parseInt(e.target.value, 10);
      aplicarConfiguracionVisual();
    });
  }

  if (DOM.selectLanguage) {
    DOM.selectLanguage.addEventListener('change', (e) => cambiarIdioma(e.target.value));
  }

  if (DOM.btnOpenLanguagesDir) {
    DOM.btnOpenLanguagesDir.addEventListener('click', () => {
      const invoke = getInvoke();
      if (invoke) {
        invoke('abrir_carpeta_idiomas').catch(err => {
          console.error('Error al abrir la carpeta de idiomas:', err);
        });
      }
    });
  }

  if (DOM.btnOpenThemesDir) {
    DOM.btnOpenThemesDir.addEventListener('click', () => {
      const invoke = getInvoke();
      if (invoke) {
        invoke('abrir_carpeta_temas').catch(err => {
          console.error('Error al abrir la carpeta de temas:', err);
        });
      }
    });
  }

  // Restricción fluida al redimensionar ventana del sistema
  window.addEventListener('resize', () => {
    [DOM.modalMd, DOM.modalStats, DOM.modalConfig, DOM.modalAbout].forEach(overlay => {
      if (overlay && overlay.classList.contains('active')) {
        const modalBox = overlay.querySelector('.modal-box');
        if (modalBox) {
          constrenirModalAPantalla(modalBox);
        }
      }
    });
  });

  // Botones de la barra superior para abrir modales
  if (DOM.btnMd) {
    DOM.btnMd.addEventListener('click', toggleShortcutsSidebar);
  }
  if (DOM.btnStats) {
    DOM.btnStats.addEventListener('click', () => abrirModal(DOM.modalStats));
  }
  if (DOM.btnConfig) {
    DOM.btnConfig.addEventListener('click', async () => {
      await refrescarListaTemas();
      abrirModal(DOM.modalConfig);
    });
  }

  // Actualizar estadísticas al vuelo al cambiar la selección en el editor o visor
  document.addEventListener('selectionchange', () => {
    if (DOM.modalStats && DOM.modalStats.classList.contains('active')) {
      actualizarEstadisticasDetalladas();
    }
  });

  inicializarModalAbout();
  inicializarMenuContextualVisor();
  inicializarSidebarComponentes();
}

/**
 * Inicializador principal del motor de diálogos y ventanas
 */
export function initUiDialogs(injectedCtx = {}) {
  _ctx = { ..._ctx, ...injectedCtx };
  inicializarEventosUiDialogs();
}
