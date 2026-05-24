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
