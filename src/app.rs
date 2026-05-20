use eframe::egui;
use rfd::FileDialog;
use std::fs;
use std::path::PathBuf;

#[derive(PartialEq)]
pub enum ViewMode {
    Split,
    PreviewOnly,
    Focus,
}

#[derive(Clone, Copy, PartialEq)]
pub enum FontChoice {
    SansSerif,
    Serif,
    Mono,
}

pub struct MarkdownApp {
    pub text: String,
    pub filename: Option<PathBuf>,
    pub is_modified: bool,
    pub view_mode: ViewMode,

    // Nombre visible editable (por defecto "Untitled")
    pub display_name: String,

    // UI state
    pub show_config: bool,
    pub show_stats_window: bool,  // ventana propia para estadísticas
    pub show_md_panel: bool,

    // Config
    pub editor_font: FontChoice,
    pub preview_font: FontChoice,
    pub base_font_size: f32,

    // Cursor/selection tracking (para aplicar comandos MD)
    pub last_cursor: usize,
    pub last_selection: Option<(usize, usize)>,
    pub previous_selection: Option<(usize, usize)>,
    pub should_scroll_to_selection: bool,

    // Alturas de contenido para sincronización de scroll
    pub editor_content_height: f32,
    pub preview_content_height: f32,
    pub last_editor_scroll: f32,
    pub last_preview_scroll: f32,

    // Toolbar icons (optional)
    pub toolbar_texture: Option<egui::TextureHandle>,
}

impl Default for MarkdownApp {
    fn default() -> Self {
        Self {
            text: String::new(),
            filename: None,
            is_modified: false,
            view_mode: ViewMode::Split,
            display_name: "Untitled".to_string(),
            show_config: false,
            show_stats_window: false,
            show_md_panel: false,
            editor_font: FontChoice::Mono,
            preview_font: FontChoice::SansSerif,
            base_font_size: 14.0,
            last_cursor: 0,
            last_selection: None,
            previous_selection: None,
            should_scroll_to_selection: false,
            editor_content_height: 1.0,
            preview_content_height: 1.0,
            last_editor_scroll: 0.0,
            last_preview_scroll: 0.0,
            toolbar_texture: None,
        }
    }
}

pub fn configure_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();

    // 1. Cargar Consolas y Courier New para Monospace (si están en Windows)
    let mut mono_fonts = vec![];
    if let Ok(bytes) = std::fs::read("C:\\Windows\\Fonts\\consola.ttf") {
        fonts.font_data.insert("Consolas".to_owned(), egui::FontData::from_owned(bytes));
        mono_fonts.push("Consolas".to_owned());
    }
    if let Ok(bytes) = std::fs::read("C:\\Windows\\Fonts\\cour.ttf") {
        fonts.font_data.insert("Courier New".to_owned(), egui::FontData::from_owned(bytes));
        mono_fonts.push("Courier New".to_owned());
    }
    
    // Insertamos nuestras fuentes al principio de la lista Monospace existente para no perder los emojis y fallbacks de egui
    if let Some(existing) = fonts.families.get_mut(&egui::FontFamily::Monospace) {
        for font in mono_fonts.into_iter().rev() {
            existing.insert(0, font);
        }
    }

    // 2. Cargar Georgia y Times New Roman para la familia Serif
    let mut serif_fonts = vec![];
    if let Ok(bytes) = std::fs::read("C:\\Windows\\Fonts\\georgia.ttf") {
        fonts.font_data.insert("Georgia".to_owned(), egui::FontData::from_owned(bytes));
        serif_fonts.push("Georgia".to_owned());
    }
    if let Ok(bytes) = std::fs::read("C:\\Windows\\Fonts\\times.ttf") {
        fonts.font_data.insert("Times New Roman".to_owned(), egui::FontData::from_owned(bytes));
        serif_fonts.push("Times New Roman".to_owned());
    }
    
    // Como fallback de Serif, tomamos las fuentes de la familia Proportional por defecto de egui
    if let Some(prop_existing) = fonts.families.get(&egui::FontFamily::Proportional) {
        for font in prop_existing.iter() {
            serif_fonts.push(font.clone());
        }
    }
    fonts.families.insert(egui::FontFamily::Name("serif".into()), serif_fonts);

    // 3. Cargar Segoe UI y Arial para Proportional (Sans Serif)
    let mut prop_fonts = vec![];
    if let Ok(bytes) = std::fs::read("C:\\Windows\\Fonts\\segoeui.ttf") {
        fonts.font_data.insert("Segoe UI".to_owned(), egui::FontData::from_owned(bytes));
        prop_fonts.push("Segoe UI".to_owned());
    }
    if let Ok(bytes) = std::fs::read("C:\\Windows\\Fonts\\arial.ttf") {
        fonts.font_data.insert("Arial".to_owned(), egui::FontData::from_owned(bytes));
        prop_fonts.push("Arial".to_owned());
    }
    
    // Insertamos nuestras fuentes al principio de la lista Proportional existente
    if let Some(existing) = fonts.families.get_mut(&egui::FontFamily::Proportional) {
        for font in prop_fonts.into_iter().rev() {
            existing.insert(0, font);
        }
    }

    ctx.set_fonts(fonts);
}

impl MarkdownApp {
    pub fn load_toolbar_icons(&mut self, ctx: &egui::Context) {
        if self.toolbar_texture.is_some() {
            return;
        }

        let icon_path = "assets/toolbar.png";
        match std::fs::read(icon_path) {
            Ok(image_data) => match image::load_from_memory(&image_data) {
                Ok(img) => {
                    let rgba = img.into_rgba8();
                    let (width, height) = rgba.dimensions();
                    let color_image = egui::ColorImage::from_rgba_unmultiplied(
                        [width as usize, height as usize],
                        rgba.as_raw(),
                    );

                    self.toolbar_texture = Some(ctx.load_texture(
                        "toolbar_icons",
                        color_image,
                        egui::TextureOptions::default(),
                    ));
                }
                Err(e) => {
                    eprintln!("Advertencia: no se pudo decodificar toolbar.png: {}", e);
                }
            },
            Err(_) => {
                // Sin imagen: usaremos texto/emojis.
            }
        }
    }

    pub fn open_file(&mut self) {
        if let Some(path) = FileDialog::new().add_filter("Markdown", &["md"]).pick_file() {
            match fs::read(&path) {
                Ok(bytes) => {
                    let content = String::from_utf8_lossy(&bytes).into_owned();
                    self.text = content;
                    self.filename = Some(path.clone());
                    self.is_modified = false;

                    // Actualizar display_name con el nombre del archivo
                    if let Some(name) = path.file_name() {
                        self.display_name = name.to_string_lossy().into_owned();
                    }
                }
                Err(e) => {
                    eprintln!("Error al leer el archivo: {}", e);
                }
            }
        }
    }

    pub fn save_file(&mut self) {
        if let Some(ref path) = self.filename {
            if fs::write(path, &self.text).is_ok() {
                self.is_modified = false;
            }
        } else {
            self.save_as();
        }
    }

    pub fn save_as(&mut self) {
        let mut dialog = FileDialog::new().add_filter("Markdown", &["md"]);
        if !self.display_name.is_empty() {
            dialog = dialog.set_file_name(&self.display_name);
        }
        if let Some(path) = dialog.save_file() {
            if fs::write(&path, &self.text).is_ok() {
                self.filename = Some(path.clone());
                self.is_modified = false;

                // Actualizar display_name con el nombre del archivo guardado
                if let Some(name) = path.file_name() {
                    self.display_name = name.to_string_lossy().into_owned();
                }
            }
        }
    }

    pub fn new_document(&mut self) {
        self.text.clear();
        self.filename = None;
        self.is_modified = false;
        self.display_name = "Untitled".to_string();
    }

    // Inserta antes/después del cursor o envuelve la selección si existe.
    pub fn insert_at_cursor_or_selection(&mut self, before: &str, after: &str) {
        if let Some((start_char, end_char)) = self.last_selection {
            if start_char != end_char {
                let start_byte = char_to_byte_index(&self.text, start_char);
                let end_byte = char_to_byte_index(&self.text, end_char);
                if start_byte <= end_byte && end_byte <= self.text.len() {
                    let selected_text = &self.text[start_byte..end_byte];
                    let replacement = format!("{}{}{}", before, selected_text, after);
                    self.text.replace_range(start_byte..end_byte, &replacement);
                    self.is_modified = true;
                    // Resetear la selección para evitar aplicar el comando múltiples veces accidentalmente
                    self.last_selection = None;
                    return;
                }
            }
        }

        let char_pos = self.last_cursor;
        let byte_pos = char_to_byte_index(&self.text, char_pos);
        self.text.insert_str(byte_pos, before);
        let new_byte_pos = byte_pos + before.len();
        self.text.insert_str(new_byte_pos, after);
        self.last_cursor = byte_to_char_index(&self.text, new_byte_pos);
        self.is_modified = true;
    }

    pub fn apply_md_command(&mut self, cmd: &str) {
        match cmd {
            "Bold" => self.insert_at_cursor_or_selection("**", "**"),
            "Italic" => self.insert_at_cursor_or_selection("*", "*"),
            "Underline" => self.insert_at_cursor_or_selection("<u>", "</u>"),
            "Strikethrough" => self.insert_at_cursor_or_selection("~~", "~~"),
            "Link" => self.insert_at_cursor_or_selection("[", "](url)"),
            "Image" => self.insert_at_cursor_or_selection("![", "](url_imagen)"),
            "Table" => self.insert_at_cursor_or_selection("\n| Columna 1 | Columna 2 |\n|-----------|-----------|\n| Celda 1   | Celda 2   |\n", ""),
            "UnorderedList" => self.insert_at_cursor_or_selection("\n- ", ""),
            "OrderedList" => self.insert_at_cursor_or_selection("\n1. ", ""),
            "TaskList" => self.insert_at_cursor_or_selection("\n- [ ] ", ""),
            "Blockquote" => self.insert_at_cursor_or_selection("\n> ", ""),
            "InlineCode" => self.insert_at_cursor_or_selection("`", "`"),
            "BlockCode" => self.insert_at_cursor_or_selection("\n```rust\n", "\n```\n"),
            "InlineMath" => self.insert_at_cursor_or_selection("$", "$"),
            "BlockMath" => self.insert_at_cursor_or_selection("\n$$\n", "\n$$\n"),
            "H1" => self.insert_at_cursor_or_selection("\n# ", ""),
            "H2" => self.insert_at_cursor_or_selection("\n## ", ""),
            "H3" => self.insert_at_cursor_or_selection("\n### ", ""),
            "H4" => self.insert_at_cursor_or_selection("\n#### ", ""),
            "H5" => self.insert_at_cursor_or_selection("\n##### ", ""),
            "H6" => self.insert_at_cursor_or_selection("\n###### ", ""),
            "Paragraph" => self.insert_at_cursor_or_selection("\n\n", ""),
            "HorizontalRule" => self.insert_at_cursor_or_selection("\n---\n", ""),
            _ => {}
        }
        self.is_modified = true;
    }

    pub fn compute_stats(&self) -> (usize, usize, usize, usize) {
        let chars_with_spaces = self.text.chars().count();
        let chars_no_spaces: usize = self.text.chars().filter(|c| !c.is_whitespace()).count();
        let words: usize = self.text.split_whitespace().collect::<Vec<_>>().len();

        // Simple link count: occurrences of "[...](..."
        let links = self.text.matches("](").count();

        (words, chars_no_spaces, chars_with_spaces, links)
    }

    pub fn handle_keyboard_shortcuts(&mut self, ctx: &egui::Context) {
        ctx.input_mut(|i| {
            let ctrl_or_cmd = i.modifiers.ctrl || i.modifiers.mac_cmd;

            if i.key_down(egui::Key::S) && ctrl_or_cmd {
                self.save_file();
            }
            if i.key_down(egui::Key::O) && ctrl_or_cmd {
                self.open_file();
            }
            if i.key_down(egui::Key::N) && ctrl_or_cmd {
                self.new_document();
            }
        });
    }

    pub fn window_title(&self) -> String {
        let suffix = if self.is_modified { "*" } else { "" };
        format!("{} {}", self.display_name, suffix)
    }
}

pub fn char_to_byte_index(text: &str, char_idx: usize) -> usize {
    text.char_indices()
        .nth(char_idx)
        .map(|(byte_idx, _)| byte_idx)
        .unwrap_or_else(|| text.len())
}

pub fn byte_to_char_index(text: &str, byte_idx: usize) -> usize {
    text.char_indices()
        .take_while(|&(idx, _)| idx < byte_idx)
        .count()
}
