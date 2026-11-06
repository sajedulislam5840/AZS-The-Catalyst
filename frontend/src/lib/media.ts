/** Link helpers for lecture videos and PDF previews. */

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const u = url.trim();
  try {
    if (u.includes("youtu.be/")) return u.split("youtu.be/")[1]?.split(/[?&#]/)[0] || null;
    if (u.includes("youtube.com/watch")) return new URLSearchParams(u.split("?")[1]?.split("#")[0] ?? "").get("v") || null;
    for (const part of ["youtube.com/embed/", "youtube.com/shorts/", "youtube.com/live/"]) {
      if (u.includes(part)) return u.split(part)[1]?.split(/[?&#]/)[0] || null;
    }
    if (/^[\w-]{11}$/.test(u)) return u;
  } catch {
    return null;
  }
  return null;
}

/** Embed URL for a YouTube link; any other link is returned unchanged. */
export function getYouTubeEmbedUrl(url: string, startAt = 0, autoplay = false): string {
  const id = getYouTubeId(url);
  if (!id) return url?.trim() ?? "";
  const q = new URLSearchParams({ rel: "0", playsinline: "1" });
  if (startAt > 0) q.set("start", String(Math.floor(startAt)));
  if (autoplay) q.set("autoplay", "1");
  return `https://www.youtube.com/embed/${id}?${q.toString()}`;
}

export function getYouTubeThumb(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function getDrivePreviewUrl(url: string): string {
  if (!url) return "";
  const file = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (file) return `https://drive.google.com/file/d/${file[1]}/preview`;
  if (url.includes("drive.google.com/open?id=")) {
    const id = url.split("id=")[1]?.split("&")[0];
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  return url;
}
