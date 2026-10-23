// ==========================================================================
// CONTROL DE VISTAS Y DISTRIBUCIÓN DE PANELES (LAYOUT MANAGER)
// ==========================================================================

let _ctx = {
  DOM: null,
  appState: null,
  renderMarkdown: null
};

function getDOM() {
  return _ctx.DOM || {};
}

function getAppState() {
  return _ctx.appState || {};
}

/**
 * Cambia la vista activa de la aplicación: 'editor', 'split' o 'preview'
 */
export function cambiarVista(vista) {
  const DOM = getDOM();
  const appState = getAppState();

  appState.activeView = vista;
  
  if (DOM.appContainer) {
    DOM.appContainer.className = '';
  }
  
  if (DOM.viewEditor) DOM.viewEditor.classList.remove('active');
  if (DOM.viewSplit) DOM.viewSplit.classList.remove('active');
  if (DOM.viewPreview) DOM.viewPreview.classList.remove('active');
  
  if (vista === 'editor') {
    if (DOM.appContainer) DOM.appContainer.classList.add('only-editor');
    if (DOM.viewEditor) DOM.viewEditor.classList.add('active');
  } else if (vista === 'preview') {
    if (DOM.appContainer) DOM.appContainer.classList.add('only-preview');
    if (DOM.viewPreview) DOM.viewPreview.classList.add('active');
  } else {
    if (DOM.appContainer) DOM.appContainer.classList.add('split-view');
    if (DOM.viewSplit) DOM.viewSplit.classList.add('active');
  }
  
  // Reposicionar el visor de Markdown al cambiar de vista para que coincida
  if (typeof _ctx.renderMarkdown === 'function') {
    _ctx.renderMarkdown();
  }
}

/**
 * Inicializador del gestor de vistas y distribución
 */
export function initLayoutManager(injectedCtx = {}) {
  _ctx = { ..._ctx, ...injectedCtx };
  const DOM = getDOM();

  if (DOM.viewEditor) {
    DOM.viewEditor.addEventListener('click', () => cambiarVista('editor'));
  }
  if (DOM.viewSplit) {
    DOM.viewSplit.addEventListener('click', () => cambiarVista('split'));
  }
  if (DOM.viewPreview) {
    DOM.viewPreview.addEventListener('click', () => cambiarVista('preview'));
  }
}
