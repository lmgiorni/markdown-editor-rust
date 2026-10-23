// ==========================================================================
// MÓDULO DE MODO ESTRUCTURADO Y VISOR EN ÁRBOL JERÁRQUICO (TAURI v2)
// ==========================================================================

import { buildTreeHTML, convertJSONToXML, convertJSONToYAML } from '../utils/data-parser.js';
import { translations } from '../utils/i18n.js';

let ctx = {
  DOM: {},
  appState: {},
  invoke: null,
  alertNotification: null,
  renderMarkdown: null
};

export function initStructuredEditor(options = {}) {
  ctx = { ...ctx, ...options };
  inicializarModoEstructurado();
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
    structuredHeaderBar: (ctx.DOM && ctx.DOM.structuredHeaderBar) || document.getElementById('structured-header-bar'),
    previewContainer: (ctx.DOM && ctx.DOM.previewContainer) || document.getElementById('preview-container'),
    preview: (ctx.DOM && ctx.DOM.preview) || document.getElementById('preview'),
    editor: (ctx.DOM && ctx.DOM.editor) || document.getElementById('editor')
  };
}

function getAppState() {
  return ctx.appState || window.appState || {};
}

export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let ultimoArbolParseado = null;

export function inicializarModoEstructurado() {
  const btnToMd = document.getElementById('btn-tree-to-md');
  const btnTabTree = document.getElementById('btn-tree-tab-tree');
  const btnTabJson = document.getElementById('btn-tree-tab-json');
  const btnTabXml = document.getElementById('btn-tree-tab-xml');
  const btnTabYaml = document.getElementById('btn-tree-tab-yaml');
  const btnExportActive = document.getElementById('btn-tree-export-active');
  const DOM = getDOM();
  const appState = getAppState();
  const inv = getInvoke();

  if (btnToMd) {
    btnToMd.addEventListener('click', () => {
      appState.structuredModeActive = false;
      if (DOM.structuredHeaderBar) DOM.structuredHeaderBar.style.display = 'none';
      if (DOM.previewContainer) DOM.previewContainer.classList.remove('structured-layout');
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
    });
  }

  if (btnTabTree) {
    btnTabTree.addEventListener('click', () => {
      appState.structuredActiveTab = 'tree';
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
    });
  }

  if (btnTabJson) {
    btnTabJson.addEventListener('click', () => {
      appState.structuredActiveTab = 'json';
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
    });
  }

  if (btnTabXml) {
    btnTabXml.addEventListener('click', () => {
      appState.structuredActiveTab = 'xml';
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
    });
  }

  if (btnTabYaml) {
    btnTabYaml.addEventListener('click', () => {
      appState.structuredActiveTab = 'yaml';
      if (typeof ctx.renderMarkdown === 'function') {
        ctx.renderMarkdown();
      }
    });
  }

  if (btnExportActive) {
    btnExportActive.addEventListener('click', () => {
      const lang = appState.language || 'es';
      const t = translations[lang] || translations.es;
      if (!ultimoArbolParseado || appState.structuredActiveTab === 'tree') return;
      if (!inv) {
        if (typeof ctx.alertNotification === 'function') {
          ctx.alertNotification(t.struct_web_export_unavailable || 'Exportación no disponible', 'error');
        }
        return;
      }

      const activeTab = appState.structuredActiveTab;
      if (activeTab === 'json') {
        const jsonStr = JSON.stringify(ultimoArbolParseado, null, 2).replace(/\\"/g, '"');
        inv('exportar_archivo', {
          defaultName: `${(appState.fileName || 'archivo').replace(/\s+/g, '_')}.json`,
          content: jsonStr,
          extension: 'json',
          filterName: 'JSON',
          directoryType: 'templates'
        }).then(res => {
          if (res && typeof ctx.alertNotification === 'function') {
            ctx.alertNotification('JSON ' + (t.struct_export_success || 'guardado en: ') + res, 'success');
          }
        }).catch(err => {
          if (typeof ctx.alertNotification === 'function') {
            ctx.alertNotification((t.struct_export_error || 'Error al guardar ') + 'JSON: ' + err, 'error');
          }
        });
      } else if (activeTab === 'xml') {
        const xmlStr = convertJSONToXML(ultimoArbolParseado, appState.fileName || 'documento');
        inv('exportar_archivo', {
          defaultName: `${(appState.fileName || 'archivo').replace(/\s+/g, '_')}.xml`,
          content: xmlStr,
          extension: 'xml',
          filterName: 'XML',
          directoryType: 'templates'
        }).then(res => {
          if (res && typeof ctx.alertNotification === 'function') {
            ctx.alertNotification('XML ' + (t.struct_export_success || 'guardado en: ') + res, 'success');
          }
        }).catch(err => {
          if (typeof ctx.alertNotification === 'function') {
            ctx.alertNotification((t.struct_export_error || 'Error al guardar ') + 'XML: ' + err, 'error');
          }
        });
      } else if (activeTab === 'yaml') {
        const yamlStr = convertJSONToYAML(ultimoArbolParseado);
        inv('exportar_archivo', {
          defaultName: `${(appState.fileName || 'archivo').replace(/\s+/g, '_')}.yaml`,
          content: yamlStr,
          extension: 'yaml',
          filterName: 'YAML',
          directoryType: 'templates'
        }).then(res => {
          if (res && typeof ctx.alertNotification === 'function') {
            ctx.alertNotification('YAML ' + (t.struct_export_success || 'guardado en: ') + res, 'success');
          }
        }).catch(err => {
          if (typeof ctx.alertNotification === 'function') {
            ctx.alertNotification((t.struct_export_error || 'Error al guardar ') + 'YAML: ' + err, 'error');
          }
        });
      }
    });
  }
}

export function renderStructuredTreeVisual(obj) {
  ultimoArbolParseado = obj;
  const appState = getAppState();
  const DOM = getDOM();
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
  const btnExportActive = document.getElementById('btn-tree-export-active');

  if (badgeActive) badgeActive.textContent = t.struct_badge_active || t.struct_active_badge || 'Modo Estructurado';
  if (btnToMd) {
    btnToMd.textContent = t.struct_btn_exit || 'Salir';
    btnToMd.setAttribute('title', t.struct_btn_read_mode_title || 'Volver a lectura Markdown');
  }
  if (btnTabTree) {
    btnTabTree.innerHTML = `📂 ${t.struct_btn_hierarchy || 'Jerarquía'}`;
    btnTabTree.setAttribute('title', t.struct_btn_tree_tab_title || 'Vista en árbol jerárquico');
  }
  if (btnTabJson) {
    btnTabJson.setAttribute('title', t.struct_btn_json_tab_title || 'Vista de código JSON');
  }
  if (btnTabXml) {
    btnTabXml.setAttribute('title', t.struct_btn_xml_tab_title || 'Vista de código XML');
  }
  if (btnTabYaml) {
    btnTabYaml.setAttribute('title', t.struct_btn_yaml_tab_title || 'Vista de código YAML');
  }

  const labelTreeSave = document.getElementById('label-tree-save');
  if (btnExportActive) {
    if (isTree) {
      btnExportActive.disabled = true;
      btnExportActive.classList.add('disabled');
      btnExportActive.setAttribute('title', t.struct_save_disabled_title || 'Selecciona un formato (JSON, XML o YAML) para guardar');
      if (labelTreeSave) labelTreeSave.textContent = t.struct_btn_save || 'Guardar';
    } else {
      btnExportActive.disabled = false;
      btnExportActive.classList.remove('disabled');
      let formatTitle = '';
      if (isJson) formatTitle = t.struct_btn_json_export_title || 'Guardar directamente como archivo .json en tu ordenador';
      else if (isXml) formatTitle = t.struct_btn_xml_export_title || 'Guardar directamente como archivo .xml en tu ordenador';
      else if (isYaml) formatTitle = t.struct_btn_yaml_export_title || 'Guardar directamente como archivo .yaml en tu ordenador';
      btnExportActive.setAttribute('title', formatTitle);
    }
  }

  // 4. Renderizar contenido de datos
  let contentHtml = '';
  if (isTree) {
    contentHtml = `<div class="tree-root-container">${buildTreeHTML(obj)}</div>`;
  } else if (isJson) {
    const jsonStr = JSON.stringify(obj, null, 2).replace(/\\"/g, '"');
    contentHtml = `<pre class="structured-code-preview"><code>${escapeHTML(jsonStr)}</code></pre>`;
  } else if (isXml) {
    const xmlStr = convertJSONToXML(obj, appState.fileName || 'documento');
    contentHtml = `<pre class="structured-code-preview"><code>${escapeHTML(xmlStr)}</code></pre>`;
  } else if (isYaml) {
    const yamlStr = convertJSONToYAML(obj);
    contentHtml = `<pre class="structured-code-preview"><code>${escapeHTML(yamlStr)}</code></pre>`;
  }

  if (DOM.preview) {
    DOM.preview.innerHTML = contentHtml;
  }
}
