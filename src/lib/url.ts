const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export function siteLink(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}

export function youtubeUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

const SITE_ORIGIN = "https://satory074.github.io";

/** base path 込みの絶対 URL（JSON-LD など host が必須の場面で使う）。 */
export function absUrl(path: string): string {
  return `${SITE_ORIGIN}${siteLink(path)}`;
}
