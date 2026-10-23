// ==========================================================================
// GESTOR DE ATAJOS GLOBALES DE TECLADO (SHORTCUTS MANAGER)
// ==========================================================================

let _ctx = {
  DOM: null,
  getHistorial: null,
  nuevoArchivo: null,
  abrirArchivo: null,
  guardarArchivo: null,
  guardarComo: null,
  insertarSintaxisMarkdown: null,
  cerrarModales: null
};

let shortcutsInitialized = false;

function getDOM() {
  return _ctx.DOM || {};
}

function manejarKeyDownGlobal(e) {
  const DOM = getDOM();
  const isCtrl = e.ctrlKey || e.metaKey;
  const historial = typeof _ctx.getHistorial === 'function' ? _ctx.getHistorial() : null;
  
  // Ctrl + Z: Deshacer (solo si el editor está enfocado)
  if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
    if (DOM.editor && document.activeElement === DOM.editor) {
      e.preventDefault();
      if (historial) {
        historial.deshacer();
      }
      return;
    }
  }
  
  // Ctrl + Y o Ctrl + Shift + Z: Rehacer (solo si el editor está enfocado)
  if (isCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    if (DOM.editor && document.activeElement === DOM.editor) {
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
    if (typeof _ctx.nuevoArchivo === 'function') _ctx.nuevoArchivo();
    return;
  }
  
  // Ctrl + O: Abrir
  if (isCtrl && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    if (typeof _ctx.abrirArchivo === 'function') _ctx.abrirArchivo();
    return;
  }
  
  // Ctrl + S: Guardar
  if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (typeof _ctx.guardarArchivo === 'function') _ctx.guardarArchivo();
    return;
  }
  
  // Ctrl + Shift + S: Guardar Como (cuando no está enfocado el editor)
  if (isCtrl && e.shiftKey && e.key.toLowerCase() === 's' && (!DOM.editor || document.activeElement !== DOM.editor)) {
    e.preventDefault();
    if (typeof _ctx.guardarComo === 'function') _ctx.guardarComo();
    return;
  }

  // Atajos de Formato Markdown en el Editor
  if (DOM.editor && document.activeElement === DOM.editor) {
    const key = e.key.toLowerCase();
    const isShift = e.shiftKey;
    const isAlt = e.altKey;
    const insertar = typeof _ctx.insertarSintaxisMarkdown === 'function' ? _ctx.insertarSintaxisMarkdown : null;

    if (!insertar) return;

    // Encabezados 1 a 6: Ctrl + 1..6 (o Cmd + 1..6)
    if (isCtrl && !isAlt && !isShift && e.key >= '1' && e.key <= '6') {
      e.preventDefault();
      insertar('h' + e.key);
      return;
    }
    // Negrita: Ctrl + B
    if (isCtrl && !isAlt && !isShift && key === 'b') {
      e.preventDefault();
      insertar('bold');
      return;
    }
    // Cursiva: Ctrl + I
    if (isCtrl && !isAlt && !isShift && key === 'i') {
      e.preventDefault();
      insertar('italic');
      return;
    }
    // Subrayado: Ctrl + U
    if (isCtrl && !isAlt && !isShift && key === 'u') {
      e.preventDefault();
      insertar('underline');
      return;
    }
    // Tachado: Ctrl + Shift + S en editor
    if (isCtrl && !isAlt && isShift && key === 's') {
      e.preventDefault();
      insertar('strikethrough');
      return;
    }
    // Resaltado: Ctrl + H
    if (isCtrl && !isAlt && !isShift && key === 'h') {
      e.preventDefault();
      insertar('highlight');
      return;
    }
    // Superíndice: Ctrl + .
    if (isCtrl && !isAlt && !isShift && e.key === '.') {
      e.preventDefault();
      insertar('superscript');
      return;
    }
    // Subíndice: Ctrl + ,
    if (isCtrl && !isAlt && !isShift && e.key === ',') {
      e.preventDefault();
      insertar('subscript');
      return;
    }
    // Código en línea: Ctrl + K (sin shift)
    if (isCtrl && !isAlt && !isShift && key === 'k') {
      e.preventDefault();
      insertar('inline-code');
      return;
    }
    // Bloque de código: Ctrl + Shift + K
    if (isCtrl && !isAlt && isShift && key === 'k') {
      e.preventDefault();
      insertar('code-block');
      return;
    }
    // Fórmula en línea: Alt + K
    if (isAlt && !isCtrl && !isShift && key === 'k') {
      e.preventDefault();
      insertar('inline-math');
      return;
    }
    // Bloque matemático: Alt + Shift + K
    if (isAlt && !isCtrl && isShift && key === 'k') {
      e.preventDefault();
      insertar('block-math');
      return;
    }
    // Comentario oculto: Ctrl + /
    if (isCtrl && !isAlt && (e.key === '/' || e.key === '7')) {
      e.preventDefault();
      insertar('comment');
      return;
    }
    // Bloque de alerta: Ctrl + Shift + A
    if (isCtrl && !isAlt && isShift && key === 'a') {
      e.preventDefault();
      insertar('callout');
      return;
    }
    // Tabla: Ctrl + T
    if (isCtrl && !isAlt && !isShift && key === 't') {
      e.preventDefault();
      insertar('table');
      return;
    }
    // Lista de tareas: Ctrl + Shift + T
    if (isCtrl && !isAlt && isShift && key === 't') {
      e.preventDefault();
      insertar('task');
      return;
    }
    // Lista ordenada: Ctrl + Shift + O
    if (isCtrl && !isAlt && isShift && key === 'o') {
      e.preventDefault();
      insertar('ol');
      return;
    }
    // Cita en bloque: Ctrl + Shift + Q
    if (isCtrl && !isAlt && isShift && key === 'q') {
      e.preventDefault();
      insertar('blockquote');
      return;
    }
    // Enlace web: Ctrl + Shift + L
    if (isCtrl && !isAlt && isShift && key === 'l') {
      e.preventDefault();
      insertar('link');
      return;
    }
    // Imagen: Ctrl + Shift + I
    if (isCtrl && !isAlt && isShift && key === 'i') {
      e.preventDefault();
      insertar('image');
      return;
    }
    // Correo: Ctrl + Shift + M
    if (isCtrl && !isAlt && isShift && key === 'm') {
      e.preventDefault();
      insertar('email');
      return;
    }
    // Nota al pie: Ctrl + Shift + F
    if (isCtrl && !isAlt && isShift && key === 'f') {
      e.preventDefault();
      insertar('footnote');
      return;
    }
    // Lista de definición: Ctrl + Shift + D
    if (isCtrl && !isAlt && isShift && key === 'd') {
      e.preventDefault();
      insertar('definition-list');
      return;
    }
    // Bloque plegable: Ctrl + Alt + D
    if (isCtrl && isAlt && !isShift && key === 'd') {
      e.preventDefault();
      insertar('details');
      return;
    }
    // Línea divisoria: Alt + Shift + S
    if (isAlt && !isCtrl && isShift && key === 's') {
      e.preventDefault();
      insertar('hr');
      return;
    }
  }
  
  // Escape: Cerrar modales abiertos
  if (e.key === 'Escape') {
    if (typeof _ctx.cerrarModales === 'function') {
      _ctx.cerrarModales();
    }
  }
}

/**
 * Inicializador del gestor de atajos globales de teclado
 */
export function initShortcutsManager(injectedCtx = {}) {
  _ctx = { ..._ctx, ...injectedCtx };
  
  if (!shortcutsInitialized) {
    window.addEventListener('keydown', manejarKeyDownGlobal);
    shortcutsInitialized = true;
  }
}
