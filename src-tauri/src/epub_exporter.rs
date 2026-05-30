use std::fs;
use std::io::Write;
use rfd::FileDialog;
use zip::write::FileOptions;
use zip::CompressionMethod;

// Utilidad para sanitizar nombres de archivo reemplazando espacios por guiones bajos
fn sanitizar_nombre_archivo(path: std::path::PathBuf) -> std::path::PathBuf {
    if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
        let sanitized = file_name.replace(" ", "_");
        return path.with_file_name(sanitized);
    }
    path
}

pub fn exportar_epub_interno(
    default_name: String, 
    title: String, 
    body_html: String, 
    bg_color: String, 
    text_color: String, 
    text_strong_color: String,
    accent_color: String,
    code_color: String,
    blockquote_bg: String,
    font_family: String,
    is_eink: bool
) -> Result<Option<String>, String> {
    let mut file_path = match FileDialog::new()
        .add_filter("Libro Electrónico EPUB (*.epub)", &["epub"])
        .set_file_name(&default_name)
        .save_file() {
            Some(path) => path,
            None => return Ok(None),
        };
        
    if file_path.extension().and_then(|ext| ext.to_str()) != Some("epub") {
        file_path.set_extension("epub");
    }
    
    let file_path = sanitizar_nombre_archivo(file_path);
    let path_str = file_path.to_string_lossy().to_string();
    
    let file = fs::File::create(&file_path)
        .map_err(|e| format!("No se pudo crear el archivo EPUB en disco: {}", e))?;
        
    let mut zip = zip::ZipWriter::new(file);
    
    // 1. mimetype (sin compresión, primera posición obligatoria por especificación de EPUB)
    let options_stored = FileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .unix_permissions(0o644);
        
    zip.start_file("mimetype", options_stored)
        .map_err(|e| format!("Error en mimetype: {}", e))?;
    zip.write_all(b"application/epub+zip")
        .map_err(|e| format!("Error en mimetype: {}", e))?;
        
    let options_deflated = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);
        
    // 2. container.xml
    let container_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"#;
    zip.start_file("META-INF/container.xml", options_deflated)
        .map_err(|e| format!("Error en container.xml: {}", e))?;
    zip.write_all(container_xml.as_bytes())
        .map_err(|e| format!("Error en container.xml: {}", e))?;
        
    // 3. content.opf
    let content_opf = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:84829375-9273-4029-9237-{}</dc:identifier>
    <dc:title>{}</dc:title>
    <dc:language>es</dc:language>
    <dc:creator>Summa Scriptura</dc:creator>
  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="styles/style.css" media-type="text/css"/>
    <item id="chapter1" href="text/chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="toc">
    <itemref idref="chapter1"/>
  </spine>
</package>"#, 
        title.len(),
        title
    );
    zip.start_file("OEBPS/content.opf", options_deflated)
        .map_err(|e| format!("Error en content.opf: {}", e))?;
    zip.write_all(content_opf.as_bytes())
        .map_err(|e| format!("Error en content.opf: {}", e))?;
        
    // 4. toc.ncx - ¡CORREGIDO quitando la palabra "xml" errónea en la primera línea!
    let toc_ncx = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:84829375-9273-4029-9237-{}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>{}</text>
  </docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>Manuscrito Principal</text>
      </navLabel>
      <content src="text/chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>"#,
        title.len(),
        title
    );
    zip.start_file("OEBPS/toc.ncx", options_deflated)
        .map_err(|e| format!("Error en toc.ncx: {}", e))?;
    zip.write_all(toc_ncx.as_bytes())
        .map_err(|e| format!("Error en toc.ncx: {}", e))?;
        
    // 5. chapter1.xhtml
    let chapter_xhtml = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">
<head>
  <title>{}</title>
  <link href="../styles/style.css" rel="stylesheet" type="text/css"/>
</head>
<body>
  <section epub:type="chapter">
    {}
  </section>
</body>
</html>"#,
        title,
        body_html
    );
    zip.start_file("OEBPS/text/chapter1.xhtml", options_deflated)
        .map_err(|e| format!("Error en chapter1.xhtml: {}", e))?;
    zip.write_all(chapter_xhtml.as_bytes())
        .map_err(|e| format!("Error en chapter1.xhtml: {}", e))?;
        
    // 6. style.css (adaptativo o modo Eink condicional)
    let style_css = if is_eink {
        // Estilo de Alto Contraste ultra-agresivo para Eink (blanco y negro absolutos)
        format!(r#"body {{
  font-family: '{}', 'Inter', system-ui, -apple-system, sans-serif;
  padding: 15px;
  line-height: 1.6;
  color: #000000;
  background-color: #ffffff;
  filter: grayscale(100%) contrast(150%);
}}
h1, h2, h3, h4 {{
  font-weight: bold;
  color: #000000;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
}}
h1 {{ font-size: 1.8em; border-bottom: 1px solid #000000; padding-bottom: 6px; }}
h2 {{ font-size: 1.5em; }}
h3 {{ font-size: 1.3em; }}
p {{
  margin-bottom: 1em;
  text-indent: 1.5em;
  margin-top: 0;
  text-align: justify;
}}
p:first-of-type {{
  text-indent: 0;
}}
blockquote {{
  border-left: 3px solid #000000;
  padding-left: 15px;
  margin-left: 10px;
  font-style: italic;
  color: #000000;
}}
pre {{
  background-color: #ffffff;
  border: 1px solid #000000;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  white-space: pre-wrap;
}}
code {{
  font-family: monospace;
  background-color: #ffffff;
  border: 1px solid #000000;
  padding: 2px 4px;
  border-radius: 4px;
}}
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}}
th, td {{
  border: 1px solid #000000;
  padding: 8px;
  text-align: left;
}}
th {{
  background-color: #ffffff;
}}
ul, ol {{
  margin-left: 20px;
  margin-bottom: 1em;
}}
li {{
  margin-bottom: 0.4em;
}}
a {{
  color: #000000;
  text-decoration: underline;
}}
img {{
  filter: grayscale(100%) !important;
}}"#, font_family)
    } else {
        // Estilo adaptativo rico que conserva la fidelidad cromática del modo Lectura
        format!(r#"body {{
  font-family: '{}', 'Inter', system-ui, -apple-system, sans-serif;
  padding: 15px;
  line-height: 1.6;
  color: {};
  background-color: {};
}}
h1, h2, h3, h4 {{
  font-weight: bold;
  color: {};
  margin-top: 1.6em;
  margin-bottom: 0.6em;
}}
h1 {{ font-size: 1.8em; border-bottom: 1px solid {}; padding-bottom: 6px; }}
h2 {{ font-size: 1.5em; }}
h3 {{ font-size: 1.3em; }}
p {{
  margin-bottom: 1em;
  text-indent: 1.5em;
  margin-top: 0;
  text-align: justify;
}}
p:first-of-type {{
  text-indent: 0;
}}
blockquote {{
  border-left: 3px solid {};
  background-color: {};
  padding-left: 15px;
  margin-left: 10px;
  font-style: italic;
  color: {};
}}
pre {{
  background-color: {};
  border: 1px solid {};
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  white-space: pre-wrap;
}}
code {{
  font-family: monospace;
  background-color: {};
  color: {};
  padding: 2px 4px;
  border-radius: 4px;
}}
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
}}
th, td {{
  border: 1px solid {};
  padding: 8px;
  text-align: left;
}}
th {{
  background-color: {};
}}
ul, ol {{
  margin-left: 20px;
  margin-bottom: 1em;
}}
li {{
  margin-bottom: 0.4em;
}}
a {{
  color: {};
  text-decoration: none;
}}"#,
        font_family,
        text_color,
        bg_color,
        text_strong_color,
        accent_color, // Línea inferior de H1
        accent_color,
        blockquote_bg,
        text_color,
        blockquote_bg,
        accent_color,
        blockquote_bg, // Fondo código inline
        code_color,
        accent_color,
        blockquote_bg,
        accent_color)
    };

    zip.start_file("OEBPS/styles/style.css", options_deflated)
        .map_err(|e| format!("Error en style.css: {}", e))?;
    zip.write_all(style_css.as_bytes())
        .map_err(|e| format!("Error en style.css: {}", e))?;
        
    zip.finish()
        .map_err(|e| format!("No se pudo empaquetar el archivo ZIP final: {}", e))?;
        
    Ok(Some(path_str))
}
