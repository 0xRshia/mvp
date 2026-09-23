export type EventItem = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  starts_at: number;
  ends_at: number;
  registration_ends_at: number;
  price: number;
  capacity: number | null;
  image: string | null;
  thumbnail: string | null;
  published: number;
  sample: number;
  created_at: number | null;
  remaining: number | null;
  attendees: number;
  distance?: number;
};
export type EventDetailData = EventItem & {
  gallery: { id: string; url: string }[];
};
export type EventSuggestion = {
  eventId: string;
  reason: "category" | "popular" | "latest" | null;
};
export type EventCatalog = {
  events: EventItem[];
  suggestions: EventSuggestion[];
};
export type User = { id: string; phone: string; name: string; isHost: boolean };
// TODO(PRODUCTION): REMOVE_TEMP_LOGIN — remove the immediate-user response when retiring demo login.
export type AuthRequestResponse =
  | { user: User }
  | { challengeId: string; resendAfter: number; expiresIn: number };
export type Reservation = {
  id: string;
  event_id: string;
  quantity: number;
  total: number;
  status: string;
  created_at: number;
  expires_at: number | null;
  reference: string | null;
  payment_state: string;
  title: string;
  venue: string;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  image: string | null;
  starts_at: number;
  ends_at: number;
  phone?: string;
  name?: string;
};
export const categories = [
  { id: "all", label: "همه ایونت‌ها" },
  { id: "music", label: "موسیقی" },
  { id: "art", label: "هنر و تجربه" },
  { id: "books", label: "کتاب و گفتگو" },
  { id: "games", label: "بازی و دورهمی" },
  { id: "coffee", label: "قهوه و کافه" },
];
export const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
export const date = (time: number, full = false) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: "Asia/Tehran",
    day: "numeric",
    month: "long",
    ...(full
      ? { year: "numeric" as const, weekday: "long" as const }
      : { weekday: "short" as const }),
  }).format(time);
export const clock = (time: number) =>
  new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
export const digits = (s: string) =>
  s.replace(/[۰-۹٠-٩]/g, (c) =>
    String(
      "۰۱۲۳۴۵۶۷۸۹".includes(c)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(c),
    ),
  );
export function distanceKm(lat: number, lng: number, a: number, b: number) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((a - lat) * r) / 2) ** 2 +
    Math.cos(lat * r) * Math.cos(a * r) * Math.sin(((b - lng) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
