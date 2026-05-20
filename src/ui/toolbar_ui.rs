use crate::app::{MarkdownApp, ViewMode};
use eframe::egui;

pub fn show_toolbar(app: &mut MarkdownApp, ctx: &egui::Context) {
    egui::TopBottomPanel::top("toolbar").show(ctx, |ui| {
        ui.horizontal(|ui| {
            // === IZQUIERDA: New, Open, Save, Nombre ===
            if ui.add(egui::Button::new("🆕 New")).on_hover_text("Nuevo (Ctrl+N)").clicked() {
                app.new_document();
            }
            if ui.add(egui::Button::new("📂 Open")).on_hover_text("Abrir (Ctrl+O)").clicked() {
                app.open_file();
            }
            if ui.add(egui::Button::new("💾 Save")).on_hover_text("Guardar (Ctrl+S)").clicked() {
                app.save_file();
            }

            ui.separator();

            ui.label("Documento:");
            let mut name = app.display_name.clone();
            if ui.text_edit_singleline(&mut name).changed() {
                app.display_name = name.trim().to_string();
                if app.display_name.is_empty() {
                    app.display_name = "Untitled".to_string();
                }
            }

            if app.is_modified {
                ui.label("*");
            }

            // === CENTRO EXACTO: línea divisoria ===
            let total_width = ui.clip_rect().width();
            let center_x = ui.clip_rect().min.x + total_width / 2.0;
            let current_x = ui.cursor().min.x;

            if current_x < center_x {
                ui.add_space(center_x - current_x);
            }
            ui.separator();

            // === CENTRO-DERECHA: Split, Focus, Read ===
            if ui.add(egui::Button::new("↔ Split")).on_hover_text("Vista dividida").clicked() {
                app.view_mode = ViewMode::Split;
                app.should_scroll_to_selection = true;
            }
            if ui.add(egui::Button::new("✍ Focus")).on_hover_text("Modo enfoque (solo editor)").clicked() {
                app.view_mode = ViewMode::Focus;
                app.should_scroll_to_selection = true;
            }
            if ui.add(egui::Button::new("👁 Read")).on_hover_text("Solo vista de lectura").clicked() {
                app.view_mode = ViewMode::PreviewOnly;
                app.should_scroll_to_selection = true;
            }

            // === DERECHA (Margen Derecho): MD, Stats, Config ===
            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                let cfg_btn = egui::Button::new(if app.show_config { "⚙ Config ✓" } else { "⚙ Config" });
                if ui.add(cfg_btn).on_hover_text("Configuración de fuentes y tamaños").clicked() {
                    app.show_config = !app.show_config;
                }

                let stats_btn = egui::Button::new(if app.show_stats_window { "📊 Stats ✓" } else { "📊 Stats" });
                if ui.add(stats_btn).on_hover_text("Estadísticas del documento").clicked() {
                    app.show_stats_window = !app.show_stats_window;
                }

                let md_btn = egui::Button::new(if app.show_md_panel { "📝 MD ✓" } else { "📝 MD" });
                if ui.add(md_btn).on_hover_text("Herramientas Markdown").clicked() {
                    app.show_md_panel = !app.show_md_panel;
                }
            });
        });
    });
}
