"use client";
import { useSearchParams } from "next/navigation";
import { ButtonLabel } from "@/components/ui/button-label";
import { AppLink, useAppNavigate } from "@/components/event/app-navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Clock3,
  Users,
  ShieldCheck,
  Plus,
  Minus,
  Ticket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "./app-shell";
import { MAX_ORDER_TOMAN } from "@/lib/payment-limits";
import { api } from "@/lib/client";
import { eventLocationUrl } from "@/lib/location-url";
import { Blank, ErrorBox, Loading } from "./shared";
import { LoadingPage } from "./loading";
import { EventGallery } from "./event-gallery";
import { RegistrationCountdown } from "./registration-countdown";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { registrationState, REGISTRATION_CLOSED } from "@/lib/registration";
import { fa, faDigits, date, clock, categories, type EventDetailData } from "@/lib/types";
import styles from "./ticket-download.module.css";
import mediaStyles from "./event-media.module.css";
import layouts from "./page-layouts.module.css";
export default function EventDetail({ id }: { id: string }) {
  return <Suspense fallback={<LoadingPage variant="event" />}><EventDetailContent id={id} /></Suspense>;
}

function EventDetailContent({ id }: { id: string }) {
  const requestedQuantity = useSearchParams().get("quantity");
  const navigate = useAppNavigate();
  const requestVersion = useRef(0);
  const [event, setEvent] = useState<EventDetailData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [quantity, setQuantity] = useState(1),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [buyerName, setBuyerName] = useState(""),
    [key, setKey] = useState(""),
    [bookingError, setBookingError] = useState("");
  const { user, paymentReady, skipPayDevEnabled } = useAuth();
  const now = useDeadlineClock(event ? Math.min(event.registration_ends_at, event.starts_at) : undefined);
  const availability = event && now !== null ? registrationState(event, now) : "checking";
  const closed = availability !== "open";
  async function load() {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const loaded = (await api<{ event: EventDetailData }>(`/api/events/${id}`))
        .event;
      if (version !== requestVersion.current) return;
      setEvent(loaded);
      const requested = Number(
        requestedQuantity,
      );
      setQuantity(
          Math.max(
            1,
            Math.min(
              Number.isInteger(requested) && requested >= 1 && requested <= 6 ? requested : 1,
              loaded.remaining ?? 6,
              loaded.price ? Math.floor(MAX_ORDER_TOMAN / loaded.price) : 6,
            ),
          ),
      );
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => { requestVersion.current++; };
  }, [id, requestedQuantity]);
  async function book() {
    if (!event || busy) return;
    if (registrationState(event, Date.now()) !== "open") {
      setConfirm(false);
      return;
    }
    const name = buyerName.trim();
    if (name.length < 2 || name.length > 80) {
      setBookingError("نام و نام خانوادگی را بین ۲ تا ۸۰ نویسه وارد کنید.");
      return;
    }
    setBusy(true);
    setBookingError("");
    try {
      const result = await api<{
        reservation: { id: string; status: string };
        paymentUrl: string | null;
      }>("/api/reservations", { eventId: id, quantity, name, requestKey: key });
      if (result.paymentUrl) window.location.assign(result.paymentUrl);
      else
        navigate(
          `/reservations?${result.reservation.status === "confirmed" ? "booked" : "pending"}=${result.reservation.id}`,
        );
    } catch (e) {
      setBookingError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className={`container subpage ${layouts.page}`}>
        <Loading variant="event" />
      </main>
    );
  if (error)
    return (
      <main className={`container subpage ${layouts.page}`}>
        <ErrorBox message={error} retry={load} />
      </main>
    );
  if (!event) return <Blank title="ایونت پیدا نشد" />;
  const mapUrl = eventLocationUrl(event);
  const category = categories.find((item) => item.id === event.category)?.label;
  return (
    <main className={`container subpage ${layouts.page} ${layouts.detailPage}`}>
      <AppLink className="back-link" href="/">
        <ArrowRight size={17} />
        همهٔ ایونت‌ها
      </AppLink>
      <header className={`${layouts.detailHero}${event.image ? "" : ` ${layouts.heroWithoutImage}`}`}>
        <div className={layouts.detailHeroCopy}>
          <span className={mediaStyles.category}>{category}</span>
          <div className={`eyebrow ${layouts.heroVenue}`}><MapPin size={18} aria-hidden="true" /><span>{event.venue} · {event.city}</span></div>
          <h1>{event.title}</h1>
          <div className={layouts.heroFacts}>
            <span><CalendarDays size={18} aria-hidden="true" />{date(event.starts_at, true)}</span>
            <span><Clock3 size={18} aria-hidden="true" />{clock(event.starts_at)} تا {clock(event.ends_at)}</span>
          </div>
          <RegistrationCountdown key={`countdown-${event.id}`} deadline={event.registration_ends_at} />
        </div>
        {event.image && <div className={layouts.detailHeroImage}><img src={event.image} alt={`تصویر ${event.title}`} /></div>}
      </header>
      <div className={`detail-grid ${layouts.detailGrid}`}>
        <article className={layouts.detailArticle}>
          <div className="detail-copy">
            <EventGallery key={event.id} images={event.gallery} title={event.title} />
            <h2>دربارهٔ این قرار</h2>
            <p className="description">{event.description}</p>
            <h2>کجا همدیگر را می‌بینیم؟</h2>
            <p>
              {event.venue}{event.address ? `، ${event.address}` : ""}
            </p>
            {mapUrl && (
              <a
                className="map-link"
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={17} />
                باز کردن پیوند محل برگزاری
                <ArrowLeft size={15} />
              </a>
            )}
            {event.sample === 1 && (
              <p className="sample-note">
                این یک ایونت نمونه برای بررسی محصول است و برنامهٔ واقعی این
                کافه نیست. تصاویر جنبهٔ نمایشی دارند.
              </p>
            )}
          </div>
        </article>
        <aside className={`booking-panel ${layouts.bookingPanel}`} aria-label="انتخاب و رزرو بلیت">
          <div className="eyebrow">
            <Ticket size={17} />
            جای تو اینجاست
          </div>
          <h2>
            {event.price ? fa(event.price) : "رایگان"}
            {event.price > 0 && <small> تومان / هر نفر</small>}
          </h2>
          <div className="booking-facts">
            <p>
              <CalendarDays size={18} />
              {date(event.starts_at)}
            </p>
            <p>
              <Clock3 size={18} />
              ساعت {clock(event.starts_at)}
            </p>
            <p className={`booking-capacity${event.remaining === 0 ? " sold-out" : ""}`}>
              <Users size={18} />
              {event.remaining === null
                ? "بدون محدودیت ظرفیت"
                : event.remaining === 0
                  ? "تکمیل ظرفیت"
                  : `${fa(event.remaining)} نفر باقی مانده`}
            </p>
          </div>
          {closed ? (
            <>
            <div className="notice registration-notice" role="status">
              {availability === "checking" ? "در حال بررسی مهلت ثبت‌نام…" : availability === "started"
                ? "ثبت‌نام این ایونت پایان یافته است."
                : availability === "expired" ? "مهلت ثبت‌نام این ایونت پایان یافته است."
                  : "ظرفیت این ایونت تکمیل شده است."}
            </div>
            <button className="button full" disabled>
              <ButtonLabel
                state={availability === "checking" ? "checking" : availability === "sold_out" ? "sold-out" : "closed"}
                states={{ checking: "در حال بررسی…", "sold-out": "تکمیل ظرفیت", closed: REGISTRATION_CLOSED }}
              />
            </button>
            </>
          ) : (
            <>
              <div className="quantity-row">
                <span>تعداد نفرات</span>
                <div className="quantity-control">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((n) => n - 1)}
                    aria-label="کم کردن تعداد"
                  >
                    <Minus size={16} />
                  </button>
                  <strong key={quantity} className="motion-number">{fa(quantity)}</strong>
                  <button
                    disabled={
                      quantity >=
                      Math.min(
                        event.remaining ?? 6,
                        6,
                        event.price
                          ? Math.floor(MAX_ORDER_TOMAN / event.price)
                          : 6,
                      )
                    }
                    onClick={() => setQuantity((n) => n + 1)}
                    aria-label="زیاد کردن تعداد"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div className="total-row">
                <span>مبلغ نهایی</span>
                <strong>
                  {event.price
                    ? `${fa(event.price * quantity)} تومان`
                    : "رایگان"}
                </strong>
              </div>
              {user ? (
                <button
                  className="button full"
                  onClick={() => {
                    if (registrationState(event, Date.now()) !== "open") return;
                    setKey(crypto.randomUUID());
                    setBuyerName(user.name ?? "");
                    setBookingError("");
                    setConfirm(true);
                  }}
                >
                  {event.price ? (skipPayDevEnabled ? "رزرو بدون پرداخت" : "خرید بلیت") : "ثبت‌نام رایگان"}
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <AppLink
                  className="button full"
                  href={`/login?next=${encodeURIComponent(`/events/${id}?quantity=${quantity}`)}`}
                >
                  {event.price ? (skipPayDevEnabled ? "ورود و رزرو بدون پرداخت" : "ورود و خرید بلیت") : "ورود و ثبت‌نام رایگان"}
                  <ArrowLeft size={18} />
                </AppLink>
              )}
              {event.price > 0 && !paymentReady && !skipPayDevEnabled && (
                <p className="notice">
                  فروش بلیت پس از فعال‌سازی درگاه پرداخت آغاز می‌شود.
                </p>
              )}
              <p className="booking-note">
                <ShieldCheck size={15} />
                {event.price
                  ? (skipPayDevEnabled ? "حالت آزمایشی: رزرو بدون دریافت وجه تأیید می‌شود" : "رزرو نهایی پس از تأیید پرداخت")
                  : "تأیید آنی، بدون نیاز به پرداخت"}
              </p>
            </>
          )}
        </aside>
      </div>
      <Dialog
        open={confirm && !closed}
        onOpenChange={(v) => {
          if (!busy) setConfirm(v);
        }}
      >
        <DialogContent className="app-dialog" dir="rtl" showCloseButton={false}>
          <DialogTitle>
            تأیید {event.price ? (skipPayDevEnabled ? "رزرو بدون پرداخت" : "خرید بلیت") : "ثبت‌نام"}
          </DialogTitle>
          <DialogDescription>
            {event.title} · {date(event.starts_at)}
          </DialogDescription>
          <div className={styles.nameField}>
            <label htmlFor="ticket-buyer-name">نام و نام خانوادگی خریدار</label>
            <input
              id="ticket-buyer-name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={buyerName}
              disabled={busy}
              aria-describedby="ticket-buyer-help"
              onChange={(event) => setBuyerName(event.target.value)}
            />
            <small id="ticket-buyer-help">
              {quantity > 1
                ? "همهٔ بلیت‌ها به نام خریدار ثبت می‌شوند؛ هر نفر یک بلیت و کد کیوآر جداگانه دارد."
                : "این نام روی بلیت و در فهرست مهمان‌های میزبان نمایش داده می‌شود."}
              {" "}شمارهٔ همراه حساب شما: <bdi>{faDigits(user?.phone ?? "")}</bdi>
            </small>
          </div>
          <div className="checkout-summary">
            <p>
              تعداد نفرات <strong key={quantity} className="motion-number">{fa(quantity)}</strong>
            </p>
            <p>
              مبلغ نهایی{" "}
              <strong>
                {event.price ? `${fa(event.price * quantity)} تومان` : "رایگان"}
              </strong>
            </p>
          </div>
          {event.price > 0 && (
            <p className="muted">
              {skipPayDevEnabled
                ? "حالت آزمایشی فعال است. مبلغ نمایش‌داده‌شده دریافت نمی‌شود؛ رزرو و بلیت‌ها بدون مراجعه به درگاه پرداخت تأیید می‌شوند."
                : "جای شما برای ۱۵ دقیقه نگه داشته می‌شود. پرداخت در صفحهٔ امن زرین‌پال انجام می‌شود."}
            </p>
          )}
          <p className="muted">
            پس از تأیید، فایل پی‌دی‌اف بلیت‌ها آمادهٔ دانلود است و همیشه در «بلیت‌های من» می‌ماند.
          </p>
          {event.sample === 1 && (
            <p className="notice">
              این ایونت نمونه است و برنامهٔ واقعی کافه نیست.
            </p>
          )}
          {bookingError && <ErrorBox message={bookingError} />}
          <button className="button full" disabled={closed || busy || buyerName.trim().length < 2} aria-busy={busy} onClick={book}>
            <ButtonLabel busy={busy} pending="در حال ثبت…">
              {event.price ? (skipPayDevEnabled ? "تأیید و دریافت بلیت" : "رفتن به درگاه پرداخت") : "تأیید ثبت‌نام"}
            </ButtonLabel>
          </button>
          <button
            className="button outline full"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            بازگشت
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
