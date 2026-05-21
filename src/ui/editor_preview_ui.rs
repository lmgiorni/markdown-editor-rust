use crate::app::{MarkdownApp, ViewMode};
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

                // Obtener los identificadores persistentes y jerárquicos exactos de los scroll areas de cada columna
                let editor_scroll_id = cols[0].make_persistent_id("editor_scroll");
                let preview_scroll_id = cols[1].make_persistent_id("preview_scroll");

                let mut editor_state = egui::scroll_area::State::load(ctx, editor_scroll_id).unwrap_or_default();
                let mut preview_state = egui::scroll_area::State::load(ctx, preview_scroll_id).unwrap_or_default();

                // Sincronización inteligente bidireccional basada en cambios reales de desplazamiento por porcentaje
                if (editor_state.offset.y - app.last_editor_scroll).abs() > 0.1 {
                    let fraction = (editor_state.offset.y / editor_max_scroll).clamp(0.0, 1.0);
                    let target_preview_y = fraction * preview_max_scroll;
                    preview_state.offset.y = target_preview_y;
                    preview_state.store(ctx, preview_scroll_id);
                    app.last_preview_scroll = target_preview_y;
                    app.last_editor_scroll = editor_state.offset.y;
                } else if (preview_state.offset.y - app.last_preview_scroll).abs() > 0.1 {
                    let fraction = (preview_state.offset.y / preview_max_scroll).clamp(0.0, 1.0);
                    let target_editor_y = fraction * editor_max_scroll;
                    editor_state.offset.y = target_editor_y;
                    editor_state.store(ctx, editor_scroll_id);
                    app.last_editor_scroll = target_editor_y;
                    app.last_preview_scroll = preview_state.offset.y;
                } else {
                    // Mantener sincronizados
                    app.last_editor_scroll = editor_state.offset.y;
                    app.last_preview_scroll = preview_state.offset.y;
                }

                // Columna 1: Editor con tipografía sincronizada y ancho máximo centrado de 700px
                cols[0].vertical(|ui| {
                    let family = app.editor_font.to_family();
                    let font_id = egui::FontId::new(app.base_font_size, family);

                    let scroll_output = egui::ScrollArea::vertical()
                        .id_source("editor_scroll")
                        .show(ui, |ui| {
                            let available_width = ui.available_width();
                            let content_width = available_width.min(700.0);
                            let margin = (available_width - content_width) / 2.0;

                            let inner_res = ui.horizontal(|ui| {
                                if margin > 0.0 {
                                    ui.add_space(margin);
                                }
                                ui.vertical(|ui| {
                                    ui.set_max_width(content_width);
                                    let size = egui::vec2(content_width, ui.available_height().max(400.0));
                                    ui.add_sized(
                                        size,
                                        egui::TextEdit::multiline(&mut app.text)
                                            .id(text_edit_id)
                                            .font(font_id)
                                    )
                                }).inner
                            });
                            inner_res.inner
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

                // Columna 2: Vista de Lectura (Read) con estética editorial premium
                cols[1].vertical(|ui| {
                    let bg_color = if ui.visuals().dark_mode {
                        egui::Color32::from_rgb(26, 26, 28) // Gris carbón suave (#1a1a1c)
                    } else {
                        egui::Color32::from_rgb(251, 249, 246) // Marfil crema (#fbf9f6)
                    };

                    egui::Frame::none()
                        .fill(bg_color)
                        .show(ui, |ui| {
                            ui.set_min_size(ui.available_size());
                            let scroll_output = egui::ScrollArea::vertical()
                                .id_source("preview_scroll")
                                .show(ui, |ui| {
                                    let available_width = ui.available_width();
                                    let content_width = available_width.min(700.0);
                                    let margin = (available_width - content_width) / 2.0;

                                    ui.horizontal(|ui| {
                                        if margin > 0.0 {
                                            ui.add_space(margin);
                                        }
                                        ui.vertical(|ui| {
                                            ui.set_max_width(content_width);
                                            render_markdown(ui, app, app.last_selection);
                                        });
                                    });
                                });
                            app.preview_content_height = scroll_output.content_size.y;
                        });
                });
            });
        } else if app.view_mode == ViewMode::Focus {
            // Modo Solo Editor a pantalla completa con limitación centrado de 700px
            ui.vertical(|ui| {
                let family = app.editor_font.to_family();
                let font_id = egui::FontId::new(app.base_font_size, family);

                let text_edit = egui::ScrollArea::vertical()
                    .id_source("focus_editor_scroll")
                    .show(ui, |ui| {
                        let available_width = ui.available_width();
                        let content_width = available_width.min(700.0);
                        let margin = (available_width - content_width) / 2.0;

                        let inner_res = ui.horizontal(|ui| {
                            if margin > 0.0 {
                                ui.add_space(margin);
                            }
                            ui.vertical(|ui| {
                                ui.set_max_width(content_width);
                                let size = egui::vec2(content_width, ui.available_height().max(500.0));
                                ui.add_sized(
                                    size,
                                    egui::TextEdit::multiline(&mut app.text)
                                        .id(text_edit_id)
                                        .font(font_id)
                                )
                            }).inner
                        });
                        inner_res.inner
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
            // Modo Solo Lectura (Read) a pantalla completa con estética editorial
            ui.vertical(|ui| {
                let bg_color = if ui.visuals().dark_mode {
                    egui::Color32::from_rgb(26, 26, 28) // Gris carbón suave (#1a1a1c)
                } else {
                    egui::Color32::from_rgb(251, 249, 246) // Marfil crema (#fbf9f6)
                };

                egui::Frame::none()
                    .fill(bg_color)
                    .show(ui, |ui| {
                        ui.set_min_size(ui.available_size());
                        let scroll_output = egui::ScrollArea::vertical()
                            .id_source("read_only_scroll")
                            .show(ui, |ui| {
                                let available_width = ui.available_width();
                                let content_width = available_width.min(700.0);
                                let margin = (available_width - content_width) / 2.0;

                                ui.horizontal(|ui| {
                                    if margin > 0.0 {
                                        ui.add_space(margin);
                                    }
                                    ui.vertical(|ui| {
                                        ui.set_max_width(content_width);
                                        render_markdown(ui, app, app.last_selection);
                                    });
                                });
                            });
                        let _ = scroll_output; // no se requiere persistir la altura del visor individual
                    });
            });
        }
    });
}
