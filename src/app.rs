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
            toolbar_texture: None,
        }
    }
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
            if let Ok(content) = fs::read_to_string(&path) {
                self.text = content;
                self.filename = Some(path.clone());
                self.is_modified = false;

                // Actualizar display_name con el nombre del archivo
                if let Some(name) = path.file_name() {
                    self.display_name = name.to_string_lossy().into_owned();
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
        if let Some(path) = FileDialog::new().add_filter("Markdown", &["md"]).save_file() {
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
        if let Some((start, end)) = self.last_selection {
            if start != end && start <= self.text.len() && end <= self.text.len() && start <= end {
                // Hay selección: envolver texto seleccionado
                let selected_text = &self.text[start..end];
                let replacement = format!("{}{}{}", before, selected_text, after);
                self.text.replace_range(start..end, &replacement);
                return;
            }
        }

        // Sin selección válida: insertar en posición del cursor
        let pos = self.last_cursor.min(self.text.len());
        self.text.insert_str(pos, before);
        let new_pos = pos + before.len();
        self.text.insert_str(new_pos, after);
    }

    pub fn apply_md_command(&mut self, cmd: &str) {
        match cmd {
            "Bold" => self.insert_at_cursor_or_selection("**", "**"),
            "Italic" => self.insert_at_cursor_or_selection("*", "*"),
            "Underline" => self.insert_at_cursor_or_selection("<u>", "</u>"),
            "Strikethrough" => self.insert_at_cursor_or_selection("~~", "~~"),
            "Link" => self.insert_at_cursor_or_selection("[texto](url)", ""),
            "Image" => self.insert_at_cursor_or_selection("![](url_imagen)", ""),
            "Table" => {
                let t = "\n| Col1 | Col2 |\n|------|------|\n|      |      |\n";
                self.text.push_str(t);
            }
            "UnorderedList" => {
                self.text.push_str("\n- ");
            }
            "OrderedList" => {
                self.text.push_str("\n1. ");
            }
            "TaskList" => {
                self.text.push_str("\n- [ ] Tarea");
            }
            "Blockquote" => {
                self.text.push_str("\n> Cita\n");
            }
            "InlineCode" => self.insert_at_cursor_or_selection("`", "`"),
            "BlockCode" => {
                let c = "\n```\ncódigo\n```\n";
                self.text.push_str(c);
            }
            "InlineMath" => self.insert_at_cursor_or_selection("$", "$"),
            "BlockMath" => {
                let m = "\n$$\nfórmula\n$$\n";
                self.text.push_str(m);
            }
            "H1" => self.text.push_str("\n# "),
            "H2" => self.text.push_str("\n## "),
            "H3" => self.text.push_str("\n### "),
            "H4" => self.text.push_str("\n#### "),
            "H5" => self.text.push_str("\n##### "),
            "H6" => self.text.push_str("\n###### "),
            "Paragraph" => {
                self.text.push_str("\n\n");
            }
            "HorizontalRule" => {
                self.text.push_str("\n---\n");
            }
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
