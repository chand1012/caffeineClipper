# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

* [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# DONE
* This can use a given bearer token and client ID to create clips from the given channel!
* Saves settings locally.
# TO DO
* Find a way to get user bearer from client ID and secret. Need `clips.edit` scope.
* Run the clip function on hotkey with some form of cooldown (like 10 seconds).
* Get settings saving working.
* ~~Hide the application to system tray. ~~ This was surprisingly easy.
* ~~Make sure hotkeys work while in system tray.~~ They work on Windows!
# Maybe
* Add a simple editor for clips after the fact
* Export clips as vertical vids via FFMPEG (borrow some Pillar code)
* Use whisper to listen for trigger words?
