// ==========================================================================
// LÓGICA INTERACTIVA PREMIUM - FRONTEND DEL EDITOR DE MARKDOWN (TAURI v2)
// ==========================================================================

import { HistorialCambios } from './utils/history-manager.js';
import { parseMarkdownToJSON, convertJSONToXML, buildTreeHTML, convertJSONToMarkdown, convertXMLToJSON, convertJSONToYAML, convertYAMLToJSON } from './utils/data-parser.js';
import { escanearVariablesDePlantilla, obtenerTextoModuloConSangria } from './utils/template-engine.js';
import { exportarDocumentoAHTML, exportarDocumentoAPDF, exportarDocumentoAEPUB } from './utils/export-service.js';
import { translations } from './utils/i18n.js';

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
  language: localStorage.getItem('md-language') || 'es'
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
  rangeEditorSize: document.getElementById('range-editor-size'),
  rangeReaderSize: document.getElementById('range-reader-size'),
  rangeStructuredSize: document.getElementById('range-structured-size'),
  valEditorSize: document.getElementById('val-editor-size'),
  valReaderSize: document.getElementById('val-reader-size'),
  valStructuredSize: document.getElementById('val-structured-size'),
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

  // Sincronizar los controles visuales del Modal de Configuración
  if (DOM.selectEditorFont) DOM.selectEditorFont.value = appState.editorFont;
  if (DOM.selectReaderFont) DOM.selectReaderFont.value = appState.readerFont;
  if (DOM.selectStructuredFont) DOM.selectStructuredFont.value = appState.structuredFont;
  if (DOM.selectLanguage) DOM.selectLanguage.value = appState.language;
  if (DOM.rangeEditorSize) DOM.rangeEditorSize.value = appState.editorFontSize;
  if (DOM.rangeReaderSize) DOM.rangeReaderSize.value = appState.readerFontSize;
  if (DOM.rangeStructuredSize) DOM.rangeStructuredSize.value = appState.structuredFontSize;
  if (DOM.valEditorSize) DOM.valEditorSize.textContent = `${appState.editorFontSize}px`;
  if (DOM.valReaderSize) DOM.valReaderSize.textContent = `${appState.readerFontSize}px`;
  if (DOM.valStructuredSize) DOM.valStructuredSize.textContent = `${appState.structuredFontSize}px`;
  
  // Guardar permanentemente en almacenamiento del navegador
  localStorage.setItem('md-editor-font', appState.editorFont);
  localStorage.setItem('md-reader-font', appState.readerFont);
  localStorage.setItem('md-structured-font', appState.structuredFont);
  localStorage.setItem('md-editor-font-size', appState.editorFontSize);
  localStorage.setItem('md-reader-font-size', appState.readerFontSize);
  localStorage.setItem('md-structured-font-size', appState.structuredFontSize);
  localStorage.setItem('md-language', appState.language);
}

// ==========================================================================
// RENDERIZADO Y CONVERSIÓN DE MARKDOWN A HTML (MARKED.JS)
// ==========================================================================

function renderMarkdown() {
  const markdownText = DOM.editor.value;
  
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
    // Configurar de manera que se traduzcan saltos y HTML limpio
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
    
    // Inyectar el HTML traducido en el Visor
    let html = marked.parse(cleanedMarkdown);
    
    // 2. Procesar referencias de notas al pie [^label]
    html = html.replace(/\[\^([^\]:\n]+)\]/g, (match, label) => {
      if (footnoteDefs[label] !== undefined) {
        return `<sup class="footnote-ref"><a href="#fn-${label}" id="fnref-${label}">${label}</a></sup>`;
      }
      return match;
    });
    
    // 3. Procesar listas de definición (dt/dd)
    // Buscamos un párrafo de término seguido inmediatamente por un párrafo que empieza por dos puntos
    html = html.replace(/<p>([^<]+)<\/p>\s*<p>:\s*(.*?)<\/p>/g, '<dl><dt>$1</dt><dd>$2</dd></dl>');
    // Fusionar bloques dl adyacentes para agruparlos correctamente
    html = html.replace(/<\/dl>\s*<dl>/g, '');
    
    // 4. Inyectar la sección de notas al pie al final del HTML si existen
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

// Modifica el indicador de cambios sin guardar
function setSavedState(saved) {
  appState.isSaved = saved;
  
  if (saved) {
    DOM.statusDot.className = 'dot-saved';
    DOM.statusDot.setAttribute('title', 'Todos los cambios están guardados en tu disco');
    // Si guardamos un tema, refrescar el Playground de forma instantánea
    if (typeof refrescarPlaygroundLocal === 'function') {
      refrescarPlaygroundLocal();
    }
  } else {
    DOM.statusDot.className = 'dot-unsaved';
    DOM.statusDot.setAttribute('title', 'Tienes cambios sin guardar en tu editor');
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
  
  const statusText = appState.isSaved ? t.status_saved : t.status_unsaved;
  DOM.fileInfo.textContent = `${display}.md (${statusText})`;
  DOM.activeFilepathDisplay.textContent = appState.filePath || (lang === 'es' ? 'Sin archivo guardado en disco' : (lang === 'en' ? 'No file saved on disk' : 'Nullum documentum in disco'));
  
  if (appState.isSaved) {
    DOM.statusDot.className = 'dot-saved';
    DOM.statusDot.setAttribute('title', lang === 'es' ? 'Todos los cambios están guardados en tu disco' : (lang === 'en' ? 'All changes are saved on your disk' : 'Omnes mutationes in disco servatae sunt'));
  } else {
    DOM.statusDot.className = 'dot-unsaved';
    DOM.statusDot.setAttribute('title', lang === 'es' ? 'Tienes cambios sin guardar en tu editor' : (lang === 'en' ? 'You have unsaved changes in your editor' : 'Mutationes non servatas habes in scriptorio'));
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
      const lowerPath = fileData.path.toLowerCase();
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
          if (parserError.length > 0) {
            throw new Error(parserError[0].textContent);
          }
          
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
      
      // Limpiar extensión de nombre visible
      let name = fileData.name;
      const lastDot = name.lastIndexOf('.');
      if (lastDot > 0) {
        name = name.substring(0, lastDot);
      }
      appState.fileName = name;
      
      // Seguridad: Si se convirtió, limpiamos filePath para forzar un "Guardar como" y no sobreescribir el origen
      if (importedAndConverted) {
        appState.filePath = null;
        alertNotification(`Datos de tipo ${importedAndConverted} importados y convertidos a Markdown. Se requiere guardar como nuevo archivo .md`, 'success');
      } else {
        appState.filePath = fileData.path;
        alertNotification('Archivo abierto con éxito', 'success');
      }
      
      renderMarkdown();
      setSavedState(true);
      inicializarHistorial();
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
    alertNotification('Cambios guardados con éxito', 'success');
  } catch (error) {
    console.error('Error al guardar:', error);
    alertNotification('Error al guardar los cambios: ' + error, 'error');
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
      alertNotification('Archivo guardado con éxito', 'success');
    }
  } catch (error) {
    console.error('Error al guardar como:', error);
    alertNotification('Error al guardar el archivo: ' + error, 'error');
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
  
  // LÓGICA DE HEADINGS CONTEXTUALES PREMIUM
  const esHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tipo);
  if (esHeading) {
    let headingPrefix = '';
    switch(tipo) {
      case 'h1': headingPrefix = '# '; break;
      case 'h2': headingPrefix = '## '; break;
      case 'h3': headingPrefix = '### '; break;
      case 'h4': headingPrefix = '#### '; break;
      case 'h5': headingPrefix = '##### '; break;
      case 'h6': headingPrefix = '###### '; break;
    }
    
    if (rawSelection.length > 0) {
      // Caso 2: Hay selección. Insertar salto de línea si es necesario y aplicar Heading
      const caracterAnterior = start > 0 ? originalText.charAt(start - 1) : '\n';
      const necesitaSalto = caracterAnterior !== '\n';
      const prefijoConSalto = necesitaSalto ? ('\n' + headingPrefix) : headingPrefix;
      
      const textFormatted = leadingSpaces + prefijoConSalto + selectedText + trailingSpaces;
      textarea.setRangeText(textFormatted, start, end, 'select');
      
      const newSelectStart = start + leadingLength + (necesitaSalto ? 1 : 0) + headingPrefix.length;
      const newSelectEnd = newSelectStart + selectedText.length;
      textarea.setSelectionRange(newSelectStart, newSelectEnd);
    } else {
      // Caso 1: No hay selección. Aplicar al inicio del párrafo actual
      let inicioParrafo = originalText.lastIndexOf('\n', start - 1);
      if (inicioParrafo === -1) {
        inicioParrafo = 0;
      } else {
        inicioParrafo += 1;
      }
      let finParrafo = originalText.indexOf('\n', start);
      if (finParrafo === -1) {
        finParrafo = originalText.length;
      }
      
      const textoParrafo = originalText.substring(inicioParrafo, finParrafo);
      const regexHeading = /^(#{1,6}\s+)/;
      const match = textoParrafo.match(regexHeading);
      
      let nuevoTextoParrafo = '';
      let offsetCursor = 0;
      
      if (match) {
        const anteriorPrefix = match[1];
        nuevoTextoParrafo = headingPrefix + textoParrafo.substring(anteriorPrefix.length);
        offsetCursor = headingPrefix.length - anteriorPrefix.length;
      } else {
        nuevoTextoParrafo = headingPrefix + textoParrafo;
        offsetCursor = headingPrefix.length;
      }
      
      textarea.setRangeText(nuevoTextoParrafo, inicioParrafo, finParrafo, 'select');
      const nuevaPosCursor = Math.max(inicioParrafo, Math.min(finParrafo + offsetCursor, start + offsetCursor));
      textarea.setSelectionRange(nuevaPosCursor, nuevaPosCursor);
    }
    
    renderMarkdown();
    setSavedState(false);
    DOM.editor.focus();
    if (historial) {
      historial.registrarCambioDespuesDeFormato();
    }
    return;
  }
  
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
    case 'footnote': {
      // Detección robusta de números de notas al pie existentes para evitar duplicados y conflictos
      const numbers = Array.from(originalText.matchAll(/\[\^(\d+)\]/g)).map(m => parseInt(m[1], 10));
      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      prefix = `[^${nextNum}]`;
      suffix = '';
      
      // Si hay selección, la ignoramos y la reemplazamos con el marcador de nota para evitar formatos rotos
      if (rawSelection.length > 0) {
        textarea.setRangeText(prefix, start, end, 'select');
        const nextCursor = start + prefix.length;
        textarea.setSelectionRange(nextCursor, nextCursor);
        
        // Añadir la definición al final
        const updatedText = textarea.value;
        const defRegex = new RegExp(`\\n\\[\\^${nextNum}\\]:`);
        if (!defRegex.test(updatedText)) {
          const hasNewLine = updatedText.endsWith('\n');
          const extraBreak = updatedText.length > 0 && !hasNewLine ? '\n\n' : (updatedText.endsWith('\n\n') ? '' : '\n');
          textarea.value = updatedText + `${extraBreak}[^${nextNum}]: Descripción de la nota ${nextNum}`;
        }
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        if (historial) {
          historial.registrarCambioDespuesDeFormato();
        }
        return;
      }
      
      // Si no hay selección, continúa al flujo por defecto pero agrega primero la definición al final
      const defRegex = new RegExp(`\\n\\[\\^${nextNum}\\]:`);
      if (!defRegex.test(originalText)) {
        const hasNewLine = originalText.endsWith('\n');
        const extraBreak = originalText.length > 0 && !hasNewLine ? '\n\n' : (originalText.endsWith('\n\n') ? '' : '\n');
        textarea.value = originalText + `${extraBreak}[^${nextNum}]: Descripción de la nota ${nextNum}`;
      }
      break;
    }
    case 'email': {
      // Eliminar espacios, '<' y '>' accidentales de la selección
      const cleanEmail = selectedText.trim().replace(/[\s<>]/g, '');
      prefix = `<${cleanEmail || 'correo@ejemplo.com'}>`;
      suffix = '';
      if (rawSelection.length > 0) {
        const textFormatted = leadingSpaces + prefix + trailingSpaces;
        textarea.setRangeText(textFormatted, start, end, 'select');
        const newSelectStart = start + leadingLength;
        const newSelectEnd = newSelectStart + prefix.length;
        textarea.setSelectionRange(newSelectStart, newSelectEnd);
        renderMarkdown();
        setSavedState(false);
        DOM.editor.focus();
        if (historial) {
          historial.registrarCambioDespuesDeFormato();
        }
        return;
      }
      break;
    }
    case 'definition-list':
      prefix = 'Término\n: Definición';
      suffix = '';
      if (rawSelection.length > 0) {
        prefix = '';
        suffix = '\n: Definición';
      }
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
if (DOM.selectLanguage) {
  DOM.selectLanguage.addEventListener('change', (e) => cambiarIdioma(e.target.value));
}

function cambiarIdioma(lang) {
  appState.language = lang;
  localStorage.setItem('md-language', lang);
  if (DOM.selectLanguage) DOM.selectLanguage.value = lang;
  actualizarTextosInterfaz(lang);
}

function actualizarTextosInterfaz(lang) {
  const t = translations[lang];
  if (!t) return;

  // 1. Barra de Herramientas (tooltips)
  const setTooltip = (el, text) => { if (el) el.setAttribute('title', text); };
  setTooltip(DOM.btnNew, t.title_new);
  setTooltip(DOM.btnOpen, t.title_open);
  setTooltip(DOM.btnSave, t.title_save);
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

  // 5. Botones de Categorías y Títulos Flotantes
  const setCategoryBtn = (cat, text) => {
    const btn = document.querySelector(`#modal-md [data-category="${cat}"]`);
    if (btn) btn.textContent = text;
  };
  setCategoryBtn('basic', t.md_cat_basic);
  setCategoryBtn('headings', t.md_cat_headings);
  setCategoryBtn('lists', t.md_cat_lists);
  setCategoryBtn('media', t.md_cat_media);
  setCategoryBtn('code', t.md_cat_code);
  setCategoryBtn('structure', t.md_cat_structure);
  setCategoryBtn('advanced', t.md_cat_advanced);

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

  // 6. Botones de Atajos
  const shortcutTranslations = {
    'bold': { text: t.btn_bold, title: lang === 'es' ? 'Negrita - Sintaxis: **texto**' : (lang === 'en' ? 'Bold - Syntax: **text**' : 'Crassus - Syntaxis: **textus**') },
    'italic': { text: t.btn_italic, title: lang === 'es' ? 'Cursiva - Sintaxis: *texto*' : (lang === 'en' ? 'Italic - Syntax: *text*' : 'Obliquus - Syntaxis: *textus*') },
    'underline': { text: t.btn_underline, title: lang === 'es' ? 'Subrayado - Sintaxis: <u>texto</u>' : (lang === 'en' ? 'Underline - Syntax: <u>text</u>' : 'Sublineatus - Syntaxis: <u>textus</u>') },
    'strikethrough': { text: t.btn_strikethrough, title: lang === 'es' ? 'Tachado - Sintaxis: ~~texto~~' : (lang === 'en' ? 'Strikethrough - Syntax: ~~text~~' : 'Deletus - Syntaxis: ~~textus~~') },
    'h1': { text: t.btn_h1, title: lang === 'es' ? 'Título 1 - Sintaxis: # Título' : (lang === 'en' ? 'Heading 1 - Syntax: # Heading' : 'Titulus 1 - Syntaxis: # Titulus') },
    'h2': { text: t.btn_h2, title: lang === 'es' ? 'Título 2 - Sintaxis: ## Título' : (lang === 'en' ? 'Heading 2 - Syntax: ## Heading' : 'Titulus 2 - Syntaxis: ## Titulus') },
    'h3': { text: t.btn_h3, title: lang === 'es' ? 'Título 3 - Sintaxis: ### Título' : (lang === 'en' ? 'Heading 3 - Syntax: ### Heading' : 'Titulus 3 - Syntaxis: ### Titulus') },
    'h4': { text: t.btn_h4, title: lang === 'es' ? 'Título 4 - Sintaxis: #### Título' : (lang === 'en' ? 'Heading 4 - Syntax: #### Heading' : 'Titulus 4 - Syntaxis: #### Titulus') },
    'h5': { text: t.btn_h5, title: lang === 'es' ? 'Título 5 - Sintaxis: ##### Título' : (lang === 'en' ? 'Heading 5 - Syntax: ##### Heading' : 'Titulus 5 - Syntaxis: ##### Titulus') },
    'h6': { text: t.btn_h6, title: lang === 'es' ? 'Título 6 - Sintaxis: ###### Título' : (lang === 'en' ? 'Heading 6 - Syntax: ###### Heading' : 'Titulus 6 - Syntaxis: ###### Titulus') },
    'ul': { text: t.btn_ul, title: lang === 'es' ? 'Lista desordenada - Sintaxis: - Elemento' : (lang === 'en' ? 'Unordered List - Syntax: - Item' : 'Index Inordinatus - Syntaxis: - Elementum') },
    'ol': { text: t.btn_ol, title: lang === 'es' ? 'Lista ordenada - Sintaxis: 1. Elemento' : (lang === 'en' ? 'Ordered List - Syntax: 1. Item' : 'Index Ordinatus - Syntaxis: 1. Elementum') },
    'task': { text: t.btn_task, title: lang === 'es' ? 'Lista de tareas - Sintaxis: - [ ] Tarea' : (lang === 'en' ? 'Task List - Syntax: - [ ] Task' : 'Index Pensorum - Syntaxis: - [ ] Pensum') },
    'link': { text: t.btn_link, title: lang === 'es' ? 'Enlace web - Sintaxis: [texto](url)' : (lang === 'en' ? 'Web Link - Syntax: [text](url)' : 'Nexus Interretialis - Syntaxis: [textus](url)') },
    'image': { text: t.btn_image, title: lang === 'es' ? 'Imagen - Sintaxis: ![texto](url)' : (lang === 'en' ? 'Image - Syntax: ![text](url)' : 'Imago - Syntaxis: ![textus](url)') },
    'inline-code': { text: t.btn_inline_code, title: lang === 'es' ? 'Código en línea - Sintaxis: `código`' : (lang === 'en' ? 'Inline Code - Syntax: `code`' : 'Codex in linea - Syntaxis: `codex`') },
    'code-block': { text: t.btn_code_block, title: lang === 'es' ? 'Bloque de código - Sintaxis: ```javascript' : (lang === 'en' ? 'Code Block - Syntax: ```javascript' : 'Codex in textu - Syntaxis: ```javascript') },
    'inline-math': { text: t.btn_inline_math, title: lang === 'es' ? 'Fórmula en línea - Sintaxis: $f(x)$' : (lang === 'en' ? 'Inline Math - Syntax: $f(x)$' : 'Formula in linea - Syntaxis: $f(x)$') },
    'block-math': { text: t.btn_block_math, title: lang === 'es' ? 'Fórmula en bloque - Sintaxis: $$' : (lang === 'en' ? 'Block Math - Syntax: $$' : 'Formula in textu - Syntaxis: $$') },
    'blockquote': { text: t.btn_blockquote, title: lang === 'es' ? 'Cita - Sintaxis: > cita' : (lang === 'en' ? 'Blockquote - Syntax: > quote' : 'Citatio - Syntaxis: > citatio') },
    'paragraph': { text: t.btn_paragraph, title: lang === 'es' ? 'Párrafo' : (lang === 'en' ? 'Paragraph' : 'Paragraphus') },
    'table': { text: t.btn_table, title: lang === 'es' ? 'Tabla - Sintaxis: tabular' : (lang === 'en' ? 'Table - Syntax: tabular' : 'Tabula - Syntaxis: tabular') },
    'hr': { text: t.btn_hr, title: lang === 'es' ? 'Línea divisoria - Sintaxis: ---' : (lang === 'en' ? 'Horizontal Rule - Syntax: ---' : 'Linea divisoria - Syntaxis: ---') },
    'footnote': { text: t.btn_footnote, title: lang === 'es' ? 'Nota al pie - Sintaxis: [^1]' : (lang === 'en' ? 'Footnote - Syntax: [^1]' : 'Nota ad calcem - Syntaxis: [^1]') },
    'email': { text: t.btn_email, title: lang === 'es' ? 'Enlace de correo - Sintaxis: <correo>' : (lang === 'en' ? 'Email Link - Syntax: <email>' : 'Nexus Litterae Electronicae - Syntaxis: <littera>') },
    'definition-list': { text: t.btn_def_list, title: lang === 'es' ? 'Lista de definición - Sintaxis: Término\\n: Definición' : (lang === 'en' ? 'Definition List - Syntax: Term\\n: Definition' : 'Index Definitionum - Syntaxis: Terminus\\n: Definitio') }
  };

  document.querySelectorAll('.md-shortcut-btn').forEach(btn => {
    const syntax = btn.getAttribute('data-syntax');
    const trans = shortcutTranslations[syntax];
    if (trans) {
      btn.textContent = trans.text;
      btn.setAttribute('title', trans.title);
    }
  });

  // 7. Etiquetas de Configuración
  const setLabelText = (selector, text) => { const el = document.querySelector(selector); if (el) el.textContent = text; };
  setLabelText('[for="select-editor-font"]', t.config_font_editor);
  setLabelText('[for="select-reader-font"]', t.config_font_reader);
  setLabelText('[for="select-structured-font"]', t.config_font_tree);
  setLabelText('[for="range-editor-size"]', t.config_size_editor);
  setLabelText('[for="range-reader-size"]', t.config_size_reader);
  setLabelText('[for="range-structured-size"]', t.config_size_tree);
  setLabelText('[for="select-theme"]', t.config_theme);
  setLabelText('[for="select-language"]', t.config_lang);

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

function actualizarBarraDeEstadoTextos() {
  const lang = appState.language || 'es';
  const t = translations[lang] || translations.es;
  if (!t) return;

  const pathDisplay = DOM.activeFilepathDisplay;
  if (pathDisplay && !appState.filePath) {
    pathDisplay.textContent = lang === 'es' ? 'Sin archivo cargado en disco' : (lang === 'en' ? 'No file loaded on disk' : 'Nullum documentum in disco');
  }

  const fileInfo = DOM.fileInfo;
  if (fileInfo) {
    const isUnsaved = !appState.isSaved;
    if (isUnsaved) {
      fileInfo.textContent = `${appState.fileName}.md (${t.status_unsaved})`;
    } else {
      fileInfo.textContent = `${appState.fileName}.md (${t.status_saved})`;
    }
  }
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
  [DOM.modalMd, DOM.modalStats, DOM.modalConfig, DOM.modalEpubExport].forEach(overlay => {
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
  actualizarTextosInterfaz(appState.language || 'es');
  renderMarkdown();
  setSavedState(true);
  
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
    alertNotification
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
  const btnExportJson = document.getElementById('btn-tree-export-json');
  const btnExportXml = document.getElementById('btn-tree-export-xml');
  const btnExportYaml = document.getElementById('btn-tree-export-yaml');

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

  if (btnExportJson) {
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

  if (btnExportXml) {
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

  if (btnExportYaml) {
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
  const btnExportJson = document.getElementById('btn-tree-export-json');
  const btnExportXml = document.getElementById('btn-tree-export-xml');
  const btnExportYaml = document.getElementById('btn-tree-export-yaml');

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
  if (btnExportJson) {
    btnExportJson.setAttribute('title', t.struct_btn_json_export_title);
  }
  if (btnTabXml) {
    btnTabXml.setAttribute('title', t.struct_btn_xml_tab_title);
  }
  if (btnExportXml) {
    btnExportXml.setAttribute('title', t.struct_btn_xml_export_title);
  }
  if (btnTabYaml) {
    btnTabYaml.setAttribute('title', t.struct_btn_yaml_tab_title);
  }
  if (btnExportYaml) {
    btnExportYaml.setAttribute('title', t.struct_btn_yaml_export_title);
  }

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
  DOM.modalTemplateVars.querySelector('.modal-close-btn').addEventListener('click', () => {
    DOM.modalTemplateVars.classList.remove('active');
  });
  DOM.btnCancelVars.addEventListener('click', () => {
    DOM.modalTemplateVars.classList.remove('active');
  });
  DOM.modalTemplateVars.addEventListener('click', (e) => {
    if (e.target === DOM.modalTemplateVars) DOM.modalTemplateVars.classList.remove('active');
  });

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
      const confirmacion = confirm('Tienes cambios sin guardar en tu documento actual.\n¿Deseas guardarlos antes de abrir el tema para edición?\n\n[Aceptar] Guardará y abrirá el tema.\n[Cancelar] Abrirá el tema descartando cambios actuales.');
      if (confirmacion) {
        await guardarArchivo();
      }
    }

    try {
      const mdText = await invoke('leer_tema', { filePath: selectedThemePath });
      
      // Cargar en el editor
      DOM.editor.value = mdText;
      
      // Obtener el nombre del tema
      const sep = selectedThemePath.includes('/') ? '/' : '\\';
      const parts = selectedThemePath.split(sep);
      const themeFileName = parts[parts.length - 1];
      
      // Actualizar estado del archivo abierto
      appState.filePath = selectedThemePath;
      appState.fileName = themeFileName;
      
      setSavedState(true);
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
