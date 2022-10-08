#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use rocket::fairing::{Fairing, Info, Kind};
use rocket::http::Header;
use rocket::{get, options};
use rocket::{Request, Response};
use tauri::Manager;
use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};
use tauri_plugin_fs_watch::Watcher;

pub struct CORS;

#[rocket::async_trait]
impl Fairing for CORS {
    fn info(&self) -> Info {
        Info {
            name: "Add CORS headers to responses",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, _request: &'r Request<'_>, response: &mut Response<'r>) {
        response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
        response.set_header(Header::new(
            "Access-Control-Allow-Methods",
            "POST, GET, PATCH, OPTIONS",
        ));
        response.set_header(Header::new("Access-Control-Allow-Headers", "*"));
        response.set_header(Header::new("Access-Control-Allow-Credentials", "true"));
    }
}

#[derive(Clone, serde::Serialize)]
struct Payload {
    url: String,
}

/// Catches all OPTION requests in order to get the CORS related Fairing triggered.
#[options("/<_..>")]
fn all_options() {
    /* Intentionally left empty */
}

#[get("/capture?<token>")]
fn capture(token: String) -> String {
    // save the token to a file
    // return a success message
    format!("Token: {}", token);
    let config_dir = dirs::config_dir()
        .unwrap()
        .join("dev.chand1012.caffeineclipper");

    // create the config directory if it doesn't exist
    std::fs::create_dir_all(&config_dir).unwrap();

    // write the token to the file
    std::fs::write(&config_dir.join("token.txt"), token).unwrap();

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
                    .attach(CORS)
                    .mount("/", rocket::routes![capture, all_options])
                    .launch(),
            );
            Ok(())
        })
        .plugin(Watcher::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
