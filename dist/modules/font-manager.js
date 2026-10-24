/**
 * font-manager.js
 * Gestor Centralizado de Tipografías Multiplataforma para Summa Scriptura
 */

export class CustomFontManager {
  constructor() {
    this.localFonts = new Map();
    this.customStyles = new Map();

    // Catálogo Maestro de Fuentes por Rol
    this.catalogo = {
      editor: [
        { name: 'Consolas', label: 'Consolas (Sistema)', family: "'Consolas', monospace" },
        { name: 'Fira Code', label: 'Fira Code', family: "'Fira Code', monospace" },
        { name: 'Courier New', label: 'Courier New', family: "'Courier New', monospace" },
        { name: 'VT323', label: 'VT323 (Terminal Retro)', family: "'VT323', monospace" },
        { name: 'Glass_TTY_VT220', label: 'Glass TTY VT220 (Fósforo)', family: "'Glass_TTY_VT220', monospace" },
        { name: 'Share Tech Mono', label: 'Share Tech Mono', family: "'Share Tech Mono', monospace" },
        { name: 'Fixedsys Excelsior 3.01', label: 'Fixedsys Excelsior 3.01', family: "'Fixedsys Excelsior 3.01', monospace" }
      ],
      reader: [
        { name: 'Georgia', label: 'Georgia (Periódico)', family: "'Georgia', serif" },
        { name: 'Merriweather', label: 'Merriweather (Elegante)', family: "'Merriweather', Georgia, serif" },
        { name: 'Iosevka', label: 'Iosevka (Compacta)', family: "'Iosevka', monospace" },
        { name: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible (Accesible)', family: "'Atkinson Hyperlegible', sans-serif" },
        { name: 'IM FELL French Canon', label: 'IM FELL French Canon (Histórica)', family: "'IM FELL French Canon', Georgia, serif" },
        { name: 'Alegreya', label: 'Alegreya (Literaria)', family: "'Alegreya', Georgia, serif" },
        { name: 'EB Garamond', label: 'EB Garamond (Clásica)', family: "'EB Garamond', Georgia, serif" },
        { name: 'Special Elite', label: 'Special Elite (Máquina de Escribir)', family: "'Special Elite', cursive, monospace" }
      ],
      structured: [
        { name: 'Fira Code', label: 'Fira Code (Moderna)', family: "'Fira Code', monospace" },
        { name: 'Iosevka', label: 'Iosevka (Compacta)', family: "'Iosevka', monospace" },
        { name: 'Consolas', label: 'Consolas (Sistema)', family: "'Consolas', monospace" },
        { name: 'Share Tech Mono', label: 'Share Tech Mono', family: "'Share Tech Mono', monospace" },
        { name: 'VT323', label: 'VT323 (Terminal)', family: "'VT323', monospace" },
        { name: 'Fixedsys Excelsior 3.01', label: 'Fixedsys Excelsior 3.01', family: "'Fixedsys Excelsior 3.01', monospace" }
      ]
    };

    // Diccionario plano para resolución rápida de familias
    this.tipografiasMap = {};
    Object.values(this.catalogo).forEach(lista => {
      lista.forEach(item => {
        this.tipografiasMap[item.name] = item.family;
      });
    });

    // Fallbacks de seguridad si el usuario seleccionara una fuente no disponible
    this.fallbacks = {
      editor: "'Fira Code', 'Consolas', monospace",
      reader: "'Georgia', 'Merriweather', serif",
      structured: "'Fira Code', 'Consolas', monospace"
    };
  }

  /**
   * Obtiene la regla font-family completa para una fuente y vista
   */
  getFontFamily(fontName, viewType = 'editor') {
    if (this.localFonts.has(fontName)) {
      return `'${fontName}', ${this.fallbacks[viewType] || 'monospace'}`;
    }
    return this.tipografiasMap[fontName] || this.fallbacks[viewType] || 'monospace';
  }

  /**
   * Obtiene las opciones de catálogo disponibles para una vista
   */
  getAvailableFonts(viewType = 'editor') {
    return this.catalogo[viewType] || [];
  }

  /**
   * Permite registrar dinámicamente una nueva fuente local en tiempo de ejecución
   */
  addLocalFont(name, path, viewType = 'editor') {
    this.localFonts.set(name, path);
    if (typeof document !== 'undefined') {
      const styleId = `custom-font-${name.replace(/\s+/g, '-').toLowerCase()}`;
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        @font-face {
          font-family: '${name}';
          src: url('${path}') format('truetype');
          font-display: swap;
        }
      `;
    }
  }
}

export const fontManager = new CustomFontManager();
