// ==========================================================================
// GESTOR DE ARCHIVOS Y DOCUMENTOS (OPERACIONES DE DISCO, VERSIONADO Y RECIENTES)
// ==========================================================================

import { translations } from '../utils/i18n.js';
import { convertJSONToMarkdown, convertXMLToJSON, convertYAMLToJSON } from '../utils/data-parser.js';
import { renderMarkdown } from './reader-engine.js';

let _ctx = {
  DOM: null,
  appState: null,
  invoke: null,
  alertNotification: null,
  renderMarkdown: null,
  inicializarHistorial: null,
  refrescarListaTemas: null,
  refrescarPlaygroundLocal: null,
  actualizarEstadoThemePlayground: null
};

let fileEventsInitialized = false;
let autosaveTimeout = null;

function getDOM() {
  if (_ctx.DOM) return _ctx.DOM;
  return {
    editor: typeof document !== 'undefined' ? document.getElementById('editor') : null,
    fileInfo: typeof document !== 'undefined' ? document.getElementById('file-info') : null,
    fileNameContainer: typeof document !== 'undefined' ? document.getElementById('file-name-container') : null,
    statusDot: typeof document !== 'undefined' ? document.getElementById('status-dot') : null,
    activeFilepathDisplay: typeof document !== 'undefined' ? document.getElementById('active-filepath-display') : null,
    btnNew: typeof document !== 'undefined' ? document.getElementById('btn-new') : null,
    btnOpen: typeof document !== 'undefined' ? document.getElementById('btn-open') : null,
    btnSave: typeof document !== 'undefined' ? document.getElementById('btn-save') : null,
    menuRecentFiles: typeof document !== 'undefined' ? document.getElementById('menu-recent-files') : null,
    recentMenuList: typeof document !== 'undefined' ? document.getElementById('recent-menu-list') : null,
    recentMenuTitle: typeof document !== 'undefined' ? document.getElementById('recent-menu-title') : null,
    btnClearRecent: typeof document !== 'undefined' ? document.getElementById('btn-clear-recent-files') : null,
    btnVersionDoc: typeof document !== 'undefined' ? document.getElementById('btn-version-doc') : null,
    btnRelocateDoc: typeof document !== 'undefined' ? document.getElementById('btn-relocate-doc') : null,
    selectVersioningDigits: typeof document !== 'undefined' ? document.getElementById('select-versioning-digits') : null,
    selectMaxRecentFiles: typeof document !== 'undefined' ? document.getElementById('select-max-recent-files') : null,
    inputRootFolder: typeof document !== 'undefined' ? document.getElementById('input-root-folder') : null,
    btnChangeRootFolder: typeof document !== 'undefined' ? document.getElementById('btn-change-root-folder') : null,
    btnResetRootFolder: typeof document !== 'undefined' ? document.getElementById('btn-reset-root-folder') : null,
    dndOverlay: typeof document !== 'undefined' ? document.getElementById('dnd-overlay') : null
  };
}

function getAppState() {
  return _ctx.appState || {};
}

function getInvoke() {
  return _ctx.invoke || (typeof window !== 'undefined' && window.__TAURI__ ? window.__TAURI__.core.invoke : null);
}

function notificar(msg, tipo = 'info') {
  if (typeof _ctx.alertNotification === 'function') {
    _ctx.alertNotification(msg, tipo);
  } else {
    console.log(`[${tipo.toUpperCase()}] ${msg}`);
  }
}

/**
 * Descarga de archivo en memoria como fallback para navegadores estándar
 */
function descargarArchivo(nombre, contenido, mimeType = 'text/plain') {
  const blob = new Blob([contenido], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Guarda en localStorage un borrador automático para recuperación ante cierres imprevistos
 */
export function guardarBorradorRecuperacion() {
  const DOM = getDOM();
  const appState = getAppState();
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    if (appState.isSaved) {
      localStorage.removeItem('md-autosave-draft');
      localStorage.removeItem('md-autosave-path');
      localStorage.removeItem('md-autosave-name');
      return;
    }
    if (DOM.editor) {
      localStorage.setItem('md-autosave-draft', DOM.editor.value);
    }
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

/**
 * Modifica el estado de guardado (isSaved) y actualiza los indicadores visuales
 */
export function setSavedState(saved) {
  const DOM = getDOM();
  const appState = getAppState();
  appState.isSaved = saved;
  
  if (saved) {
    if (DOM.statusDot) {
      DOM.statusDot.className = 'dot-saved';
      DOM.statusDot.setAttribute('title', 'Todos los cambios están guardados en tu disco');
    }
    
    // Limpiar borrador de recuperación automática
    localStorage.removeItem('md-autosave-draft');
    localStorage.removeItem('md-autosave-path');
    localStorage.removeItem('md-autosave-name');

    // Si guardamos un tema, refrescar el Playground de forma instantánea
    if (typeof _ctx.refrescarPlaygroundLocal === 'function') {
      _ctx.refrescarPlaygroundLocal();
    }
  } else {
    if (DOM.statusDot) {
      DOM.statusDot.className = 'dot-unsaved';
      DOM.statusDot.setAttribute('title', 'Tienes cambios sin guardar en tu editor');
    }
    guardarBorradorRecuperacion();
  }
  actualizarNombreArchivo();
  
  // Actualizar visibilidad del Playground si cambió el archivo activo
  if (typeof _ctx.actualizarEstadoThemePlayground === 'function') {
    _ctx.actualizarEstadoThemePlayground();
  }
}

/**
 * Actualiza el nombre del archivo visible en la barra superior (ocultando la extensión .md)
 */
export function actualizarNombreArchivo() {
  const DOM = getDOM();
  const appState = getAppState();
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  
  let display = appState.fileName || 'Sin título';
  const lastDot = display.lastIndexOf('.');
  if (lastDot > 0) {
    display = display.substring(0, lastDot);
  }
  
  if (!DOM.fileInfo) return;

  if (appState.filePath === null) {
    // Si el documento nunca ha sido guardado en disco
    DOM.fileInfo.textContent = `${display}.md`;
    if (DOM.activeFilepathDisplay) {
      DOM.activeFilepathDisplay.textContent = t.status_no_file_disk || (lang === 'es' ? 'Sin archivo guardado en disco' : (lang === 'en' ? 'No file saved on disk' : 'Nullum documentum in disco'));
    }
    if (DOM.statusDot) {
      DOM.statusDot.className = 'dot-unsaved';
      DOM.statusDot.setAttribute('title', lang === 'es' ? 'Sin archivo guardado en disco (en memoria)' : (lang === 'en' ? 'No file saved on disk (in memory)' : 'Nullum documentum in disco'));
    }
  } else {
    const statusText = appState.isSaved ? (t.status_saved || 'guardado') : (t.status_unsaved || 'sin guardar');
    DOM.fileInfo.textContent = `${display}.md`;
    if (DOM.activeFilepathDisplay) {
      DOM.activeFilepathDisplay.textContent = appState.filePath;
    }
    
    if (DOM.statusDot) {
      if (appState.isSaved) {
        DOM.statusDot.className = 'dot-saved';
        DOM.statusDot.setAttribute('title', lang === 'es' ? 'Todos los cambios están guardados en tu disco' : (lang === 'en' ? 'All changes are saved on your disk' : 'Omnes mutationes in disco servatae sunt'));
      } else {
        DOM.statusDot.className = 'dot-unsaved';
        DOM.statusDot.setAttribute('title', lang === 'es' ? 'Tienes cambios sin guardar en tu editor' : (lang === 'en' ? 'You have unsaved changes in your editor' : 'Mutationes non servatas habes in scriptorio'));
      }
    }
  }
}

/**
 * Habilita la edición directa del nombre de archivo pulsando sobre la barra superior
 */
export function habilitarEdicionNombre() {
  const DOM = getDOM();
  const appState = getAppState();
  if (!DOM.fileNameContainer || !DOM.fileInfo) return;

  // Prevenir duplicaciones de inputs
  if (DOM.fileNameContainer.querySelector('.editable-name-input')) return;

  let actualName = appState.fileName || 'Sin título';
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
  input.select();

  function guardarNombreEditado() {
    let nuevoNombre = input.value.trim();
    
    const lastDotName = nuevoNombre.lastIndexOf('.');
    if (lastDotName > 0) {
      nuevoNombre = nuevoNombre.substring(0, lastDotName);
    }
    
    if (nuevoNombre.length > 0) {
      if (nuevoNombre !== appState.fileName) {
        appState.fileName = nuevoNombre;
        
        if (appState.filePath) {
          const sep = appState.filePath.includes('/') ? '/' : '\\';
          const parts = appState.filePath.split(sep);
          parts[parts.length - 1] = nuevoNombre + '.md';
          appState.filePath = parts.join(sep);
        }
        
        setSavedState(false);
      }
    }
    
    input.remove();
    DOM.fileInfo.style.display = 'block';
    actualizarNombreArchivo();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      guardarNombreEditado();
    } else if (e.key === 'Escape') {
      input.remove();
      DOM.fileInfo.style.display = 'block';
    }
  });

  input.addEventListener('blur', guardarNombreEditado);
}

/**
 * Muestra el diálogo modal de confirmación con estilo del sistema
 */
export function solicitarConfirmacionSistema({ titulo, mensaje, detalle, tipo, btnSaveText, btnDiscardText, btnCancelText }) {
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

/**
 * Crea un documento nuevo en blanco, verificando cambios pendientes sin guardar
 */
export async function nuevoArchivo() {
  const DOM = getDOM();
  const appState = getAppState();

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
  
  if (DOM.editor) DOM.editor.value = '';
  appState.filePath = null;
  appState.fileName = 'Sin título';
  
  if (typeof _ctx.renderMarkdown === 'function') {
    _ctx.renderMarkdown();
  } else {
    renderMarkdown();
  }
  setSavedState(true);
  
  if (typeof _ctx.inicializarHistorial === 'function') {
    _ctx.inicializarHistorial();
  }
}

/**
 * Obtiene la lista de documentos recientemente abiertos desde localStorage
 */
export function obtenerArchivosRecientes() {
  try {
    const raw = localStorage.getItem('md-recent-files');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Registra un documento en el historial de archivos recientes
 */
export function registrarArchivoReciente(name, path) {
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

/**
 * Renderiza el menú desplegable de documentos recientes
 */
export function renderizarMenuRecientes() {
  const DOM = getDOM();
  const appState = getAppState();
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

/**
 * Alterna la visibilidad del menú de archivos recientes
 */
export function alternarMenuRecientes(forzar) {
  const DOM = getDOM();
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

/**
 * Cierra el menú desplegable de archivos recientes
 */
export function cerrarMenuRecientes() {
  const DOM = getDOM();
  if (DOM.menuRecentFiles) {
    DOM.menuRecentFiles.style.display = 'none';
  }
}

/**
 * Procesa y carga el contenido del documento en el editor, realizando conversión si es JSON, XML o YAML
 */
export async function procesarYCargarDocumento(fileData) {
  if (!fileData) return;
  const DOM = getDOM();
  const appState = getAppState();

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
      notificar('El archivo .json tiene errores de estructura y no pudo importarse.', 'error');
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
      notificar('El archivo .xml tiene errores de estructura y no pudo importarse.', 'error');
      return;
    }
  } else if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) {
    try {
      const jsonObj = convertYAMLToJSON(fileData.content);
      finalContent = convertJSONToMarkdown(jsonObj);
      importedAndConverted = 'YAML';
    } catch (yamlErr) {
      console.error('Error al analizar YAML en importación:', yamlErr);
      notificar('El archivo YAML tiene errores de estructura y no pudo importarse.', 'error');
      return;
    }
  }

  if (DOM.editor) DOM.editor.value = finalContent;
  
  let name = fileData.name;
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) {
    name = name.substring(0, lastDot);
  }
  appState.fileName = name;
  
  if (importedAndConverted) {
    appState.filePath = null;
    setSavedState(false);
    notificar(`Archivo ${importedAndConverted} importado y convertido a Markdown. Guarda el archivo como .md`);
  } else {
    appState.filePath = fileData.path || null;
    setSavedState(true);
    if (fileData.path) {
      registrarArchivoReciente(name, fileData.path);
    }
    notificar('Archivo abierto con éxito', 'success');
  }
  
  localStorage.removeItem('md-autosave-draft');
  localStorage.removeItem('md-autosave-path');
  localStorage.removeItem('md-autosave-name');
  
  actualizarNombreArchivo();
  
  if (typeof _ctx.renderMarkdown === 'function') {
    _ctx.renderMarkdown();
  } else {
    renderMarkdown();
  }
  
  if (typeof _ctx.inicializarHistorial === 'function') {
    _ctx.inicializarHistorial();
  }
}

/**
 * Abre un archivo directamente dada su ruta absoluta en disco
 */
export async function abrirArchivoDesdeRuta(filePath) {
  const appState = getAppState();
  const invoke = getInvoke();

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
    notificar('La conexión con el sistema nativo no está disponible fuera de Tauri.', 'error');
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
    notificar(t.recent_file_not_found || 'El archivo no fue encontrado en la ruta especificada.', 'error');
    
    let list = obtenerArchivosRecientes();
    list = list.filter(item => item.path !== filePath);
    localStorage.setItem('md-recent-files', JSON.stringify(list));
    renderizarMenuRecientes();
  }
}

/**
 * Abre el selector nativo de archivos para abrir un documento
 */
export async function abrirArchivo() {
  const appState = getAppState();
  const invoke = getInvoke();

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
    notificar('La conexión con el sistema de archivos nativo no está disponible fuera de Tauri.', 'error');
    return;
  }

  try {
    const fileData = await invoke('abrir_archivo');
    if (fileData) {
      await procesarYCargarDocumento(fileData);
    }
  } catch (error) {
    console.error('Error al abrir:', error);
    notificar('Error al abrir el archivo: ' + error, 'error');
  }
}

/**
 * Guarda el documento actual en su ruta de disco o invoca "Guardar como" si no tiene ruta
 */
export async function guardarArchivo() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();

  if (!invoke) {
    notificar('La comunicación con Tauri no está activa.', 'error');
    return false;
  }

  // Si es un archivo nuevo sin ruta, o si no es un archivo .md, redirige a "Guardar como"
  if (!appState.filePath || !appState.filePath.toLowerCase().endsWith('.md')) {
    await guardarComo();
    return true;
  }

  try {
    const contenido = DOM.editor ? DOM.editor.value : '';
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
    
    // Limpiar borrador temporal del Playground si aplica y refrescar selector de temas
    if (appState.filePath && appState.filePath.includes('themes')) {
      localStorage.removeItem('md-theme-draft-text');
      localStorage.removeItem('md-theme-draft-path');
      if (typeof _ctx.refrescarListaTemas === 'function') {
        await _ctx.refrescarListaTemas(appState.filePath);
      }
    }

    notificar('Cambios guardados con éxito', 'success');
    return true;
  } catch (error) {
    console.error('Error al guardar:', error);
    notificar('Error al guardar los cambios: ' + error, 'error');
    return false;
  }
}

/**
 * Inicializa y resuelve la carpeta base del sistema para almacenamiento de documentos
 */
export async function inicializarRutaBaseDocumentos() {
  const appState = getAppState();
  const invoke = getInvoke();
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

/**
 * Devuelve la carpeta de trabajo efectiva (personalizada o por defecto)
 */
export function obtenerRutaRaizEfectiva() {
  const appState = getAppState();
  return appState.customRootFolder || appState.systemDefaultRootFolder || '';
}

/**
 * Obtiene el directorio inicial para los cuadros de diálogo de guardado
 */
export function obtenerDirectorioArranqueDialogo() {
  const appState = getAppState();
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

/**
 * Refleja la carpeta raíz efectiva en el campo de texto de configuración
 */
export function actualizarVisualizacionRutaRaiz() {
  const DOM = getDOM();
  if (DOM.inputRootFolder) {
    DOM.inputRootFolder.value = obtenerRutaRaizEfectiva();
  }
}

/**
 * Abre el cuadro de diálogo para guardar el documento con una nueva ruta o nombre
 */
export async function guardarComo() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();

  if (!invoke) {
    notificar('La comunicación con Tauri no está activa.', 'error');
    return;
  }

  try {
    const contenido = DOM.editor ? DOM.editor.value : '';
    const defaultSaveName = (appState.fileName || 'documento').replace(/\s+/g, '_') + '.md';
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
      
      let name = fileData.name;
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        name = name.substring(0, lastDot);
      }
      appState.fileName = name;
      setSavedState(true);
      
      if (appState.filePath && appState.filePath.includes('themes')) {
        localStorage.removeItem('md-theme-draft-text');
        localStorage.removeItem('md-theme-draft-path');
        if (typeof _ctx.refrescarListaTemas === 'function') {
          await _ctx.refrescarListaTemas(appState.filePath);
        }
      }

      notificar('Archivo guardado con éxito', 'success');
    }
  } catch (error) {
    console.error('Error al guardar como:', error);
    notificar('Error al guardar el archivo: ' + error, 'error');
  }
}

/**
 * Crea una nueva versión numerada del documento actual en disco (ej. _V_002)
 */
export async function versionarDocumentoActual() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  const digits = appState.versioningDigits || 3;
  const currentContent = DOM.editor ? DOM.editor.value : '';

  if (appState.filePath === null) {
    notificar(t.versioning_initial_notice || 'Debes guardar el documento inicial en disco antes de comenzar su versionado.', 'info');
    
    let baseName = appState.fileName || 'documento';
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
          notificar((t.versioning_initial_saved || 'Documento inicial guardado como primera versión: ') + fileData.name, 'success');
        }
      } else {
        descargarArchivo(initialVersionName, currentContent, 'text/markdown');
        appState.fileName = initialVersionName.replace(/\.md$/, '');
        setSavedState(true);
        notificar((t.versioning_initial_saved || 'Documento inicial guardado como primera versión: ') + initialVersionName, 'success');
      }
    } catch (err) {
      console.error('Error al guardar versión inicial:', err);
      notificar('Error al guardar documento inicial: ' + err, 'error');
    }
    return;
  }

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
        notificar((t.versioning_success || 'Nueva versión creada: ') + fileData.name + (t.versioning_backed_up || ' (versión previa respaldada)'), 'success');
      }
    } else {
      let baseName = appState.fileName || 'documento';
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
      notificar((t.versioning_success || 'Nueva versión creada: ') + newName, 'success');
    }
  } catch (err) {
    console.error('Error al versionar documento:', err);
    notificar('Error al versionar documento: ' + err, 'error');
  }
}

/**
 * Reubica el documento actual en otra carpeta seleccionada por el usuario
 */
export async function reubicarCarpetaDocumento() {
  const DOM = getDOM();
  const appState = getAppState();
  const invoke = getInvoke();
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  const currentContent = DOM.editor ? DOM.editor.value : '';

  try {
    if (invoke) {
      const rutaInicial = obtenerDirectorioArranqueDialogo();
      const folder = await invoke('seleccionar_carpeta', { rutaInicial: rutaInicial || null });
      if (!folder) return; // Cancelado por el usuario
      
      appState.lastUsedFolder = folder;
      localStorage.setItem('md-last-used-folder', folder);
      
      let fileName = appState.fileName || 'documento';
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
      notificar((t.relocate_success || 'Nueva ruta establecida: ') + (savedPath || newPath), 'success');
    } else {
      notificar('La selección de carpetas del sistema solo está disponible en la aplicación de escritorio.', 'info');
    }
  } catch (err) {
    console.error('Error al reubicar documento:', err);
    notificar('Error al cambiar carpeta de destino: ' + err, 'error');
  }
}

/**
 * Valida y abre un archivo arrastrado directamente a la ventana
 */
export async function validarYAbrirArchivoSoltado(pathOrName, fileObj = null) {
  const appState = getAppState();
  const invoke = getInvoke();
  const fileName = (pathOrName || '').split(/[\\/]/).pop() || '';
  const lower = fileName.toLowerCase();
  const allowed = ['.md', '.markdown', '.txt', '.json', '.xml', '.yaml', '.yml'];
  const isAllowed = allowed.some(ext => lower.endsWith(ext));
  
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  
  if (!isAllowed) {
    notificar(t.dnd_format_unsupported || 'Formato no compatible. Formatos permitidos: .md, .markdown, .txt, .json, .xml, .yaml', 'error');
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
      notificar('Error al leer el archivo arrastrado: ' + (err.message || err), 'error');
    }
  }
}

/**
 * Inicializa los controladores de arrastre y soltar (Drag & Drop) de archivos del sistema
 */
export function inicializarDragAndDrop() {
  const DOM = getDOM();
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
  const isFileDrag = (e) => {
    if (!e || !e.dataTransfer || !e.dataTransfer.types) return false;
    const types = Array.from(e.dataTransfer.types);
    return types.includes('Files') || types.includes('application/x-moz-file');
  };

  ['dragenter', 'dragover'].forEach(evt => {
    window.addEventListener(evt, (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (overlay) overlay.style.display = 'flex';
    });
    if (DOM.editor) {
      DOM.editor.addEventListener(evt, (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
      });
    }
  });

  window.addEventListener('dragleave', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      if (overlay) overlay.style.display = 'none';
    }
  });

  const handleDrop = async (e) => {
    if (!isFileDrag(e)) return;
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

/**
 * Inicializa todos los eventos de botones y controles relacionados a la gestión de archivos
 */
export function inicializarEventosFileManager() {
  if (fileEventsInitialized) return;
  fileEventsInitialized = true;

  const DOM = getDOM();
  const appState = getAppState();

  // Botón Nuevo
  if (DOM.btnNew) {
    DOM.btnNew.addEventListener('click', nuevoArchivo);
  }

  // Botón Abrir (clic normal abre diálogo, Ctrl+Shift abre recientes)
  if (DOM.btnOpen) {
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
  }

  // Botón Guardar (clic normal guarda, Ctrl+Shift abre Guardar Como)
  if (DOM.btnSave) {
    DOM.btnSave.addEventListener('click', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        guardarComo();
      } else {
        guardarArchivo();
      }
    });
  }

  // Clic en el nombre para renombrar
  if (DOM.fileNameContainer) {
    DOM.fileNameContainer.addEventListener('click', habilitarEdicionNombre);
  }

  // Botones de versionado y reubicación
  if (DOM.btnVersionDoc) {
    DOM.btnVersionDoc.addEventListener('click', versionarDocumentoActual);
  }
  if (DOM.btnRelocateDoc) {
    DOM.btnRelocateDoc.addEventListener('click', reubicarCarpetaDocumento);
  }

  // Selectores de configuración de versionado y recientes
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

  // Configuración de carpeta raíz
  if (DOM.btnChangeRootFolder) {
    DOM.btnChangeRootFolder.addEventListener('click', async () => {
      const invoke = getInvoke();
      if (invoke) {
        const actual = obtenerRutaRaizEfectiva();
        const seleccionada = await invoke('seleccionar_carpeta', { rutaInicial: actual || null });
        if (seleccionada) {
          appState.customRootFolder = seleccionada;
          localStorage.setItem('md-root-folder', seleccionada);
          actualizarVisualizacionRutaRaiz();
          const lang = appState.language || 'es';
          const t = translations[lang] || translations.es;
          notificar((t.root_folder_changed || 'Carpeta raíz actualizada: ') + seleccionada, 'success');
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
      notificar((t.root_folder_reset || 'Carpeta raíz restablecida a: ') + appState.systemDefaultRootFolder, 'info');
    });
  }

  // Cierre automático del menú de recientes al pulsar fuera
  document.addEventListener('click', (e) => {
    if (DOM.menuRecentFiles && DOM.menuRecentFiles.style.display !== 'none') {
      if (!DOM.menuRecentFiles.contains(e.target) && DOM.btnOpen && !DOM.btnOpen.contains(e.target)) {
        cerrarMenuRecientes();
      }
    }
  });

  // Botón para vaciar la lista de recientes
  if (DOM.btnClearRecent) {
    DOM.btnClearRecent.addEventListener('click', () => {
      localStorage.removeItem('md-recent-files');
      renderizarMenuRecientes();
    });
  }

  // Inicializar Drag & Drop
  inicializarDragAndDrop();
}

/**
 * Inicializador principal del motor de archivos
 */
export function initFileManager(injectedCtx = {}) {
  _ctx = { ..._ctx, ...injectedCtx };
  inicializarEventosFileManager();
}
