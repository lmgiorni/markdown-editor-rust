use crate::app::{MarkdownApp, ViewMode};
use eframe::egui;

pub fn show_toolbar(app: &mut MarkdownApp, ctx: &egui::Context) {
    egui::TopBottomPanel::top("toolbar").show(ctx, |ui| {
        ui.horizontal(|ui| {
            let btn = egui::Button::new;

            // === IZQUIERDA: MD, Stats, Config ===
            if ui.add(btn(if app.show_md_panel { "MD ✓" } else { "MD" }))
                .on_hover_text("Herramientas Markdown")
                .clicked()
            {
                    app.show_md_panel = !app.show_md_panel;
                }

            if ui.add(btn(if app.show_stats_window { "📊 Stats ✓" } else { "📊 Stats" }))
                .on_hover_text("Estadísticas del documento")
                .clicked()
            {
                app.show_stats_window = !app.show_stats_window;
            }

            let cfg_btn = btn(if app.show_config { "⚙ Config ✓" } else { "⚙ Config" });
            if ui.add(cfg_btn).on_hover_text("Configuración de fuentes y tamaños").clicked() {
                app.show_config = !app.show_config;
                }

            // === CENTRO: barra vertical + Split/Focus/Preview ===
            ui.separator();

            if ui.add(btn("↔ Split")).on_hover_text("Vista dividida").clicked() {
                app.view_mode = ViewMode::Split;
}
            if ui.add(btn("✍ Focus")).on_hover_text("Modo enfoque (solo editor)").clicked() {
                app.view_mode = ViewMode::Focus;
            }
            if ui.add(btn("👁 Preview")).on_hover_text("Solo vista previa").clicked() {
                app.view_mode = ViewMode::PreviewOnly;
            }

            // === DERECHA: nombre editable + New/Open/Save ===
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                // Botones de archivo
                if ui.add(btn("💾 Save")).on_hover_text("Guardar (Ctrl+S)").clicked() {
                    app.save_file();
                }
                if ui.add(btn("📂 Open")).on_hover_text("Abrir (Ctrl+O)").clicked() {
                    app.open_file();
                }
                if ui.add(btn("🆕 New")).on_hover_text("Nuevo (Ctrl+N)").clicked() {
                    app.new_document();
                }

                // Nombre de archivo editable
                let mut name = app.display_name.clone();
                if ui.text_edit_singleline(&mut name).changed() {
                    app.display_name = name.trim().to_string();
                    if app.display_name.is_empty() {
                        app.display_name = "Untitled".to_string();
                    }
                }

                // Indicador de cambios sin guardar
                if app.is_modified {
                    ui.label("*");
                }
            });
        });
    });
}

