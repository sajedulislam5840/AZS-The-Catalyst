"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { AppNotification } from "@/lib/dashboard-types";

/**
 * The student's in-app messages (renewal warnings at 7, 3 and 1 days left, expiry, renewal).
 * The server creates a warning the first time it is due, i.e. when the student opens the app.
 */
export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ unread: number; items: AppNotification[] }>("/api/v1/notifications/me");
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnread(Number(data.unread) || 0);
    } catch {
      // Messages are a courtesy; never block the dashboard on them.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [enabled, load]);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.post("/api/v1/notifications/read-all");
    } catch {
      // It will simply show again next time.
    }
  }, []);

  return { items, unread, markAllRead, reload: load };
}
