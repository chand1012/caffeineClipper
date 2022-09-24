import { useState } from "react";
import { SettingsManager } from "tauri-settings";
import type { Settings } from "./types";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { register } from "@tauri-apps/api/globalShortcut";
import useAsyncEffect from "use-async-effect";

function App() {
  const settingsManager = new SettingsManager<Settings>({
    clientId: "",
    bearerToken: "",
    channelName: "",
  });
  const [settings, setSettings] = useState<Settings>({
    clientId: "",
    bearerToken: "",
    channelName: "",
  });
  const [userMsg, setUserMsg] = useState<string>("");

  async function test() {
    // current settings
    setUserMsg(JSON.stringify(settings));
  }

  function handleCommand(command: string) {
    setUserMsg(`Command: ${command}`);
  }

  useAsyncEffect(async () => {
    await register("CommandOrControl+Shift+S", handleCommand);
    await settingsManager.initialize();
  }, []);

  useAsyncEffect(async () => {
    await settingsManager.set("clientId", settings.clientId);
    await settingsManager.set("bearerToken", settings.bearerToken);
  }, [settings]);

  useAsyncEffect(async () => {
    await settingsManager.syncCache();
  });

  return (
    <div className="container">
      <h1>Welcome to CaffeineClipper!</h1>

      <p>Enter your client ID and bearer token below!</p>

      <div className="row">
        <div>
          <input
            id="greet-input"
            onChange={(e) =>
              setSettings({ ...settings, clientId: e.target.value })
            }
            placeholder="Client ID"
          />
          <input
            id="greet-input"
            onChange={(e) =>
              setSettings({ ...settings, bearerToken: e.target.value })
            }
            placeholder="Bearer Token"
          />
          <button onClick={test}>Test</button>
        </div>
      </div>
      <p>{userMsg}</p>
    </div>
  );
}

export default App;
