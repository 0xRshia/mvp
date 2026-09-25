"use client";
import { ButtonLabel } from "@/components/ui/button-label";
import { AppLink } from "@/components/event/app-navigation";
import { CatalogResultsTransition } from "./catalog-results-transition";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  LocateFixed,
  ArrowLeft,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Blank, Choice, ErrorBox, Loading } from "@/components/event/shared";
import { EventCard } from "@/components/event/event-card";
import { EventGroup } from "./event-group";
import { useAuth } from "./app-shell";
import { ConicSpin } from "@/components/ui/conic-spin";
import styles from "./discovery.module.css";
import { useEventBrowse } from "./event-browse-provider";
import { useEventCatalog } from "@/hooks/use-event-catalog";
import { filterEvents, groupEvents, type CatalogView } from "@/lib/event-catalog";
import {
  categories,
  fa,
  distanceKm,
  type EventItem,
  type EventSuggestion,
} from "@/lib/types";
const emptyEvents: EventItem[] = [];
const emptySuggestions: EventSuggestion[] = [];
const categoryIcons: Record<string, string> = {
  all: "/icons/calander-time-date.png",
  music: "/icons/music.png",
  art: "/icons/painting.png",
  books: "/icons/books-talks.png",
  games: "/icons/games.png",
  coffee: "/icons/coffe.png",
};
const neighborhoods = [
  { value: "all", label: "همهٔ تهران" },
  { value: "vanak", label: "ونک", lat: 35.757, lng: 51.409 },
  { value: "center", label: "کریم‌خان و مرکز شهر", lat: 35.715, lng: 51.417 },
  { value: "enghelab", label: "انقلاب", lat: 35.701, lng: 51.391 },
  { value: "north", label: "تجریش", lat: 35.804, lng: 51.429 },
];
const groupDefinitions = [
  { view: "free", heading: "ایونت‌های رایگان", href: "/events/free" },
  { view: "suggested", heading: "پیشنهاد برای تو", href: "/events?view=suggested" },
  { view: "new", heading: "ایونت‌های تازه", href: "/events?view=new" },
  { view: "all", heading: "همهٔ ایونت‌ها", href: "/events" },
] as const;

export default function EventCatalogBrowser({ view = "home" }: { view?: CatalogView }) {
  const { user } = useAuth();
  const now = useDeadlineClock(undefined);
  const { filters, updateFilters, resetFilters } = useEventBrowse();
  const { category, query, city, sort, when, free, point, area } = filters;
  const { catalog, loading: fetching, error, reload } = useEventCatalog();
  const events = catalog?.events ?? emptyEvents;
  const suggestions = catalog?.suggestions ?? emptySuggestions;
  const loading = fetching || now === null;
  const [locationOpen, setLocationOpen] = useState(false),
    [locating, setLocating] = useState(false),
    [locationError, setLocationError] = useState("");
  function closeLocation() {
    setLocationOpen(false);
  }
  function showResults() {
    const results = document.getElementById("results");
    results?.focus({ preventScroll: true });
    results?.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
  }
  function locate() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError(
        "مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند. محله را انتخاب کنید.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "موقعیت شما",
        };
        const nearby = events
          .flatMap((event) =>
            event.lat !== null && event.lng !== null &&
            Number.isFinite(event.lat) && Number.isFinite(event.lng)
              ? [{ ...event, d: distanceKm(p.lat, p.lng, event.lat, event.lng) }]
              : [],
          )
          .sort((a, b) => a.d - b.d);
        updateFilters({ point: p, sort: "distance", area: "all", city: nearby[0]?.d < 50 ? nearby[0].city : "nearby" });
        setLocating(false);
        closeLocation();
      },
      () => {
        setLocationError(
          "دسترسی به موقعیت فراهم نشد. می‌توانید محله را دستی انتخاب کنید.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }
  const filtered = useMemo(() => now === null ? [] : filterEvents(events,
    { ...filters, free: view === "free" || free }, now), [events, filters, free, view, now]);
  const groups = useMemo(() => groupEvents(filtered, suggestions, now ?? 0), [filtered, suggestions, now]);
  const listing = view === "home" ? groups.all : groups[view];
  const resultsKey = loading ? "loading" : error || JSON.stringify([
    view, filters, Object.values(groups).map((items) => items.map(({ event }) => event.id)),
  ]);
  const title = groupDefinitions.find((group) => group.view === view)?.heading;
  const cities = Array.from(new Set(["تهران", ...events.map((e) => e.city)]));
  useEffect(() => {
    const mc = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal: AbortSignal },
          ) => Promise<void>;
        };
      }
    ).modelContext;
    if (!mc) return;
    const controller = new AbortController();
    void mc
      .registerTool(
        {
          name: "search_events",
          description:
            "Search the visible Persian event catalog. Changes filters only; does not book or access location.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              category: { type: "string", enum: categories.map((c) => c.id) },
              freeOnly: { type: "boolean" },
            },
          },
          execute: async (input: {
            query?: string;
            category?: string;
            freeOnly?: boolean;
          }) => {
            if (input.query !== undefined) updateFilters({ query: input.query });
            if (
              input.category &&
              categories.some((c) => c.id === input.category)
            )
              updateFilters({ category: input.category });
            if (input.freeOnly !== undefined) updateFilters({ free: input.freeOnly });
            return { updated: true };
          },
        },
        { signal: controller.signal },
      )
      .catch(() => {});
    return () => controller.abort();
  }, [updateFilters]);
  return (
    <main data-motion-group className="discover container">
      {view !== "home" && <AppLink href="/" className="back-link">بازگشت به کشف ایونت‌ها</AppLink>}
      {view === "home" ? (
        <section className={styles.hero} aria-labelledby="home-title">
          <ConicSpin className={styles.glow} />
          <div className={styles.grid} aria-hidden="true" />
          <div data-motion-group className={styles.heroContent}>
            <div className={`eyebrow ${styles.eyebrow}`}><span />بیرون از روزمرگی</div>
            <h1 id="home-title">یک قرار خوب، <span className={styles.typing}>همین نزدیکی.</span></h1>
            <p>موسیقی، تجربه‌های تازه و آدم‌هایی که هنوز نمی‌شناسی.<br />قرار بعدی‌ات را در هم‌قدم پیدا کن.</p>
            <div className={styles.actions}>
              <button type="button" className={`button ${styles.explore}`} onClick={showResults}>
                کشف ایونت‌ها <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <AppLink className="button outline" href={user ? "/reservations" : "/login"}>
                {user ? "بلیت‌های من" : "ورود / ثبت‌نام"}
              </AppLink>
            </div>
          </div>
        </section>
      ) : (
        <div className="intro">
          <div>
            <h1>{title}</h1>
            <p>قرار بعدی‌ات را پیدا کن.</p>
          </div>
        </div>
      )}
      <form
        className={`search-bar ${styles.search}`}
        onSubmit={(e) => {
          e.preventDefault();
          showResults();
        }}
      >
        <Search />
        <input
          aria-label="جستجوی ایونت"
          placeholder="دنبال چه تجربه‌ای می‌گردی؟"
          value={query}
          onChange={(e) => updateFilters({ query: e.target.value })}
        />
        {query && (
          <button
            type="button"
            className="icon-button"
            aria-label="پاک کردن جستجو"
            onClick={() => updateFilters({ query: "" })}
          >
            <X size={16} />
          </button>
        )}
        <button className="button">
          جستجو <ArrowLeft size={17} />
        </button>
      </form>
      <div data-motion-group className={`category-row ${styles.categories}`} aria-label="دسته‌بندی ایونت‌ها">
        {categories.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={category === option.id}
            className={`category ${category === option.id ? "selected" : ""}`}
            onClick={() => updateFilters({ category: option.id })}
          >
            <span className="category-icon" aria-hidden="true">
              <img src={categoryIcons[option.id]} alt="" width={64} height={64} draggable={false} />
            </span>
            <span className="category-label">{option.label}</span>
          </button>
        ))}
      </div>
      <div className={`section-heading ${styles.resultsHeading}`} id="results" tabIndex={-1}>
        <div>
          <h2>
            {city === "nearby" ? "ایونت‌های اطراف شما" : `این روزهای ${city}`}
          </h2>
          <p aria-live="polite">
            {loading
              ? "در حال پیدا کردن ایونت‌ها…"
              : `${fa(listing.length)} تجربه، برای حال‌وهوای تو`}
          </p>
        </div>
        <div className="filters">
          <button type="button" className="location-button" aria-label={`انتخاب شهر و موقعیت؛ ${point?.label ?? (city === "nearby" ? "اطراف شما" : city)}`} aria-haspopup="dialog" onClick={() => setLocationOpen(true)}>
            <img className="location-art" src="/icons/map.png" alt="" width={24} height={24} draggable={false} />
            <span>{point?.label ?? (city === "nearby" ? "اطراف شما" : city)}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          <label className="free-filter">
            <Switch
              checked={view === "free" || free}
              disabled={view === "free"}
              onCheckedChange={(value) => updateFilters({ free: value })}
              aria-label="فقط ایونت‌های رایگان"
            />{" "}
            فقط رایگان
          </label>
          <Choice
            label="زمان ایونت"
            value={when}
            onChange={(value) => updateFilters({ when: value })}
            options={[
              { value: "all", label: "همهٔ روزها" },
              { value: "today", label: "۲۴ ساعت آینده" },
              { value: "week", label: "۷ روز آینده" },
            ]}
          />
          {view !== "suggested" && view !== "new" && <Choice
            label="مرتب‌سازی"
            value={sort}
            onChange={(v) => {
              if (v === "distance" && !point) setLocationOpen(true);
              else updateFilters({ sort: v });
            }}
            options={[
              { value: "soon", label: "زودترین ایونت‌ها" },
              { value: "distance", label: "نزدیک‌ترین به من" },
              { value: "price", label: "کمترین قیمت" },
            ]}
          />}
        </div>
      </div>
      {point && (
        <p className="location-caption">
          <LocateFixed size={14} /> فاصلهٔ مستقیم{" "}
          {area === "all" ? "از موقعیت شما" : `و تقریبی از ${point.label}`} ·{" "}
          <button onClick={() => setLocationOpen(true)}>تغییر موقعیت</button>
        </p>
      )}
      <CatalogResultsTransition transitionKey={resultsKey}>
      {loading ? (
        <Loading variant={view === "home" ? "discovery" : "catalog"} />
      ) : error ? (
        <ErrorBox message={error} retry={reload} />
      ) : listing.length === 0 ? (
        <Blank
          title="هنوز قراری با این مشخصات نداریم"
          description="زمان، دسته‌بندی یا شهر را تغییر دهید."
        >
          <button
            className="button outline"
            onClick={resetFilters}
          >
            پاک کردن فیلترها
          </button>
        </Blank>
      ) : view === "home" ? (
        <div data-motion-group className="event-groups">
          {groupDefinitions.filter((group) => groups[group.view].length > 0).map((group, index) => (
            <EventGroup key={group.view} heading={group.heading} items={groups[group.view]}
              href={group.href} variant={group.view === "suggested" ? "primary" : "neutral"}
              priority={index === 0} />
          ))}
        </div>
      ) : (
        <div data-motion-group className="event-grid">
          {listing.map(({ event }, i) => (
            <EventCard
              key={event.id}
              event={event}
              priority={i < 3}
            />
          ))}
        </div>
      )}
      </CatalogResultsTransition>
      <Dialog
        open={locationOpen}
        onOpenChange={(open) => {
          if (!open) closeLocation();
          else setLocationOpen(true);
        }}
      >
        <DialogContent className="app-dialog" dir="rtl" showCloseButton={false}>
          <div className="dialog-symbol">
            <img className="location-art" src="/icons/map.png" alt="" width={64} height={64} draggable={false} />
          </div>
          <DialogTitle>قرارهای نزدیکت را پیدا کنیم؟</DialogTitle>
          <DialogDescription>
            با دسترسی به موقعیت، نزدیک‌ترین ایونت‌ها اول نمایش داده می‌شوند.
            موقعیت دقیق شما ذخیره نمی‌شود.
          </DialogDescription>
          <button
            className="button full"
            onClick={locate}
            disabled={locating || loading}
          >
            <LocateFixed size={18} />
            <ButtonLabel busy={locating} pending="در حال دریافت موقعیت…">استفاده از موقعیت من</ButtonLabel>
          </button>
          {locationError && <ErrorBox message={locationError} />}
          <div className="or-divider">یا خودت انتخاب کن</div>
          <Choice
            label="انتخاب شهر"
            value={cities.includes(city) ? city : "تهران"}
            onChange={(v) => {
              updateFilters({ city: v, point: null, area: "all", sort: "soon" });
            }}
            options={cities.map((c) => ({ value: c, label: c }))}
          />
          {city === "تهران" && (
            <Choice
              label="انتخاب محله"
              value={area}
              onChange={(v) => {
                const n = neighborhoods.find((n) => n.value === v);
                if (n?.lat) {
                  updateFilters({ area: v, point: { lat: n.lat, lng: n.lng!, label: n.label }, sort: "distance" });
                } else {
                  updateFilters({ area: v, point: null, sort: "soon" });
                }
              }}
              options={neighborhoods}
            />
          )}
          <button className="button outline full" onClick={closeLocation}>
            دیدن ایونت‌های {city === "nearby" ? "اطراف" : city}
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
