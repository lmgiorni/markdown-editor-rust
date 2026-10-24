use std::fs;
use std::io::Write;
use rfd::FileDialog;
use zip::write::FileOptions;
use zip::CompressionMethod;

// Utilidad para decodificar URL-encoding básico (e.g. %20 -> espacio)
fn url_decode(s: &str) -> String {
    let mut res = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let mut hex = String::new();
            if let Some(h1) = chars.next() { hex.push(h1); }
            if let Some(h2) = chars.next() { hex.push(h2); }
            if let Ok(val) = u8::from_str_radix(&hex, 16) {
                res.push(val as char);
            } else {
                res.push('%');
                res.push_str(&hex);
            }
        } else {
            res.push(c);
        }
    }
    res
}

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
    is_eink: bool,
    cover_image_bytes: Option<Vec<u8>>,
    cover_image_path: Option<String>,
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
        
    generar_epub_zip(
        file,
        &title,
        &body_html,
        &bg_color,
        &text_color,
        &text_strong_color,
        &accent_color,
        &code_color,
        &blockquote_bg,
        &font_family,
        is_eink,
        cover_image_bytes,
        cover_image_path
    )?;

    Ok(Some(path_str))
}

pub fn generar_epub_zip<W: std::io::Write + std::io::Seek>(
    writer: W,
    title: &str, 
    body_html: &str, 
    bg_color: &str, 
    text_color: &str, 
    text_strong_color: &str,
    accent_color: &str,
    code_color: &str,
    blockquote_bg: &str,
    font_family: &str,
    is_eink: bool,
    cover_image_bytes: Option<Vec<u8>>,
    cover_image_path: Option<String>,
) -> Result<(), String> {
    let mut zip = zip::ZipWriter::new(writer);
    
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
        
    // ==========================================================================
    // CAPA INTELIGENTE DE PROCESAMIENTO DE PORTADA (COVER IMAGE & COVER XHTML)
    // ==========================================================================
    let mut cover_info: Option<(Vec<u8>, String, String)> = None;

    if let Some(bytes) = cover_image_bytes {
        if !bytes.is_empty() {
            cover_info = Some((bytes, "cover.jpg".to_string(), "image/jpeg".to_string()));
        }
    }

    if cover_info.is_none() {
        if let Some(ref p_str) = cover_image_path {
            if !p_str.trim().is_empty() {
                let p = std::path::Path::new(p_str);
                let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("jpg").to_lowercase();
                let mime = match ext.as_str() {
                    "png" => "image/png",
                    _ => "image/jpeg",
                };
                let fname = if ext == "png" { "cover.png" } else { "cover.jpg" };
                if let Ok(bytes) = fs::read(p) {
                    cover_info = Some((bytes, fname.to_string(), mime.to_string()));
                }
            }
        }
    }

    let mut manifest_cover_items = String::new();
    let mut meta_cover_tag = String::new();
    let mut spine_cover_item = String::new();
    let mut guide_cover_block = String::new();
    let mut toc_cover_item = String::new();
    let mut nav_point_chapter_index = 1;

    if let Some((ref bytes, ref fname, ref mime)) = cover_info {
        let zip_cover_path = format!("OEBPS/images/{}", fname);
        if zip.start_file(&zip_cover_path, options_deflated).is_ok() {
            let _ = zip.write_all(bytes);

            meta_cover_tag = "    <meta name=\"cover\" content=\"cover-image\"/>\n".to_string();
            manifest_cover_items = format!(
                "    <item id=\"cover-image\" href=\"images/{}\" media-type=\"{}\" properties=\"cover-image\"/>\n    <item id=\"cover-page\" href=\"text/cover.xhtml\" media-type=\"application/xhtml+xml\"/>\n",
                fname, mime
            );
            spine_cover_item = "    <itemref idref=\"cover-page\"/>\n".to_string();
            guide_cover_block = "  <guide>\n    <reference type=\"cover\" title=\"Portada\" href=\"text/cover.xhtml\"/>\n  </guide>\n".to_string();
            toc_cover_item = r#"    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>Portada</text>
      </navLabel>
      <content src="text/cover.xhtml"/>
    </navPoint>
"#.to_string();
            nav_point_chapter_index = 2;

            // Generar página XHTML estricta de portada con preservación de proporciones SVG
            let cover_xhtml = format!(
                r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es">
<head>
  <title>Portada</title>
  <link href="../styles/style.css" rel="stylesheet" type="text/css"/>
  <style type="text/css">
    @page {{ margin: 0; padding: 0; }}
    html, body {{
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      text-align: center;
      background-color: transparent;
    }}
    .cover-container {{
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }}
    svg {{
      width: 100%;
      height: 100%;
      display: block;
    }}
  </style>
</head>
<body epub:type="cover">
  <div class="cover-container">
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"
         width="100%" height="100%" viewBox="0 0 1600 2560" preserveAspectRatio="xMidYMid meet">
      <image width="1600" height="2560" xlink:href="../images/{}"/>
    </svg>
  </div>
</body>
</html>"#,
                fname
            );

            let _ = zip.start_file("OEBPS/text/cover.xhtml", options_deflated);
            let _ = zip.write_all(cover_xhtml.as_bytes());
        }
    }
        
    // ==========================================================================
    // CAPA INTELIGENTE DE ESCANEO, VALIDACIÓN Y EMPAQUETAMIENTO DE IMÁGENES
    // ==========================================================================
    let clean_html = body_html;
    let mut imagenes_a_empaquetar = Vec::new();
    let mut cursor = 0;
    
    // Escaneo rápido y nativo de etiquetas <img src="..." />
    while let Some(start_img) = clean_html[cursor..].find("<img") {
        let abs_start = cursor + start_img;
        let rest = &clean_html[abs_start..];
        if let Some(end_img) = rest.find(">") {
            let abs_end = abs_start + end_img;
            let img_tag = &clean_html[abs_start..=abs_end];
            
            if let Some(src_pos) = img_tag.find("src=\"") {
                let val_start = src_pos + 5;
                if let Some(src_end) = img_tag[val_start..].find("\"") {
                    let src_val = &img_tag[val_start..(val_start + src_end)];
                    imagenes_a_empaquetar.push(src_val.to_string());
                }
            } else if let Some(src_pos) = img_tag.find("src='") {
                let val_start = src_pos + 5;
                if let Some(src_end) = img_tag[val_start..].find("'") {
                    let src_val = &img_tag[val_start..(val_start + src_end)];
                    imagenes_a_empaquetar.push(src_val.to_string());
                }
            }
            cursor = abs_end + 1;
        } else {
            break;
        }
    }
    
    // Eliminar duplicados para evitar procesamiento y empaquetamiento redundante
    imagenes_a_empaquetar.sort();
    imagenes_a_empaquetar.dedup();
    
    let mut manifest_image_items = Vec::new();
    let mut reemplazos_xhtml = Vec::new();
    let mut index_imagen = 1;
    
    for original_src in imagenes_a_empaquetar {
        // Ignorar imágenes remotas de internet o imágenes en línea Base64
        if original_src.starts_with("http://") || original_src.starts_with("https://") || original_src.starts_with("data:") {
            continue;
        }
        
        // Sanitizar y limpiar la ruta
        let mut sanitized_path = original_src.clone();
        if sanitized_path.starts_with("file:///") {
            sanitized_path = sanitized_path.replacen("file:///", "", 1);
        } else if sanitized_path.starts_with("file://") {
            sanitized_path = sanitized_path.replacen("file://", "", 1);
        }
        
        // URL Decoding (e.g. %20 -> espacio)
        let sanitized_path = url_decode(&sanitized_path);
        
        // Validación estricta de formatos compatibles con EPUB (JPG, JPEG, PNG, GIF, SVG)
        let path_ref = std::path::Path::new(&sanitized_path);
        let ext = path_ref.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
            
        let mime_type = match ext.as_str() {
            "png" => Some("image/png"),
            "jpg" | "jpeg" => Some("image/jpeg"),
            "gif" => Some("image/gif"),
            "svg" => Some("image/svg+xml"),
            _ => None, // Ignorar formatos no universales (como webp o propietarios)
        };
        
        if let Some(mime) = mime_type {
            // Leer bytes binarios de la imagen si existe
            if let Ok(bytes_imagen) = fs::read(&sanitized_path) {
                let nombre_interno = format!("img_{}.{}", index_imagen, ext);
                let ruta_zip_imagen = format!("OEBPS/images/{}", nombre_interno);
                
                // Empaquetar el archivo binario físicamente en el ZIP
                if zip.start_file(&ruta_zip_imagen, options_deflated).is_ok() {
                    let _ = zip.write_all(&bytes_imagen);
                    
                    // Registrar en el manifiesto oficial del content.opf
                    manifest_image_items.push(format!(
                        r#"    <item id="img_{}" href="images/{}" media-type="{}"/>"#,
                        index_imagen, nombre_interno, mime
                    ));
                    
                    // Almacenar el mapeo para reconstruir el XHTML
                    reemplazos_xhtml.push((original_src, format!("../images/{}", nombre_interno)));
                    index_imagen += 1;
                }
            }
        }
    }
    
    // 3. content.opf
    let mut manifest_items_string = String::new();
    for item in &manifest_image_items {
        manifest_items_string.push_str(item);
        manifest_items_string.push_str("\n");
    }
    
    let content_opf = format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:84829375-9273-4029-9237-{}</dc:identifier>
    <dc:title>{}</dc:title>
    <dc:language>es</dc:language>
    <dc:creator>Summa Scriptura</dc:creator>
{}  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="styles/style.css" media-type="text/css"/>
{}{}    <item id="chapter1" href="text/chapter1.xhtml" media-type="application/xhtml+xml"/>
{}  </manifest>
  <spine toc="toc">
{}{}    <itemref idref="chapter1"/>
  </spine>
{}</package>"#, 
        title.len(),
        title,
        meta_cover_tag,
        manifest_cover_items,
        manifest_items_string,
        "",
        spine_cover_item,
        "",
        guide_cover_block
    );
    zip.start_file("OEBPS/content.opf", options_deflated)
        .map_err(|e| format!("Error en content.opf: {}", e))?;
    zip.write_all(content_opf.as_bytes())
        .map_err(|e| format!("Error en content.opf: {}", e))?;
        
    // 4. toc.ncx
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
{}    <navPoint id="navPoint-{}" playOrder="{}">
      <navLabel>
        <text>Manuscrito Principal</text>
      </navLabel>
      <content src="text/chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>"#,
        title.len(),
        title,
        toc_cover_item,
        nav_point_chapter_index,
        nav_point_chapter_index
    );
    zip.start_file("OEBPS/toc.ncx", options_deflated)
        .map_err(|e| format!("Error en toc.ncx: {}", e))?;
    zip.write_all(toc_ncx.as_bytes())
        .map_err(|e| format!("Error en toc.ncx: {}", e))?;
        
    // 5. chapter1.xhtml (Reconstruyendo las rutas locales a relativas dentro del EPUB)
    let mut xhtml_content = body_html.to_string();
    for (original, nuevo) in reemplazos_xhtml {
        xhtml_content = xhtml_content.replace(&original, &nuevo);
    }
    
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
        xhtml_content
    );
    zip.start_file("OEBPS/text/chapter1.xhtml", options_deflated)
        .map_err(|e| format!("Error en chapter1.xhtml: {}", e))?;
    zip.write_all(chapter_xhtml.as_bytes())
        .map_err(|e| format!("Error en chapter1.xhtml: {}", e))?;
        
    // 6. style.css (adaptativo o modo Eink condicional)
    let style_css = if is_eink {
        // Estilo de Alto Contraste ultra-agresivo para Eink (blanco y negro absolutos)
        format!(r#"body {{
  font-family: '{}', 'Georgia', serif, sans-serif;
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
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
}}"#, font_family)
    } else {
        // Estilo adaptativo rico que conserva la fidelidad cromática del modo Lectura
        format!(r#"body {{
  font-family: '{}', 'Georgia', serif, sans-serif;
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
}}
img {{
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
  border-radius: 6px;
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
        
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use zip::ZipArchive;

    #[test]
    fn test_generar_epub_sin_portada() {
        let mut buffer = Cursor::new(Vec::new());
        let res = generar_epub_zip(
            &mut buffer,
            "Libro de Prueba",
            "<p>Contenido del libro</p>",
            "#ffffff",
            "#000000",
            "#000000",
            "#6366f1",
            "#be185d",
            "#f1f5f9",
            "Inter",
            false,
            None,
            None
        );
        assert!(res.is_ok(), "La generación de EPUB sin portada falló");

        let mut archive = ZipArchive::new(buffer).expect("No se pudo leer el archivo ZIP generado");
        
        // Verificar que no existen archivos de portada
        assert!(archive.by_name("OEBPS/images/cover.jpg").is_err());
        assert!(archive.by_name("OEBPS/text/cover.xhtml").is_err());

        // Verificar content.opf sin portada
        {
            let mut opf_file = archive.by_name("OEBPS/content.opf").expect("content.opf no encontrado");
            let mut opf_content = String::new();
            std::io::Read::read_to_string(&mut opf_file, &mut opf_content).unwrap();
            assert!(!opf_content.contains("cover-image"));
            assert!(!opf_content.contains("cover-page"));
        }

        // Verificar toc.ncx inicia en playOrder="1" con capítulo
        {
            let mut ncx_file = archive.by_name("OEBPS/toc.ncx").expect("toc.ncx no encontrado");
            let mut ncx_content = String::new();
            std::io::Read::read_to_string(&mut ncx_file, &mut ncx_content).unwrap();
            assert!(ncx_content.contains(r#"playOrder="1""#));
            assert!(!ncx_content.contains("Portada"));
        }
    }

    #[test]
    fn test_generar_epub_con_portada_bytes() {
        let mut buffer = Cursor::new(Vec::new());
        let dummy_cover = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]; // Cabecera simulada JPEG
        let res = generar_epub_zip(
            &mut buffer,
            "Libro con Portada",
            "<p>Contenido del libro</p>",
            "#ffffff",
            "#000000",
            "#000000",
            "#6366f1",
            "#be185d",
            "#f1f5f9",
            "Inter",
            true, // Eink
            Some(dummy_cover.clone()),
            None
        );
        assert!(res.is_ok(), "La generación de EPUB con portada falló");

        let mut archive = ZipArchive::new(buffer).expect("No se pudo leer el archivo ZIP generado");

        // Verificar imagen de portada física en el ZIP
        {
            let mut cover_img_file = archive.by_name("OEBPS/images/cover.jpg").expect("cover.jpg no encontrada");
            let mut cover_bytes = Vec::new();
            std::io::Read::read_to_end(&mut cover_img_file, &mut cover_bytes).unwrap();
            assert_eq!(cover_bytes, dummy_cover);
        }

        // Verificar página de portada XHTML
        {
            let mut cover_page = archive.by_name("OEBPS/text/cover.xhtml").expect("cover.xhtml no encontrada");
            let mut cover_xhtml = String::new();
            std::io::Read::read_to_string(&mut cover_page, &mut cover_xhtml).unwrap();
            assert!(cover_xhtml.contains(r#"viewBox="0 0 1600 2560""#));
            assert!(cover_xhtml.contains(r#"xlink:href="../images/cover.jpg""#));
        }

        // Verificar content.opf
        {
            let mut opf_file = archive.by_name("OEBPS/content.opf").expect("content.opf no encontrado");
            let mut opf_content = String::new();
            std::io::Read::read_to_string(&mut opf_file, &mut opf_content).unwrap();
            assert!(opf_content.contains(r#"<meta name="cover" content="cover-image"/>"#));
            assert!(opf_content.contains(r#"id="cover-image""#));
            assert!(opf_content.contains(r#"id="cover-page""#));
            assert!(opf_content.contains(r#"<itemref idref="cover-page"/>"#));
            assert!(opf_content.contains(r#"<reference type="cover" title="Portada" href="text/cover.xhtml"/>"#));
        }

        // Verificar toc.ncx tiene Portada como playOrder="1" y capítulo como playOrder="2"
        {
            let mut ncx_file = archive.by_name("OEBPS/toc.ncx").expect("toc.ncx no encontrado");
            let mut ncx_content = String::new();
            std::io::Read::read_to_string(&mut ncx_file, &mut ncx_content).unwrap();
            assert!(ncx_content.contains(r#"<navPoint id="navPoint-1" playOrder="1">"#));
            assert!(ncx_content.contains("<text>Portada</text>"));
            assert!(ncx_content.contains(r#"<navPoint id="navPoint-2" playOrder="2">"#));
        }
    }
}