/**
 * export-service.js
 * Servicio Premium de Exportación e Impresión (Fase 11)
 */

// 1. COMPILAR Y EXPORTAR HTML AUTÓNOMO CON CSS INTEGRADO
export async function exportarDocumentoAHTML(fileName, markdownText, readerFont, invokeTauri, notify) {
  try {
    const response = await fetch('style.css');
    const cssContent = await response.text();
    
    // Validar si marked está disponible en el entorno global
    const bodyHtml = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText;
    
    const htmlCompleto = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Fira+Code:wght@400;500&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    /* ESTILOS PREMIUM BASE AUTÓNOMOS */
    ${cssContent}
    
    body {
      background-color: var(--bg-reader, #0b0b0e) !important;
      color: var(--text-reader, #e2e8f0) !important;
      padding: 60px 20px !important;
      font-family: '${readerFont}', 'Inter', sans-serif !important;
      display: block !important;
      overflow-y: auto !important;
      height: auto !important;
    }
    .markdown-body {
      max-width: 800px;
      margin: 0 auto;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
  </style>
</head>
<body>
  <div class="markdown-body">
    ${bodyHtml}
  </div>
</body>
</html>`;

    if (invokeTauri) {
      const defaultName = fileName.replace(/\s+/g, '_') + '.html';
      const pathGuardado = await invokeTauri('exportar_html', { defaultName, content: htmlCompleto });
      if (pathGuardado) {
        notify('HTML autónomo exportado con éxito en: ' + pathGuardado);
      }
    } else {
      // Fallback para descarga directa en navegador
      const blob = new Blob([htmlCompleto], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\s+/g, '_') + '.html';
      a.click();
      URL.revokeObjectURL(url);
      notify('HTML autónomo descargado con éxito');
    }
  } catch (error) {
    console.error('Error al exportar a HTML:', error);
    notify('Error al exportar a HTML');
  }
}

// 2. DISPARAR DIÁLOGO DE IMPRESIÓN NATIVO PARA PDF
export async function exportarDocumentoAPDF(fileName, markdownText, readerFont, notify) {
  try {
    const response = await fetch('style.css');
    const cssContent = await response.text();
    
    // Obtener los estilos del tema activo actual para aplicarlos a la impresión
    const computedStyle = getComputedStyle(document.documentElement);
    const extractedBg = computedStyle.getPropertyValue('--bg-app').trim() || '#ffffff';
    
    // Determinar si el tema es oscuro para realizar adaptaciones legibles en papel
    let isDark = false;
    if (extractedBg.startsWith('#')) {
      const hex = extractedBg.slice(1);
      let r = 255;
      if (hex.length === 3) {
        r = parseInt(hex[0], 16) * 17;
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
      }
      isDark = r < 130;
    } else if (extractedBg.includes('rgba') || extractedBg.includes('rgb')) {
      const match = extractedBg.match(/\d+/);
      if (match) {
        const r = parseInt(match[0]);
        isDark = r < 130;
      }
    } else {
      isDark = extractedBg.includes('dark') || extractedBg.includes('black');
    }
    
    // Extraer variables cromáticas del tema
    let accentColor = computedStyle.getPropertyValue('--accent').trim() || '#6366f1';
    let codeColor = computedStyle.getPropertyValue('--text-code-inline').trim() || '#be185d';
    let blockquoteBg = computedStyle.getPropertyValue('--bg-blockquote').trim() || 'rgba(99, 102, 241, 0.03)';
    let tableHeaderBg = computedStyle.getPropertyValue('--bg-table-header').trim() || 'rgba(0, 0, 0, 0.02)';
    let tableZebraBg = computedStyle.getPropertyValue('--bg-table-zebra').trim() || 'rgba(0, 0, 0, 0.01)';
    let borderSubtle = computedStyle.getPropertyValue('--border-subtle').trim() || 'rgba(0, 0, 0, 0.08)';
    
    // Si el tema es oscuro, adaptamos fondos a tonos muy claros para no gastar tinta y mantener el contraste
    if (isDark) {
      tableHeaderBg = 'rgba(0, 0, 0, 0.04)';
      tableZebraBg = 'rgba(0, 0, 0, 0.01)';
      blockquoteBg = 'rgba(99, 102, 241, 0.03)';
      borderSubtle = 'rgba(0, 0, 0, 0.08)';
      if (codeColor === '#f472b6' || codeColor.toLowerCase() === '#f472b6') {
        codeColor = '#be185d';
      }
    }
    
    const bodyHtml = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText;
    
    const htmlCompleto = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Impresión - ${fileName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Fira+Code:wght@400;500&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    ${cssContent}
    
    /* Adaptaciones de Tema para Impresión PDF */
    :root {
      --bg-app: #ffffff !important;
      --bg-panel: #ffffff !important;
      --bg-reader: #ffffff !important;
      --text-reader: #1e293b !important;
      --text-strong: #0f172a !important;
      --text-main: #1e293b !important;
      --text-muted: #64748b !important;
      --accent: ${accentColor} !important;
      --accent-color: ${accentColor} !important;
      --text-code-inline: ${codeColor} !important;
      --bg-code: #f8fafc !important;
      --bg-blockquote: ${blockquoteBg} !important;
      --bg-table-header: ${tableHeaderBg} !important;
      --bg-table-zebra: ${tableZebraBg} !important;
      --border-subtle: ${borderSubtle} !important;
    }
    
    body {
      background-color: #ffffff !important;
      color: #1e293b !important;
      padding: 40px !important;
      font-family: '${readerFont}', 'Inter', sans-serif !important;
    }
    .markdown-body {
      max-width: 800px;
      margin: 0 auto;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    @media print {
      body { padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="markdown-body">
    ${bodyHtml}
  </div>
  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlCompleto], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const printWin = window.open(url, 'Imprimir_PDF', 'width=800,height=600,top=100,left=100,resizable=yes,scrollbars=yes');
    if (!printWin) {
      window.print();
    } else {
      notify('Ventana de impresión abierta');
    }
  } catch (error) {
    console.error('Error al generar PDF:', error);
    window.print();
  }
}

// Auxiliar para asegurar que las etiquetas vacías cumplan estrictamente con XHTML
function purificarHTMLaXHTML(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/<hr\s*\/?>/gi, '<hr />')
    .replace(/<img([^>]+)>/gi, (match, attrs) => {
      if (attrs.trim().endsWith('/')) {
        return match;
      }
      return `<img${attrs} />`;
    });
}

// 3. EXPORTAR A LIBRO ELECTRÓNICO EPUB PREMIUM CON ADAPTACIÓN EINK O TEMA
export async function exportarDocumentoAEPUB(fileName, markdownText, readerFont, invokeTauri, notify) {
  if (!invokeTauri) {
    notify('La exportación a EPUB no está disponible en la web', 'error');
    return;
  }
  
  if (markdownText.trim() === '') {
    notify('El editor está vacío. Escribe algo antes de exportar a EPUB.', 'info');
    return;
  }
  
  try {
    let bodyHtmlRaw = '';
    if (typeof marked !== 'undefined') {
      bodyHtmlRaw = marked.parse(markdownText);
    } else {
      bodyHtmlRaw = markdownText.replace(/\n/g, '<br/>');
    }
    
    // Sanitización XHTML estricta para lectores estrictos
    const bodyHtml = purificarHTMLaXHTML(bodyHtmlRaw);
    
    // Preguntar al usuario por el estilo del EPUB mediante el modal premium
    const modalEpub = document.getElementById('modal-epub-export');
    const btnEink = document.getElementById('btn-epub-opt-eink');
    const btnTheme = document.getElementById('btn-epub-opt-theme');
    const btnCancel = document.getElementById('btn-epub-cancel');
    const closeBtn = modalEpub ? modalEpub.querySelector('.modal-close-btn') : null;
    
    if (!modalEpub || !btnEink || !btnTheme) {
      notify('El diálogo de exportación a EPUB no está disponible', 'error');
      return;
    }
    
    const optEink = await new Promise((resolve) => {
      const cleanup = (value) => {
        btnEink.removeEventListener('click', selectEink);
        btnTheme.removeEventListener('click', selectTheme);
        if (btnCancel) btnCancel.removeEventListener('click', selectCancel);
        if (closeBtn) closeBtn.removeEventListener('click', selectCancel);
        
        modalEpub.classList.remove('active');
        
        // Devolver el foco al editor para mantener el flujo fluido
        const editor = document.getElementById('editor');
        if (editor) editor.focus();
        
        resolve(value);
      };
      
      const selectEink = () => cleanup(true);
      const selectTheme = () => cleanup(false);
      const selectCancel = () => cleanup(null);
      
      btnEink.addEventListener('click', selectEink);
      btnTheme.addEventListener('click', selectTheme);
      if (btnCancel) btnCancel.addEventListener('click', selectCancel);
      if (closeBtn) closeBtn.addEventListener('click', selectCancel);
      
      modalEpub.classList.add('active');
      btnEink.focus();
    });
    
    if (optEink === null) {
      notify('Exportación a EPUB cancelada', 'info');
      return;
    }
    
    let bgColor = '#ffffff';
    let textColor = '#000000';
    let textStrongColor = '#000000';
    let accentColor = '#000000';
    let codeColor = '#be185d';
    let blockquoteBg = 'rgba(0,0,0,0.03)';
    let fontFamily = readerFont || 'Inter';
    
    if (!optEink) {
      // Extraer los colores calculados en caliente del tema activo actual
      const computedStyle = getComputedStyle(document.documentElement);
      const extractedBg = computedStyle.getPropertyValue('--bg-reader').trim();
      const extractedText = computedStyle.getPropertyValue('--text-reader').trim();
      const extractedStrong = computedStyle.getPropertyValue('--text-strong').trim();
      const extractedAccent = computedStyle.getPropertyValue('--accent').trim();
      const extractedCode = computedStyle.getPropertyValue('--text-code-inline').trim();
      const extractedBlockquoteBg = computedStyle.getPropertyValue('--bg-blockquote').trim();
      
      if (extractedBg) bgColor = extractedBg;
      if (extractedText) textColor = extractedText;
      if (extractedStrong) textStrongColor = extractedStrong;
      if (extractedAccent) accentColor = extractedAccent;
      if (extractedCode) codeColor = extractedCode;
      if (extractedBlockquoteBg) blockquoteBg = extractedBlockquoteBg;
    } else {
      // Para Eink forzamos negro absoluto en todos los elementos tipográficos
      textStrongColor = '#000000';
      accentColor = '#000000';
      codeColor = '#000000';
      blockquoteBg = '#ffffff';
    }
    
    const defaultSaveName = fileName.replace(/\s+/g, '_') + '.epub';
    const savedPath = await invokeTauri('exportar_epub', {
      defaultName: defaultSaveName,
      title: fileName,
      bodyHtml: bodyHtml,
      bgColor: bgColor,
      textColor: textColor,
      textStrongColor: textStrongColor,
      accentColor: accentColor,
      codeColor: codeColor,
      blockquoteBg: blockquoteBg,
      fontFamily: fontFamily,
      isEink: optEink
    });
    
    if (savedPath) {
      notify('Libro EPUB exportado con éxito en: ' + savedPath, 'success');
    }
  } catch (err) {
    console.error('Error al exportar EPUB:', err);
    notify('Error al exportar EPUB: ' + err, 'error');
  }
}
