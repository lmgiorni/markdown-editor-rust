use crate::app::{FontChoice, MarkdownApp};
use eframe::egui;

pub fn show_stats_panel(app: &MarkdownApp, ctx: &egui::Context) {
    if !app.show_stats_window {
        return;
    }

    egui::Window::new("Estadísticas")
        .collapsible(true)
        .resizable(true)
        .default_size(egui::vec2(300.0, 180.0))
        .show(ctx, |ui| {
            let (words, chars_no_spaces, chars_with_spaces, links) = app.compute_stats();

            ui.label("Estadísticas del documento:");
            ui.separator();

            egui::Grid::new("stats_grid").show(ui, |ui| {
                ui.label("Palabras:");
                ui.label(words.to_string());
                ui.end_row();

                ui.label("Caracteres (sin espacios):");
                ui.label(chars_no_spaces.to_string());
                ui.end_row();

                ui.label("Caracteres (con espacios):");
                ui.label(chars_with_spaces.to_string());
                ui.end_row();

                ui.label("Enlaces:");
                ui.label(links.to_string());
                ui.end_row();
            });

            ui.separator();
            if ui.add(egui::Button::new("Cerrar")).clicked() {
                // El toggle se controla desde toolbar_ui; aquí solo cerramos visualmente.
                ctx.send_viewport_cmd(egui::ViewportCommand::Close);
            }
        });
}

pub fn show_md_panel(app: &mut MarkdownApp, ctx: &egui::Context) {
    if !app.show_md_panel {
        return;
    }

    egui::SidePanel::right("md_panel")
        .default_width(200.0)
        .show(ctx, |ui| {
            ui.heading("Markdown Tools");
            ui.separator();

            let btn = egui::Button::new;

            if ui.add(btn("B Bold")).clicked() { app.apply_md_command("Bold"); }
            if ui.add(btn("I Italic")).clicked() { app.apply_md_command("Italic"); }
            if ui.add(btn("U Underline")).clicked() { app.apply_md_command("Underline"); }
            if ui.add(btn("S̶ Strikethrough")).clicked() { app.apply_md_command("Strikethrough"); }

            if ui.add(btn("[Link]")).clicked() { app.apply_md_command("Link"); }
            if ui.add(btn("![] Image")).clicked() { app.apply_md_command("Image"); }
            if ui.add(btn("| Table |")).clicked() { app.apply_md_command("Table"); }

            if ui.add(btn("- Unordered List")).clicked() { app.apply_md_command("UnorderedList"); }
            if ui.add(btn("1. Ordered List")).clicked() { app.apply_md_command("OrderedList"); }
            if ui.add(btn("[ ] Task List")).clicked() { app.apply_md_command("TaskList"); }

            if ui.add(btn("> Blockquote")).clicked() { app.apply_md_command("Blockquote"); }

            if ui.add(btn("` Inline Code")).clicked() { app.apply_md_command("InlineCode"); }
            if ui.add(btn("``` Block Code")).clicked() { app.apply_md_command("BlockCode"); }

            if ui.add(btn("$ Inline Math $")).clicked() { app.apply_md_command("InlineMath"); }
            if ui.add(btn("$$ Block Math $$")).clicked() { app.apply_md_command("BlockMath"); }

            ui.separator();
            ui.label("Headers:");
            egui::Grid::new("headers_grid").show(ui, |ui| {
                for (i, label) in ["H1","H2","H3","H4","H5","H6"].iter().enumerate() {
                    let cmd = format!("H{}", i + 1);
                    if ui.add(btn(label)).clicked() { app.apply_md_command(&cmd); }
                    ui.end_row();
                }
            });

            if ui.add(btn("¶ Paragraph")).clicked() { app.apply_md_command("Paragraph"); }
            if ui.add(btn("--- Horizontal Rule")).clicked() { app.apply_md_command("HorizontalRule"); }
        });
}

pub fn show_config_window(app: &mut MarkdownApp, ctx: &egui::Context) {
    if !app.show_config {
        return;
    }

    egui::Window::new("Configuración")
        .collapsible(true)
        .resizable(true)
        .default_size(egui::vec2(340.0, 520.0))
        .show(ctx, |ui| {
            ui.heading("Tipografía y tamaños");

            // Fuente del Editor
            egui::ComboBox::from_label("Fuente del Editor")
                .selected_text(match app.editor_font {
                    FontChoice::SansSerif => "Sans Serif",
                    FontChoice::Serif => "Serif",
                    FontChoice::Mono => "Monospace",
                })
                .show_ui(ui, |ui| {
                    ui.selectable_value(&mut app.editor_font, FontChoice::SansSerif, "Sans Serif");
                    ui.selectable_value(&mut app.editor_font, FontChoice::Serif, "Serif");
                    ui.selectable_value(&mut app.editor_font, FontChoice::Mono, "Monospace");
                });

            // Fuente del Preview
            egui::ComboBox::from_label("Fuente del Preview")
                .selected_text(match app.preview_font {
                    FontChoice::SansSerif => "Sans Serif",
                    FontChoice::Serif => "Serif",
                    FontChoice::Mono => "Monospace",
                })
                .show_ui(ui, |ui| {
                    ui.selectable_value(&mut app.preview_font, FontChoice::SansSerif, "Sans Serif");
                    ui.selectable_value(&mut app.preview_font, FontChoice::Serif, "Serif");
                    ui.selectable_value(&mut app.preview_font, FontChoice::Mono, "Monospace");
                });

            // Tamaño base afecta a editor y preview
            ui.add(egui::Slider::new(&mut app.base_font_size, 10.0..=24.0)
                .text("Tamaño base (editor + preview)"));

            ui.separator();
            ui.label("Vista previa de estilos (editor y preview):");

            egui::Frame::group(ui.style()).show(ui, |ui| {
                let size = app.base_font_size;

                // Editor style preview
                match app.editor_font {
                    FontChoice::Mono => {
                        ui.label(egui::RichText::new("Editor: Monospace")
                            .monospace().size(size));
                    }
                    FontChoice::Serif => {
                        ui.label(egui::RichText::new("Editor: Serif").size(size));
                    }
                    FontChoice::SansSerif => {
                        ui.label(egui::RichText::new("Editor: Sans Serif").size(size));
                    }
                }

                // Preview style preview
                match app.preview_font {
                    FontChoice::Mono => {
                        ui.label(egui::RichText::new("Preview: Monospace")
                            .monospace().size(size));
                    }
                    FontChoice::Serif => {
                        ui.label(egui::RichText::new("Preview: Serif").size(size));
                    }
                    FontChoice::SansSerif => {
                        ui.label(egui::RichText::new("Preview: Sans Serif").size(size));
                    }
                }

                // Ejemplos de formato
                ui.add_space(4.0);
                ui.label(egui::RichText::new("**Negrita** y *cursiva*").size(size));
                ui.label(egui::RichText::new("# Encabezado H1")
                    .size(size + 6.0).strong());
            });

            ui.separator();
            if ui.add(egui::Button::new("Cerrar")).clicked() {
                app.show_config = false;
            }
        });
}
