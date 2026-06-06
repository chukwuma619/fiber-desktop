mod app_state;
mod bundled_fnn;
mod commands;
mod config_sync;
mod fiber_rpc;
mod fnn_fetch;
mod fnn_precheck;
mod fnn_runtime;
mod platform;
mod secret;
mod settings;
mod shop_agents;

use app_state::AppUxState;
use fnn_runtime::FnnRuntime;
use shop_agents::ShopAgentsManager;
use tauri::Manager;

#[cfg(desktop)]
use tauri::menu::{Menu, MenuItem};
#[cfg(desktop)]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .manage(FnnRuntime::new())
        .manage(AppUxState::new())
        .manage(ShopAgentsManager::new())
        .setup(|app| {
            app.state::<FnnRuntime>().attach_app(app.handle().clone());
            if let Err(err) = app.state::<ShopAgentsManager>().load_and_start(&app.handle()) {
                eprintln!("shop agents failed to start: {err}");
            }

            #[cfg(desktop)]
            setup_tray(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let hide = window
                    .app_handle()
                    .state::<AppUxState>()
                    .hide_on_close();
                if hide {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::set_fnn_secret_password,
            commands::has_fnn_secret_password,
            commands::fnn_start,
            commands::fnn_stop,
            commands::fnn_status,
            commands::fnn_logs,
            commands::fnn_runtime_snapshot,
            commands::fiber_rpc_call,
            commands::pinned_fnn_info,
            commands::download_pinned_fnn,
            commands::install_upstream_fnn_config,
            commands::clear_config_bootnodes,
            commands::apply_ckb_rpc_to_config_file,
            commands::fnn_binary_status,
            commands::ensure_fnn_binary,
            commands::prepare_ckb_key_folder,
            commands::ckb_key_status,
            commands::write_ckb_private_key,
            commands::use_bundled_fnn_binary,
            commands::fnn_adopt_orphan,
            commands::get_platform_labels,
            commands::set_hide_on_close,
            commands::get_hide_on_close,
            commands::shop_agents_list,
            commands::shop_agents_save,
            commands::shop_agents_delete,
            commands::shop_agents_set_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "tray-show", "Show Fiber Desktop", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray-quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let icon = app
        .default_window_icon()
        .ok_or("missing default window icon")?
        .clone();

    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("Fiber Desktop")
        .on_menu_event(|app, event| {
            let window = app.get_webview_window("main");
            match event.id().as_ref() {
                "tray-show" => {
                    if let Some(w) = window {
                        let _ = w.unminimize();
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "tray-quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.unminimize();
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg(not(desktop))]
fn setup_tray(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}
