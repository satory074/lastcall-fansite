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
