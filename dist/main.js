// ==========================================================================
// LÓGICA INTERACTIVA PREMIUM - FRONTEND DEL EDITOR DE MARKDOWN (TAURI v2)
// ==========================================================================

// Configuración y Acceso Seguro al Puente de Tauri
const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;

// Estado Global de la Aplicación (con persistencia en localStorage para configuración)
let appState = {
  filePath: null,             // Ruta completa del archivo en disco
  fileName: 'Sin título',     // Nombre visible del archivo (sin extensión)
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
// GESTOR DE HISTORIAL DE CAMBIOS (UNDO / REDO STACK CON DEBOUNCE PREMIUM)
// ==========================================================================

class HistorialCambios {
  constructor(textarea, onRestore) {
    this.textarea = textarea;
    this.onRestore = onRestore;
    
    // Lista indexada de estados para Deshacer / Rehacer
    this.historial = [];
    this.indiceActual = -1;
    this.maxStates = 150; // Límite de seguridad
    
    // Control de debounce para atajos rápidos de formato
    this.ultimoFormatoTiempo = 0;
    this.debeConsolidarFormato = false;
    
    // Control de consolidación para escritura ordinaria de teclado
    this.typingTimer = null;
    this.estaEscribiendo = false;
    
    // Registrar estado inicial al cargar
    this.guardarEstado(textarea.value, textarea.selectionStart, textarea.selectionEnd, false);
  }

  // Guardar un nuevo estado en la pila
  guardarEstado(value, selectionStart, selectionEnd, esFormato = false, consolidar = false) {
    // Si el usuario realiza una nueva acción estando en medio del historial (tras varios Deshacer),
    // eliminamos los estados futuros (limpiar Redo)
    if (this.indiceActual < this.historial.length - 1) {
      this.historial = this.historial.slice(0, this.indiceActual + 1);
    }
    
    // Evitar guardar valores de texto idénticos consecutivos
    const ultimoEstado = this.historial[this.indiceActual];
    if (ultimoEstado && ultimoEstado.value === value) {
      // Solo actualizamos la posición del cursor para mantener la fidelidad de la navegación
      ultimoEstado.selectionStart = selectionStart;
      ultimoEstado.selectionEnd = selectionEnd;
      return;
    }
    
    // Si se activa la consolidación y el estado anterior fue un formato, sobrescribimos para agruparlos
    if (consolidar && ultimoEstado && ultimoEstado.esFormato) {
      ultimoEstado.value = value;
      ultimoEstado.selectionStart = selectionStart;
      ultimoEstado.selectionEnd = selectionEnd;
      ultimoEstado.timestamp = Date.now();
      return;
    }
    
    const nuevoEstado = {
      value,
      selectionStart,
      selectionEnd,
      timestamp: Date.now(),
      esFormato
    };
    
    this.historial.push(nuevoEstado);
    
    // Mantener bajo el límite de memoria máximo
    if (this.historial.length > this.maxStates) {
      this.historial.shift();
    } else {
      this.indiceActual++;
    }
  }

  // Se ejecuta ANTES de aplicar un formato por botón
  registrarCambioAntesDeFormato() {
    this.finalizarSesionEscritura();
    
    const ahora = Date.now();
    // Debounce de 1.5 segundos (1500 ms) para agrupar formatos consecutivos rápidos
    this.debeConsolidarFormato = (ahora - this.ultimoFormatoTiempo < 1500);
    
    if (!this.debeConsolidarFormato) {
      // Guardar el estado limpio antes del nuevo bloque de formatos
      this.guardarEstado(
        this.textarea.value,
        this.textarea.selectionStart,
        this.textarea.selectionEnd,
        true
      );
    }
    
    this.ultimoFormatoTiempo = ahora;
  }

  // Se ejecuta DESPUÉS de aplicar el formato
  registrarCambioDespuesDeFormato() {
    this.guardarEstado(
      this.textarea.value,
      this.textarea.selectionStart,
      this.textarea.selectionEnd,
      true,
      this.debeConsolidarFormato
    );
  }

  // Monitorear entrada del teclado ordinaria (input)
  registrarEscritura() {
    if (!this.estaEscribiendo) {
      this.estaEscribiendo = true;
    }
    
    // Temporizador de 1 segundo para consolidar la escritura fluida
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.finalizarSesionEscritura();
    }, 1000);
  }

  // Finalizar sesión activa de escritura y confirmar el estado
  finalizarSesionEscritura() {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    
    if (this.estaEscribiendo) {
      this.estaEscribiendo = false;
      this.guardarEstado(
        this.textarea.value,
        this.textarea.selectionStart,
        this.textarea.selectionEnd,
        false
      );
    }
  }

  // Deshacer (Ctrl + Z)
  deshacer() {
    this.finalizarSesionEscritura();
    
    if (this.indiceActual > 0) {
      this.indiceActual--;
      const estado = this.historial[this.indiceActual];
      this.aplicarEstado(estado);
    }
  }

  // Rehacer (Ctrl + Y)
  rehacer() {
    this.finalizarSesionEscritura();
    
    if (this.indiceActual < this.historial.length - 1) {
      this.indiceActual++;
      const estado = this.historial[this.indiceActual];
      this.aplicarEstado(estado);
    }
  }

  // Aplicar el estado al editor físico y sincronizar
  aplicarEstado(estado) {
    this.textarea.value = estado.value;
    this.textarea.selectionStart = estado.selectionStart;
    this.textarea.selectionEnd = estado.selectionEnd;
    
    if (this.onRestore) {
      this.onRestore();
    }
  }
}

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
    
    // Soporte de imágenes locales (relativas y absolutas) mediante el protocolo de activos de Tauri v2
    const imgs = DOM.preview.querySelectorAll('img');
    imgs.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        const isAbsoluteWin = /^[a-zA-Z]:/.test(src); // Cualquier unidad física como C:, D: en Windows
        const isRelative = src.startsWith('./') || src.startsWith('../');
        
        if (isAbsoluteWin || isRelative) {
          let pathCompleto = src;
          
          if (isRelative) {
            // Solo procesamos rutas relativas si hay un archivo abierto con ruta física
            if (appState.filePath) {
              const sep = appState.filePath.includes('/') ? '/' : '\\';
              const parts = appState.filePath.split(sep);
              parts.pop(); // Quitar nombre del archivo
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
              // Si no está guardado, no se puede resolver la ruta relativa
              return;
            }
          }
          
          // Normalizar barras para URL homogénea
          const normalized = pathCompleto.replace(/\\/g, '/');
          
          // Convertir la ruta física a la URL del protocolo de recursos de Tauri v2
          if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.convertFileSrc) {
            img.src = window.__TAURI__.core.convertFileSrc(normalized);
          } else {
            // Fallback manual robusto con codificación URL por componente para evitar roturas por espacios
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

// Actualiza el nombre que se visualiza arriba (escondiendo la extensión)
function actualizarNombreArchivo() {
  let indicator = appState.isSaved ? '' : ' *';
  let display = appState.fileName;
  const lastDot = display.lastIndexOf('.');
  if (lastDot > 0) {
    display = display.substring(0, lastDot);
  }
  DOM.fileInfo.textContent = `${display}${indicator}`;
  DOM.activeFilepathDisplay.textContent = appState.filePath || 'Sin archivo guardado en disco';
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

function nuevoArchivo() {
  if (!appState.isSaved) {
    const confirmar = confirm('Tienes cambios pendientes sin guardar. ¿Deseas descartarlos y crear un documento nuevo?');
    if (!confirmar) return;
  }
  
  DOM.editor.value = '';
  appState.filePath = null;
  appState.fileName = 'Sin título';
  renderMarkdown();
  setSavedState(true);
  inicializarHistorial();
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
      
      // Limpiar extensión de nombre visible
      let name = fileData.name;
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        name = name.substring(0, lastDot);
      }
      appState.fileName = name;
      
      renderMarkdown();
      setSavedState(true);
      inicializarHistorial();
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

  // Si es un archivo nuevo sin ruta, o si no es un archivo .md, redirige a "Guardar como"
  if (!appState.filePath || !appState.filePath.toLowerCase().endsWith('.md')) {
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
    // Pre-rellenar el diálogo con el nombre del archivo con extensión .md
    const defaultSaveName = appState.fileName + '.md';
    const fileData = await invoke('guardar_como', { defaultName: defaultSaveName, content: contenido });
    
    if (fileData) {
      appState.filePath = fileData.path;
      
      // Guardar nombre sin la extensión para la barra de menú
      let name = fileData.name;
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        name = name.substring(0, lastDot);
      }
      appState.fileName = name;
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
  // Registrar estado previo antes del formateo
  if (historial) {
    historial.registrarCambioAntesDeFormato();
  }

  const textarea = DOM.editor;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const originalText = textarea.value;
  const rawSelection = originalText.substring(start, end);
  
  // Aislar y limpiar espacios en blanco iniciales o finales (Trim interactivo premium)
  const leadingSpaces = rawSelection.match(/^\s*/)[0];
  const trailingSpaces = rawSelection.match(/\s*$/)[0];
  const selectedText = rawSelection.trim();
  const leadingLength = leadingSpaces.length;
  
  let prefix = '';
  let suffix = '';
  let cursorOffset = 0; // Para reposicionar el cursor si no hay selección
  
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
      prefix = '| Encabezado 1 | Encabezado 2 |\n| ------------ | ------------ |\n| Celda 1      | Celda 2      |';
      suffix = '';
      break;
    case 'ul':
      prefix = '- ';
      suffix = '';
      if (selectedText.includes('\n')) {
        const lineas = selectedText.split('\n').map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n');
        const finalBlock = leadingSpaces + lineas + trailingSpaces;
        textarea.setRangeText(finalBlock, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        if (historial) {
          historial.registrarCambioDespuesDeFormato();
        }
        return;
      }
      break;
    case 'ol':
      prefix = '1. ';
      suffix = '';
      if (selectedText.includes('\n')) {
        let count = 1;
        const lineas = selectedText.split('\n').map(l => {
          const formatted = l.trim().length > 0 ? `${count}. ${l}` : l;
          count++;
          return formatted;
        }).join('\n');
        const finalBlock = leadingSpaces + lineas + trailingSpaces;
        textarea.setRangeText(finalBlock, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        if (historial) {
          historial.registrarCambioDespuesDeFormato();
        }
        return;
      }
      break;
    case 'task':
      prefix = '- [ ] ';
      suffix = '';
      if (selectedText.includes('\n')) {
        const lineas = selectedText.split('\n').map(l => l.startsWith('- [ ] ') ? l : `- [ ] ${l}`).join('\n');
        const finalBlock = leadingSpaces + lineas + trailingSpaces;
        textarea.setRangeText(finalBlock, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        if (historial) {
          historial.registrarCambioDespuesDeFormato();
        }
        return;
      }
      break;
    case 'blockquote':
      prefix = '> ';
      suffix = '';
      if (selectedText.includes('\n')) {
        const lineas = selectedText.split('\n').map(l => l.startsWith('> ') ? l : `> ${l}`).join('\n');
        const finalBlock = leadingSpaces + lineas + trailingSpaces;
        textarea.setRangeText(finalBlock, start, end, 'select');
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        if (historial) {
          historial.registrarCambioDespuesDeFormato();
        }
        return;
      }
      break;
    case 'inline-code':
      prefix = '`';
      suffix = '`';
      break;
    case 'code-block':
      prefix = '```javascript\n';
      suffix = '\n```';
      break;
    case 'inline-math':
      prefix = '$';
      suffix = '$';
      break;
    case 'block-math':
      prefix = '$$\n';
      suffix = '\n$$';
      break;
    case 'h1': prefix = '# '; break;
    case 'h2': prefix = '## '; break;
    case 'h3': prefix = '### '; break;
    case 'h4': prefix = '#### '; break;
    case 'h5': prefix = '##### '; break;
    case 'h6': prefix = '###### '; break;
    case 'paragraph':
      prefix = '';
      suffix = '';
      break;
    case 'hr':
      prefix = '---';
      suffix = '';
      break;
  }
  
  if (rawSelection.length > 0) {
    // Aplicar el formato estrictamente al texto limpio, conservando los espacios por fuera
    const textFormatted = leadingSpaces + prefix + selectedText + suffix + trailingSpaces;
    textarea.setRangeText(textFormatted, start, end, 'select');
    
    // Ajustar la selección final para enfocar exactamente el texto formateado
    const newSelectStart = start + leadingLength;
    const newSelectEnd = newSelectStart + prefix.length + selectedText.length + suffix.length;
    textarea.setSelectionRange(newSelectStart, newSelectEnd);
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

  // Registrar el estado final del formateo
  if (historial) {
    historial.registrarCambioDespuesDeFormato();
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

// Ajuste automático de selección al hacer doble click en el Editor para remover espacios vacíos
DOM.editor.addEventListener('dblclick', () => {
  setTimeout(() => {
    const textarea = DOM.editor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value.substring(start, end);
    
    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed !== text) {
      const leadingCount = text.match(/^\s*/)[0].length;
      const trailingCount = text.match(/\s*$/)[0].length;
      textarea.setSelectionRange(start + leadingCount, end - trailingCount);
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
DOM.btnOpen.addEventListener('click', abrirArchivo);

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
DOM.btnMd.addEventListener('click', () => abrirModal(DOM.modalMd));
DOM.btnStats.addEventListener('click', () => abrirModal(DOM.modalStats));
DOM.btnConfig.addEventListener('click', () => abrirModal(DOM.modalConfig));

// Click sobre el nombre de archivo superior para renombrarlo
DOM.fileNameContainer.addEventListener('click', habilitarEdicionNombre);

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
  [DOM.modalMd, DOM.modalStats, DOM.modalConfig].forEach(overlay => {
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
  
  // Registrar cursores en las barras de scroll
  registrarCursorEnScrollbar(DOM.editor);
  registrarCursorEnScrollbar(DOM.previewContainer);
  
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
});
