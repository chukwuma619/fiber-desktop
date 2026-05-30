import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { DESKTOP_NOTIFICATIONS } from "../constants/storageKeys";

export function desktopNotificationsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(DESKTOP_NOTIFICATIONS);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return false;
  }
}

export function setDesktopNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DESKTOP_NOTIFICATIONS, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export async function sendDesktopNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!desktopNotificationsEnabled()) return;

  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      granted = perm === "granted";
    }
    if (!granted) return;

    sendNotification({ title, body });
  } catch {
    // Notifications unavailable (e.g. headless CI)
  }
}
