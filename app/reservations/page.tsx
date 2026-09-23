"use client";
import { useSearchParams } from "next/navigation";
import { AppLink } from "@/components/event/app-navigation";
import { AnimatedRegion } from "@/components/ui/animated-region";
import { ButtonLabel } from "@/components/ui/button-label";
import { LoadingPage } from "@/components/event/loading";
import { Suspense, useEffect, useState } from "react";
import {
  Ticket,
  CalendarDays,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsPanels } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/components/event/app-shell";
import { Blank, ErrorBox, Loading } from "@/components/event/shared";
import { api } from "@/lib/client";
import { date, clock, fa, type Reservation } from "@/lib/types";
import { TicketDownload } from "@/components/event/ticket-download";
import { eventLocationUrl } from "@/lib/location-url";
import { groupReservations } from "@/lib/reservation-history";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import styles from "@/components/event/ticket-download.module.css";
import mediaStyles from "@/components/event/event-media.module.css";
export default function Reservations() {
  return <Suspense fallback={<LoadingPage variant="reservations" />}><ReservationsContent /></Suspense>;
}

function ReservationsContent() {
  const search = useSearchParams();
  const payment = search.has("booked") ? "booked" : (search.get("payment") ?? "");
  const purchasedId = search.get("booked") || search.get("reservation") || "";
  const returnTo = `/reservations${search.size ? `?${search}` : ""}`;
  const { user, loading: authLoading } = useAuth();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [rows, setRows] = useState<Reservation[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [cancel, setCancel] = useState<string | null>(null),
    [busy, setBusy] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const currentTime = useDeadlineClock(undefined);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(
        (await api<{ reservations: Reservation[] }>("/api/reservations"))
          .reservations,
      );
      setHasLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user) void load();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading]);
  async function action(id: string, kind: string) {
    if (busy) return;
    setBusy(id);
    setBusyAction(kind);
    try {
      const result = await api<{ paymentUrl?: string }>(
        `/api/reservations/${id}`,
        { action: kind },
      );
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      toast.success(
        kind === "cancel" ? "رزرو لغو شد." : "وضعیت پرداخت به‌روزرسانی شد.",
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
      setBusyAction("");
      setCancel(null);
    }
  }
  if (currentTime === null) return <main className="container subpage"><Loading variant="reservations" /></main>;
  const now = currentTime;
  const { past, upcoming, cancelled } = groupReservations(rows, now);
  const purchased = rows.find((r) => r.id === purchasedId && r.status === "confirmed");
  function status(r: Reservation) {
    if (r.status === "confirmed")
      return r.ends_at > now ? "رزرو تأییدشده" : "برگزارشده";
    if (r.status === "paid_unfulfilled") return "پرداخت نیازمند پیگیری";
    if (r.status === "hold")
      return (r.expires_at ?? 0) > now
        ? "در انتظار پرداخت"
        : "مهلت رزرو پایان یافته";
    if (r.status === "cancelled") return "لغوشده";
    return "پرداخت ناموفق";
  }
  function list(items: Reservation[]) {
    return items.length ? (
      <div className="reservation-list">
        {items.map((r) => {
          const locationUrl = eventLocationUrl(r);
          return (
          <article className={`reservation-card${r.image ? "" : ` ${mediaStyles.reservationWithoutImage}`}`} key={r.id}>
            {r.image && <img src={r.image} alt={`تصویر ${r.title}`} />}
            <div className="reservation-info">
              <span
                className={`status ${r.status === "confirmed" ? "success" : ""}`}
              >
                {status(r)}
              </span>
              <AppLink href={`/events/${r.event_id}`}>
                <h2>{r.title}</h2>
              </AppLink>
              <p>
                <CalendarDays size={15} />
                {date(r.starts_at)}، ساعت {clock(r.starts_at)}
              </p>
              <p>
                <MapPin size={15} />
                {r.venue}
              </p>
              <div className="reservation-meta">
                <span>{fa(r.quantity)} نفر</span>
                <strong>{r.total ? `${fa(r.total)} تومان` : "رایگان"}</strong>
              </div>
              {r.status === "confirmed" && (
                <p className="ticket-code">
                  کد رزرو: <bdi>{r.id}</bdi>
                </p>
              )}
              {r.reference && (
                <p className="ticket-code">
                  شناسهٔ پرداخت: <bdi>{r.reference}</bdi>
                </p>
              )}
              {r.payment_state === "skipped_dev" && (
                <p className="notice">رزرو آزمایشی؛ وجهی دریافت نشده است.</p>
              )}
              {r.status === "paid_unfulfilled" && (
                <p className="notice">
                  پرداخت انجام شده اما ظرفیت ایونت پر شده است. بلیت صادر نشده؛
                  میزبان باید پرداخت را پیگیری و بازگرداند.
                </p>
              )}
            </div>
            <div className="reservation-actions">
              {r.status === "confirmed" && (
                <TicketDownload reservationId={r.id} quantity={r.quantity} fullWidth />
              )}
              {locationUrl && (
                <a className="button outline reservation-location" href={locationUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin size={17} aria-hidden="true" />
                  مشاهده آدرس
                </a>
              )}
              {r.total === 0 &&
                r.status === "confirmed" &&
                r.starts_at > now && (
                  <button
                    className="text-button danger"
                    onClick={() => setCancel(r.id)}
                  >
                    لغو رزرو
                  </button>
                )}
              {r.total > 0 &&
                r.status === "hold" &&
                (r.expires_at ?? 0) > now && (
                  <button
                    className="button"
                    disabled={!!busy}
                    aria-busy={busy === r.id && busyAction === "retry"}
                    onClick={() => action(r.id, "retry")}
                  >
                    <ButtonLabel busy={busy === r.id && busyAction === "retry"} pending="در حال آماده‌سازی…">ادامهٔ پرداخت</ButtonLabel>
                  </button>
                )}
              {r.total > 0 &&
                r.status !== "confirmed" &&
                r.status !== "paid_unfulfilled" && (
                  <button
                    className="button outline"
                    disabled={!!busy}
                    aria-busy={busy === r.id && busyAction === "verify"}
                    onClick={() => action(r.id, "verify")}
                  >
                    <RefreshCw size={16} />
                    <ButtonLabel busy={busy === r.id && busyAction === "verify"} pending="در حال بررسی…">بررسی پرداخت</ButtonLabel>
                  </button>
                )}
              {r.status === "hold" && (r.expires_at ?? 0) <= now && (
                <AppLink href={`/events/${r.event_id}`} className="text-button">
                  رزرو دوباره
                </AppLink>
              )}
            </div>
          </article>
          );
        })}
      </div>
    ) : (
      <Blank
        title="اینجا منتظر اولین قرار توست"
        description="یک ایونت پیدا کن؛ بلیت و جزئیات رزرو اینجا می‌ماند."
      >
        <AppLink className="button" href="/">
          کشف ایونت‌ها
          <ArrowLeft size={17} />
        </AppLink>
      </Blank>
    );
  }
  return (
    <main className="container subpage">
      <div className="page-heading">
        <div className="eyebrow">
          <Ticket size={17} />
          قرارهای تو
        </div>
        <h1>بلیت‌های من</h1>
        <p>همهٔ قرارهای پیش رو و خاطره‌های قبلی، یک‌جا.</p>
      </div>
      {user && !loading && !error && purchased && (
        <section className={styles.purchase} aria-labelledby="tickets-ready-heading">
          <CheckCircle2 size={27} />
          <div>
            <h2 id="tickets-ready-heading">بلیتت آماده است.</h2>
            <p>{purchased.title} · بلیت‌ها اینجا و در سوابق خریدت می‌مانند.</p>
            <TicketDownload reservationId={purchased.id} quantity={purchased.quantity} prominent />
          </div>
        </section>
      )}
      {payment && !purchased && (
        <div
          className={
            payment === "success" || payment === "booked"
              ? "success-box"
              : "notice"
          }
          role="status"
        >
          {payment === "success" || payment === "booked" ? (
            "نتیجهٔ خرید و دانلود بلیت در فهرست رزروهای شما نمایش داده می‌شود."
          ) : payment === "cancelled" ? (
            "از درگاه برگشتید. اگر مبلغی کسر شده، وضعیت پرداخت را بررسی کنید."
          ) : payment === "review" ? (
            "پرداخت شما نیاز به پیگیری میزبان دارد. جزئیات را در رزرو ببینید."
          ) : (
            "تأیید پرداخت در حال بررسی است. «بررسی پرداخت» را بزنید."
          )}
        </div>
      )}
      <AnimatedRegion animateHeight={false} aria-busy={hasLoaded && loading} transitionKey={authLoading || (loading && !hasLoaded) ? "loading" : !user ? "signed-out" : error || rows.map((row) => `${row.id}:${row.status}`).join(",")}>
      {authLoading || (loading && !hasLoaded) ? (
        <Loading variant="reservations" />
      ) : !user ? (
        <Blank
          title="بلیت‌هایت منتظرت هستند"
          description="با شمارهٔ همراهت وارد شو تا رزروها را ببینی."
        >
          <AppLink className="button" href={`/login?next=${encodeURIComponent(returnTo)}`}>
            ورود به حساب
            <ArrowLeft size={17} />
          </AppLink>
        </Blank>
      ) : error ? (
        <ErrorBox message={error} retry={load} />
      ) : (
        <Tabs defaultValue={purchased && past.includes(purchased) ? "past" : "upcoming"} dir="rtl">
          <TabsList className="page-tabs">
            <TabsTrigger value="past">
              رفته ({fa(past.length)})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              پیش رو ({fa(upcoming.length)})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              لغو شده ({fa(cancelled.length)})
            </TabsTrigger>
          </TabsList>
          <TabsPanels>
          <TabsContent value="past">{list(past)}</TabsContent>
          <TabsContent value="upcoming">{list(upcoming)}</TabsContent>
          <TabsContent value="cancelled">{list(cancelled)}</TabsContent>
        </TabsPanels>
        </Tabs>
      )}
      </AnimatedRegion>
      <AlertDialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v && !busy) setCancel(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>این قرار را لغو می‌کنی؟</AlertDialogTitle>
            <AlertDialogDescription>
              جای شما آزاد می‌شود و ممکن است فرد دیگری آن را رزرو کند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>نگه داشتن رزرو</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!busy}
              aria-busy={!!busy && busyAction === "cancel"}
              onClick={() => cancel && action(cancel, "cancel")}
            >
              <ButtonLabel busy={!!busy && busyAction === "cancel"} pending="در حال لغو…">لغو رزرو</ButtonLabel>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
