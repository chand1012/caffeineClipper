#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use rocket::get;
use std::path::Path;
use tauri::Manager;
use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use tauri_plugin_fs_watch::Watcher;

const CONFIG_DIR_LINUX: &str = "$HOME/.config/dev.chand1012.caffeineclipper";
const CONFIG_DIR_WINDOWS: &str = "%appdata%/dev.chand1012.caffeineclipper";
const CONFIG_DIR_MACOS: &str = "$HOME/Library/Application Support/dev.chand1012.caffeineclipper";

#[derive(Clone, serde::Serialize)]
struct Payload {
    url: String,
}

#[get("/capture?<token>")]
fn capture(token: String) -> String {
    // save the token to a file
    // return a success message
    format!("Token: {}", token);
    let mut config_dir = "";
    if cfg!(target_os = "linux") {
        config_dir = CONFIG_DIR_LINUX;
    } else if cfg!(target_os = "windows") {
        config_dir = CONFIG_DIR_WINDOWS;
    } else if cfg!(target_os = "macos") {
        config_dir = CONFIG_DIR_MACOS;
    }

    let full_path = shellexpand::full(config_dir).unwrap();

    let path = Path::new(full_path.as_ref());

    // create the config directory if it doesn't exist
    std::fs::create_dir_all(path).unwrap();

    // write the token to the file
    std::fs::write(path.join("token.txt"), token).unwrap();

    "ok".to_string()
}

fn main() {
    // here `"quit".to_string()` defines the menu item id, and the second parameter is the menu item label.
    // this creates the menu tray
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let tray_menu = SystemTrayMenu::new()
        .add_item(quit)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(hide);
    // this creates the tauri application
    tauri::Builder::default()
        // this is the code that allows us to close to system tray rather than quitting
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        // handles login events. currently does nothing.
        .system_tray(SystemTray::new().with_menu(tray_menu))
        // this handles menu tray operation
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                app.get_window("main").unwrap().show().unwrap();
            }
            SystemTrayEvent::DoubleClick {
                position: _,
                size: _,
                ..
            } => {
                app.get_window("main").unwrap().show().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "hide" => {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|_app| {
            tauri::async_runtime::spawn(
                rocket::build()
                    .mount("/", rocket::routes![capture])
                    .launch(),
            );
            Ok(())
        })
        .plugin(Watcher::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
