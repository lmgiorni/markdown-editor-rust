# Especificación Técnica: Sistema de Localización (i18n)

Este documento detalla la arquitectura, el diseño y la implementación técnica del motor de localización (i18n) multiidioma en la aplicación **Summa Scriptura**.

---

## 1. Filosofía de Diseño

El sistema de localización de Summa Scriptura fue diseñado bajo las siguientes premisas:
*   **Ligereza e Independencia**: Evitar dependencias externas o librerías pesadas para mantener la aplicación rápida y autónoma.
*   **Sin Parpadeos (Zero-Flicker)**: El cambio de idioma se realiza en tiempo de ejecución (caliente) en pocos milisegundos, actualizando los elementos del DOM de forma selectiva.
*   **Persistencia**: El idioma seleccionado se conserva entre sesiones del usuario mediante almacenamiento local.
*   **Traducciones Específicas**: Además de Español e Inglés, incluye Latín (*Latine*) para adecuarse al contexto histórico y eclesiástico del proyecto.

---

## 2. Componentes del Sistema

El motor de localización se compone de tres piezas principales integradas:

```
[i18n.js (Diccionario)] ──> [main.js (Estado y Lógica DOM)] ──> [index.html (Configuración)]
                                       │
                                       └──> [Vista de Lectura / Modo Estructurado / Sidebar]
```

### 2.1. El Diccionario de Traducción (`i18n.js`)
Ubicación: `dist/utils/i18n.js`

Exporta una constante modular `translations` que contiene sub-objetos para cada idioma (`es`, `en`, `la`). Cada sub-objeto comparte las mismas claves identificadoras:

*   **Barra de Herramientas**: Tooltips explicativos de los botones de control.
*   **Biblioteca de Componentes**: Etiquetas de pestañas, placeholders, estados de carga y descripciones/categorías por defecto.
*   **Atajos Markdown**: Los nombres de los 24 atajos estructurados organizados por ventanas flotantes.
*   **Modo Estructurado**: Botones superiores de la vista de árbol, leyendas de exportación y avisos del sistema.
*   **Menú Contextual**: Elementos interactivos del menú secundario del visor.
*   **Barra de Estado**: Indicadores dinámicos de archivo guardado/modificado.

### 2.2. La Interfaz de Selección (`index.html`)
Ubicación: `dist/index.html`

El modal de configuración (`#modal-config`) contiene un selector nativo vinculable:
```html
<div class="config-row">
  <label for="select-language">Idioma de la Interfaz</label>
  <select id="select-language" class="config-select">
    <option value="es">Español</option>
    <option value="en">English</option>
    <option value="la">Latine (Latín)</option>
  </select>
</div>
```

---

## 3. Flujo Lógico y Ciclo de Vida

El ciclo de vida del idioma se gestiona mediante eventos y sincronización de estado:

### 3.1. Inicialización en el Arranque
1. Al cargar la aplicación, se consulta el almacén local del navegador:
   ```javascript
   appState.language = localStorage.getItem('md-language') || 'es';
   ```
2. Se sincroniza el elemento selector visual para que coincida con el idioma recuperado.
3. Se invoca a la función central `actualizarTextosInterfaz(appState.language)` para aplicar los textos correctos antes de mostrar la UI.

### 3.2. Cambio de Idioma (En Caliente)
Cuando el usuario cambia de idioma en el desplegable de configuración:
1. Se intercepta el evento de cambio (`change`).
2. Se actualiza el estado global (`appState.language`).
3. Se persiste el nuevo valor en la clave `md-language` de `localStorage`.
4. Se vuelve a ejecutar `actualizarTextosInterfaz(lang)` con el nuevo código de idioma.

---

## 4. El Algoritmo de Traducción del DOM

La función central `actualizarTextosInterfaz(lang)` realiza actualizaciones del árbol DOM mediante selectores específicos:

```javascript
function actualizarTextosInterfaz(lang) {
  const t = translations[lang];
  if (!t) return;

  // 1. Tooltips de la Barra de Herramientas
  const setTooltip = (el, text) => { if (el) el.setAttribute('title', text); };
  setTooltip(DOM.btnNew, t.title_new);
  setTooltip(DOM.btnSave, t.title_save);
  // ...

  // 2. Textos de Contenido Fijo
  const setSpanText = (el, text) => { if (el) { const span = el.querySelector('span'); if (span) span.textContent = text; } };
  setSpanText(DOM.optExportHtml, t.text_export_html);
  // ...

  // 3. Biblioteca de Componentes (Pestañas y Placeholders)
  if (DOM.tabModules) DOM.tabModules.textContent = t.lib_tab_modules;
  if (DOM.tabTemplates) DOM.tabTemplates.textContent = t.lib_tab_templates;
  if (DOM.sidebarSearch) DOM.sidebarSearch.setAttribute('placeholder', ...);

  // 4. Modales de Atajos y Mensajes de Ayuda
  // Actualiza los títulos y los ejemplos en los pies de página de los modales flotantes.

  // 5. Barra de Estado
  actualizarBarraDeEstadoTextos();

  // 6. Recarga de Contenido Dinámico Abierto
  if (DOM.componentsSidebar && !DOM.componentsSidebar.classList.contains('collapsed')) {
    cargarComponentesSidebar(); // Vuelve a cargar y traducir los módulos/plantillas locales
  }

  // 7. Forzar Repintado del Visor
  renderMarkdown(); // Asegura la traducción inmediata del Modo Estructurado y Menús
}
```

---

## 5. Mantenimiento y Extensión

Para añadir soporte a un nuevo idioma (por ejemplo, *italiano*):

1. **Añadir el diccionario**: Abra `dist/utils/i18n.js` y cree un bloque con la clave `it` dentro de `translations`, copiando la misma estructura de claves que `es`.
2. **Añadir la opción en el HTML**: Abra `dist/index.html` y añada el `<option>` al selector:
   ```html
   <option value="it">Italiano</option>
   ```
3. El motor de JavaScript asociará de forma automática el nuevo idioma al cambiar la opción en la configuración.
