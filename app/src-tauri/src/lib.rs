mod bundled_fnn;
mod commands;
mod config_sync;
mod fiber_rpc;
mod fnn_fetch;
mod fnn_precheck;
mod fnn_runtime;
mod secret;
mod settings;

use fnn_runtime::FnnRuntime;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }));
    }

    builder
        .manage(FnnRuntime::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::set_fnn_secret_password,
            commands::has_fnn_secret_password,
            commands::fnn_start,
            commands::fnn_stop,
            commands::fnn_status,
            commands::fnn_logs,
            commands::fiber_rpc_call,
            commands::pinned_fnn_info,
            commands::download_pinned_fnn,
            commands::install_upstream_fnn_config,
            commands::clear_config_bootnodes,
            commands::apply_ckb_rpc_to_config_file,
            commands::fnn_binary_status,
            commands::prepare_ckb_key_folder,
            commands::ckb_key_status,
            commands::write_ckb_private_key,
            commands::use_bundled_fnn_binary,
            commands::fnn_adopt_orphan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
