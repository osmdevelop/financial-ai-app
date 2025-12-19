import { useState, useEffect, useCallback } from "react";

export type NotificationSeverity = "info" | "warning" | "critical";

export type AppNotification = {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
  link?: string;
};

const STORAGE_KEY = "notifications_v1";
const MAX_NOTIFICATIONS = 100;

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getStoredNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error("Failed to save notifications:", e);
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(getStoredNotifications);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setNotifications(getStoredNotifications());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addNotification = useCallback((
    notif: Omit<AppNotification, "id" | "createdAt" | "read">
  ): AppNotification => {
    const newNotification: AppNotification = {
      ...notif,
      id: generateId(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    const current = getStoredNotifications();
    const updated = [newNotification, ...current].slice(0, MAX_NOTIFICATIONS);
    saveNotifications(updated);
    setNotifications(updated);
    
    return newNotification;
  }, []);

  const markAsRead = useCallback((id: string): void => {
    const current = getStoredNotifications();
    const updated = current.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
    setNotifications(updated);
  }, []);

  const markAllAsRead = useCallback((): void => {
    const current = getStoredNotifications();
    const updated = current.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
    setNotifications(updated);
  }, []);

  const removeNotification = useCallback((id: string): void => {
    const current = getStoredNotifications();
    const updated = current.filter((n) => n.id !== id);
    saveNotifications(updated);
    setNotifications(updated);
  }, []);

  const clearAll = useCallback((): void => {
    saveNotifications([]);
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifications = notifications.slice(0, 10);

  return {
    notifications,
    recentNotifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  };
}

export function addNotificationDirect(
  notif: Omit<AppNotification, "id" | "createdAt" | "read">
): AppNotification {
  const newNotification: AppNotification = {
    ...notif,
    id: generateId(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  
  const current = getStoredNotifications();
  const updated = [newNotification, ...current].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(updated);
  
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  
  return newNotification;
}
