"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, CalendarDays, Clock3, Moon, Sun, Ticket, UserRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsPanels, TabsTrigger } from "@/components/ui/tabs";
import { ButtonLabel } from "@/components/ui/button-label";
import { AppLink } from "@/components/event/app-navigation";
import { ReservationHistory } from "@/components/event/reservation-history";
import { ReceiptActions } from "@/components/event/receipt-actions";
import { useAuth } from "@/components/event/app-shell";
import { api } from "@/lib/client";
import type { AccountSummary } from "@/lib/account-types";
import { reservationAmountLabel, reservationStatusLabel } from "@/lib/account-types";
import { clock, date, fa, faDigits } from "@/lib/types";
import { eventLocationUrl } from "@/lib/location-url";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { ErrorBox, Loading } from "@/components/event/shared";
import layouts from "@/components/event/page-layouts.module.css";

export function AccountDashboard() {
  const { user, loading: authLoading, refresh, logout, loggingOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [paymentBusy, setPaymentBusy] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const currentTime = useDeadlineClock(summary?.latestPurchase?.expires_at ?? undefined, 1000, summary?.serverNow);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api<AccountSummary>("/api/account/summary")
      .then((data) => { if (active) { setSummary(data); setName(data.user.name); } })
      .catch((error: Error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [user]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveBusy) return;
    setSaveBusy(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const result = await api<{ user: { name: string } }>("/api/me", { name }, "PATCH");
      setName(result.user.name);
      setSummary((current) => current ? { ...current, user: { ...current.user, name: result.user.name } } : current);
      await refresh();
      setSaveMessage("نام حساب به‌روز شد.");
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSaveBusy(false);
    }
  }

  async function paymentAction(id: string, action: "retry" | "verify") {
    if (paymentBusy) return;
    setPaymentBusy(action);
    setPaymentError("");
    try {
      const result = await api<{ paymentUrl?: string }>(`/api/reservations/${encodeURIComponent(id)}`, { action });
      if (result.paymentUrl) { window.location.assign(result.paymentUrl); return; }
      const updated = await api<AccountSummary>("/api/account/summary");
      setSummary(updated);
    } catch (error) {
      setPaymentError((error as Error).message);
    } finally {
      setPaymentBusy("");
    }
  }

  if (authLoading) return <main className={`container subpage ${layouts.page}`}><Loading variant="account" /></main>;
  if (!user) return <main className={`container subpage ${layouts.page}`}><section className="blank"><h1>برای دیدن حساب وارد شو</h1><p>با شمارهٔ همراهت وارد شو تا خریدها و تنظیماتت را ببینی.</p><AppLink className="button" href="/login?next=%2Faccount">ورود به حساب <ArrowLeft size={17} /></AppLink></section></main>;
  if (loadError) return <main className={`container subpage ${layouts.page}`}><ErrorBox message={loadError} retry={() => { setLoadError(""); setSummary(null); api<AccountSummary>("/api/account/summary").then(setSummary).catch((error: Error) => setLoadError(error.message)); }} /></main>;
  if (!summary) return <main className={`container subpage ${layouts.page}`}><Loading variant="account" /></main>;

  const latest = summary.latestPurchase;
  const outstanding = summary.latestOutstanding;
  const now = currentTime ?? summary.serverNow;
  const latestStatus = latest ? reservationStatusLabel(latest.status, latest.payment_state, latest.total, latest.ends_at, now) : "";
  const location = latest ? eventLocationUrl(latest) : null;
  return <main data-motion-group className={`container subpage ${layouts.page} account-dashboard`}>
    <div className={`page-heading ${layouts.pageHeading}`}>
      <div className="eyebrow"><UserRound size={17} /> حساب کاربری</div>
      <h1>سلام، {user.name || "هم‌قدم"}</h1>
      <p>اطلاعات حساب، خریدها و رسید رزروهایت را اینجا پیدا می‌کنی.</p>
    </div>
    <section className={`${layouts.accountProfile} account-dashboard-profile`} aria-label="اطلاعات حساب">
      <div className={layouts.accountIdentity}><span className={layouts.accountAvatar}><UserRound size={28} aria-hidden="true" /></span><div><h2>{user.name || "حساب شما"}</h2><p>شمارهٔ همراه <bdi>{faDigits(user.phone)}</bdi></p></div></div>
      <button className="button outline" type="button" onClick={logout} disabled={loggingOut} aria-busy={loggingOut}><ButtonLabel busy={loggingOut} pending="در حال خروج…">خروج از حساب</ButtonLabel></button>
    </section>
    <Tabs defaultValue="overview" dir="rtl">
      <TabsList className="page-tabs account-tabs">
        <TabsTrigger value="overview">نمای کلی</TabsTrigger>
        <TabsTrigger value="purchases">خریدها ({fa(summary.reservationCount)})</TabsTrigger>
        <TabsTrigger value="settings">تنظیمات</TabsTrigger>
      </TabsList>
      <TabsPanels>
        <TabsContent value="overview">
          <section className="account-stat-grid" aria-label="خلاصه حساب">
            <article><Ticket size={19} /><strong>{fa(summary.reservationCount)}</strong><span>رزرو</span></article>
            <article><CalendarDays size={19} /><strong>{fa(summary.confirmedCount)}</strong><span>رزرو تأییدشده</span></article>
            <article><Clock3 size={19} /><strong>{fa(summary.outstandingCount)}</strong><span>در انتظار پرداخت</span></article>
          </section>
          <section className="account-latest" aria-labelledby="latest-purchase-heading">
            <div className="account-section-heading"><div><span className="eyebrow">آخرین خرید</span><h2 id="latest-purchase-heading">آخرین رزرو ثبت‌شده</h2></div><AppLink className="text-button" href="/reservations">همهٔ خریدها <ArrowLeft size={16} /></AppLink></div>
            {latest ? <article className="account-latest-card">
              {latest.image && <img src={latest.image} alt={`تصویر ${latest.title}`} />}
              <div className="account-latest-info"><span className="status success">{latestStatus}</span><h3>{latest.title}</h3><p>{date(latest.created_at, true)}، ساعت {clock(latest.created_at)}</p><p>{date(latest.starts_at, true)}، ساعت {clock(latest.starts_at)} · {latest.venue}</p><div className="reservation-meta"><span>{fa(latest.quantity)} نفر</span><strong>{reservationAmountLabel(latest.status, latest.payment_state, latest.total)}</strong></div>{latest.reference && <p className="ticket-code">شناسهٔ پرداخت: <bdi>{latest.reference}</bdi></p>}{latest.payment_state === "skipped_dev" && <p className="notice">برای این رزرو وجهی دریافت نشده است.</p>}<div className="account-latest-actions"><ReceiptActions reservationId={latest.id} />{location && <a className="button outline" href={location} target="_blank" rel="noopener noreferrer">مشاهدهٔ محل برگزاری</a>}</div></div>
            </article> : <div className="account-empty"><p>هنوز خریدی ثبت نشده است.</p><AppLink className="button" href="/">کشف ایونت‌ها <ArrowLeft size={17} /></AppLink></div>}
          </section>
          {outstanding && <section className="account-latest account-outstanding" aria-labelledby="outstanding-heading">
            <div className="account-section-heading"><div><span className="eyebrow">{fa(summary.outstandingCount)} مورد باز</span><h2 id="outstanding-heading">رزروی که نیاز به پیگیری دارد</h2></div><AppLink className="text-button" href="/reservations">همهٔ خریدها <ArrowLeft size={16} /></AppLink></div>
            <article className="account-outstanding-card"><div><span className="status">{reservationStatusLabel(outstanding.status, outstanding.payment_state, outstanding.total, outstanding.status === "hold" ? (outstanding.expires_at ?? 0) : outstanding.ends_at, now)}</span><h3>{outstanding.title}</h3><p>{date(outstanding.created_at, true)} · {reservationAmountLabel(outstanding.status, outstanding.payment_state, outstanding.total)}</p>{outstanding.status === "hold" && (outstanding.expires_at ?? 0) > now && <p className="hold-countdown" role="timer" aria-live="off">مهلت پرداخت: {fa(Math.ceil(((outstanding.expires_at ?? now) - now) / 1000))} ثانیه</p>}{outstanding.status === "paid_unfulfilled" && <p className="notice">پرداخت انجام شده اما رزرو قطعی نشده است؛ رسید را نگه دارید و با میزبان پیگیری کنید.</p>}</div><div className="account-payment-actions">{outstanding.status === "hold" && (outstanding.expires_at ?? 0) > now && <button className="button" disabled={!!paymentBusy} onClick={() => void paymentAction(outstanding.id, "retry")}><ButtonLabel busy={paymentBusy === "retry"} pending="در حال آماده‌سازی…">ادامهٔ پرداخت</ButtonLabel></button>}{outstanding.status === "hold" && <button className="button outline" disabled={!!paymentBusy} onClick={() => void paymentAction(outstanding.id, "verify")}><ButtonLabel busy={paymentBusy === "verify"} pending="در حال بررسی…">بررسی پرداخت</ButtonLabel></button>}{outstanding.status === "paid_unfulfilled" && <ReceiptActions reservationId={outstanding.id} />}</div>{paymentError && <p className="form-error" role="alert">{paymentError}</p>}</article>
          </section>}
        </TabsContent>
        <TabsContent value="purchases"><ReservationHistory embedded /></TabsContent>
        <TabsContent value="settings">
          <section className="account-settings-card"><form className="auth-form" onSubmit={saveProfile}><h2>اطلاعات حساب</h2><label htmlFor="account-name">نام و نام خانوادگی</label><input id="account-name" autoComplete="name" minLength={2} maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} /><label htmlFor="account-phone">شمارهٔ همراه</label><input id="account-phone" value={faDigits(user.phone)} readOnly aria-describedby="account-phone-help" /><small id="account-phone-help">شمارهٔ همراه با تأیید پیامکی ثبت شده و از این بخش تغییر نمی‌کند.</small>{saveError && <p className="form-error" role="alert">{saveError}</p>}{saveMessage && <p className="success-box" role="status">{saveMessage}</p>}<button className="button" disabled={saveBusy} aria-busy={saveBusy}><ButtonLabel busy={saveBusy} pending="در حال ذخیره…">ذخیرهٔ نام</ButtonLabel></button></form>
            <div className="account-theme"><div><h2>حالت نمایش</h2><p>تنظیم انتخابی روی همین دستگاه ذخیره می‌شود.</p></div><div className="account-theme-buttons"><button type="button" className={`button outline${theme === "light" ? " selected" : ""}`} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={18} /> روشن</button><button type="button" className={`button outline${theme === "dark" ? " selected" : ""}`} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={18} /> تیره</button></div></div>
          </section>
        </TabsContent>
      </TabsPanels>
    </Tabs>
  </main>;
}
