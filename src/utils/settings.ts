import {
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
  broadcastID: string;
  colorMode: "light" | "dark";
};

export const loadSettings = async () => {
  const settings: Settings = {
    clientId: "wnnkc8v7ytf770n8um30xfym79j6pf",
    bearerToken: "",
    channelName: "",
    clientSecret: "",
    broadcastID: "",
    colorMode: "dark",
  };

  const dir = BaseDirectory.App;
  const appdata = await appDir();
  const settingsFile = `settings.json`;
  try {
    const settingsContent = await readTextFile(settingsFile, { dir });
    // console.log("Settings file exists, loading it");
    // console.log(settingsContent);
    const settingsData = JSON.parse(settingsContent);
    return settingsData;
  } catch (e) {
    // doesn't exist, handle it
    // console.log("Settings file doesn't exist, creating it");
    await createDir(appdata, { recursive: true });
    await writeTextFile(settingsFile, JSON.stringify(settings), { dir });
    return settings;
  }
};

export const saveSettings = async (settings: Settings) => {
  const settingsPath = `${await appDir()}settings.json`;
  await writeTextFile(settingsPath, JSON.stringify(settings));
};
