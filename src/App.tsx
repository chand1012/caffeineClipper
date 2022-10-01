import { useEffect, useState } from "react";
import { Settings, loadSettings, saveSettings } from "./utils/settings";
import "./App.css";
import { register, unregister } from "@tauri-apps/api/globalShortcut";
import useAsyncEffect from "use-async-effect";
import { handleNotificationPermissions } from "./utils/notifications";
import { sendNotification } from "@tauri-apps/api/notification";
import {
  authURL,
  Clip,
  createClip,
  getBroadcastID,
  isUserLive,
} from "./utils/twitch";
import { writeText } from "@tauri-apps/api/clipboard";
import { loadHistory, saveHistory, ClipHistory } from "./utils/history";

function App() {
  const [settings, setSettings] = useState<Settings>({} as Settings);
  const [userMsg, setUserMsg] = useState<string>("");
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClip, setLoadingClip] = useState<boolean>(false);
  const [loadingID, setLoadingID] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [shortcutActive, setShortcutActive] = useState<boolean>(false);

  async function authenticate() {
    const url = authURL(settings);
    // get the twitch login screen
    console.log(url);
    setUserMsg(
      "Open this link in your browser and copy the returned access token: " +
        url
    );

    // remove the message in 15 seconds
    setTimeout(() => {
      setUserMsg("");
    }, 15000);
  }

  async function onSaveSettings() {
    // save settings
    await saveSettings(settings);
    sendNotification("Settings saved");
  }

  async function handleCopyID() {
    await writeText(settings.broadcastID);
    sendNotification("Copied broadcast ID to clipboard");
  }

  async function handleUpdateID() {
    setLoadingID(true);
    setCooldown(false);
    const broadcastID = await getBroadcastID(settings);
    if (broadcastID) {
      setSettings({ ...settings, broadcastID });
    }
    await saveSettings(settings);
    setIsLive(await isUserLive(settings));
    setLoadingID(false);
  }

  async function handleCreateClip() {
    if (cooldown) {
      return;
    }
    setLoadingClip(true);
    setCooldown(true);
    console.log(settings);
    if (!settings.broadcastID) {
      sendNotification("No broadcast ID set");
      setLoadingClip(false);
      return;
    }

    if (!isLive) {
      sendNotification("User is not live");
      setLoadingClip(false);

      return;
    }

    const clipResp = await createClip(settings.broadcastID, settings);
    if (clipResp) {
      // get the edit URL
      const data = clipResp?.data;
      if (!data) {
        sendNotification("No clip data returned");
        setLoadingClip(false);
        return;
      }
      if (data[0].edit_url) {
        setUserMsg("Success! Edit the clip at: " + data[0].edit_url);
        const c = {
          id: data[0].id,
          edit_url: data[0].edit_url,
          channelName: settings.channelName,
        } as Clip;
        setClips([c, ...clips]);
      } else {
        sendNotification("No edit URL returned");
      }
    }
    setLoadingClip(false);
    setTimeout(() => {
      setCooldown(false);
    }, 10000);
  }

  async function activateShortcut() {
    try {
      await register("CommandOrControl+Shift+S", () => {
        handleCreateClip();
      });
      setShortcutActive(true);
      sendNotification("Shortcut activated");
    } catch (e) {
      console.log("Failed to register shortcut");
      sendNotification("Failed to register shortcut");
    }
  }

  async function deactivateShortcut() {
    try {
      await unregister("CommandOrControl+Shift+S");
      setShortcutActive(false);
      sendNotification("Shortcut deactivated");
    } catch (e) {
      console.log("Failed to deactivate shortcut");
      sendNotification("Failed to deactivate shortcut");
    }
  }

  // runs on first load
  useAsyncEffect(async () => {
    const initialSettings = await loadSettings();
    setSettings(initialSettings as Settings);
    // not working
    const initialHistory = await loadHistory();
    setClips(initialHistory as ClipHistory);
    const isNotify = await handleNotificationPermissions();
    if (!isNotify) {
      setUserMsg(
        "Notifications are not enabled. Please check your permissions."
      );
    }
  }, []);

  useEffect(() => {
    saveHistory(clips);
  }, [clips]);

  const resolveCursor = (isLoading: boolean, isDisabled?: boolean) => {
    if (isLoading) {
      return "wait";
    }
    if (isDisabled) {
      return "not-allowed";
    }

    return "pointer";
  };

  const isClipDisabled =
    loadingClip || !isLive || !settings.broadcastID || cooldown;

  return (
    <div className="container">
      <div className="row">
        <img className="logo" src="/logo.png" alt="logo" />
      </div>
      <h1>Welcome to CaffeineClipper!</h1>

      <p>Enter your authorization token below!</p>

      <div className="row">
        <div>
          <input
            onChange={(e) =>
              setSettings({ ...settings, clientId: e.target.value })
            }
            value={settings.clientId}
            placeholder="Client ID"
            type="password"
          />
          <input
            onChange={(e) =>
              setSettings({ ...settings, bearerToken: e.target.value })
            }
            value={settings.bearerToken}
            placeholder="Authorization"
            type="password"
          />
          <button onClick={onSaveSettings}>Save</button>
        </div>
      </div>
      <div className="row">
        <div>
          <button onClick={authenticate}>Authenticate</button>
        </div>
      </div>
      <div className="row">
        <div>
          <input
            placeholder="Channel Name"
            value={settings.channelName}
            onChange={(e) => {
              setIsLive(null);
              setSettings({ ...settings, channelName: e.target.value });
            }}
          />
          <button
            disabled={loadingID}
            style={{ cursor: resolveCursor(loadingID) }}
            onClick={handleUpdateID}
          >
            Update
          </button>
          <input
            style={{ maxWidth: "6.5em" }}
            placeholder="None"
            disabled
            value={settings.broadcastID}
          />
          <button disabled={!settings.broadcastID} onClick={handleCopyID}>
            Copy ID
          </button>
        </div>
      </div>
      <div className="row">
        <button
          disabled={isClipDisabled}
          style={{
            backgroundColor: isClipDisabled ? "grey" : "#A970FF",
            color: "white",
            cursor: resolveCursor(loadingClip, isClipDisabled),
          }}
          onClick={handleCreateClip}
        >
          {loadingClip ? "Loading...." : "Clip!"}
        </button>
        {/* shortcuts are still not working as intended */}
        {!shortcutActive && (
          <button onClick={activateShortcut}> Activate Shortcut </button>
        )}
        {shortcutActive && (
          <button onClick={deactivateShortcut}> Deactivate Shortcut </button>
        )}
        <button
          style={{ backgroundColor: "red", color: "white" }}
          onClick={() => setClips([])}
        >
          Clear History
        </button>
      </div>
      {isLive !== null && (
        <div className="row">
          {isLive && <p>{settings.channelName} is live!</p>}
          {!isLive && <p>{settings.channelName} is not live.</p>}
        </div>
      )}
      <p>{userMsg}</p>
      {/* This is temporary until I make a better solution */}
      {/* Table of the clip IDs and edit URLs */}
      <table>
        <thead>
          <tr>
            <th>Clip ID</th>
            <th>Channel Name</th>
            <th>Edit URL</th>
          </tr>
        </thead>
        <tbody>
          {clips.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.channelName}</td>
              <td>
                <a href={c.edit_url} target="_blank" rel="noreferrer">
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
