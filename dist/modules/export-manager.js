// ==========================================================================
// MÓDULO DE EXPORTACIONES EDITORIALES Y PLANTILLAS DINÁMICAS (TAURI v2)
// ==========================================================================

import { exportarDocumentoAHTML, exportarDocumentoAPDF, exportarDocumentoAEPUB } from '../utils/export-service.js';
import { escanearVariablesDePlantilla } from '../utils/template-engine.js';

let ctx = {
  DOM: {},
  appState: {},
  invoke: null,
  alertNotification: null,
  renderMarkdown: null,
  setSavedState: null,
  getHistorial: null
};

export function initExportManager(options = {}) {
  ctx = { ...ctx, ...options };
  inicializarExportacionesYTemplates();
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
  return ctx.DOM || {};
}

function getAppState() {
  return ctx.appState || window.appState || {};
}

function getHistorial() {
  if (typeof ctx.getHistorial === 'function') return ctx.getHistorial();
  return ctx.historial || null;
}

function alert(msg, type = 'info') {
  if (typeof ctx.alertNotification === 'function') {
    ctx.alertNotification(msg, type);
  }
}

// --------------------------------------------------------------------------
// 1. FUNCIONES PRINCIPALES DE EXPORTACIÓN
// --------------------------------------------------------------------------

export async function exportarAHTML() {
  const DOM = getDOM();
  const appState = getAppState();
  await exportarDocumentoAHTML(
    appState.fileName,
    DOM.editor ? DOM.editor.value : '',
    appState.readerFont,
    getInvoke(),
    alert
  );
}

export function exportarAPDF() {
  const DOM = getDOM();
  const appState = getAppState();
  exportarDocumentoAPDF(
    appState.fileName,
    DOM.editor ? DOM.editor.value : '',
    appState.readerFont,
    alert
  );
}

export async function exportarAEPUB() {
  const DOM = getDOM();
  const appState = getAppState();
  await exportarDocumentoAEPUB(
    appState.fileName,
    DOM.editor ? DOM.editor.value : '',
    appState.readerFont,
    getInvoke(),
    alert,
    appState.filePath
  );
}

// --------------------------------------------------------------------------
// 2. LISTENERS DE INTERFAZ DEL DESPLEGABLE Y PLANTILLAS
// --------------------------------------------------------------------------

export function inicializarExportacionesYTemplates() {
  const DOM = getDOM();
  const appState = getAppState();
  const inv = getInvoke();

  if (DOM.btnExport && DOM.exportDropdown) {
    DOM.btnExport.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.exportDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      DOM.exportDropdown.classList.remove('show');
    });
  }

  if (DOM.optExportHtml) {
    DOM.optExportHtml.addEventListener('click', () => {
      if (DOM.exportDropdown) DOM.exportDropdown.classList.remove('show');
      exportarAHTML();
    });
  }

  if (DOM.optExportPdf) {
    DOM.optExportPdf.addEventListener('click', () => {
      if (DOM.exportDropdown) DOM.exportDropdown.classList.remove('show');
      exportarAPDF();
    });
  }

  if (DOM.optExportEpub) {
    DOM.optExportEpub.addEventListener('click', () => {
      if (DOM.exportDropdown) DOM.exportDropdown.classList.remove('show');
      exportarAEPUB();
    });
  }

  // Guardar Plantilla
  if (DOM.optSaveTemplate) {
    DOM.optSaveTemplate.addEventListener('click', async () => {
      if (DOM.exportDropdown) DOM.exportDropdown.classList.remove('show');
      const content = DOM.editor ? DOM.editor.value : '';
      if (content.trim() === '') {
        alert('Escribe algo en tu editor antes de guardarlo como plantilla');
        return;
      }

      if (inv) {
        const defaultSaveName = (appState.fileName || 'plantilla').replace(/\s+/g, '_') + '.md';
        const fileData = await inv('guardar_como', {
          defaultName: defaultSaveName,
          content: content,
          directoryType: 'templates'
        });
        if (fileData) {
          alert('Plantilla guardada con éxito');
        }
      } else {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (appState.fileName || 'plantilla').replace(/\s+/g, '_') + '.md';
        a.click();
        URL.revokeObjectURL(url);
        alert('Plantilla descargada con éxito');
      }
    });
  }

  // Listeners de Cierre de Modales de Variables
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

  if (DOM.btnApplyVars) {
    DOM.btnApplyVars.addEventListener('click', () => {
      let replacedText = appState.currentTemplateText || '';
      if (DOM.formTemplateVars) {
        const inputs = DOM.formTemplateVars.querySelectorAll('.config-input-text');
        inputs.forEach(input => {
          const varName = input.getAttribute('data-var');
          const varVal = input.value;
          const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
          replacedText = replacedText.replace(regex, varVal);
        });
      }

      const hist = getHistorial();
      if (hist) {
        hist.registrarCambioAntesDeFormato();
      }

      if (DOM.editor) {
        DOM.editor.value = replacedText;
      }
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
      if (typeof ctx.setSavedState === 'function') {
        ctx.setSavedState(false);
      }
      if (DOM.modalTemplateVars) {
        DOM.modalTemplateVars.classList.remove('active');
      }
      alert('Plantilla inyectada con éxito');

      if (hist) {
        hist.registrarCambioDespuesDeFormato();
      }
    });
  }
}

// --------------------------------------------------------------------------
// 3. PROCESAMIENTO E INYECCIÓN DE PLANTILLAS
// --------------------------------------------------------------------------

export function procesarCargaDePlantillaText(text) {
  const DOM = getDOM();
  const appState = getAppState();
  const hist = getHistorial();
  const variables = escanearVariablesDePlantilla(text);

  if (variables.length > 0) {
    appState.currentTemplateText = text;
    if (DOM.formTemplateVars) {
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
    }

    if (DOM.modalTemplateVars) {
      DOM.modalTemplateVars.classList.add('active');
    }
  } else {
    if (hist) {
      hist.registrarCambioAntesDeFormato();
    }
    if (DOM.editor) {
      DOM.editor.value = text;
    }
    if (typeof ctx.renderMarkdown === 'function') {
      ctx.renderMarkdown();
    }
    if (typeof ctx.setSavedState === 'function') {
      ctx.setSavedState(false);
    }
    alert('Plantilla cargada con éxito');
    if (hist) {
      hist.registrarCambioDespuesDeFormato();
    }
  }
}
