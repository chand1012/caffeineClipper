import {
  readTextFile,
  writeTextFile,
  BaseDirectory,
  createDir,
} from "@tauri-apps/api/fs";
import { appDir } from "@tauri-apps/api/path";
import type { Clip } from "./twitch";

export type ClipHistory = Clip[];

export const loadHistory = async () => {
  const history: ClipHistory = [];

  const dir = BaseDirectory.App;
  const appdata = await appDir();
  const historyFile = `history.json`;
  try {
    const historyContent = await readTextFile(historyFile, { dir });
    console.log("History file exists, loading it");
    console.log(historyContent);
    const historyData = JSON.parse(historyContent);
    return historyData;
  } catch (e) {
    // doesn't exist, handle it
    console.log("History file doesn't exist, creating it");
    await createDir(appdata, { recursive: true });
    await writeTextFile(historyFile, JSON.stringify(history), { dir });
    return history;
  }
};

export const saveHistory = async (history: ClipHistory) => {
  const historyPath = `${await appDir()}history.json`;
  await writeTextFile(historyPath, JSON.stringify(history));
};
