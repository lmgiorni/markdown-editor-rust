// ==========================================================================
// MÓDULO DE GESTIÓN DE TEMAS VISUALES Y THEME PLAYGROUND (TAURI v2)
// ==========================================================================

import { parseMarkdownToJSON } from '../utils/data-parser.js';
import { abrirColorPicker } from '../utils/color-picker.js';
import { translations } from '../utils/i18n.js';

let ctx = {
  DOM: {},
  appState: {},
  invoke: null,
  solicitarConfirmacionSistema: null,
  alertNotification: null,
  guardarArchivo: null,
  setSavedState: null,
  renderMarkdown: null
};

export function initThemeManager(options = {}) {
  ctx = { ...ctx, ...options };
  inicializarTemas();
  inicializarThemePlayground();
}

function getInvoke() {
  if (ctx.invoke) return ctx.invoke;
  if (typeof window !== 'undefined') {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return window.__TAURI__.core.invoke;
    }
    if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
      return window.__TAURI__.invoke;
    }
  }
  return null;
}

function getDOM() {
  return {
    selectTheme: (ctx.DOM && ctx.DOM.selectTheme) || document.getElementById('select-theme'),
    editor: (ctx.DOM && ctx.DOM.editor) || document.getElementById('editor'),
    modalConfig: (ctx.DOM && ctx.DOM.modalConfig) || document.getElementById('modal-config')
  };
}

function getAppState() {
  return ctx.appState || window.appState || {};
}

// --------------------------------------------------------------------------
// 1. GESTIÓN Y PERSISTENCIA DE TEMAS (.md)
// --------------------------------------------------------------------------

export async function refrescarListaTemas(temaPathASeleccionar = null) {
  const DOM = getDOM();
  const inv = getInvoke();
  if (!DOM.selectTheme || !inv) return;

  try {
    const temas = await inv('listar_temas');
    const valorPrevio = temaPathASeleccionar || DOM.selectTheme.value;
    DOM.selectTheme.innerHTML = '';

    if (!temas || temas.length === 0) {
      DOM.selectTheme.innerHTML = '<option value="">Sin temas disponibles</option>';
      return;
    }

    const appState = getAppState();
    let encontrado = false;
    temas.forEach(tema => {
      const opt = document.createElement('option');
      opt.value = tema.filePath;
      opt.textContent = tema.themeName.replace(/-/g, ' ');

      if (valorPrevio && (tema.filePath === valorPrevio || tema.themeName === valorPrevio || tema.filePath.endsWith(valorPrevio))) {
        opt.selected = true;
        encontrado = true;
      } else if (!encontrado && tema.themeName === appState.activeTheme) {
        opt.selected = true;
        encontrado = true;
      }
      DOM.selectTheme.appendChild(opt);
    });

    if (!encontrado && DOM.selectTheme.options.length > 0) {
      DOM.selectTheme.selectedIndex = 0;
    }
  } catch (err) {
    console.error('Error al refrescar la lista de temas:', err);
  }
}

export async function inicializarTemas() {
  const DOM = getDOM();
  if (!DOM.selectTheme) return;

  DOM.selectTheme.addEventListener('change', async (e) => {
    const filePath = e.target.value;
    if (filePath) {
      await cargarYAplicarTema(filePath);
    }
  });

  await refrescarListaTemas();

  // Cargar y aplicar el tema guardado al iniciar
  if (DOM.selectTheme.value) {
    await cargarYAplicarTema(DOM.selectTheme.value);
  }
}

export async function cargarYAplicarTema(filePath) {
  const inv = getInvoke();
  if (!inv) return;

  try {
    const mdText = await inv('leer_tema', { filePath });
    const parsedData = parseMarkdownToJSON(mdText);
    
    // Buscar de manera tolerante a fallos el nodo del tema y su sección de colores
    const tema = parsedData.Tema || parsedData.tema || parsedData;
    const colorsSection = tema.colors || tema.Colores || tema.colores || tema;
    const appState = getAppState();
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
    if (typeof ctx.alertNotification === 'function') {
      ctx.alertNotification('No se pudo aplicar el tema seleccionado: ' + err, 'error');
    }
  }
}

// --------------------------------------------------------------------------
// 2. ENTORNO DE DISEÑO FLOTANTE: THEME PLAYGROUND
// --------------------------------------------------------------------------

export function inicializarThemePlayground() {
  const btnEditTheme = document.getElementById('btn-edit-theme');
  const playgroundBox = document.getElementById('modal-theme-playground');
  const btnClosePlayground = document.getElementById('btn-close-playground');
  const dragHandle = document.getElementById('playground-drag-handle');
  const resizeHandle = document.getElementById('playground-resize-handle');
  const btnApplyThemeGlobal = document.getElementById('btn-apply-theme-global');
  const DOM = getDOM();
  const appState = getAppState();
  const inv = getInvoke();
  
  if (!btnEditTheme || !playgroundBox) return;

  // 1. Botón Lápiz: Carga directa del tema en el editor
  btnEditTheme.addEventListener('click', async () => {
    const selectedThemePath = DOM.selectTheme ? DOM.selectTheme.value : null;
    if (!selectedThemePath) {
      if (typeof ctx.alertNotification === 'function') {
        ctx.alertNotification('Por favor, selecciona un tema primero', 'info');
      }
      return;
    }

    // Advertencia de cambios sin guardar
    if (!appState.isSaved && typeof ctx.solicitarConfirmacionSistema === 'function') {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      const accion = await ctx.solicitarConfirmacionSistema({
        titulo: t.confirm_title_theme || 'Editar Tema Visual',
        mensaje: t.confirm_msg_unsaved_theme || 'Tienes cambios sin guardar en tu documento actual. ¿Deseas guardarlos antes de abrir el tema para edición?',
        detalle: '[Guardar cambios] Guardará y abrirá el tema.\n[Descartar cambios] Abrirá el tema descartando cambios actuales.',
        tipo: 'warning',
        btnSaveText: t.confirm_btn_save || 'Guardar cambios',
        btnDiscardText: t.confirm_btn_discard || 'Descartar cambios',
        btnCancelText: t.confirm_btn_cancel || 'Cancelar'
      });

      if (accion === 'cancel') return;
      if (accion === 'save' && typeof ctx.guardarArchivo === 'function') {
        const guardado = await ctx.guardarArchivo();
        if (!guardado) return;
      }
    }

    try {
      const savedDraftPath = localStorage.getItem('md-theme-draft-path');
      const savedDraftText = localStorage.getItem('md-theme-draft-text');
      
      let mdText = '';
      let recovered = false;
      
      if (savedDraftPath === selectedThemePath && savedDraftText && typeof ctx.solicitarConfirmacionSistema === 'function') {
        const lang = appState.language || 'es';
        const t = translations[lang] || translations.es;
        const accion = await ctx.solicitarConfirmacionSistema({
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
      
      if (!mdText && inv) {
        mdText = await inv('leer_tema', { filePath: selectedThemePath });
      }
      
      // Cargar en el editor
      if (DOM.editor) {
        DOM.editor.value = mdText;
      }
      
      // Obtener el nombre del tema
      const sep = selectedThemePath.includes('/') ? '/' : '\\';
      const parts = selectedThemePath.split(sep);
      const themeFileName = parts[parts.length - 1];
      
      // Actualizar estado del archivo abierto
      appState.filePath = selectedThemePath;
      appState.fileName = themeFileName;
      
      // Si se recuperó un borrador, se marca como no guardado
      if (typeof ctx.setSavedState === 'function') {
        ctx.setSavedState(!recovered);
      }
      
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
      
      // Cerrar el modal de configuración de apariencia
      if (DOM.modalConfig) {
        DOM.modalConfig.classList.remove('active');
      }
      
      if (typeof ctx.alertNotification === 'function') {
        ctx.alertNotification('Tema cargado en el editor. Se ha abierto el Theme Playground.', 'success');
      }
      
      // Forzar mostrar el Playground
      actualizarEstadoThemePlayground();
      
    } catch (err) {
      console.error('Error al editar el tema:', err);
      if (typeof ctx.alertNotification === 'function') {
        ctx.alertNotification('No se pudo cargar el tema para edición: ' + err, 'error');
      }
    }
  });

  // 2. Botón de cerrar visualizador
  if (btnClosePlayground) {
    btnClosePlayground.addEventListener('click', async () => {
      playgroundBox.classList.remove('active');
      playgroundBox.style.height = '';
      await refrescarListaTemas();
    });
  }

  // 3. Arrastre de la ventana flotante (Mousedown, Mousemove, Mouseup)
  if (dragHandle) {
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
  }

  // 4. Redimensionado de la ventana flotante (Escalado manual)
  if (resizeHandle) {
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
      
      const maxAllowedWidth = Math.max(600, (window.innerWidth || 1200) - 60);
      const maxAllowedHeight = Math.max(700, (window.innerHeight || 800) - 60);
      const newWidth = Math.max(340, Math.min(maxAllowedWidth, startWidth + dx));
      const newHeight = Math.max(450, Math.min(maxAllowedHeight, startHeight + dy));
      
      playgroundBox.style.width = `${newWidth}px`;
      playgroundBox.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
      }
    });
  }

  // 5. Botón de aplicar tema globalmente
  if (btnApplyThemeGlobal) {
    btnApplyThemeGlobal.addEventListener('click', async () => {
      if (appState.filePath && appState.filePath.includes('themes')) {
        if (!appState.isSaved && typeof ctx.guardarArchivo === 'function') {
          const guardado = await ctx.guardarArchivo();
          if (!guardado) return;
        }
        await cargarYAplicarTema(appState.filePath);
        if (typeof ctx.alertNotification === 'function') {
          ctx.alertNotification('¡Tema aplicado globalmente al sistema!', 'success');
        }
      }
    });
  }

  // 6. Listener del editor para foco contextual
  if (DOM.editor) {
    DOM.editor.addEventListener('keyup', () => {
      actualizarFocoContextualPlayground();
    });

    DOM.editor.addEventListener('click', () => {
      actualizarFocoContextualPlayground();
    });
  }

  // 7. Inspector Bidireccional: Al hacer clic en cualquier muestra del Playground,
  // navega automáticamente a la variable en el editor y abre el Selector de Color.
  const playgroundBody = playgroundBox.querySelector('.playground-body');
  if (playgroundBody) {
    playgroundBody.addEventListener('click', (e) => {
      const specimenEl = e.target.closest('[data-theme-var]');
      if (!specimenEl) return;

      const varName = specimenEl.getAttribute('data-theme-var');
      if (!varName) return;

      if (!DOM.editor) return;
      const editorText = DOM.editor.value;
      const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const varRegex = new RegExp(`\\*\\*${escapedVar}\\*\\*:\\s*([^\\r\\n]+)`, 'i');
      const match = varRegex.exec(editorText);

      if (match) {
        const fullMatch = match[0];
        const colorVal = match[1].trim();
        const colorValIndexInMatch = fullMatch.lastIndexOf(colorVal);
        const colorStart = match.index + colorValIndexInMatch;
        let colorEnd = colorStart + colorVal.length;

        // Foco y selección en el editor de la cadena de color
        DOM.editor.focus();
        DOM.editor.setSelectionRange(colorStart, colorEnd);

        // Desplazamiento del scroll para centrar la línea visualizada
        const linesBefore = editorText.substring(0, colorStart).split('\n');
        const lineIndex = linesBefore.length - 1;
        const approxLineHeight = 22;
        DOM.editor.scrollTop = Math.max(0, (lineIndex * approxLineHeight) - (DOM.editor.clientHeight / 2));

        // Pulso visual reactivo en la muestra pulsada
        const prevGlow = playgroundBox.querySelectorAll('.playground-pulse-bg, .playground-pulse-border, .playground-pulse-text, .playground-highlight-pulse');
        prevGlow.forEach(el => el.classList.remove('playground-pulse-bg', 'playground-pulse-border', 'playground-pulse-text', 'playground-highlight-pulse'));

        let pulseClass = 'playground-pulse-bg';
        if (varName.startsWith('border-')) pulseClass = 'playground-pulse-border';
        else if (varName.startsWith('text-')) pulseClass = 'playground-pulse-text';
        void specimenEl.offsetWidth;
        specimenEl.classList.add(pulseClass);

        // Apertura inmediata del Selector de Color
        abrirColorPicker(colorVal, (nuevoColor) => {
          DOM.editor.setRangeText(nuevoColor, colorStart, colorEnd, 'select');
          DOM.editor.dispatchEvent(new Event('input', { bubbles: true }));
          if (typeof ctx.setSavedState === 'function') {
            ctx.setSavedState(false);
          }
          refrescarPlaygroundLocal();
          colorEnd = colorStart + nuevoColor.length;
          DOM.editor.setSelectionRange(colorStart, colorEnd);
        });
      }
    });
  }
}

// Verifica si estamos editando un tema y muestra/oculta el Playground
export function actualizarEstadoThemePlayground() {
  const playgroundBox = document.getElementById('modal-theme-playground');
  if (!playgroundBox) return;

  const appState = getAppState();
  if (appState.filePath && appState.filePath.includes('themes')) {
    playgroundBox.classList.add('active');
    refrescarPlaygroundLocal();
  } else {
    playgroundBox.classList.remove('active');
  }
}

// Inteligencia de foco: Resalta el elemento en la ventana flotante según la línea del cursor con micro-glow animado de 1s
export function actualizarFocoContextualPlayground() {
  const playgroundBox = document.getElementById('modal-theme-playground');
  if (!playgroundBox || !playgroundBox.classList.contains('active')) return;

  const DOM = getDOM();
  if (!DOM.editor) return;
  const textarea = DOM.editor;
  const text = textarea.value;
  const cursorPosition = textarea.selectionStart;
  
  // Encontrar la línea actual
  const linesBefore = text.substring(0, cursorPosition).split('\n');
  const currentLineIndex = linesBefore.length - 1;
  const lines = text.split('\n');
  const currentLineText = lines[currentLineIndex] || '';

  // Limpiar micro-glows y pulsos previos
  const prevGlow = playgroundBox.querySelectorAll('.playground-pulse-bg, .playground-pulse-border, .playground-pulse-text, .playground-highlight-pulse');
  prevGlow.forEach(el => el.classList.remove('playground-pulse-bg', 'playground-pulse-border', 'playground-pulse-text', 'playground-highlight-pulse'));

  // Buscar coincidencia de variable en la línea
  const propRegex = /\*\*([a-zA-Z0-9-]+)\*\*:\s*([^\r\n]*)/i;
  const match = currentLineText.match(propRegex);
  if (match) {
    const variableName = match[1].toLowerCase().trim();
    
    // Mapear a muestra específica por data-theme-var o por mapeos contextuales
    let targetEl = playgroundBox.querySelector(`[data-theme-var="${variableName}"]`);

    if (!targetEl) {
      if (variableName.includes('badge-int')) targetEl = document.getElementById('specimen-badge-int');
      else if (variableName.includes('badge-float')) targetEl = document.getElementById('specimen-badge-float');
      else if (variableName.includes('badge-bool')) targetEl = document.getElementById('specimen-badge-bool');
      else if (variableName.includes('badge-str')) targetEl = document.getElementById('specimen-badge-str');
      else if (variableName === 'border-subtle') targetEl = document.getElementById('specimen-editor-box');
      else if (variableName === 'accent-color') targetEl = document.getElementById('specimen-accent-btn');
      else if (variableName === 'bg-toolbar') targetEl = document.getElementById('specimen-toolbar-mock');
      else if (variableName === 'bg-modal') targetEl = document.getElementById('specimen-editor-box');
    }

    if (targetEl) {
      let pulseClass = 'playground-pulse-bg';
      if (variableName.startsWith('border-')) {
        pulseClass = 'playground-pulse-border';
      } else if (variableName.startsWith('text-')) {
        pulseClass = 'playground-pulse-text';
      }

      void targetEl.offsetWidth; // Forzar reinicio de animación
      targetEl.classList.add(pulseClass);
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

// Refresca los estilos de forma local ÚNICAMENTE para la ventana flotante
export function refrescarPlaygroundLocal() {
  const playgroundBox = document.getElementById('modal-theme-playground');
  if (!playgroundBox || !playgroundBox.classList.contains('active')) return;

  const DOM = getDOM();
  const appState = getAppState();

  // Salvar borrador temporal en localStorage como medida de seguridad contra pérdidas
  if (DOM.editor && appState.filePath && appState.filePath.includes('themes')) {
    localStorage.setItem('md-theme-draft-text', DOM.editor.value);
    localStorage.setItem('md-theme-draft-path', appState.filePath);
  }

  try {
    if (!DOM.editor) return;
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
