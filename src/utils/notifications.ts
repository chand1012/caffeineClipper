import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/api/notification";

export const handleNotificationPermissions = async () => {
  const permission = await isPermissionGranted();
  if (permission) {
    return true;
  }
  try {
    const response = await requestPermission();
    return response === "granted";
  } catch (e) {
    return false;
  }
};
