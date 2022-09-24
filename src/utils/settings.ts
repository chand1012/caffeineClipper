import {
  exists,
  readTextFile,
  writeTextFile,
  BaseDirectory,
  createDir,
} from "@tauri-apps/api/fs";
import { appDir } from "@tauri-apps/api/path";

export type Settings = {
  clientId: string;
  bearerToken: string;
  channelName: string;
  clientSecret: string;
  broadcast_id: string;
};

export const loadSettings = async () => {
  const settings: Settings = {
    clientId: "",
    bearerToken: "",
    channelName: "",
    clientSecret: "",
    broadcast_id: "",
  };

  const dir = BaseDirectory.App;
  const appdata = await appDir();
  const settingsFile = `settings.json`;
  try {
    await exists(settingsFile, { dir });
  } catch (e) {
    // doesn't exist, handle it
    console.log("Settings file doesn't exist, creating it");
    await createDir(appdata, { recursive: true });
    await writeTextFile(settingsFile, JSON.stringify(settings), { dir });
    return settings;
  }

  const settingsContent = await readTextFile(settingsFile, { dir });
  console.log("Settings file exists, loading it");
  const settingsData = JSON.parse(settingsContent);
  return settingsData;
};

export const saveSettings = async (settings: Settings) => {
  const settingsPath = `${await appDir()}settings.json`;
  await writeTextFile(settingsPath, JSON.stringify(settings));
};
