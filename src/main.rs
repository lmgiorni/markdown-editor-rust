mod app;
mod markdown_renderer;
mod ui;

use crate::app::MarkdownApp;
use eframe::egui;
use ui::{toolbar_ui, panels_ui, editor_preview_ui};

impl eframe::App for MarkdownApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.load_toolbar_icons(ctx);

        // Top toolbar
        toolbar_ui::show_toolbar(self, ctx);

        // Stats panel (below toolbar if enabled)
        panels_ui::show_stats_panel(self, ctx);

        // Markdown tools side panel
        panels_ui::show_md_panel(self, ctx);

        // Config window
        panels_ui::show_config_window(self, ctx);

        // Central editor + preview
        editor_preview_ui::show_central_panel(self, ctx);

        // Keyboard shortcuts (fixed for new egui API)
        self.handle_keyboard_shortcuts(ctx);
    }
}

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([1200.0, 700.0]),
        ..Default::default()
    };
    eframe::run_native(
        "Premium Markdown Editor",
        options,
        Box::new(|_cc| Box::new(MarkdownApp::default())),
    )
}
