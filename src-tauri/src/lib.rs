use std::fs;
use rfd::FileDialog;
use tauri::Manager;

mod epub_exporter;

#[derive(serde::Serialize)]
pub struct FileData {
    path: String,
    name: String,
    content: String,
}

#[derive(serde::Serialize)]
pub struct ActivoMetadata {
    #[serde(rename = "fileName")]
    file_name: String,
    #[serde(rename = "filePath")]
    file_path: String,
}

#[derive(serde::Serialize)]
pub struct TemaMetadata {
    #[serde(rename = "themeName")]
    theme_name: String,
    #[serde(rename = "filePath")]
    file_path: String,
}

// Utilidad para sanitizar nombres de archivo reemplazando espacios por guiones bajos
fn sanitizar_nombre_archivo(path: std::path::PathBuf) -> std::path::PathBuf {
    if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
        let sanitized = file_name.replace(" ", "_");
        return path.with_file_name(sanitized);
    }
    path
}

#[tauri::command]
fn abrir_archivo() -> Result<Option<FileData>, String> {
    let file_path = match FileDialog::new()
        .add_filter("Markdown & Datos (*.md, *.json, *.xml)", &["md", "markdown", "txt", "json", "xml"])
        .pick_file() {
            Some(path) => path,
            None => return Ok(None),
        };
    
    let path_str = file_path.to_string_lossy().to_string();
    let name_str = file_path.file_name()
        .ok_or_else(|| "No se pudo obtener el nombre del archivo de la ruta seleccionada.".to_string())?
        .to_string_lossy()
        .to_string();
        
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Error de lectura en '{}': {}", path_str, e))?;
    
    Ok(Some(FileData {
        path: path_str,
        name: name_str,
        content,
    }))
}

#[tauri::command]
fn guardar_archivo(path: String, content: String) -> Result<String, String> {
    let original_path = std::path::PathBuf::from(path);
    let sanitized_path = sanitizar_nombre_archivo(original_path);
    let path_str = sanitized_path.to_string_lossy().to_string();
    
    fs::write(&sanitized_path, content)
        .map_err(|e| format!("Error de escritura en '{}': {}", path_str, e))?;
        
    Ok(path_str)
}

#[tauri::command]
fn guardar_como(default_name: String, content: String) -> Result<Option<FileData>, String> {
    let mut file_path = match FileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .set_file_name(&default_name)
        .save_file() {
            Some(path) => path,
            None => return Ok(None),
        };
        
    // Asegurarse de que termine con la extensión .md siempre
    if file_path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        file_path.set_extension("md");
    }
    
    // Sanitizar el nombre del archivo (reemplazar espacios por _)
    let file_path = sanitizar_nombre_archivo(file_path);
    let path_str = file_path.to_string_lossy().to_string();
    
    fs::write(&file_path, &content)
        .map_err(|e| format!("Error de escritura en '{}': {}", path_str, e))?;
    
    let name_str = file_path.file_name()
        .ok_or_else(|| "No se pudo obtener el nombre del archivo de la ruta seleccionada.".to_string())?
        .to_string_lossy()
        .to_string();
    
    Ok(Some(FileData {
        path: path_str,
        name: name_str,
        content,
    }))
}

#[tauri::command]
fn exportar_html(default_name: String, content: String) -> Option<String> {
    let mut file_path = FileDialog::new()
        .add_filter("HTML", &["html"])
        .set_file_name(&default_name)
        .save_file()?;
        
    if file_path.extension().and_then(|ext| ext.to_str()) != Some("html") {
        file_path.set_extension("html");
    }
        
    fs::write(&file_path, &content).ok()?;
    Some(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn exportar_archivo(default_name: String, content: String, extension: String, filter_name: String) -> Option<String> {
    let mut file_path = FileDialog::new()
        .add_filter(&filter_name, &[&extension])
        .set_file_name(&default_name)
        .save_file()?;
        
    if file_path.extension().and_then(|ext| ext.to_str()) != Some(&extension) {
        file_path.set_extension(&extension);
    }
    
    let file_path = sanitizar_nombre_archivo(file_path);
        
    fs::write(&file_path, &content).ok()?;
    Some(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn exportar_epub(
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
    epub_exporter::exportar_epub_interno(
        default_name, 
        title, 
        body_html, 
        bg_color, 
        text_color, 
        text_strong_color,
        accent_color,
        code_color,
        blockquote_bg,
        font_family,
        is_eink
    )
}

#[tauri::command]
fn listar_activos(app_handle: tauri::AppHandle, tipo: String) -> Result<Vec<ActivoMetadata>, String> {
    let base_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos de la app: {}", e))?;
    
    let path = base_dir.join("assets").join(&tipo);
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    let mut activos = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            if path_buf.is_file() {
                if let Some(ext) = path_buf.extension() {
                    if ext == "md" || ext == "markdown" {
                        let file_name = path_buf.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("")
                            .to_string();
                        let file_path = path_buf.to_string_lossy().to_string();
                        activos.push(ActivoMetadata {
                            file_name,
                            file_path,
                        });
                    }
                }
            }
        }
    }
    
    // Ordenar alfabéticamente
    activos.sort_by(|a, b| a.file_name.to_lowercase().cmp(&b.file_name.to_lowercase()));
    
    Ok(activos)
}

#[tauri::command]
fn leer_activo(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn listar_temas(app_handle: tauri::AppHandle) -> Result<Vec<TemaMetadata>, String> {
    let base_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos de la app: {}", e))?;
    
    let path = base_dir.join("assets").join("themes");
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    let mut temas = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            if path_buf.is_file() {
                if let Some(ext) = path_buf.extension() {
                        if ext == "md" {
                            let file_stem = path_buf.file_stem()
                                .and_then(|s| s.to_str())
                                .unwrap_or("")
                                .to_string();
                            let file_path = path_buf.to_string_lossy().to_string();
                            temas.push(TemaMetadata {
                                theme_name: file_stem,
                                file_path,
                            });
                        }
                }
            }
        }
    }
    
    temas.sort_by(|a, b| a.theme_name.to_lowercase().cmp(&b.theme_name.to_lowercase()));
    Ok(temas)
}

#[tauri::command]
fn leer_tema(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Inicializar y asegurar carpetas de assets locales en app_data_dir
      let base_dir = app.path().app_data_dir()
          .map_err(|e| format!("No se pudo obtener el directorio de datos de la app: {}", e))?;
      let assets_dir = base_dir.join("assets");
      let templates_dir = assets_dir.join("templates");
      let modules_dir = assets_dir.join("modules");
      let themes_dir = assets_dir.join("themes");

      fs::create_dir_all(&templates_dir).unwrap_or_default();
      fs::create_dir_all(&modules_dir).unwrap_or_default();
      fs::create_dir_all(&themes_dir).unwrap_or_default();

      // Inyectar activos base en modules si está vacío
      if let Ok(mut entries) = fs::read_dir(&modules_dir) {
          if entries.next().is_none() {
              let atributos_content = "# Atributos `Módulo de atributos de RPG clásico: vida, fuerza, agilidad, activo.`\n\t**Vida:** 100i\n\t**Fuerza:** 10i\n\t**Agilidad:** 5.5f\n\t**Activo:** Sí";
              fs::write(modules_dir.join("Atributos.md"), atributos_content).unwrap_or_default();

              let historia_content = "# Historia `Contenido narrativo básico del lore de tu personaje.`\n\tEste guerrero proviene de las tierras frías del norte. Su clan ha custodiado los secretos del metal durante generaciones.";
              fs::write(modules_dir.join("Historia.md"), historia_content).unwrap_or_default();

              let habilidad_content = "# Habilidad `Módulo de habilidades clásicas de batalla y costo.`\n\t**Nombre:** Ráfaga Feroz\n\t**Costo:** 15i\n\t**Multiplicador:** 1.5f";
              fs::write(modules_dir.join("Habilidad.md"), habilidad_content).unwrap_or_default();
          }
      }

      // Inyectar activos base en templates si está vacío
      if let Ok(mut entries) = fs::read_dir(&templates_dir) {
          if entries.next().is_none() {
              let ficha_content = "# Personaje `Plantilla inicial interactiva para crear un personaje completo.`\n# Datos_Generales\n\t**Nombre:** {{Nombre_del_Personaje}}\n\t**Clase:** {{Clase_Guerrero_Mago}}\n\n# Atributos `Módulo de atributos de RPG clásico: vida, fuerza, agilidad, activo.`\n\t**Vida:** 100i\n\t**Fuerza:** 10i\n\t**Agilidad:** 5.5f\n\t**Activo:** Sí";
              fs::write(templates_dir.join("Ficha_Personaje.md"), ficha_content).unwrap_or_default();
          }
      }

      // Inyectar/Actualizar temas por defecto con el formato de Markdown estructurado jerárquico
      let cyberpunk_content = r##"# Tema `Esquema de colores Cyberpunk-Dark para la interfaz`
	**themeName**: Cyberpunk-Dark

	# colors `Parámetros de estilo estructurados`
		
		## Interfaz General `Fondo, bordes y acento de la app`
			**bg-app**: #0b0b0e
			**bg-panel**: #111116
			**bg-toolbar**: #0c0e16
			**bg-sidebar**: #111116
			**bg-modal**: rgba(23, 28, 42, 0.95)
			**bg-input**: rgba(255, 255, 255, 0.02)
			**bg-code**: #161b29
			**border-subtle**: rgba(255, 255, 255, 0.08)
			**border-focus**: rgba(188, 19, 254, 0.45)
			**accent**: #bc13fe
			**accent-color**: #bc13fe
			**accent-hover**: #d946ef

		## Textos de Edición `Colores para la interfaz del cromo y editor`
			**text-main**: #f1f5f9
			**text-muted**: #64748b
			**text-editor**: #cbd5e1

		## Visor de Lectura `Colores aplicables en el modo Read`
			**bg-reader**: #0b0b0e
			**text-reader**: #cbd5e1
			**text-strong**: #f1f5f9
			**text-code-inline**: #f472b6
			**bg-blockquote**: rgba(139, 92, 246, 0.03)
			**bg-table-header**: rgba(255, 255, 255, 0.02)
			**bg-table-zebra**: rgba(255, 255, 255, 0.01)

		## Badges de Datos `Insignias de tipo de dato en modo estructurado`
			**bg-badge-int**: rgba(16, 185, 129, 0.1)
			**text-badge-int**: #34d399
			**border-badge-int**: rgba(16, 185, 129, 0.2)
			**bg-badge-float**: rgba(6, 182, 212, 0.1)
			**text-badge-float**: #22d3ee
			**border-badge-float**: rgba(6, 182, 212, 0.2)
			**bg-badge-bool**: rgba(139, 92, 246, 0.1)
			**text-badge-bool**: #a78bfa
			**border-badge-bool**: rgba(139, 92, 246, 0.2)
			**bg-badge-str**: rgba(59, 130, 246, 0.1)
			**text-badge-str**: #60a5fa
			**border-badge-str**: rgba(59, 130, 246, 0.2)"##;
      fs::write(themes_dir.join("Cyberpunk-Dark.md"), cyberpunk_content).unwrap_or_default();

      let light_content = r##"# Tema `Esquema de colores Classic-Light para la interfaz`
	**themeName**: Classic-Light

	# colors `Parámetros de estilo estructurados`
		
		## Interfaz General `Fondo, bordes y acento de la app`
			**bg-app**: #ffffff
			**bg-panel**: #ffffff
			**bg-toolbar**: #e2e8f0
			**bg-sidebar**: #f1f5f9
			**bg-modal**: #ffffff
			**bg-input**: rgba(0, 0, 0, 0.03)
			**bg-code**: #f1f5f9
			**border-subtle**: rgba(0, 0, 0, 0.08)
			**border-focus**: rgba(99, 102, 241, 0.45)
			**accent**: #6366f1
			**accent-color**: #6366f1
			**accent-hover**: #4f46e5

		## Textos de Edición `Colores para la interfaz del cromo y editor`
			**text-main**: #0f172a
			**text-muted**: #475569
			**text-editor**: #1e293b

		## Visor de Lectura `Colores aplicables en el modo Read`
			**bg-reader**: #ffffff
			**text-reader**: #1e293b
			**text-strong**: #0f172a
			**text-code-inline**: #be185d
			**bg-blockquote**: rgba(99, 102, 241, 0.03)
			**bg-table-header**: rgba(0, 0, 0, 0.02)
			**bg-table-zebra**: rgba(0, 0, 0, 0.01)

		## Badges de Datos `Insignias de tipo de dato en modo estructurado`
			**bg-badge-int**: rgba(16, 185, 129, 0.08)
			**text-badge-int**: #047857
			**border-badge-int**: rgba(16, 185, 129, 0.15)
			**bg-badge-float**: rgba(6, 182, 212, 0.08)
			**text-badge-float**: #0369a1
			**border-badge-float**: rgba(6, 182, 212, 0.15)
			**bg-badge-bool**: rgba(139, 92, 246, 0.08)
			**text-badge-bool**: #6d28d9
			**border-badge-bool**: rgba(139, 92, 246, 0.15)
			**bg-badge-str**: rgba(59, 130, 246, 0.08)
			**text-badge-str**: #1d4ed8
			**border-badge-str**: rgba(59, 130, 246, 0.15)"##;
      fs::write(themes_dir.join("Classic-Light.md"), light_content).unwrap_or_default();

      // Limpiar antiguos archivos JSON obsoletos si existen
      let _ = fs::remove_file(themes_dir.join("Cyberpunk-Dark.json"));
      let _ = fs::remove_file(themes_dir.join("Classic-Light.json"));

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        abrir_archivo, 
        guardar_archivo, 
        guardar_como, 
        exportar_html,
        exportar_archivo,
        exportar_epub,
        listar_activos,
        leer_activo,
        listar_temas,
        leer_tema
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
