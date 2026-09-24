"use client";
import layouts from "@/components/event/page-layouts.module.css";
import { ButtonLabel } from "@/components/ui/button-label";
import { AppLink, useAppNavigate } from "./app-navigation";
import { AnimatedRegion } from "@/components/ui/animated-region";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCheck,
  Copy,
  Download,
  MapPin,
  RefreshCw,
  ScanLine,
  Search,
  Share2,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/event/app-shell";
import { Blank, ErrorBox, Loading } from "@/components/event/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/client";
import { clock, date, fa, faDigits, type EventItem } from "@/lib/types";

type HostEventData = {
  event: EventItem;
  attendees: {
    id: string;
    event_id: string;
    quantity: number;
    total: number;
    status: string;
    payment_state: string;
    created_at: number;
    name: string;
    phone: string;
    checkedIn: number;
  }[];
  attendeeTotal: number;
  page: number;
  stats: { people: number; bookings: number; checkedIn: number; revenue: number };
};

const PAGE_SIZE = 50;

export default function HostEventPanel({ id }: { id: string }) {
  const navigate = useAppNavigate();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<HostEventData | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [scannerUrl, setScannerUrl] = useState("");
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const eventPath = `/api/host/events/${encodeURIComponent(id)}`;

  useEffect(() => {
    if (!user?.isHost) return;
    let ignore = false;
    const timer = window.setTimeout(() => {
      api<HostEventData>(
        `${eventPath}?${new URLSearchParams({ q: query.trim(), page: String(page) })}`,
      )
        .then((result) => {
          if (!ignore) {
            setData(result);
            setError("");
          }
        })
        .catch((reason: Error) => {
          if (!ignore) setError(reason.message);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, query ? 250 : 0);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [eventPath, user?.isHost, user?.id, query, page, revision]);

  function reload() {
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  }

  function search(value: string) {
    if (value === query && page === 0) return;
    setQuery(value);
    setPage(0);
    setLoading(true);
    setError("");
  }

  function changePage(value: number) {
    setPage(value);
    setLoading(true);
    setError("");
  }

  async function exportAttendees() {
    setExporting(true);
    try {
      const response = await fetch(
        `${eventPath}/export?${new URLSearchParams({ q: query.trim() })}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          result?.error || "دریافت فهرست انجام نشد. دوباره تلاش کنید.",
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `hamghadam-attendees-${id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("فایل نام‌ها و شماره‌های همراه آماده شد.");
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "دریافت فایل انجام نشد. اتصال اینترنت را بررسی کنید.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function getScannerUrl(rotate = false) {
    if (scannerUrl && !rotate) return scannerUrl;
    setScannerBusy(true);
    setScannerError("");
    try {
      const result = await api<{ scannerUrl: string }>(`${eventPath}/scanner`, {
        ...(rotate ? { action: "rotate" } : {}),
      });
      const url = new URL(result.scannerUrl, window.location.origin).href;
      setScannerUrl(url);
      return url;
    } catch (reason) {
      setScannerError((reason as Error).message);
      return null;
    } finally {
      setScannerBusy(false);
    }
  }

  function openShareMenu() {
    setNativeShareAvailable(typeof navigator.share === "function");
    setRotateConfirm(false);
    setShareOpen(true);
    void getScannerUrl();
  }

  async function copyScannerLink() {
    const url = await getScannerUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک اسکنر کپی شد.");
    } catch {
      setNativeShareAvailable(typeof navigator.share === "function");
      setShareOpen(true);
      toast.error("کپی خودکار ممکن نیست؛ لینک را از کادر انتخاب و کپی کنید.");
    }
  }

  async function shareScanner() {
    if (!scannerUrl || !data) return;
    try {
      await navigator.share({
        title: `اسکنر ورود ${data.event.title}`,
        text: `ثبت ورود بلیت‌های ایونت «${data.event.title}» در هم‌قدم`,
        url: scannerUrl,
      });
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") return;
      toast.error("اشتراک‌گذاری انجام نشد؛ از دکمهٔ کپی لینک استفاده کنید.");
    }
  }

  async function rotateScannerLink() {
    const url = await getScannerUrl(true);
    if (url) {
      setRotateConfirm(false);
      toast.success("لینک قبلی غیرفعال شد. لینک تازه را برای کارکنان بفرستید.");
    }
  }

  const backLink = (
    <AppLink className="back-link" href="/host">
      <ArrowRight size={17} /> بازگشت به پنل میزبان
    </AppLink>
  );

  if (authLoading)
    return (
      <main className={`container subpage ${layouts.page} ${layouts.workspace}`}>
        {backLink}
        <Loading variant="host-event" />
      </main>
    );

  if (!user?.isHost)
    return (
      <main className={`container subpage ${layouts.page} ${layouts.workspace}`}>
        {backLink}
        <Blank
          title={
            user ? "این بخش ویژهٔ میزبان ایونت است" : "وارد حساب میزبان شوید"
          }
          description="فهرست شرکت‌کنندگان و ابزارهای ورود فقط در اختیار میزبان همین ایونت است."
        >
          {!user && (
            <AppLink className="button" href="/host/login">ورود میزبان</AppLink>
          )}
        </Blank>
      </main>
    );

  if (!data)
    return (
      <main className={`container subpage ${layouts.page} ${layouts.workspace}`}>
        {backLink}
        {error ? <ErrorBox message={error} retry={reload} /> : <Loading variant="host-event" />}
      </main>
    );

  return (
    <main className={`container subpage host-event-panel ${layouts.page} ${layouts.workspace}`}>
      {backLink}
      <div className={`page-heading host-heading ${layouts.pageHeading}`}>
        <div>
          <div className="eyebrow">مدیریت یک قرار خوب</div>
          <h1>{data.event.title}</h1>
          <div className="host-event-meta">
            <span>
              <CalendarDays size={16} /> {date(data.event.starts_at)}، ساعت{" "}
              {clock(data.event.starts_at)}
            </span>
            <span><MapPin size={16} /> {data.event.venue}</span>
          </div>
        </div>
        <AppLink
          className="button outline"
          href={`/events/${encodeURIComponent(id)}`}
        >
          مشاهدهٔ صفحهٔ ایونت
        </AppLink>
      </div>

      <div className="stats-grid">
        {[
          {
            label: "بلیت‌های تأییدشده",
            value: data.stats.people,
            unit: "بلیت",
            Icon: Ticket,
          },
          {
            label: "ورود ثبت‌شده",
            value: data.stats.checkedIn,
            unit: "نفر",
            Icon: CheckCheck,
          },
          {
            label: "خریدهای تأییدشده",
            value: data.stats.bookings,
            unit: "خرید",
            Icon: Users,
          },
          {
            label: "فروش ایونت",
            value: data.stats.revenue,
            unit: "تومان",
            Icon: Wallet,
          },
        ].map(({ label, value, unit, Icon }) => (
          <div className="stat-card" key={label}>
            <div>
              <span>{label}</span><Icon size={21} />
            </div>
            <strong>{fa(value)}<small>{unit}</small></strong>
          </div>
        ))}
      </div>

      <section
        className="host-scanner-panel"
        aria-labelledby="host-scanner-heading"
      >
        <div className="host-section-heading">
          <div className="host-scanner-symbol"><ScanLine size={28} /></div>
          <div>
            <h2 id="host-scanner-heading">یک خوش‌آمدگویی ساده، با اسکن بلیت</h2>
            <p>اسکنر اختصاصی این ایونت را در اختیار مسئولان ورود قرار دهید.</p>
          </div>
        </div>
        <div className="host-scanner-actions">
          {scannerUrl ? (
            <AppLink className="button" href={scannerUrl} rel="noreferrer">
              <ScanLine size={18} /> رفتن به اسکنر ورود
            </AppLink>
          ) : (
            <button
              className="button"
              disabled={scannerBusy}
              aria-busy={scannerBusy}
              onClick={async () => {
                const url = await getScannerUrl();
                if (url) navigate(url);
              }}
            >
              <ScanLine size={18} />{" "}
              <ButtonLabel busy={scannerBusy} pending="در حال آماده‌سازی…">رفتن به اسکنر ورود</ButtonLabel>
            </button>
          )}
          <button
            className="button outline"
            disabled={scannerBusy}
            aria-busy={scannerBusy}
            onClick={() => void copyScannerLink()}
          >
            <Copy size={17} /> <ButtonLabel busy={scannerBusy} pending="در حال آماده‌سازی…">کپی لینک اسکنر</ButtonLabel>
          </button>
          <button
            className="button outline"
            disabled={scannerBusy}
            aria-busy={scannerBusy}
            onClick={openShareMenu}
          >
            <Share2 size={17} /> <ButtonLabel busy={scannerBusy} pending="در حال آماده‌سازی…">اشتراک اسکنر با کارکنان</ButtonLabel>
          </button>
        </div>
        <ol className="host-scanner-instructions">
          <li>
            لینک اسکنر را روی گوشی باز کنید، اسکن را شروع کنید و اجازهٔ دسترسی
            به دوربین را بدهید.
          </li>
          <li>
            کد کیوآر بلیت هم‌قدم را مقابل دوربین بگیرید. هر صفحهٔ فایل پی‌دی‌اف، یک
            بلیت و یک کد جداگانه دارد.
          </li>
          <li>
            با تیک سبز، ورود تأیید می‌شود و اطلاعات بلیت تا اسکن بعدی روی صفحه
            می‌ماند. هر بلیت فقط یک‌بار پذیرفته می‌شود.
          </li>
        </ol>
        <p className="host-scanner-access">
          کارکنان برای اسکن نیازی به ورود به حساب ندارند. لینک را فقط با مسئولان
          ورود همین ایونت به اشتراک بگذارید.
        </p>
        {scannerError && <ErrorBox message={scannerError} />}
      </section>

      <section
        className="host-attendees-panel"
        aria-labelledby="host-attendees-heading"
      >
        <div className="host-section-heading host-attendees-heading">
          <div>
            <h2 id="host-attendees-heading">فهرست شرکت‌کنندگان</h2>
            <p>
              پس از تأیید خرید، نام و شمارهٔ همراه خریدار اینجا ثبت می‌شود.
              خرید گروهی در یک ردیف با تعداد بلیت نمایش داده می‌شود.
            </p>
          </div>
          <button className="text-button" disabled={loading} onClick={reload}>
            <RefreshCw size={16} /> به‌روزرسانی
          </button>
        </div>
        <div className="host-attendee-toolbar">
          <label className="host-attendee-search">
            <span className="sr-only">جستجوی نام یا شمارهٔ همراه</span>
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={query}
              maxLength={100}
              onChange={(event) => search(event.target.value)}
              placeholder="جستجوی نام یا شمارهٔ همراه"
            />
          </label>
          <button
            className="button outline"
            disabled={exporting || loading || !!error || !data.attendeeTotal}
            onClick={() => void exportAttendees()}
          >
            <Download size={17} />{" "}
            <ButtonLabel busy={exporting} pending="در حال دریافت…">دریافت نام‌ها و شماره‌ها (سی‌اس‌وی)</ButtonLabel>
          </button>
        </div>
        <p className="host-attendee-count" aria-live="polite">
          {loading
            ? "در حال دریافت فهرست…"
            : error
              ? "دریافت فهرست انجام نشد. دوباره تلاش کنید."
              : `${fa(data.attendeeTotal)} خرید${query.trim() ? " مطابق جستجو" : " تأییدشده"}؛ خروجی سی‌اس‌وی شامل تمام نتایج ${query.trim() ? "این جستجو" : "ایونت"} است.`}
        </p>
        <AnimatedRegion aria-busy={loading} transitionKey={error || data.attendees.map((attendee) => attendee.id).join(",")}>
          {error ? (
            <ErrorBox message={error} retry={reload} />
          ) : data.attendees.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام خریدار</TableHead>
                  <TableHead>شمارهٔ همراه</TableHead>
                  <TableHead>تعداد بلیت</TableHead>
                  <TableHead>ورود ثبت‌شده</TableHead>
                  <TableHead>زمان خرید</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell>
                      <strong>{attendee.name || "بدون نام"}</strong>
                      {attendee.payment_state === "skipped_dev" && (
                        <p className="muted">آزمایشی؛ بدون دریافت وجه</p>
                      )}
                    </TableCell>
                    <TableCell><bdi>{faDigits(attendee.phone ?? "")}</bdi></TableCell>
                    <TableCell>{fa(attendee.quantity)}</TableCell>
                    <TableCell>
                      <span
                        className={`status${attendee.checkedIn === attendee.quantity ? " success" : ""}`}
                      >
                        {fa(attendee.checkedIn)} از {fa(attendee.quantity)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {date(attendee.created_at)}، {clock(attendee.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Blank
              title={
                query.trim()
                  ? "نام یا شماره‌ای پیدا نشد"
                  : "منتظر اولین هم‌قدم هستیم"
              }
              description={
                query.trim()
                  ? "بخش کوتاه‌تری از نام یا شماره را جستجو کنید."
                  : "اطلاعات خریداران پس از تأیید اولین خرید به این فهرست اضافه می‌شود."
              }
            >
              {query && (
                <button className="button outline" onClick={() => search("")}>
                  پاک کردن جستجو
                </button>
              )}
            </Blank>
          )}
        </AnimatedRegion>
        {data.attendeeTotal > PAGE_SIZE && !error && (
          <nav
            className="host-attendee-pagination"
            aria-label="صفحه‌های شرکت‌کنندگان"
          >
            <button
              className="button outline"
              disabled={loading || page === 0}
              onClick={() => changePage(page - 1)}
            >
              صفحهٔ قبل
            </button>
            <span>
              صفحهٔ {fa(page + 1)} از{" "}
              {fa(Math.ceil(data.attendeeTotal / PAGE_SIZE))}
            </span>
            <button
              className="button outline"
              disabled={loading || (page + 1) * PAGE_SIZE >= data.attendeeTotal}
              onClick={() => changePage(page + 1)}
            >
              صفحهٔ بعد
            </button>
          </nav>
        )}
      </section>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="app-dialog host-share-dialog" dir="rtl">
          <DialogTitle>اشتراک اسکنر با کارکنان</DialogTitle>
          <DialogDescription>
            این لینک فقط برای ثبت ورود به «{data.event.title}» است. کارکنان به
            حساب میزبان یا فهرست شماره‌های همراه دسترسی ندارند.
          </DialogDescription>
          {scannerError && (
            <ErrorBox message={scannerError} retry={() => void getScannerUrl()} />
          )}
          {scannerUrl ? (
            <>
              <label className="host-scanner-link-label">
                لینک اسکنر این ایونت
                <input
                  className="host-scanner-link"
                  value={scannerUrl}
                  readOnly
                  dir="ltr"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <div className="host-share-options">
                {nativeShareAvailable && (
                  <button
                    className="button"
                    disabled={scannerBusy}
                    onClick={() => void shareScanner()}
                  >
                    <Share2 size={17} /> انتخاب برنامهٔ اشتراک‌گذاری
                  </button>
                )}
                <button
                  className="button outline"
                  disabled={scannerBusy}
                  onClick={() => void copyScannerLink()}
                >
                  <Copy size={17} /> کپی لینک برای کارکنان
                </button>
              </div>
              <div className="host-scanner-rotate">
                {rotateConfirm ? (
                  <>
                    <p>
                      با ساخت لینک تازه، لینک فعلی روی تمام گوشی‌ها غیرفعال
                      می‌شود. لینک تازه را دوباره برای کارکنان بفرستید.
                    </p>
                    <div className="host-share-options">
                      <button
                        className="button outline"
                        disabled={scannerBusy}
                        aria-busy={scannerBusy}
                        onClick={() => void rotateScannerLink()}
                      >
                        <ButtonLabel busy={scannerBusy} pending="در حال ساخت لینک…">غیرفعال کردن لینک قبلی و ساخت لینک تازه</ButtonLabel>
                      </button>
                      <button
                        className="text-button"
                        disabled={scannerBusy}
                        onClick={() => setRotateConfirm(false)}
                      >
                        انصراف
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    className="text-button"
                    disabled={scannerBusy}
                    onClick={() => setRotateConfirm(true)}
                  >
                    <RefreshCw size={15} /> تغییر لینک و لغو دسترسی قبلی
                  </button>
                )}
              </div>
            </>
          ) : scannerBusy ? (
            <p role="status">در حال آماده‌سازی لینک اسکنر…</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
