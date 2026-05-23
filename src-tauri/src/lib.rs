use std::fs;
use rfd::FileDialog;

#[derive(serde::Serialize)]
pub struct FileData {
    path: String,
    name: String,
    content: String,
}

#[tauri::command]
fn abrir_archivo() -> Option<FileData> {
    let file_path = FileDialog::new()
        .add_filter("Markdown", &["md", "markdown", "txt"])
        .pick_file()?;
    
    let path_str = file_path.to_string_lossy().to_string();
    let name_str = file_path.file_name()?.to_string_lossy().to_string();
    let content = fs::read_to_string(&file_path).ok()?;
    
    Some(FileData {
        path: path_str,
        name: name_str,
        content,
    })
}

#[tauri::command]
fn guardar_archivo(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn guardar_como(default_name: String, content: String) -> Option<FileData> {
    let mut file_path = FileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .set_file_name(&default_name)
        .save_file()?;
        
    // Asegurarse de que termine con la extensión .md siempre
    if file_path.extension().and_then(|ext| ext.to_str()) != Some("md") {
        file_path.set_extension("md");
    }
        
    fs::write(&file_path, &content).ok()?;
    
    let path_str = file_path.to_string_lossy().to_string();
    let name_str = file_path.file_name()?.to_string_lossy().to_string();
    
    Some(FileData {
        path: path_str,
        name: name_str,
        content,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![abrir_archivo, guardar_archivo, guardar_como])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
