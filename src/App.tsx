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
  Space,
} from "@mantine/core";
import {
  IconCopy,
  IconAlertCircle,
  IconTrashX,
  IconBrandTwitch,
  IconDeviceFloppy as IconSave,
} from "@tabler/icons";
import { openConfirmModal } from "@mantine/modals";
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
  getCurrentUser,
  isUserLive,
} from "./utils/twitch";
import { writeText } from "@tauri-apps/api/clipboard";
import { loadHistory, saveHistory, ClipHistory } from "./utils/history";
import { StyledTable as Table } from "./components/Table";
import { ThemeButton } from "./components/ThemeButton";
import { watch, DebouncedEvent } from "tauri-plugin-fs-watch-api";
import { appDir } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/api/fs";
import { open } from "@tauri-apps/api/shell";

function App() {
  const { colorScheme } = useMantineColorScheme();
  const [settings, setSettings] = useState<Settings>({
    clientId: "wnnkc8v7ytf770n8um30xfym79j6pf",
  } as Settings);
  const [authLoading, setAuthLoading] = useState(false);
  const [debouncedSettings] = useDebouncedValue(settings, 500);
  const [debouncedUser] = useDebouncedValue(settings.channelName, 500);
  const [authUser, setAuthUser] = useState("");
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClip, setLoadingClip] = useState<boolean>(false);
  const [loadingID, setLoadingID] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [shortcutActive, setShortcutActive] = useState<boolean>(false);
  const [notificationEnabled, setNotificationEnabled] =
    useState<boolean>(false);

  console.log(settings);

  async function onAuth() {
    setAuthLoading(true);
    const url = authURL(settings);
    open(url);
  }

  async function openChat() {
    const chat = new WebviewWindow("chat", {
      url: `https://www.twitch.tv/popout/${settings.channelName}/chat?popout=`,
      title: settings.channelName + "'s Chat",
    });

    chat.listen("tauri://close-requested", () => {
      chat.close();
    });
  }

  const openConfirmDeleteModal = () => {
    openConfirmModal({
      title: "Delete History",
      children: (
        <Text size="sm">
          Are you sure you want to delete your clip history? This action cannot
          be undone.
        </Text>
      ),
      onConfirm: () => {
        setClips([]);
      },
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
    });
  };

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
    await watch(await appDir(), {}, async (event: DebouncedEvent) => {
      const payload = event.payload as string;
      if (
        payload.endsWith("token.txt") &&
        (event.type === "Create" || event.type === "Write")
      ) {
        const token = await readTextFile(payload);
        setSettings({ ...settings, bearerToken: token });
      }
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

  // runs on settings change
  useAsyncEffect(async () => {
    if (debouncedSettings) {
      await saveSettings(debouncedSettings);
      if (debouncedSettings.bearerToken) {
        setAuthLoading(false);
        const currentUserData = await getCurrentUser(debouncedSettings);
        if (currentUserData) {
          setAuthUser(currentUserData.login);
        }
      }
    }
  }, [debouncedSettings]);

  useEffect(() => {
    if (settings.bearerToken) {
      setAuthLoading(false);
    }
  }, [settings.bearerToken]);

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

      <Group>
        <Button
          color={settings.bearerToken ? "gray" : "purple"}
          onClick={onAuth}
          loading={authLoading}
        >
          {settings.bearerToken ? "Re-Authenticate" : "Authenticate"}
        </Button>
        <ThemeButton />
      </Group>
      {authUser ? (
        <Text>
          Authenticated as <b>{authUser}</b>
        </Text>
      ) : (
        <Space style={{ height: "24.8px" }} />
      )}
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
        <Button disabled={isClipDisabled} onClick={openChat}>
          Open Chat
        </Button>
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
          color={isClipDisabled ? "gray" : "purple"}
          onClick={handleCreateClip}
          loading={loadingClip}
          leftIcon={<IconBrandTwitch size={14} />}
        >
          Clip!
        </Button>
        {/* shortcuts are still not working as intended */}
        {!shortcutActive && (
          <Button
            variant={colorScheme === "dark" ? "outline" : "filled"}
            color="green"
            disabled={isClipDisabled}
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
          onClick={openConfirmDeleteModal}
          disabled={clips.length === 0}
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

      <Table data={clips} />
    </Stack>
  );
}

export default App;
