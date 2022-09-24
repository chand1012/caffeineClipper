import { useState } from "react";
import { Settings, loadSettings, saveSettings } from "./utils/settings";
import "./App.css";
import { register } from "@tauri-apps/api/globalShortcut";
import useAsyncEffect from "use-async-effect";
import { handleNotificationPermissions } from "./utils/notifications";
import { sendNotification } from "@tauri-apps/api/notification";
import { authURL } from "./twitch";
import { WebviewWindow } from "@tauri-apps/api/window";

function App() {
  const [settings, setSettings] = useState<Settings>({} as Settings);
  const [userMsg, setUserMsg] = useState<string>("");

  async function authenticate() {
    const url = authURL(settings);
    // get the twitch login screen
    console.log(url);
    const loginWindow = new WebviewWindow("login", {
      url,
      width: 800,
      height: 600,
      title: "Twitch Login",
    });
    const deactivate = await loginWindow.listen("receive-login", (event) => {
      console.log(event);
    });

    loginWindow.onCloseRequested((event) => {
      deactivate();
      loginWindow.close();
    });
  }

  async function onSaveSettings() {
    // save settings
    await saveSettings(settings);
    sendNotification("Settings saved");
  }

  function handleCommand(command: string) {
    setUserMsg(`Command: ${command}`);
  }

  // runs on first load
  useAsyncEffect(async () => {
    await register("CommandOrControl+Shift+S", handleCommand);
    // this doesn't work
    const initialSettings = await loadSettings();
    setSettings(initialSettings as Settings);
    const isNotify = await handleNotificationPermissions();
    if (!isNotify) {
      setUserMsg(
        "Notifications are not enabled. Please check your permissions."
      );
    }
  }, []);

  return (
    <div className="container">
      <div className="row">
        <img className="logo" src="/logo.png" alt="logo" />
      </div>
      <h1>Welcome to CaffeineClipper!</h1>

      <p>Enter your client ID and secret below!</p>

      <div className="row">
        <div>
          <input
            id="greet-input"
            onChange={(e) =>
              setSettings({ ...settings, clientId: e.target.value })
            }
            value={settings.clientId}
            placeholder="Client ID"
          />
          <button onClick={onSaveSettings}>Save</button>
        </div>
      </div>
      <div style={{ marginTop: "0.95em" }} className="row">
        <div>
          <button onClick={authenticate}>Authenticate</button>
        </div>
      </div>
      <p>{userMsg}</p>
    </div>
  );
}

export default App;
