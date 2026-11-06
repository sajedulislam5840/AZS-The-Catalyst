"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Play } from "lucide-react";
import { formatClock } from "@/lib/progress";
import { getYouTubeEmbedUrl, getYouTubeId, getYouTubeThumb } from "@/lib/media";

export interface PlayerHandle {
  /** Seconds into the video right now (0 if it has not started). */
  getTime: () => number;
}

interface Props {
  url: string;
  title: string;
  lectureNo: number;
  startAt?: number;
  autoPlay?: boolean;
  ref?: Ref<PlayerHandle>;
  onStart?: () => void;
  /** Called about every 15 seconds while playing, and when paused or closed. */
  onSave?: (position: number, duration: number) => void;
  /** Called once when the student gets 90% of the way through. */
  onComplete?: () => void;
}

/* ---- minimal typing for the bits of the YouTube IFrame API we use ---- */
interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars: Record<string, string | number>;
      events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const timeout = setTimeout(() => {
      apiPromise = null;
      reject(new Error("YouTube API timed out"));
    }, 8000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API unavailable"));
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      clearTimeout(timeout);
      apiPromise = null;
      reject(new Error("YouTube API failed to load"));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const PLAYING = 1;
const PAUSED = 2;
const ENDED = 0;
const DONE_AT = 0.9;
const SAVE_EVERY_MS = 15_000;

/**
 * A lecture video that costs nothing until it is tapped (a thumbnail, no YouTube code), then loads
 * the YouTube player so progress can be tracked: resume position, timestamped notes, and automatic
 * completion at 90%. If the YouTube script cannot load, a plain embedded video is used instead.
 */
export default function LecturePlayer({ url, title, lectureNo, startAt = 0, autoPlay = false, ref, onStart, onSave, onComplete }: Props) {
  const [active, setActive] = useState(autoPlay);
  const [fallback, setFallback] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const completed = useRef(false);
  const latest = useRef({ onStart, onSave, onComplete });
  useEffect(() => {
    latest.current = { onStart, onSave, onComplete };
  });

  const id = getYouTubeId(url);
  const thumb = getYouTubeThumb(url);

  useImperativeHandle(ref, () => ({ getTime: () => (player.current ? Math.floor(player.current.getCurrentTime() || 0) : 0) }), []);

  const start = useCallback(() => {
    setActive(true);
    latest.current.onStart?.();
  }, []);

  useEffect(() => {
    if (autoPlay) latest.current.onStart?.();
  }, [autoPlay]);

  useEffect(() => {
    if (!active || !id) return;
    const container = host.current;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastSave = 0;
    completed.current = false;

    const read = () => {
      const p = player.current;
      if (!p) return null;
      const pos = p.getCurrentTime() || 0;
      const dur = p.getDuration() || 0;
      return { pos, dur };
    };
    const save = () => {
      const r = read();
      if (r && r.pos > 0) latest.current.onSave?.(r.pos, r.dur);
      lastSave = Date.now();
    };
    const tick = () => {
      const r = read();
      if (!r) return;
      if (!completed.current && r.dur > 60 && r.pos / r.dur >= DONE_AT) {
        completed.current = true;
        latest.current.onComplete?.();
      }
      if (Date.now() - lastSave >= SAVE_EVERY_MS) save();
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !container) return;
        // The YouTube API swaps this element for its own iframe; keep it away from React's nodes.
        const mount = document.createElement("div");
        container.appendChild(mount);
        player.current = new YT.Player(mount, {
          videoId: id,
          playerVars: { rel: 0, playsinline: 1, modestbranding: 1, autoplay: 1, start: Math.floor(startAt) },
          events: {
            onStateChange: (e) => {
              if (e.data === PLAYING) {
                if (!timer) timer = setInterval(tick, 1000);
              } else {
                if (timer) {
                  clearInterval(timer);
                  timer = null;
                }
                if (e.data === PAUSED || e.data === ENDED) {
                  if (e.data === ENDED && !completed.current) {
                    completed.current = true;
                    latest.current.onComplete?.();
                  }
                  save();
                }
              }
            },
            onError: () => setFallback(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (player.current) {
        save();
        try {
          player.current.destroy();
        } catch {
          // already gone
        }
        player.current = null;
      }
      container?.replaceChildren();
    };
    // startAt is only the starting point; changing it later must not restart the video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, id]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={start}
        aria-label={`Play lecture ${lectureNo}: ${title}`}
        className="group relative block aspect-video w-full overflow-hidden bg-slate-900 text-left"
      >
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-slate-900/20" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-[#075985]">Lecture {lectureNo}</span>
        {startAt > 10 && (
          <span className="absolute right-3 top-3 rounded-full bg-[#CC310E] px-2.5 py-1 text-[10px] font-black text-white">Resume {formatClock(startAt)}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#CC310E] text-white shadow-[0_10px_30px_-6px_rgba(204,49,14,0.8)] transition group-hover:scale-110 group-active:scale-95">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </span>
      </button>
    );
  }

  // Not a YouTube link (or the YouTube script is blocked): a plain embed still works.
  if (!id || fallback) {
    return (
      <div className="aspect-video bg-slate-900">
        <iframe
          src={getYouTubeEmbedUrl(url, startAt, true)}
          title={title}
          className="h-full w-full border-none"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="aspect-video bg-slate-900">
      <div ref={host} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
  );
}
