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

#[derive(serde::Serialize)]
pub struct IdiomaMetadata {
    #[serde(rename = "code")]
    code: String,
    #[serde(rename = "name")]
    name: String,
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
fn abrir_archivo_desde_ruta(file_path: String) -> Result<FileData, String> {
    let path = std::path::PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("El archivo no existe en la ruta: {}", file_path));
    }
    let name_str = path.file_name()
        .ok_or_else(|| "No se pudo obtener el nombre del archivo de la ruta seleccionada.".to_string())?
        .to_string_lossy()
        .to_string();
        
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Error de lectura en '{}': {}", file_path, e))?;
    
    Ok(FileData {
        path: file_path,
        name: name_str,
        content,
    })
}

#[tauri::command]
fn abrir_archivo() -> Result<Option<FileData>, String> {
    let file_path = match FileDialog::new()
        .add_filter("Markdown & Datos (*.md, *.json, *.xml, *.yaml, *.yml)", &["md", "markdown", "txt", "json", "xml", "yaml", "yml"])
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
fn guardar_como(default_name: String, content: String, default_path: Option<String>) -> Result<Option<FileData>, String> {
    let mut dialog = FileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .set_file_name(&default_name);

    if let Some(ref dir_str) = default_path {
        let p = std::path::PathBuf::from(dir_str);
        if p.exists() {
            if p.is_dir() {
                dialog = dialog.set_directory(&p);
            } else if let Some(parent) = p.parent() {
                if parent.exists() {
                    dialog = dialog.set_directory(parent);
                }
            }
        }
    }

    let mut file_path = match dialog.save_file() {
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
fn obtener_ruta_base_documentos(app_handle: tauri::AppHandle) -> Result<String, String> {
    let docs_dir = app_handle.path().document_dir()
        .map_err(|e| format!("No se pudo obtener la carpeta de documentos del sistema: {}", e))?;
    let summa_dir = docs_dir.join("SummaScriptura");
    if !summa_dir.exists() {
        let _ = fs::create_dir_all(&summa_dir);
    }
    Ok(summa_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn seleccionar_carpeta(ruta_inicial: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = FileDialog::new();
    if let Some(ref ruta) = ruta_inicial {
        let p = std::path::PathBuf::from(ruta);
        if p.exists() {
            if p.is_dir() {
                dialog = dialog.set_directory(&p);
            } else if let Some(parent) = p.parent() {
                if parent.exists() {
                    dialog = dialog.set_directory(parent);
                }
            }
        }
    }
    let folder = dialog.pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn versionar_documento(file_path: String, content: String, digits: usize) -> Result<FileData, String> {
    let path_buf = std::path::PathBuf::from(&file_path);
    if !path_buf.exists() {
        return Err("El archivo actual no existe en el disco. Debe guardarse antes de versionar.".to_string());
    }

    let parent_dir = path_buf.parent().ok_or_else(|| "No se pudo obtener el directorio contenedor.".to_string())?;
    let stem = path_buf.file_stem().and_then(|s| s.to_str()).ok_or_else(|| "Nombre de archivo inválido.".to_string())?;
    let extension = path_buf.extension().and_then(|s| s.to_str()).unwrap_or("md");

    // Detectar si el stem actual ya termina en _V_###
    let (base_stem, current_v) = if let Some(idx) = stem.rfind("_V_") {
        let suffix = &stem[idx + 3..];
        if !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()) {
            let num: usize = suffix.parse().unwrap_or(0);
            (&stem[..idx], Some(num))
        } else {
            (stem, None)
        }
    } else {
        (stem, None)
    };

    // Escanear el directorio para encontrar la versión máxima existente
    let mut max_version: usize = 0;
    if let Ok(entries) = fs::read_dir(parent_dir) {
        let prefix = format!("{}_V_", base_stem);
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Some(fstem) = p.file_stem().and_then(|s| s.to_str()) {
                    if fstem.starts_with(&prefix) {
                        let suffix = &fstem[prefix.len()..];
                        if !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()) {
                            if let Ok(num) = suffix.parse::<usize>() {
                                if num > max_version {
                                    max_version = num;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let pad_width = if digits < 2 { 2 } else { digits };

    let (next_version_num, next_path) = match current_v {
        None => {
            // El archivo en disco no tenía versión previa (ej: Capitulo_Lore.md)
            // Paso 1: Renombrar el archivo actual a la versión 1 (o max_version + 1 si ya existían versiones previas)
            let v_backup = if max_version == 0 { 1 } else { max_version + 1 };
            let v_new = v_backup + 1;

            let backup_name = format!("{}_V_{:0width$}.{}", base_stem, v_backup, extension, width = pad_width);
            let backup_path = parent_dir.join(&backup_name);

            fs::rename(&path_buf, &backup_path)
                .map_err(|e| format!("Error al respaldar archivo previo como '{}': {}", backup_name, e))?;

            let new_name = format!("{}_V_{:0width$}.{}", base_stem, v_new, extension, width = pad_width);
            let new_path = parent_dir.join(&new_name);

            fs::write(&new_path, &content)
                .map_err(|e| format!("Error al escribir nueva versión '{}': {}", new_name, e))?;

            (v_new, new_path)
        }
        Some(v) => {
            // El archivo actual ya estaba versionado (ej: Capitulo_Lore_V_001.md)
            let next_v = std::cmp::max(v, max_version) + 1;
            let new_name = format!("{}_V_{:0width$}.{}", base_stem, next_v, extension, width = pad_width);
            let new_path = parent_dir.join(&new_name);

            fs::write(&new_path, &content)
                .map_err(|e| format!("Error al escribir nueva versión '{}': {}", new_name, e))?;

            (next_v, new_path)
        }
    };

    let new_path_str = next_path.to_string_lossy().to_string();
    let new_name_str = next_path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}_V_{:0width$}.{}", base_stem, next_version_num, extension, width = pad_width));

    Ok(FileData {
        path: new_path_str,
        name: new_name_str,
        content,
    })
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

#[tauri::command]
fn listar_idiomas(app_handle: tauri::AppHandle) -> Result<Vec<IdiomaMetadata>, String> {
    let base_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos de la app: {}", e))?;
    
    let path = base_dir.join("assets").join("languages");
    
    if !path.exists() {
        return Ok(Vec::new());
    }
    
    let mut idiomas = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            if path_buf.is_file() {
                if let Some(ext) = path_buf.extension() {
                    if ext == "json" {
                        let file_stem = path_buf.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("")
                            .to_string();
                        let file_path = path_buf.to_string_lossy().to_string();
                        
                        let mut name = file_stem.clone();
                        if let Ok(content) = fs::read_to_string(&path_buf) {
                            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                                if let Some(n) = v.get("meta_language_name").and_then(|s| s.as_str()) {
                                    name = n.to_string();
                                }
                            }
                        }

                        idiomas.push(IdiomaMetadata {
                            code: file_stem,
                            name,
                            file_path,
                        });
                    }
                }
            }
        }
    }
    
    idiomas.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(idiomas)
}

#[tauri::command]
fn leer_idioma(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn abrir_carpeta_idiomas(app_handle: tauri::AppHandle) -> Result<(), String> {
    let base_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("No se pudo obtener el directorio de datos de la app: {}", e))?;
    let path = base_dir.join("assets").join("languages");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el explorador de archivos: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el buscador: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el gestor de archivos: {}", e))?;
    }

    Ok(())
}

fn sincronizar_idioma_base(path: &std::path::Path, base_content: &str) {
    if !path.exists() {
        let _ = fs::write(path, base_content);
        return;
    }
    
    // Si ya existe, nos aseguramos de que no le falten claves agregadas en nuevas versiones
    if let (Ok(existing_str), Ok(base_val)) = (fs::read_to_string(path), serde_json::from_str::<serde_json::Value>(base_content)) {
        if let Ok(mut existing_val) = serde_json::from_str::<serde_json::Value>(&existing_str) {
            if let (Some(existing_obj), Some(base_obj)) = (existing_val.as_object_mut(), base_val.as_object()) {
                let mut modificado = false;
                for (k, v) in base_obj {
                    if !existing_obj.contains_key(k) {
                        existing_obj.insert(k.clone(), v.clone());
                        modificado = true;
                    }
                }
                if modificado {
                    if let Ok(nuevo_json) = serde_json::to_string_pretty(&existing_val) {
                        let _ = fs::write(path, nuevo_json);
                    }
                }
            }
        }
    }
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
      let languages_dir = assets_dir.join("languages");
      fs::create_dir_all(&languages_dir).unwrap_or_default();

      // Inyectar o sincronizar idiomas base en la carpeta de usuario
      sincronizar_idioma_base(&languages_dir.join("es.json"), include_str!("../../assets/languages/es.json"));
      sincronizar_idioma_base(&languages_dir.join("en.json"), include_str!("../../assets/languages/en.json"));
      sincronizar_idioma_base(&languages_dir.join("la.json"), include_str!("../../assets/languages/la.json"));

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
        abrir_archivo_desde_ruta, 
        guardar_archivo, 
        guardar_como, 
        obtener_ruta_base_documentos,
        seleccionar_carpeta,
        versionar_documento, 
        exportar_html,
        exportar_archivo,
        exportar_epub,
        listar_activos,
        leer_activo,
        listar_temas,
        leer_tema,
        listar_idiomas,
        leer_idioma,
        abrir_carpeta_idiomas
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
