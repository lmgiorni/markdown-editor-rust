use std::fs;
use std::path::Path;

fn sincronizar_iconos_web() {
    let icons_src = Path::new("icons");
    let dist_icons = Path::new("../dist/icons");

    if !dist_icons.exists() {
        let _ = fs::create_dir_all(dist_icons);
    }

    let files_to_sync = [
        ("128x128.png", "../dist/icons/128x128.png"),
        ("32x32.png", "../dist/icons/32x32.png"),
        ("64x64.png", "../dist/icons/64x64.png"),
        ("icon.png", "../dist/icons/icon.png"),
        ("icon.ico", "../dist/favicon.ico"),
    ];

    for (src_name, dest_path_str) in files_to_sync {
        let src = icons_src.join(src_name);
        let dest = Path::new(dest_path_str);
        if src.exists() {
            let need_copy = match (fs::metadata(&src), fs::metadata(dest)) {
                (Ok(src_meta), Ok(dest_meta)) => {
                    src_meta.len() != dest_meta.len()
                        || src_meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                            > dest_meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                }
                (Ok(_), Err(_)) => true,
                _ => false,
            };
            if need_copy {
                let _ = fs::copy(&src, dest);
            }
        }
    }
}

fn main() {
    // Sincronizar automáticamente los íconos de src-tauri hacia la interfaz web dist
    sincronizar_iconos_web();

    // Rastrear cambios en los íconos maestros y el frontend para invalidar la caché de compilación
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/128x128.png");
    println!("cargo:rerun-if-changed=../dist/index.html");
    println!("cargo:rerun-if-changed=../dist/icons/128x128.png");

    tauri_build::build()
}
