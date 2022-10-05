import { useEffect, useState } from "react";
import {
  Stack,
  Image,
  Title,
  Text,
  Group,
  TextInput,
  Button,
  Loader,
  ActionIcon,
  Alert,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconCopy,
  IconAlertCircle,
  IconTrashX,
  IconBrandTwitch,
  IconDeviceFloppy as IconSave,
} from "@tabler/icons";
import { useDebouncedValue } from "@mantine/hooks";
import { Settings, loadSettings, saveSettings } from "./utils/settings";
import "./App.css";
import { register, unregister } from "@tauri-apps/api/globalShortcut";
import useAsyncEffect from "use-async-effect";
import { handleNotificationPermissions } from "./utils/notifications";
import { sendNotification } from "@tauri-apps/api/notification";
import { WebviewWindow } from "@tauri-apps/api/window";
import {
  authURL,
  Clip,
  createClip,
  getBroadcastID,
  isUserLive,
} from "./utils/twitch";
import { writeText } from "@tauri-apps/api/clipboard";
import { loadHistory, saveHistory, ClipHistory } from "./utils/history";
import { StyledTable as Table } from "./components/Table";
import { ThemeButton } from "./components/ThemeButton";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { watch } from "tauri-plugin-fs-watch-api";
import { appDir } from "@tauri-apps/api/path";

function App() {
  const { colorScheme } = useMantineColorScheme();
  const [settings, setSettings] = useState<Settings>({} as Settings);
  const [debouncedUser] = useDebouncedValue(settings.channelName, 500);
  const [userMsg, setUserMsg] = useState<string>("");
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClip, setLoadingClip] = useState<boolean>(false);
  const [loadingID, setLoadingID] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [shortcutActive, setShortcutActive] = useState<boolean>(false);
  const [notificationEnabled, setNotificationEnabled] =
    useState<boolean>(false);
  // state to hold a function that returns void
  const [token, setToken] = useState<string>("");

  async function onAuth() {
    // get the login window
    const url = authURL(settings);
    // open the login window
    const login = WebviewWindow.getByLabel("login");
    if (login) {
      console.log("login window already exists");
      login.emit("open", url);
      login.show();
    }
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
        const c = {
          id: data[0].id,
          edit_url: data[0].edit_url,
          channelName: settings.channelName,
        } as Clip;
        sendNotification({ title: "Success!", body: "Clip created" });
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
    const initialHistory = await loadHistory();
    setClips(initialHistory as ClipHistory);
    const isNotify = await handleNotificationPermissions();
    setNotificationEnabled(isNotify);
    await watch(await appDir(), {}, (event) => {
      console.log(event);
    });
  }, []);

  // runs on clip update
  useAsyncEffect(async () => {
    if (clips.length > 0) {
      await saveHistory(clips);
    }
  }, [clips]);

  // runs on user change
  useAsyncEffect(async () => {
    if (debouncedUser) {
      await handleUpdateID();
    }
  }, [debouncedUser]);

  useEffect(() => {
    if (token) {
      setSettings({ ...settings, bearerToken: token });
    }
  }, [token]);

  const isClipDisabled =
    loadingClip || !isLive || !settings.broadcastID || cooldown;

  return (
    <Stack align="center">
      <Image src="/logo.png" alt="logo" width={200} height={200} />
      <Title>Welcome to CaffeineClipper!</Title>

      {!notificationEnabled && (
        <Alert
          title="Notifications are disabled"
          icon={<IconAlertCircle size={16} />}
          color="yellow"
        >
          Notifications are disabled. You will not be notified when a clip is
          created.
        </Alert>
      )}

      {!settings.clientId && !settings.bearerToken && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={"Missing Client ID and Bearer Token!"}
          color="red"
        >
          Please enter your Client ID and Bearer Token below!
        </Alert>
      )}
      {!settings.bearerToken && settings.clientId && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={"Missing Bearer Token!"}
          color="red"
        >
          You can get your Bearer Token by authenticating with Twitch below.
          Then enter it in the box!
        </Alert>
      )}
      {!settings.clientId && settings.bearerToken && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title={"Missing Client ID!"}
          color="red"
        >
          Please enter your Client ID below!
        </Alert>
      )}

      <Group>
        <TextInput
          label="Client ID"
          onChange={(e) => {
            setSettings({ ...settings, clientId: e.target.value });
          }}
          value={settings.clientId}
          placeholder="Client ID"
        />
        <TextInput
          label="Bearer Token"
          onChange={(e) => {
            setSettings({ ...settings, bearerToken: e.target.value });
          }}
          value={settings.bearerToken}
          placeholder="Bearer Token"
          type="password"
        />
      </Group>

      <Group>
        <Button onClick={onSaveSettings} leftIcon={<IconSave size={14} />}>
          Save Settings
        </Button>
        <Button onClick={onAuth}>Authenticate</Button>
        <ThemeButton />
      </Group>
      <Group>
        <TextInput
          placeholder="Channel Name"
          value={settings.channelName}
          onChange={(e) => {
            setIsLive(null);
            setSettings({ ...settings, channelName: e.target.value });
          }}
          rightSection={loadingID ? <Loader size="xs" /> : null}
        />
        <TextInput
          style={{ width: "8em" }}
          placeholder="Broadcast ID"
          disabled
          value={settings.broadcastID}
          rightSection={
            <ActionIcon onClick={handleCopyID}>
              <IconCopy />
            </ActionIcon>
          }
        />
      </Group>

      <Group>
        <Button
          disabled={isClipDisabled}
          color={isClipDisabled ? "gray" : "grape"}
          onClick={handleCreateClip}
          loading={loadingClip}
          leftIcon={<IconBrandTwitch size={14} />}
          variant={colorScheme === "dark" ? "outline" : "filled"}
        >
          Clip!
        </Button>
        {/* shortcuts are still not working as intended */}
        {!shortcutActive && (
          <Button
            variant={colorScheme === "dark" ? "outline" : "filled"}
            color="green"
            onClick={activateShortcut}
          >
            {" "}
            Activate Shortcut{" "}
          </Button>
        )}
        {shortcutActive && (
          <Button
            variant={colorScheme === "dark" ? "outline" : "filled"}
            color="orange"
            onClick={deactivateShortcut}
          >
            {" "}
            Deactivate Shortcut{" "}
          </Button>
        )}
        <Button
          color="red"
          onClick={() => setClips([])}
          leftIcon={<IconTrashX size={14} />}
          variant={colorScheme === "dark" ? "outline" : "filled"}
        >
          Clear History
        </Button>
      </Group>

      {isLive && <Text>{settings.channelName} is live!</Text>}
      {!isLive && isLive !== null && (
        <Text>{settings.channelName} is not live.</Text>
      )}

      <Text align="center">{userMsg}</Text>

      <Table data={clips} />
    </Stack>
  );
}

export default App;
