use std::fs;
use rfd::FileDialog;
use tauri::Manager;

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

#[tauri::command]
fn abrir_archivo() -> Result<Option<FileData>, String> {
    let file_path = match FileDialog::new()
        .add_filter("Markdown", &["md", "markdown", "txt"])
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
fn guardar_archivo(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Error de escritura en '{}': {}", path, e))
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

      fs::create_dir_all(&templates_dir).unwrap_or_default();
      fs::create_dir_all(&modules_dir).unwrap_or_default();

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
        listar_activos,
        leer_activo
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
