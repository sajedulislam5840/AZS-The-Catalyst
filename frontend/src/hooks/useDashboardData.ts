"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import type { Material, Notice, UserProfile, VideoLecture } from "@/lib/dashboard-types";

const CONTENT_KEY = "azs_content_v1";

interface Cached {
  videos: VideoLecture[];
  materials: Material[];
  notice: Notice | null;
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    if (Array.isArray(c.videos) && Array.isArray(c.materials)) return { videos: c.videos, materials: c.materials, notice: c.notice ?? null };
  } catch {
    // ignore
  }
  return null;
}

interface Options {
  /** Set false until sign-in is confirmed. */
  enabled: boolean;
  onProfile: (patch: Partial<UserProfile> & { is_admin?: boolean }) => void;
  onUnauthorized: () => void;
}

/**
 * Loads lectures, PDFs and the current notice. The last good copy is shown immediately from the
 * device while fresh data loads, so a slow server wake-up never leaves a blank screen.
 */
export function useDashboardData({ enabled, onProfile, onUnauthorized }: Options) {
  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callbacks change on every render of the page; keep the latest in a ref so loading runs once.
  const cb = useRef({ onProfile, onUnauthorized });
  useEffect(() => {
    cb.current = { onProfile, onUnauthorized };
  });

  const load = useCallback(async () => {
    setError(null);
    const [me, vids, mats, note] = await Promise.allSettled([
      api.get("/api/v1/auth/me"),
      api.get("/api/v1/academic/videos").catch(() => api.get("/api/v1/academic/lectures")),
      api.get("/api/v1/academic/materials"),
      api.get("/api/v1/academic/notice"),
    ]);

    if (me.status === "fulfilled" && me.value.data) cb.current.onProfile(me.value.data);
    if (me.status === "rejected" && (me.reason as { response?: { status?: number } })?.response?.status === 401) {
      cb.current.onUnauthorized();
      return;
    }

    const nextVideos = vids.status === "fulfilled" && Array.isArray(vids.value.data) ? (vids.value.data as VideoLecture[]) : null;
    const nextMaterials = mats.status === "fulfilled" && Array.isArray(mats.value.data) ? (mats.value.data as Material[]) : null;
    const nextNotice = note.status === "fulfilled" && note.value.data ? (note.value.data as Notice) : null;

    if (nextVideos) setVideos(nextVideos);
    if (nextMaterials) setMaterials(nextMaterials);
    setNotice(nextNotice);

    if (!nextVideos && !nextMaterials) {
      setError("We could not reach the server. Showing your last saved lectures if there are any.");
    } else if (nextVideos && nextMaterials) {
      try {
        localStorage.setItem(CONTENT_KEY, JSON.stringify({ videos: nextVideos, materials: nextMaterials, notice: nextNotice }));
      } catch {
        // storage full: fine
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const cached = readCache();
    if (cached) {
      // Show the last good copy straight away while fresh data loads.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideos(cached.videos);
      setMaterials(cached.materials);
      setNotice(cached.notice);
      setLoading(false);
    }
    void load();
  }, [enabled, load]);

  return { videos, materials, notice, loading, error, reload: load };
}
