// ==========================================================================
// LÓGICA INTERACTIVA PREMIUM - FRONTEND DEL EDITOR DE MARKDOWN (TAURI v2)
// ==========================================================================

// Configuración y Acceso Seguro al Puente de Tauri
const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;

// Estado Global de la Aplicación (con persistencia en localStorage para configuración)
let appState = {
  filePath: null,             // Ruta completa del archivo en disco
  fileName: 'Sin título.md',  // Nombre visible del archivo
  isSaved: true,              // Estado de guardado de los cambios
  activeView: 'split',        // Modo de visualización activa: 'editor', 'split' o 'preview'
  
  // Configuración visual (valores iniciales elegantes)
  editorFont: localStorage.getItem('md-editor-font') || 'Fira Code',
  readerFont: localStorage.getItem('md-reader-font') || 'Inter',
  editorFontSize: parseInt(localStorage.getItem('md-editor-font-size')) || 14,
  readerFontSize: parseInt(localStorage.getItem('md-reader-font-size')) || 15
};

// Referencias seguras y completas a Elementos del DOM
const DOM = {
  editor: document.getElementById('editor'),
  preview: document.getElementById('preview'),
  fileInfo: document.getElementById('file-info'),
  fileNameContainer: document.getElementById('file-name-container'),
  statusDot: document.getElementById('status-dot'),
  wordCountStatus: document.getElementById('word-count-status'),
  appContainer: document.getElementById('app-container'),
  previewContainer: document.getElementById('preview-container'),
  activeFilepathDisplay: document.getElementById('active-filepath-display'),
  
  // Botones de la barra de herramientas
  btnNew: document.getElementById('btn-new'),
  btnOpen: document.getElementById('btn-open'),
  btnSave: document.getElementById('btn-save'),
  
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
  
  // Selectores e Inputs de Configuración
  selectEditorFont: document.getElementById('select-editor-font'),
  selectReaderFont: document.getElementById('select-reader-font'),
  rangeEditorSize: document.getElementById('range-editor-size'),
  rangeReaderSize: document.getElementById('range-reader-size'),
  valEditorSize: document.getElementById('val-editor-size'),
  valReaderSize: document.getElementById('val-reader-size'),
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
// CONFIGURACIÓN DE APARIENCIA Y VARIABLES TIPOGRÁFICAS (CSS CUSTOM PROPERTIES)
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

  root.style.setProperty('--editor-font-family', editorFamily);
  root.style.setProperty('--reader-font-family', readerFamily);
  root.style.setProperty('--editor-font-size', `${appState.editorFontSize}px`);
  root.style.setProperty('--reader-font-size', `${appState.readerFontSize}px`);

  // Sincronizar los controles visuales del Modal de Configuración
  if (DOM.selectEditorFont) DOM.selectEditorFont.value = appState.editorFont;
  if (DOM.selectReaderFont) DOM.selectReaderFont.value = appState.readerFont;
  if (DOM.rangeEditorSize) DOM.rangeEditorSize.value = appState.editorFontSize;
  if (DOM.rangeReaderSize) DOM.rangeReaderSize.value = appState.readerFontSize;
  if (DOM.valEditorSize) DOM.valEditorSize.textContent = `${appState.editorFontSize}px`;
  if (DOM.valReaderSize) DOM.valReaderSize.textContent = `${appState.readerFontSize}px`;
  
  // Guardar permanentemente en almacenamiento del navegador
  localStorage.setItem('md-editor-font', appState.editorFont);
  localStorage.setItem('md-reader-font', appState.readerFont);
  localStorage.setItem('md-editor-font-size', appState.editorFontSize);
  localStorage.setItem('md-reader-font-size', appState.readerFontSize);
}

// ==========================================================================
// RENDERIZADO Y CONVERSIÓN DE MARKDOWN A HTML (MARKED.JS)
// ==========================================================================

function renderMarkdown() {
  const markdownText = DOM.editor.value;
  
  // Validar si la biblioteca de conversión se cargó de forma correcta y offline
  if (typeof marked !== 'undefined') {
    // Configurar de manera que se traduzcan saltos y HTML limpio
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false
    });
    
    // Inyectar el HTML traducido en el Visor
    DOM.preview.innerHTML = marked.parse(markdownText);
  } else {
    // Fallback de texto plano si no se pudo cargar la librería
    DOM.preview.textContent = markdownText;
  }
  
  // Actualizar estadísticas inmediatas de la barra inferior
  const palabras = markdownText.trim().split(/\s+/).filter(p => p.length > 0).length;
  DOM.wordCountStatus.textContent = `${palabras} ${palabras === 1 ? 'palabra' : 'palabras'}`;
}

// Modifica el indicador de cambios sin guardar
function setSavedState(saved) {
  appState.isSaved = saved;
  
  if (saved) {
    DOM.statusDot.className = 'dot-saved';
    DOM.statusDot.setAttribute('title', 'Todos los cambios están guardados en tu disco');
  } else {
    DOM.statusDot.className = 'dot-unsaved';
    DOM.statusDot.setAttribute('title', 'Tienes cambios sin guardar en tu editor');
  }
  actualizarNombreArchivo();
}

// Actualiza el nombre que se visualiza arriba
function actualizarNombreArchivo() {
  let indicator = appState.isSaved ? '' : ' *';
  DOM.fileInfo.textContent = `${appState.fileName}${indicator}`;
  DOM.activeFilepathDisplay.textContent = appState.filePath || 'Sin archivo guardado en disco';
}

// ==========================================================================
// EDICIÓN DIRECTA DE NOMBRE DE ARCHIVO (CLICKABLE RENAME)
// ==========================================================================

function habilitarEdicionNombre() {
  // Prevenir duplicaciones de inputs
  if (DOM.fileNameContainer.querySelector('.editable-name-input')) return;

  const actualName = appState.fileName;
  DOM.fileInfo.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = actualName;
  input.className = 'editable-name-input';
  DOM.fileNameContainer.appendChild(input);
  input.focus();

  // Seleccionar la parte del nombre sin la extensión para facilitar la edición
  const dotIndex = actualName.lastIndexOf('.');
  if (dotIndex > 0) {
    input.setSelectionRange(0, dotIndex);
  } else {
    input.select();
  }

  // Guardar al pulsar Enter o salir del foco
  function guardarNombreEditado() {
    let nuevoNombre = input.value.trim();
    if (nuevoNombre.length > 0) {
      // Asegurar que conserva la extensión .md
      if (!nuevoNombre.toLowerCase().endsWith('.md')) {
        nuevoNombre += '.md';
      }
      
      if (nuevoNombre !== appState.fileName) {
        appState.fileName = nuevoNombre;
        
        // Si ya tenía una ruta en disco, la actualizamos para que al guardar lo escriba en el nuevo nombre
        if (appState.filePath) {
          const sep = appState.filePath.includes('/') ? '/' : '\\';
          const parts = appState.filePath.split(sep);
          parts[parts.length - 1] = nuevoNombre;
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

function nuevoArchivo() {
  if (!appState.isSaved) {
    const confirmar = confirm('Tienes cambios pendientes sin guardar. ¿Deseas descartarlos y crear un documento nuevo?');
    if (!confirmar) return;
  }
  
  DOM.editor.value = '';
  appState.filePath = null;
  appState.fileName = 'Sin título.md';
  renderMarkdown();
  setSavedState(true);
}

async function abrirArchivo() {
  if (!appState.isSaved) {
    const confirmar = confirm('Tienes cambios pendientes sin guardar. ¿Deseas abrir otro archivo y descartar los actuales?');
    if (!confirmar) return;
  }

  if (!invoke) {
    alert('La conexión con el sistema de archivos nativo no está disponible fuera de Tauri.');
    return;
  }

  try {
    const fileData = await invoke('abrir_archivo');
    if (fileData) {
      DOM.editor.value = fileData.content;
      appState.filePath = fileData.path;
      appState.fileName = fileData.name;
      
      renderMarkdown();
      setSavedState(true);
    }
  } catch (error) {
    console.error('Error al abrir:', error);
    alert('No se pudo abrir el archivo seleccionado.');
  }
}

async function guardarArchivo() {
  if (!invoke) {
    alert('La comunicación con Tauri no está activa.');
    return;
  }

  // Si es un archivo nuevo sin ruta, redirige a "Guardar como" automáticamente
  if (!appState.filePath) {
    await guardarComo();
    return;
  }

  try {
    const contenido = DOM.editor.value;
    await invoke('guardar_archivo', { path: appState.filePath, content: contenido });
    setSavedState(true);
  } catch (error) {
    console.error('Error al guardar:', error);
    alert('Ocurrió un error al intentar guardar los cambios: ' + error);
  }
}

async function guardarComo() {
  if (!invoke) {
    alert('La comunicación con Tauri no está activa.');
    return;
  }

  try {
    const contenido = DOM.editor.value;
    const fileData = await invoke('guardar_como', { content: contenido });
    
    if (fileData) {
      appState.filePath = fileData.path;
      appState.fileName = fileData.name;
      setSavedState(true);
    }
  } catch (error) {
    console.error('Error al guardar como:', error);
    alert('No se pudo guardar el archivo bajo esa ubicación.');
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
  }
  
  // Si abrimos el modal de estadísticas, forzamos su actualización
  if (modal === DOM.modalStats) {
    actualizarEstadisticasDetalladas();
  }
}

function cerrarModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  
  // Devolver el foco al editor para mantener el flujo de escritura fluido
  DOM.editor.focus();
}

function cerrarModales() {
  cerrarModal(DOM.modalMd);
  cerrarModal(DOM.modalStats);
  cerrarModal(DOM.modalConfig);
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
  const modalBox = modalOverlay.querySelector('.modal-box');
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
});

// ==========================================================================
// LÓGICA DE INYECCIÓN DE ATAJOS MARKDOWN (MODAL MD)
// ==========================================================================

function insertarSintaxisMarkdown(tipo) {
  const textarea = DOM.editor;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalText = textarea.value;
  const selectedText = originalText.substring(start, end);
  
  let prefix = '';
  let suffix = '';
  let cursorOffset = 0; // Para reposicionar el cursor si no hay selección
  let selectionOffset = 0; // Para mantener la selección del texto
  
  switch(tipo) {
    case 'bold':
      prefix = '**';
      suffix = '**';
      break;
    case 'italic':
      prefix = '*';
      suffix = '*';
      break;
    case 'underline':
      prefix = '<u>';
      suffix = '</u>';
      break;
    case 'strikethrough':
      prefix = '~~';
      suffix = '~~';
      break;
    case 'link':
      prefix = '[';
      suffix = '](url)';
      cursorOffset = 5; // Posicionar dentro de 'url'
      break;
    case 'image':
      prefix = '![';
      suffix = '](url_imagen)';
      cursorOffset = 12; // Posicionar dentro de 'url_imagen'
      break;
    case 'table':
      prefix = '\n| Encabezado 1 | Encabezado 2 |\n| ------------ | ------------ |\n| Celda 1      | Celda 2      |\n';
      suffix = '';
      break;
    case 'ul':
      prefix = '\n- ';
      suffix = '';
      // Si hay varias líneas seleccionadas, anteponer el guión a cada una
      if (selectedText.includes('\n')) {
        const lineas = selectedText.split('\n').map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n');
        textarea.setRangeText(lineas, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        return;
      }
      break;
    case 'ol':
      prefix = '\n1. ';
      suffix = '';
      if (selectedText.includes('\n')) {
        let count = 1;
        const lineas = selectedText.split('\n').map(l => {
          const formatted = l.trim().length > 0 ? `${count}. ${l}` : l;
          count++;
          return formatted;
        }).join('\n');
        textarea.setRangeText(lineas, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        return;
      }
      break;
    case 'task':
      prefix = '\n- [ ] ';
      suffix = '';
      if (selectedText.includes('\n')) {
        const lineas = selectedText.split('\n').map(l => l.startsWith('- [ ] ') ? l : `- [ ] ${l}`).join('\n');
        textarea.setRangeText(lineas, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        return;
      }
      break;
    case 'blockquote':
      prefix = '\n> ';
      suffix = '';
      if (selectedText.includes('\n')) {
        const lineas = selectedText.split('\n').map(l => l.startsWith('> ') ? l : `> ${l}`).join('\n');
        textarea.setRangeText(lineas, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        return;
      }
      break;
    case 'inline-code':
      prefix = '`';
      suffix = '`';
      break;
    case 'code-block':
      prefix = '\n```javascript\n';
      suffix = '\n```\n';
      break;
    case 'inline-math':
      prefix = '$';
      suffix = '$';
      break;
    case 'block-math':
      prefix = '\n$$\n';
      suffix = '\n$$\n';
      break;
    case 'h1': prefix = '\n# '; break;
    case 'h2': prefix = '\n## '; break;
    case 'h3': prefix = '\n### '; break;
    case 'h4': prefix = '\n#### '; break;
    case 'h5': prefix = '\n##### '; break;
    case 'h6': prefix = '\n###### '; break;
    case 'paragraph':
      prefix = '\n\n';
      suffix = '\n\n';
      break;
    case 'hr':
      prefix = '\n---\n';
      break;
  }
  
  if (selectedText.length > 0) {
    // Si hay texto seleccionado, envolverlo
    const textFormatted = prefix + selectedText + suffix;
    textarea.setRangeText(textFormatted, start, end, 'select');
  } else {
    // Si no hay texto, colocar el cursor en el punto medio exacto
    const placeholder = tipo === 'link' ? 'texto' : (tipo === 'image' ? 'texto_alternativo' : '');
    const textInsert = prefix + placeholder + suffix;
    textarea.setRangeText(textInsert, start, start, 'select');
    
    // Calcular posiciones de foco cómodas
    const focusStart = start + prefix.length;
    const focusEnd = focusStart + placeholder.length;
    
    if (cursorOffset > 0) {
      textarea.setSelectionRange(start + textInsert.length - cursorOffset, start + textInsert.length);
    } else {
      textarea.setSelectionRange(focusStart, focusEnd);
    }
  }
  
  renderMarkdown();
  setSavedState(false);
  DOM.editor.focus();
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

function cambiarFontSizeEditor(nuevoSize) {
  appState.editorFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
}

function cambiarFontSizeReader(nuevoSize) {
  appState.readerFontSize = parseInt(nuevoSize);
  aplicarConfiguracionVisual();
}

// Lógica para botones de aumento y reducción combinados +1 | -1
function ajustarTamañoGeneral(factor) {
  const nuevoEditorSize = appState.editorFontSize + factor;
  const nuevoReaderSize = appState.readerFontSize + factor;
  
  // Mantener los valores siempre dentro del rango estricto (10px a 24px)
  if (nuevoEditorSize >= 10 && nuevoEditorSize <= 24) {
    appState.editorFontSize = nuevoEditorSize;
  }
  if (nuevoReaderSize >= 10 && nuevoReaderSize <= 24) {
    appState.readerFontSize = nuevoReaderSize;
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
if (DOM.rangeEditorSize) {
  DOM.rangeEditorSize.addEventListener('input', (e) => cambiarFontSizeEditor(e.target.value));
}
if (DOM.rangeReaderSize) {
  DOM.rangeReaderSize.addEventListener('input', (e) => cambiarFontSizeReader(e.target.value));
}
if (DOM.btnFontDec) {
  DOM.btnFontDec.addEventListener('click', () => ajustarTamañoGeneral(-1));
}
if (DOM.btnFontInc) {
  DOM.btnFontInc.addEventListener('click', () => ajustarTamañoGeneral(1));
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

// Sincronización interactiva de foco por línea activa
function sincronizarFocoElemento() {
  const text = DOM.editor.value;
  const cursorSelStart = DOM.editor.selectionStart;
  
  // Encontrar la línea actual del cursor
  const linesBefore = text.substring(0, cursorSelStart).split('\n');
  const currentLineIndex = linesBefore.length - 1;
  const lines = text.split('\n');
  
  if (!lines[currentLineIndex]) return;
  const currentLineText = lines[currentLineIndex].trim();
  
  // Limpiar clases de resaltados anteriores
  const blocks = DOM.preview.querySelectorAll('.markdown-body > *');
  blocks.forEach(b => b.classList.remove('highlighted-block'));
  
  if (currentLineText.length < 3) return; // Evitar disparar con líneas vacías
  
  // Remover sintaxis Markdown de la línea para hacer una búsqueda limpia
  const cleanLineText = currentLineText.replace(/[#*`~_\-[\]()]/g, '').toLowerCase().trim();
  if (cleanLineText.length < 3) return;
  
  let bestMatch = null;
  let maxScore = 0;
  
  blocks.forEach(block => {
    const blockText = block.textContent.toLowerCase();
    if (blockText.includes(cleanLineText)) {
      const score = cleanLineText.length / blockText.length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = block;
      }
    }
  });
  
  if (bestMatch) {
    bestMatch.classList.add('highlighted-block');
    // Scroll suave hasta tener el elemento visible a nivel de panel
    bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Sincronizar foco inverso (Doble clic en Visor selecciona línea del Editor)
DOM.preview.addEventListener('dblclick', (e) => {
  const targetElement = e.target.closest('.markdown-body > *');
  if (!targetElement) return;
  
  const textToSearch = targetElement.textContent.trim();
  if (textToSearch.length < 4) return;
  
  const cleanSearch = textToSearch.toLowerCase().substring(0, 30); // Usamos las primeras letras para buscar
  const fullText = DOM.editor.value;
  const lines = fullText.split('\n');
  
  let lineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].replace(/[#*`~_\-[\]()]/g, '').toLowerCase().trim();
    if (cleanLine.includes(cleanSearch) || cleanSearch.includes(cleanLine)) {
      lineIndex = i;
      break;
    }
  }
  
  if (lineIndex !== -1) {
    // Calcular el inicio de esa línea
    let charIndex = 0;
    for (let i = 0; i < lineIndex; i++) {
      charIndex += lines[i].length + 1;
    }
    
    // Seleccionar la línea en el Editor y hacer foco
    DOM.editor.focus();
    DOM.editor.setSelectionRange(charIndex, charIndex + lines[lineIndex].length);
    
    // Desplazar suavemente el textarea
    const lineHeight = 24; // Aproximado
    DOM.editor.scrollTop = Math.max(0, (lineIndex * lineHeight) - 100);
    
    // Resaltar visualmente el bloque del visor
    const blocks = DOM.preview.querySelectorAll('.markdown-body > *');
    blocks.forEach(b => b.classList.remove('highlighted-block'));
    targetElement.classList.add('highlighted-block');
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

// ==========================================================================
// INICIALIZACIÓN, ATADOS DE TECLADO Y ARRANQUE DE LA APP
// ==========================================================================

// Monitoreo de entradas de texto en tiempo real
DOM.editor.addEventListener('input', () => {
  renderMarkdown();
  if (appState.isSaved) {
    setSavedState(false);
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
DOM.btnOpen.addEventListener('click', abrirArchivo);
DOM.btnSave.addEventListener('click', guardarArchivo);

// Cambios de vistas
DOM.viewEditor.addEventListener('click', () => cambiarVista('editor'));
DOM.viewSplit.addEventListener('click', () => cambiarVista('split'));
DOM.viewPreview.addEventListener('click', () => cambiarVista('preview'));

// Diálogos modales
DOM.btnMd.addEventListener('click', () => abrirModal(DOM.modalMd));
DOM.btnStats.addEventListener('click', () => abrirModal(DOM.modalStats));
DOM.btnConfig.addEventListener('click', () => abrirModal(DOM.modalConfig));

// Click sobre el nombre de archivo superior para renombrarlo
DOM.fileNameContainer.addEventListener('click', habilitarEdicionNombre);

// ==========================================================================
// DESPLAZAMIENTO GESTUAL POR ARRASTRE (DRAG TO SCROLL) EN EL VISOR
// ==========================================================================

let isScrollingDrag = false;
let startY = 0;
let startScrollTop = 0;

DOM.previewContainer.addEventListener('mousedown', (e) => {
  // Solo clic izquierdo
  if (e.button !== 0) return;
  
  // Si hace clic sobre enlaces, botones o elementos de entrada, no arrastramos
  if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) return;
  
  isScrollingDrag = true;
  startY = e.clientY;
  startScrollTop = DOM.previewContainer.scrollTop;
  DOM.previewContainer.style.cursor = 'grab';
});

DOM.previewContainer.addEventListener('mousemove', (e) => {
  if (!isScrollingDrag) return;
  
  // Si el usuario está activamente seleccionando texto, cancelamos el gesto de arrastre de fondo
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    isScrollingDrag = false;
    DOM.previewContainer.style.cursor = 'auto';
    return;
  }
  
  const dy = e.clientY - startY;
  // Multiplicador ágil de 1.5 para un desplazamiento cómodo
  DOM.previewContainer.scrollTop = startScrollTop - dy * 1.5;
  DOM.previewContainer.style.cursor = 'grabbing';
});

const detenerArrastreScroll = () => {
  if (isScrollingDrag) {
    isScrollingDrag = false;
    DOM.previewContainer.style.cursor = 'auto';
  }
};

DOM.previewContainer.addEventListener('mouseup', detenerArrastreScroll);
DOM.previewContainer.addEventListener('mouseleave', detenerArrastreScroll);

// Atajos globales de Teclado nativos
window.addEventListener('keydown', (e) => {
  const isCtrl = e.ctrlKey || e.metaKey;
  
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
  
  // Ctrl + Shift + S: Guardar Como
  if (isCtrl && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    guardarComo();
  }
  
  // Escape: Cerrar modales abiertos
  if (e.key === 'Escape') {
    cerrarModales();
  }
});

// Inicio oficial de la aplicación
window.addEventListener('DOMContentLoaded', () => {
  aplicarConfiguracionVisual();
  renderMarkdown();
  setSavedState(true);
  
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
});
