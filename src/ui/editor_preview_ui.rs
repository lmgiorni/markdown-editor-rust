use crate::app::{FontChoice, MarkdownApp, ViewMode};
use crate::markdown_renderer::render_markdown;
use eframe::egui;

pub fn show_central_panel(app: &mut MarkdownApp, ctx: &egui::Context) {
    // 1. Sincronizar el cursor del editor si hubo selección/clic en el visor de lectura
    let text_edit_id = egui::Id::new("editor_text_edit");
    if let Some(mut state) = egui::widgets::text_edit::TextEditState::load(ctx, text_edit_id) {
        let current_idx = state.cursor.char_range().map(|r| r.primary.index).unwrap_or(0);
        if app.last_cursor != current_idx && app.last_selection.is_none() {
            let ccursor = egui::text::CCursor::new(app.last_cursor);
            state.cursor.set_char_range(Some(egui::text::CCursorRange::one(ccursor)));
            state.store(ctx, text_edit_id);
        }
    }

    // 2. Controlar la señal de foco al cambiar la selección en el editor
    if app.last_selection != app.previous_selection {
        if app.last_selection.is_some() {
            app.should_scroll_to_selection = true;
        }
        app.previous_selection = app.last_selection;
    }

    egui::CentralPanel::default().show(ctx, |ui| {
        if app.view_mode == ViewMode::Split {
            ui.columns(2, |cols| {
                let visible_height = cols[0].available_height();
                
                let editor_max_scroll = (app.editor_content_height - visible_height).max(1.0);
                let preview_max_scroll = (app.preview_content_height - visible_height).max(1.0);

                let mut editor_state = egui::scroll_area::State::load(ctx, egui::Id::new("editor_scroll")).unwrap_or_default();
                let mut preview_state = egui::scroll_area::State::load(ctx, egui::Id::new("preview_scroll")).unwrap_or_default();

                // Sincronización inteligente bidireccional basada en cambios reales de desplazamiento (scroll)
                if (editor_state.offset.y - app.last_editor_scroll).abs() > 0.1 {
                    let fraction = (editor_state.offset.y / editor_max_scroll).clamp(0.0, 1.0);
                    let target_preview_y = fraction * preview_max_scroll;
                    preview_state.offset.y = target_preview_y;
                    preview_state.store(ctx, egui::Id::new("preview_scroll"));
                    app.last_preview_scroll = target_preview_y;
                    app.last_editor_scroll = editor_state.offset.y;
                } else if (preview_state.offset.y - app.last_preview_scroll).abs() > 0.1 {
                    let fraction = (preview_state.offset.y / preview_max_scroll).clamp(0.0, 1.0);
                    let target_editor_y = fraction * editor_max_scroll;
                    editor_state.offset.y = target_editor_y;
                    editor_state.store(ctx, egui::Id::new("editor_scroll"));
                    app.last_editor_scroll = target_editor_y;
                    app.last_preview_scroll = preview_state.offset.y;
                } else {
                    // Mantener sincronizados
                    app.last_editor_scroll = editor_state.offset.y;
                    app.last_preview_scroll = preview_state.offset.y;
                }

                // Columna 1: Editor con tipografía sincronizada
                cols[0].vertical(|ui| {
                    let family = match app.editor_font {
                        FontChoice::SansSerif => egui::FontFamily::Proportional,
                        FontChoice::Serif => egui::FontFamily::Name("serif".into()),
                        FontChoice::Mono => egui::FontFamily::Monospace,
                    };
                    let font_id = egui::FontId::new(app.base_font_size, family);

                    let scroll_output = egui::ScrollArea::vertical()
                        .id_source("editor_scroll")
                        .show(ui, |ui| {
                            ui.add_sized(
                                ui.available_size(),
                                egui::TextEdit::multiline(&mut app.text)
                                    .id(text_edit_id)
                                    .font(font_id)
                            )
                        });
                    
                    app.editor_content_height = scroll_output.content_size.y;
                    let text_edit = scroll_output.inner;

                    if text_edit.changed() {
                        app.is_modified = true;
                    }

                    // Capturar el cursor y la selección en tiempo real
                    if let Some(state) = egui::TextEdit::load_state(ctx, text_edit_id) {
                        if let Some(range) = state.cursor.char_range() {
                            app.last_cursor = range.primary.index;
                            if range.primary.index != range.secondary.index {
                                app.last_selection = Some((
                                    range.primary.index.min(range.secondary.index),
                                    range.primary.index.max(range.secondary.index),
                                ));
                            } else {
                                app.last_selection = None;
                            }
                        }
                    }
                });

                // Columna 2: Vista de Lectura (Read) con scroll independiente y sincronizado
                cols[1].vertical(|ui| {
                    let scroll_output = egui::ScrollArea::vertical()
                        .id_source("preview_scroll")
                        .show(ui, |ui| {
                            render_markdown(ui, app, app.last_selection);
                        });
                    app.preview_content_height = scroll_output.content_size.y;
                });
            });
        } else if app.view_mode == ViewMode::Focus {
            // Modo Solo Editor a pantalla completa
            ui.vertical(|ui| {
                let family = match app.editor_font {
                    FontChoice::SansSerif => egui::FontFamily::Proportional,
                    FontChoice::Serif => egui::FontFamily::Name("serif".into()),
                    FontChoice::Mono => egui::FontFamily::Monospace,
                };
                let font_id = egui::FontId::new(app.base_font_size, family);

                let text_edit = egui::ScrollArea::vertical()
                    .id_source("focus_editor_scroll")
                    .show(ui, |ui| {
                        ui.add_sized(
                            ui.available_size(),
                            egui::TextEdit::multiline(&mut app.text)
                                .id(text_edit_id)
                                .font(font_id)
                        )
                    }).inner;

                if text_edit.changed() {
                    app.is_modified = true;
                }

                // Capturar cursor y selección
                if let Some(state) = egui::TextEdit::load_state(ctx, text_edit_id) {
                    if let Some(range) = state.cursor.char_range() {
                        app.last_cursor = range.primary.index;
                        if range.primary.index != range.secondary.index {
                            app.last_selection = Some((
                                range.primary.index.min(range.secondary.index),
                                range.primary.index.max(range.secondary.index),
                            ));
                        } else {
                            app.last_selection = None;
                        }
                    }
                }
            });
        } else {
            // Modo Solo Lectura (Read) a pantalla completa
            ui.vertical(|ui| {
                egui::ScrollArea::vertical()
                    .id_source("read_only_scroll")
                    .show(ui, |ui| {
                        render_markdown(ui, app, app.last_selection);
                    });
            });
        }
    });
}
