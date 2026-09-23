import { parseGoogleMapsUrl } from "./google-maps";

export const LOCATION_URL_ERROR = "پیوند کامل و معتبر محل برگزاری را با http:// یا https:// وارد کنید.";

export type LocationLink = {
  url: string;
  lat: number | null;
  lng: number | null;
};

/** Validate a destination without fetching it or inferring unknown coordinates. */
export function parseLocationUrl(value: unknown): LocationLink | null {
  if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u001f\u007f-\u009f]/.test(value)) return null;
  const input = value.trim();
  const authority = input.match(/^https?:\/\/([^/?#]+)/i)?.[1];
  if (!authority || authority.includes("@") || input.length > 2048 || /[\s\\]/.test(input)) return null;
  let url: URL;
  try { url = new URL(input); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname ||
    url.username || url.password || url.href.length > 2048) return null;
  const coordinates = parseGoogleMapsUrl(url.href);
  return { url: url.href, lat: coordinates?.lat ?? null, lng: coordinates?.lng ?? null };
}
