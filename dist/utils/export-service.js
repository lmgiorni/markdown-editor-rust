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
      const defaultName = fileName + '.html';
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
      a.download = fileName + '.html';
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
export function exportarDocumentoAPDF(notify) {
  window.print();
  notify('Preparando exportación a PDF (Ventana del Sistema)');
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
    
    const defaultSaveName = fileName + '.epub';
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
