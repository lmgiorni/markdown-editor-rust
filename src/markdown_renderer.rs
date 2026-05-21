use eframe::egui;
use pulldown_cmark::{Parser, Event, Tag, TagEnd, Options, HeadingLevel};

#[derive(Clone)]
struct Style {
    strong: bool,
    emphasis: bool,
    strikethrough: bool,
}

impl Default for Style {
    fn default() -> Self {
        Self {
            strong: false,
            emphasis: false,
            strikethrough: false,
        }
    }
}

struct TextFragment {
    text: String,
    style: Style,
    heading_level: Option<u8>,
    is_link: Option<String>,
    is_inline_code: bool,
    range: std::ops::Range<usize>,
}

fn push_text_fragment(
    fragments: &mut Vec<TextFragment>,
    text: String,
    style: Style,
    heading_level: Option<u8>,
    is_link: Option<String>,
    is_inline_code: bool,
    range: std::ops::Range<usize>,
) {
    fragments.push(TextFragment {
        text,
        style,
        heading_level,
        is_link,
        is_inline_code,
        range,
    });
}

fn flush_fragments(
    ui: &mut egui::Ui,
    app: &mut crate::app::MarkdownApp,
    fragments: &mut Vec<TextFragment>,
    list_depth: usize,
) {
    if fragments.is_empty() {
        return;
    }

    ui.horizontal_wrapped(|ui| {
        if list_depth > 0 {
            let indent = (list_depth as f32) * (app.base_font_size * 1.5);
            ui.add_space(indent);
            let bullet_color = if ui.visuals().dark_mode {
                egui::Color32::from_rgb(180, 180, 180)
            } else {
                egui::Color32::from_rgb(100, 100, 100)
            };
            ui.label(egui::RichText::new("• ")
                .strong()
                .size(app.base_font_size)
                .color(bullet_color));
        }

        for frag in fragments.iter() {
            let family = app.preview_font.to_family();

            // Determinar partes del texto según la selección
            let mut sub_parts = vec![];
            
            let is_selected_any = if let Some((sel_start_char, sel_end_char)) = app.last_selection {
                if sel_start_char < sel_end_char {
                    let frag_start_char = app.cached_byte_to_char(frag.range.start);
                    let frag_end_char = app.cached_byte_to_char(frag.range.end);
                    
                    let int_start = frag_start_char.max(sel_start_char);
                    let int_end = frag_end_char.min(sel_end_char);
                    
                    if int_start < int_end {
                        let chars: Vec<char> = frag.text.chars().collect();
                        let rel_start = int_start.saturating_sub(frag_start_char).min(chars.len());
                        let rel_end = int_end.saturating_sub(frag_start_char).min(chars.len());
                        
                        let part1: String = chars[..rel_start].iter().collect();
                        let part2: String = chars[rel_start..rel_end].iter().collect();
                        let part3: String = chars[rel_end..].iter().collect();
                        
                        if !part1.is_empty() {
                            sub_parts.push((part1, false));
                        }
                        if !part2.is_empty() {
                            sub_parts.push((part2, true));
                        }
                        if !part3.is_empty() {
                            sub_parts.push((part3, false));
                        }
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            } else {
                false
            };

            if !is_selected_any {
                sub_parts.push((frag.text.clone(), false));
            }

            let text_color = if ui.visuals().dark_mode {
                egui::Color32::from_rgb(224, 224, 224) // #e0e0e0
            } else {
                egui::Color32::from_rgb(44, 44, 44) // #2c2c2c
            };

            for (text_part, is_part_selected) in sub_parts {
                let mut font_size = app.base_font_size;
                let mut is_strong = frag.style.strong;

                if let Some(level) = frag.heading_level {
                    match level {
                        1 => { font_size = app.base_font_size * 2.0; is_strong = true; }
                        2 => { font_size = app.base_font_size * 1.6; is_strong = true; }
                        3 => { font_size = app.base_font_size * 1.3; is_strong = true; }
                        4 => { font_size = app.base_font_size * 1.15; is_strong = true; }
                        5 => { font_size = app.base_font_size; is_strong = true; }
                        _ => { font_size = app.base_font_size - 1.0; }
                    }
                }

                let color = if frag.is_link.is_some() {
                    ui.visuals().hyperlink_color
                } else if frag.is_inline_code {
                    egui::Color32::from_rgb(210, 80, 80)
                } else if is_strong {
                    if ui.visuals().dark_mode {
                        egui::Color32::from_rgb(255, 255, 255)
                    } else {
                        egui::Color32::from_rgb(0, 0, 0)
                    }
                } else {
                    text_color
                };

                let bg_color = if is_part_selected {
                    egui::Color32::from_rgba_unmultiplied(100, 150, 255, 60)
                } else if frag.is_inline_code {
                    egui::Color32::from_black_alpha(20)
                } else {
                    egui::Color32::TRANSPARENT
                };

                let format = egui::text::TextFormat {
                    font_id: egui::FontId {
                        size: font_size,
                        family: if frag.is_inline_code { egui::FontFamily::Monospace } else { family.clone() },
                    },
                    color,
                    background: bg_color,
                    italics: frag.style.emphasis,
                    strikethrough: if frag.style.strikethrough { egui::Stroke::new(1.0, color) } else { egui::Stroke::NONE },
                    ..Default::default()
                };

                let mut job = egui::text::LayoutJob::single_section(text_part, format);
                job.wrap.break_anywhere = true;
                job.wrap.max_width = ui.available_width();

                let response = if let Some(ref url) = frag.is_link {
                    ui.hyperlink_to(job, url)
                } else {
                    let label = egui::Label::new(job).sense(egui::Sense::click());
                    ui.add(label)
                };

                if is_part_selected && app.should_scroll_to_selection {
                    response.scroll_to_me(Some(egui::Align::Center));
                    app.should_scroll_to_selection = false;
                }

                // Sincronización a la inversa
                if response.clicked() {
                    app.last_cursor = app.cached_byte_to_char(frag.range.start);
                    app.last_selection = None;
                    app.should_scroll_to_selection = true; // enfocar editor
                }
            }
        }
    });

    fragments.clear();
}

fn render_math_block(ui: &mut egui::Ui, app: &mut crate::app::MarkdownApp, text: &str) {
    let clean_text = text.trim_start_matches("$$").trim_end_matches("$$").trim();
    
    egui::Frame::none()
        .fill(egui::Color32::from_black_alpha(6))
        .inner_margin(egui::Margin::symmetric(16.0, 10.0))
        .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(210, 210, 210)))
        .rounding(egui::Rounding::same(6.0))
        .show(ui, |ui| {
            ui.vertical_centered(|ui| {
                let rt = egui::RichText::new(clean_text)
                    .family(egui::FontFamily::Name("serif".into()))
                    .italics()
                    .size(app.base_font_size + 2.0)
                    .color(egui::Color32::from_rgb(50, 55, 60));
                ui.label(rt);
            });
        });
    ui.add_space(8.0);
}

fn render_image<'a, I>(
    ui: &mut egui::Ui,
    app: &mut crate::app::MarkdownApp,
    dest_url: &str,
    events: &mut std::iter::Peekable<I>,
) where
    I: Iterator<Item = (Event<'a>, std::ops::Range<usize>)>,
{
    let mut alt_text = String::new();
    while let Some(&(ref event, _)) = events.peek() {
        if matches!(event, Event::End(TagEnd::Image)) {
            events.next();
            break;
        }
        if let Some((evt, _)) = events.next() {
            if let Event::Text(t) = evt {
                alt_text.push_str(&t);
            }
        }
    }

    if alt_text.is_empty() {
        alt_text = "Imagen de Internet".to_string();
    }

    egui::Frame::none()
        .stroke(egui::Stroke::new(1.0, egui::Color32::from_rgb(180, 200, 220)))
        .fill(egui::Color32::from_rgb(240, 245, 250))
        .rounding(egui::Rounding::same(8.0))
        .inner_margin(egui::Margin::same(12.0))
        .show(ui, |ui| {
            ui.vertical_centered(|ui| {
                ui.label(egui::RichText::new("🖼").size(24.0));
                ui.add_space(4.0);
                ui.label(egui::RichText::new(&alt_text).strong().size(app.base_font_size));
                ui.add_space(2.0);
                ui.hyperlink_to(dest_url, dest_url);
            });
        });
    ui.add_space(8.0);
}

fn render_blockquote<'a, I>(
    ui: &mut egui::Ui,
    app: &mut crate::app::MarkdownApp,
    events: &mut std::iter::Peekable<I>,
    style_stack: &mut Vec<Style>,
    list_depth: usize,
) where
    I: Iterator<Item = (Event<'a>, std::ops::Range<usize>)>,
{
    egui::Frame::none()
        .fill(egui::Color32::from_black_alpha(8))
        .inner_margin(egui::Margin { left: 16.0, right: 12.0, top: 8.0, bottom: 8.0 })
        .rounding(egui::Rounding::same(4.0))
        .show(ui, |ui| {
            let rect = ui.max_rect();
            let line_start = egui::pos2(rect.left() + 4.0, rect.top() + 4.0);
            let line_end = egui::pos2(rect.left() + 4.0, rect.bottom() - 4.0);
            ui.painter().line_segment(
                [line_start, line_end],
                egui::Stroke::new(4.0, egui::Color32::from_rgb(90, 140, 210)),
            );

            let mut fragments = Vec::new();
            let mut active_link = None;

            while let Some(&(ref event, ref _range)) = events.peek() {
                if matches!(event, Event::End(TagEnd::BlockQuote)) {
                    events.next();
                    break;
                }

                let (evt, rng) = events.next().unwrap();
                match evt {
                    Event::Text(t) => {
                        let mut style = style_stack.last().cloned().unwrap_or_default();
                        style.emphasis = true;
                        push_text_fragment(&mut fragments, t.to_string(), style, None, active_link.clone(), false, rng);
                    }
                    Event::Code(t) => {
                        let style = style_stack.last().cloned().unwrap_or_default();
                        push_text_fragment(&mut fragments, t.to_string(), style, None, active_link.clone(), true, rng);
                    }
                    Event::Start(Tag::Strong) => {
                        let mut s = style_stack.pop().unwrap_or_default();
                        s.strong = true;
                        style_stack.push(s);
                    }
                    Event::End(TagEnd::Strong) => {
                        let mut s = style_stack.pop().unwrap_or_default();
                        s.strong = false;
                        style_stack.push(s);
                    }
                    Event::Start(Tag::Emphasis) => {
                        let mut s = style_stack.pop().unwrap_or_default();
                        s.emphasis = true;
                        style_stack.push(s);
                    }
                    Event::End(TagEnd::Emphasis) => {
                        let mut s = style_stack.pop().unwrap_or_default();
                        s.emphasis = false;
                        style_stack.push(s);
                    }
                    Event::Start(Tag::Link { dest_url, .. }) => {
                        active_link = Some(dest_url.to_string());
                    }
                    Event::End(TagEnd::Link) => {
                        active_link = None;
                    }
                    Event::SoftBreak | Event::HardBreak => {
                        fragments.push(TextFragment {
                            text: " ".to_string(),
                            style: Style { strong: false, emphasis: true, strikethrough: false },
                            heading_level: None,
                            is_link: None,
                            is_inline_code: false,
                            range: rng,
                        });
                    }
                    Event::End(TagEnd::Paragraph) => {
                        flush_fragments(ui, app, &mut fragments, list_depth);
                        ui.add_space(4.0);
                    }
                    _ => {}
                }
            }
            flush_fragments(ui, app, &mut fragments, list_depth);
        });
    ui.add_space(6.0);
}

fn render_table<'a, I>(
    ui: &mut egui::Ui,
    app: &mut crate::app::MarkdownApp,
    events: &mut std::iter::Peekable<I>,
) where
    I: Iterator<Item = (Event<'a>, std::ops::Range<usize>)>,
{
    let mut rows: Vec<Vec<Vec<(Event, std::ops::Range<usize>)>>> = Vec::new();
    let mut current_row: Vec<Vec<(Event, std::ops::Range<usize>)>> = Vec::new();
    let mut current_cell: Vec<(Event, std::ops::Range<usize>)> = Vec::new();

    while let Some(&(ref event, _)) = events.peek() {
        if matches!(event, Event::End(TagEnd::Table)) {
            events.next();
            break;
        }

        let (evt, rng) = events.next().unwrap();
        match evt {
            Event::Start(Tag::TableRow) => {
                current_row.clear();
            }
            Event::End(TagEnd::TableRow) => {
                rows.push(current_row.clone());
            }
            Event::Start(Tag::TableCell) => {
                current_cell.clear();
            }
            Event::End(TagEnd::TableCell) => {
                current_row.push(current_cell.clone());
            }
            _ => {
                current_cell.push((evt, rng));
            }
        }
    }

    if rows.is_empty() {
        return;
    }

    // Calcular el número máximo de columnas en la tabla para distribuir el espacio proporcionalmente
    let num_cols = rows.iter().map(|r| r.len()).max().unwrap_or(1);
    let num_cols_f32 = num_cols as f32;
    let spacing_x = 16.0;
    
    // Ancho total disponible en el panel
    let available_width = ui.available_width();
    
    // Descontar márgenes internos y espacios entre columnas para estimar el ancho equitativo
    let min_col_width = ((available_width - 20.0 - (spacing_x * (num_cols_f32 - 1.0))) / num_cols_f32).max(40.0);

    egui::Frame::none()
        .stroke(egui::Stroke::new(1.0, egui::Color32::from_gray(200)))
        .fill(egui::Color32::from_black_alpha(4))
        .inner_margin(egui::Margin::same(10.0))
        .rounding(egui::Rounding::same(6.0))
        .show(ui, |ui| {
            egui::Grid::new(ui.next_auto_id())
                .striped(true)
                .spacing(egui::vec2(spacing_x, 8.0))
                .min_col_width(min_col_width)
                .show(ui, |ui| {
                    for (row_idx, row) in rows.iter().enumerate() {
                        for cell in row.iter() {
                            ui.vertical(|ui| {
                                let mut fragments = Vec::new();
                                let mut style_stack = vec![Style::default()];
                                let active_link = None;

                                for (evt, rng) in cell.iter().cloned() {
                                    match evt {
                                        Event::Text(t) => {
                                            let mut style = style_stack.last().cloned().unwrap_or_default();
                                            if row_idx == 0 {
                                                style.strong = true;
                                            }
                                            push_text_fragment(&mut fragments, t.to_string(), style, None, active_link.clone(), false, rng);
                                        }
                                        Event::Code(t) => {
                                            let style = style_stack.last().cloned().unwrap_or_default();
                                            push_text_fragment(&mut fragments, t.to_string(), style, None, active_link.clone(), true, rng);
                                        }
                                        Event::Start(Tag::Strong) => {
                                            let mut s = style_stack.pop().unwrap_or_default();
                                            s.strong = true;
                                            style_stack.push(s);
                                        }
                                        Event::End(TagEnd::Strong) => {
                                            let mut s = style_stack.pop().unwrap_or_default();
                                            s.strong = false;
                                            style_stack.push(s);
                                        }
                                        Event::Start(Tag::Emphasis) => {
                                            let mut s = style_stack.pop().unwrap_or_default();
                                            s.emphasis = true;
                                            style_stack.push(s);
                                        }
                                        Event::End(TagEnd::Emphasis) => {
                                            let mut s = style_stack.pop().unwrap_or_default();
                                            s.emphasis = false;
                                            style_stack.push(s);
                                        }
                                        _ => {}
                                    }
                                }
                                flush_fragments(ui, app, &mut fragments, 0);
                            });
                        }
                        ui.end_row();
                    }
                });
        });
    ui.add_space(8.0);
}

pub fn render_markdown(
    ui: &mut egui::Ui,
    app: &mut crate::app::MarkdownApp,
    _last_selection: Option<(usize, usize)>,
) {
    ui.style_mut().wrap = Some(true);
    app.rebuild_byte_to_char_cache();
    let doc_text = app.text.clone();
    let options = Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TABLES;
    let parser = Parser::new_ext(&doc_text, options);
    let mut events = parser.into_offset_iter().peekable();

    let mut in_code_block = false;
    let mut code_text = String::new();

    let mut list_depth: usize = 0;
    let mut heading_level: Option<u8> = None;
    let mut style_stack: Vec<Style> = vec![Style::default()];
    let mut active_link: Option<String> = None;
    let mut fragments: Vec<TextFragment> = Vec::new();

    // Espaciado vertical entre bloques (interlineado emulado)
    ui.spacing_mut().item_spacing.y = app.base_font_size * 0.6;

    // Padding editorial premium (superior/inferior generoso, laterales holgados)
    let page_margin = egui::Margin {
        left: 30.0,
        right: 30.0,
        top: 40.0,
        bottom: 40.0,
    };

    egui::Frame::none().inner_margin(page_margin).show(ui, |ui| {
        while let Some((event, range)) = events.next() {
            match event {
                // Code block
                Event::Start(Tag::CodeBlock(_)) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    in_code_block = true;
                    code_text.clear();
                    ui.add_space(4.0);
                }
                Event::End(TagEnd::CodeBlock) => {
                    in_code_block = false;
                    let rt = egui::RichText::new(code_text.trim_end_matches('\n'))
                        .font(egui::FontId::monospace(app.base_font_size));
                    ui.add_space(2.0);
                    egui::ScrollArea::horizontal()
                        .show(ui, |ui| {
                            ui.label(rt);
                        });
                    code_text.clear();
                }

                // Headings
                Event::Start(Tag::Heading { level, .. }) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    let lvl = match level {
                        HeadingLevel::H1 => 1,
                        HeadingLevel::H2 => 2,
                        HeadingLevel::H3 => 3,
                        HeadingLevel::H4 => 4,
                        HeadingLevel::H5 => 5,
                        HeadingLevel::H6 => 6,
                    };
                    heading_level = Some(lvl);

                    // Margen superior dinámico para jerarquía editorial
                    let top_space = match lvl {
                        1 => 0.0,
                        2 => app.base_font_size * 2.5,
                        3 => app.base_font_size * 2.0,
                        _ => app.base_font_size * 1.2,
                    };
                    if top_space > 0.0 {
                        ui.add_space(top_space);
                    }
                }
                Event::End(TagEnd::Heading(_)) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    
                    // Margen inferior dinámico según el nivel
                    let bottom_space = match heading_level {
                        Some(1) => app.base_font_size * 1.8,
                        Some(2) => app.base_font_size * 1.0,
                        Some(3) => app.base_font_size * 0.8,
                        _ => app.base_font_size * 0.6,
                    };
                    heading_level = None;
                    ui.add_space(bottom_space);
                }

                // Paragraphs
                Event::Start(Tag::Paragraph) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                }
                Event::End(TagEnd::Paragraph) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    ui.add_space(app.base_font_size * 1.6);
                }

                // Lists
                Event::Start(Tag::List(Some(start))) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    list_depth += 1;
                    let _ = start;
                }
                Event::Start(Tag::List(None)) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    list_depth += 1;
                }
                Event::End(TagEnd::List(_)) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    if list_depth > 0 {
                        list_depth -= 1;
                    }
                    ui.add_space(4.0);
                }

                // List items
                Event::Start(Tag::Item) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                }
                Event::End(TagEnd::Item) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    ui.end_row();
                    ui.add_space(app.base_font_size * 0.5); // Margen inferior que hace "respirar" la lista
                }

                // Blockquote
                Event::Start(Tag::BlockQuote) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    render_blockquote(ui, app, &mut events, &mut style_stack, list_depth);
                }
                Event::End(TagEnd::BlockQuote) => {}

                // Tables
                Event::Start(Tag::Table(_)) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    render_table(ui, app, &mut events);
                }
                Event::End(TagEnd::Table) => {}

                // Inline styles
                Event::Start(Tag::Strong) => {
                    let mut s = style_stack.pop().unwrap_or_default();
                    s.strong = true;
                    style_stack.push(s);
                }
                Event::End(TagEnd::Strong) => {
                    let mut s = style_stack.pop().unwrap_or_default();
                    s.strong = false;
                    style_stack.push(s);
                }

                Event::Start(Tag::Emphasis) => {
                    let mut s = style_stack.pop().unwrap_or_default();
                    s.emphasis = true;
                    style_stack.push(s);
                }
                Event::End(TagEnd::Emphasis) => {
                    let mut s = style_stack.pop().unwrap_or_default();
                    s.emphasis = false;
                    style_stack.push(s);
                }

                Event::Start(Tag::Strikethrough) => {
                    let mut s = style_stack.pop().unwrap_or_default();
                    s.strikethrough = true;
                    style_stack.push(s);
                }
                Event::End(TagEnd::Strikethrough) => {
                    let mut s = style_stack.pop().unwrap_or_default();
                    s.strikethrough = false;
                    style_stack.push(s);
                }

                // Links
                Event::Start(Tag::Link { dest_url, .. }) => {
                    active_link = Some(dest_url.to_string());
                }
                Event::End(TagEnd::Link) => {
                    active_link = None;
                }

                // Images
                Event::Start(Tag::Image { dest_url, .. }) => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    render_image(ui, app, &dest_url, &mut events);
                }
                Event::End(TagEnd::Image) => {}

                // Horizontal rule
                Event::Rule => {
                    flush_fragments(ui, app, &mut fragments, list_depth);
                    ui.separator();
                    ui.add_space(4.0);
                }

                // Text
                Event::Text(t) => {
                    if in_code_block {
                        code_text.push_str(&t);
                        continue;
                    }

                    if t.starts_with("$$") && t.ends_with("$$") {
                        flush_fragments(ui, app, &mut fragments, list_depth);
                        render_math_block(ui, app, &t);
                        continue;
                    }

                    let current_style = style_stack.last().cloned().unwrap_or_default();
                    push_text_fragment(&mut fragments, t.to_string(), current_style, heading_level, active_link.clone(), false, range);
                }

                // Inline code
                Event::Code(t) => {
                    let current_style = style_stack.last().cloned().unwrap_or_default();
                    push_text_fragment(&mut fragments, t.to_string(), current_style, heading_level, active_link.clone(), true, range);
                }

                // Soft/Hard break
                Event::SoftBreak | Event::HardBreak => {
                    if !in_code_block && heading_level.is_none() {
                        fragments.push(TextFragment {
                            text: " ".to_string(),
                            style: Style::default(),
                            heading_level: None,
                            is_link: None,
                            is_inline_code: false,
                            range,
                        });
                    }
                }

                _ => {}
            }
        }
        flush_fragments(ui, app, &mut fragments, list_depth);
    });
}
