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

pub fn render_markdown(ui: &mut egui::Ui, text: &str, base_font_size: f32) {
    let options = Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TABLES;
    let parser = Parser::new_ext(text, options);

    let mut in_code_block = false;
    let mut code_text = String::new();

    let mut list_depth: usize = 0;
    let mut heading_level: Option<u8> = None;
    let mut style_stack: Vec<Style> = vec![Style::default()];

    egui::Frame::none().inner_margin(16.0).show(ui, |ui| {
        for event in parser {
            match event {
                // Code block
                Event::Start(Tag::CodeBlock(_)) => {
                    in_code_block = true;
                    code_text.clear();
                    ui.add_space(4.0);
                }
                Event::End(TagEnd::CodeBlock) => {
                    in_code_block = false;
                    let rt = egui::RichText::new(code_text.trim_end_matches('\n'))
                        .font(egui::FontId::monospace(base_font_size));
                    ui.add_space(2.0);
                    egui::ScrollArea::horizontal()
                        .show(ui, |ui| {
                            ui.label(rt);
                        });
                    code_text.clear();
                }

                // Headings
                Event::Start(Tag::Heading { level, .. }) => {
                    heading_level = Some(match level {
                        HeadingLevel::H1 => 1,
                        HeadingLevel::H2 => 2,
                        HeadingLevel::H3 => 3,
                        HeadingLevel::H4 => 4,
                        HeadingLevel::H5 => 5,
                        HeadingLevel::H6 => 6,
                    });
                }
                Event::End(TagEnd::Heading(_)) => {
                    heading_level = None;
                    ui.add_space(6.0);
                }

                // Paragraphs
                Event::Start(Tag::Paragraph) => {}
                Event::End(TagEnd::Paragraph) => {
                    ui.add_space(4.0);
                }

                // Lists
                Event::Start(Tag::List(Some(start))) => {
                    list_depth += 1;
                    let _ = start;
                }
                Event::Start(Tag::List(None)) => {
                    list_depth += 1;
                }
                Event::End(TagEnd::List(_)) => {
                    if list_depth > 0 {
                        list_depth -= 1;
                    }
                    ui.add_space(4.0);
                }

                // List items
                Event::Start(Tag::Item) => {}
                Event::End(TagEnd::Item) => {
                    ui.end_row();
                }

                // Blockquote (unit variant in this version)
                Event::Start(Tag::BlockQuote) => {
                    egui::Frame::none()
                        .outer_margin(egui::Margin::same(10.0))
                        .show(ui, |ui| {
                            ui.add_space(0.0);
                        });
                }
                Event::End(TagEnd::BlockQuote) => {
                    ui.add_space(4.0);
                }

                // Inline styles: Strong / Emphasis / Strikethrough
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

                // Links (struct variant in this version)
                Event::Start(Tag::Link { dest_url, .. }) => {
                    ui.horizontal_wrapped(|ui| {
                        ui.add_space(0.0);
                    });
                    let _ = dest_url;
                }
                Event::End(TagEnd::Link) => {}

                // Images (struct variant in this version)
                Event::Start(Tag::Image { dest_url, .. }) => {
                    ui.label(egui::RichText::new(format!("[Imagen: {}]", dest_url))
                        .size(base_font_size - 1.0).weak());
                }
                Event::End(TagEnd::Image) => {}

                // Horizontal rule
                Event::Rule => {
                    ui.separator();
                    ui.add_space(4.0);
                }

                // Text
                Event::Text(t) => {
                    if in_code_block {
                        code_text.push_str(&t);
                        return;
                    }

                    let current_style = style_stack.last().cloned().unwrap_or_default();
                    let text: String = t.to_string();
                    let mut rt = egui::RichText::new(text).size(base_font_size);

                    if heading_level.is_some() {
                        match heading_level.unwrap() {
                            1 => rt = rt.size(base_font_size + 8.0).strong(),
                            2 => rt = rt.size(base_font_size + 6.0).strong(),
                            3 => rt = rt.size(base_font_size + 4.0).strong(),
                            4 => rt = rt.size(base_font_size + 2.0).strong(),
                            5 => rt = rt.size(base_font_size).strong(),
                            _ => rt = rt.size(base_font_size - 1.0).weak(),
                        }
                    }

                    if current_style.strong {
                        rt = rt.strong();
                    }
                    if current_style.emphasis {
                        rt = rt.italics();
                    }

                    ui.horizontal_wrapped(|ui| {
                        if list_depth > 0 && heading_level.is_none() {
                            let indent = (list_depth as f32) * 16.0;
                            ui.add_space(indent);
                        }
                        ui.label(rt);
                    });
                }

                // Soft/Hard break
                Event::SoftBreak | Event::HardBreak => {
                    if !in_code_block && heading_level.is_none() {
                        ui.add_space(2.0);
                    }
                }

                _ => {}
            }
        }
    });
}
