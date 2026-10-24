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
  <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Fira+Code:wght@400;500;700&family=IM+Fell+French+Canon:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Roboto:wght@300;400;500;700&family=Special+Elite&family=VT323&display=swap" rel="stylesheet">
  <style>
    /* ESTILOS PREMIUM BASE AUTÓNOMOS */
    ${cssContent}
    
    body {
      background-color: var(--bg-reader, #0b0b0e) !important;
      color: var(--text-reader, #e2e8f0) !important;
      padding: 60px 20px !important;
      font-family: '${readerFont}', 'Georgia', serif, sans-serif !important;
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
    }

    const printThemeStyles = isDark ? `
      /* MODO ALTO CONTRASTE PARA IMPRESIÓN DE TEMAS OSCUROS */
      body {
        background-color: #ffffff !important;
        color: #1a1a1a !important;
      }
      .markdown-body {
        color: #1a1a1a !important;
      }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
        color: #000000 !important;
        border-bottom-color: #e2e8f0 !important;
      }
      .markdown-body pre, .markdown-body code {
        background-color: #f8fafc !important;
        color: #0f172a !important;
        border: 1px solid #e2e8f0 !important;
      }
      .markdown-body blockquote {
        background-color: #f1f5f9 !important;
        color: #334155 !important;
        border-left-color: #94a3b8 !important;
      }
      .markdown-body table th {
        background-color: #f8fafc !important;
        color: #0f172a !important;
      }
      .markdown-body table td, .markdown-body table th {
        border-color: #e2e8f0 !important;
      }
    ` : `
      /* TEMA CLARO NATIVO */
      body {
        background-color: var(--bg-reader, #ffffff) !important;
        color: var(--text-reader, #1e293b) !important;
      }
    `;

    const bodyHtml = typeof marked !== 'undefined' ? marked.parse(markdownText) : markdownText;

    const htmlCompleto = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Fira+Code:wght@400;500;700&family=IM+Fell+French+Canon:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Roboto:wght@300;400;500;700&family=Special+Elite&family=VT323&display=swap" rel="stylesheet">
  <style>
    ${cssContent}
    ${printThemeStyles}

    body {
      padding: 40px !important;
      font-family: '${readerFont}', 'Georgia', serif, sans-serif !important;
      display: block !important;
      overflow: visible !important;
      height: auto !important;
    }
    .markdown-body {
      max-width: 100% !important;
      margin: 0 auto;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
    @page {
      size: auto;
      margin: 20mm 15mm 20mm 15mm;
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

// Auxiliar para convertir rutas de archivos locales en URLs seguras para WebView2
function resolverUrlImagenLocal(ruta) {
  if (!ruta) return '';
  if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.convertFileSrc) {
    const normalized = ruta.replace(/\\/g, '/');
    return window.__TAURI__.core.convertFileSrc(normalized);
  }
  return 'file:///' + ruta.replace(/\\/g, '/');
}

// Auxiliar para optimizar y reducir imágenes excesivamente pesadas (>2560px) en memoria vía Canvas
async function optimizarImagenPortadaCanvas(imgElement) {
  const maxW = 1600;
  const maxH = 2560;
  let targetW = imgElement.naturalWidth;
  let targetH = imgElement.naturalHeight;
  
  // Escalar proporcionalmente manteniendo la relación de aspecto original
  const ratio = Math.min(maxW / targetW, maxH / targetH);
  if (ratio < 1) {
    targetW = Math.round(targetW * ratio);
    targetH = Math.round(targetH * ratio);
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgElement, 0, 0, targetW, targetH);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const arrayBuffer = reader.result;
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        resolve(bytes);
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/jpeg', 0.90);
  });
}

// 3. EXPORTAR A LIBRO ELECTRÓNICO EPUB PREMIUM CON PORTADA Y ADAPTACIÓN EINK O TEMA
export async function exportarDocumentoAEPUB(fileName, markdownText, readerFont, invokeTauri, notify, currentDocPath) {
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
    
    // Sanitización XHTML estricta para lectores de EPUB
    const bodyHtml = purificarHTMLaXHTML(bodyHtmlRaw);
    
    // Elementos del Modal
    const modalEpub = document.getElementById('modal-epub-export');
    const btnEink = document.getElementById('btn-epub-opt-eink');
    const btnTheme = document.getElementById('btn-epub-opt-theme');
    const btnCancel = document.getElementById('btn-epub-cancel');
    const closeBtn = modalEpub ? modalEpub.querySelector('.modal-close-btn') : null;
    
    // Elementos de la sección de Portada
    const coverEmpty = document.getElementById('epub-cover-empty');
    const coverPreviewCard = document.getElementById('epub-cover-preview-card');
    const coverThumb = document.getElementById('epub-cover-thumb');
    const coverFilename = document.getElementById('epub-cover-filename');
    const coverBadgeRes = document.getElementById('epub-cover-badge-res');
    const coverBadgeStatus = document.getElementById('epub-cover-badge-status');
    const btnSelectCover = document.getElementById('btn-epub-select-cover');
    const btnChangeCover = document.getElementById('btn-epub-change-cover');
    const btnRemoveCover = document.getElementById('btn-epub-remove-cover');
    
    if (!modalEpub || !btnEink || !btnTheme) {
      notify('El diálogo de exportación a EPUB no está disponible', 'error');
      return;
    }

    // Estado local de la portada seleccionada
    let selectedCoverPath = null;
    let selectedCoverImg = null;
    let isHighRes = false;
    let currentBlobUrl = null;

    // Función interna para cargar, dimensionar y previsualizar una portada
    const cargarYMostrarPortada = async (path) => {
      if (!path) {
        selectedCoverPath = null;
        selectedCoverImg = null;
        isHighRes = false;
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
          currentBlobUrl = null;
        }
        if (coverPreviewCard) coverPreviewCard.style.display = 'none';
        if (coverEmpty) coverEmpty.style.display = 'flex';
        return;
      }

      try {
        // Leemos los bytes del archivo de forma nativa vía Tauri para generar un Blob del mismo origen.
        // Esto evita terminantemente el error de 'Tainted canvases' (CORS) al exportar con toBlob() en WebP o imágenes grandes.
        let srcUrl = '';
        try {
          const bytes = await invokeTauri('leer_archivo_binario', { path });
          const ext = path.split('.').pop().toLowerCase();
          const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
          const blob = new Blob([new Uint8Array(bytes)], { type: mime });
          
          if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
          }
          currentBlobUrl = URL.createObjectURL(blob);
          srcUrl = currentBlobUrl;
        } catch (readErr) {
          console.warn('Fallo al leer bytes directamente, recurriendo a convertFileSrc:', readErr);
          srcUrl = resolverUrlImagenLocal(path);
        }

        const img = new Image();
        img.src = srcUrl;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error('No se pudo cargar la imagen para previsualización'));
        });

        selectedCoverPath = path;
        selectedCoverImg = img;

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const sep = path.includes('/') ? '/' : '\\';
        const namePart = path.split(sep).pop();

        if (coverThumb) coverThumb.src = srcUrl;
        if (coverFilename) {
          coverFilename.textContent = namePart;
          coverFilename.title = path;
        }
        if (coverBadgeRes) {
          coverBadgeRes.textContent = `${w} × ${h} px`;
        }

        if (coverBadgeStatus) {
          if (w < 1000 || h < 1400) {
            isHighRes = false;
            coverBadgeStatus.className = 'epub-badge epub-badge-warn';
            coverBadgeStatus.textContent = `⚠️ Baja resolución (${w}×${h} px). Podría pixelarse.`;
          } else if (w > 2560 || h > 2560) {
            isHighRes = true;
            coverBadgeStatus.className = 'epub-badge epub-badge-info';
            coverBadgeStatus.textContent = `ℹ️ Alta resolución (${w}×${h} px). Se optimizará a 1600×2560 px.`;
          } else {
            isHighRes = false;
            coverBadgeStatus.className = 'epub-badge epub-badge-ok';
            coverBadgeStatus.textContent = `✓ Resolución recomendada (${w}×${h} px)`;
          }
        }

        if (coverEmpty) coverEmpty.style.display = 'none';
        if (coverPreviewCard) coverPreviewCard.style.display = 'flex';
      } catch (err) {
        console.warn('No se pudo previsualizar la portada:', err);
        selectedCoverPath = null;
        selectedCoverImg = null;
        isHighRes = false;
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
          currentBlobUrl = null;
        }
        if (coverPreviewCard) coverPreviewCard.style.display = 'none';
        if (coverEmpty) coverEmpty.style.display = 'flex';
      }
    };

    // Auto-detección inicial de portada candidata en el directorio del documento
    if (currentDocPath) {
      try {
        const candidata = await invokeTauri('buscar_portada_candidata', { filePath: currentDocPath });
        if (candidata) {
          await cargarYMostrarPortada(candidata);
        } else {
          await cargarYMostrarPortada(null);
        }
      } catch (err) {
        await cargarYMostrarPortada(null);
      }
    } else {
      await cargarYMostrarPortada(null);
    }

    // Manejador para elegir / cambiar portada manualmente
    const onElegirPortada = async () => {
      try {
        const elegida = await invokeTauri('seleccionar_imagen_portada');
        if (elegida) {
          await cargarYMostrarPortada(elegida);
        }
      } catch (err) {
        console.error('Error al seleccionar imagen de portada:', err);
      }
    };

    // Manejador para quitar la portada
    const onQuitarPortada = () => {
      cargarYMostrarPortada(null);
    };

    if (btnSelectCover) btnSelectCover.addEventListener('click', onElegirPortada);
    if (btnChangeCover) btnChangeCover.addEventListener('click', onElegirPortada);
    if (btnRemoveCover) btnRemoveCover.addEventListener('click', onQuitarPortada);
    
    // Esperar la selección de estilo por parte del usuario
    const optEink = await new Promise((resolve) => {
      const cleanup = (value) => {
        btnEink.removeEventListener('click', selectEink);
        btnTheme.removeEventListener('click', selectTheme);
        if (btnCancel) btnCancel.removeEventListener('click', selectCancel);
        if (closeBtn) closeBtn.removeEventListener('click', selectCancel);
        if (btnSelectCover) btnSelectCover.removeEventListener('click', onElegirPortada);
        if (btnChangeCover) btnChangeCover.removeEventListener('click', onElegirPortada);
        if (btnRemoveCover) btnRemoveCover.removeEventListener('click', onQuitarPortada);
        
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
          currentBlobUrl = null;
        }
        
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
    let fontFamily = readerFont || 'Georgia';
    
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

    // Preparar imagen de portada si está presente
    let coverBytes = null;
    let coverPath = null;

    if (selectedCoverPath && selectedCoverImg) {
      const isWebp = selectedCoverPath.toLowerCase().endsWith('.webp');
      if (isHighRes || isWebp) {
        // Redimensionar automáticamente vía Canvas a dimensiones óptimas (1600x2560) o convertir de WebP a JPEG
        notify('Optimizando imagen de portada para el EPUB...', 'info');
        coverBytes = await optimizarImagenPortadaCanvas(selectedCoverImg);
        coverPath = null;
      } else {
        // Formato estándar (JPG/PNG) dentro de resolución adecuada: Rust lo lee directamente de disco
        coverPath = selectedCoverPath;
        coverBytes = null;
      }
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
      isEink: optEink,
      coverImageBytes: coverBytes,
      coverImagePath: coverPath
    });
    
    if (savedPath) {
      notify('Libro EPUB exportado con éxito en: ' + savedPath, 'success');
    }
  } catch (err) {
    console.error('Error al exportar EPUB:', err);
    notify('Error al exportar EPUB: ' + err, 'error');
  }
}
