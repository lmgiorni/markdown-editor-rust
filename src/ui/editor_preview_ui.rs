use crate::app::{FontChoice, MarkdownApp, ViewMode};
use crate::markdown_renderer::render_markdown;
use eframe::egui;

pub fn show_central_panel(app: &mut MarkdownApp, ctx: &egui::Context) {
    egui::CentralPanel::default().show(ctx, |ui| {
        egui::ScrollArea::vertical().show(ui, |ui| {
            if app.view_mode == ViewMode::Split {
                ui.columns(2, |cols| {
                    // Editor
                    cols[0].vertical(|ui| {
                        let font_style = match app.editor_font {
                            FontChoice::Mono => egui::TextStyle::Monospace,
                            _ => egui::TextStyle::Body,
                        };

                        let text_edit = ui.add(egui::TextEdit::multiline(&mut app.text)
                            .font(font_style)
                            .desired_width(f32::INFINITY));

                        if text_edit.changed() {
                            app.is_modified = true;
                        }
                    });

                    // Preview
                    cols[1].vertical(|ui| {
                        render_markdown(ui, &app.text, app.base_font_size);
                    });
                });
            } else if app.view_mode == ViewMode::Focus {
                ui.vertical(|ui| {
                    let font_style = match app.editor_font {
                        FontChoice::Mono => egui::TextStyle::Monospace,
                        _ => egui::TextStyle::Body,
                    };

                    let text_edit = ui.add(egui::TextEdit::multiline(&mut app.text)
                        .font(font_style)
                        .desired_width(f32::INFINITY));

                    if text_edit.changed() {
                        app.is_modified = true;
                    }
                });
            } else {
                // PreviewOnly
                ui.vertical(|ui| {
                    render_markdown(ui, &app.text, app.base_font_size);
                });
            }
        });
    });
}

