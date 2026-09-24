"use client";
import { AnimatedRegion } from "@/components/ui/animated-region";
import { ButtonLabel } from "@/components/ui/button-label";
import { Loading } from "@/components/event/loading";
import { ScannerHeader } from "@/components/event/scanner-header";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type QrScanner from "qr-scanner";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Check,
  ImageUp,
  LoaderCircle,
  MapPin,
  ScanLine,
  ShieldCheck,
  Square,
  Ticket,
} from "lucide-react";
import { clock, date, fa } from "@/lib/types";
import "./scanner.css";

type ScannerEvent = {
  id: string;
  title: string;
  venue: string;
  address: string;
  city: string;
  starts_at: number;
  ends_at: number;
};
type ScanResult = {
  status: "checked_in" | "already_checked_in";
  ticket: Omit<ScannerEvent, "id"> & {
    id: string;
    ordinal: number;
    name: string;
    checked_in_at: number;
  };
};

async function scannerRequest<T>(
  key: string,
  signal: AbortSignal,
  qr?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/scanner", {
      method: qr === undefined ? "GET" : "POST",
      headers: {
        "X-Scanner-Key": key,
        ...(qr === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: qr === undefined ? undefined : JSON.stringify({ qr }),
      credentials: "omit",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("ارتباط اینترنت برقرار نیست. اتصال را بررسی کنید و دوباره اسکن کنید.");
  }
  let result: T & { error?: string };
  try {
    result = await response.json();
  } catch {
    throw new Error("پاسخ سرویس قابل دریافت نیست. لطفاً دوباره تلاش کنید.");
  }
  if (!response.ok) throw new Error(result.error || "بررسی بلیت انجام نشد.");
  return result;
}

function cameraMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/permission|denied|notallowed/i.test(message))
    return "اجازهٔ دسترسی به دوربین داده نشد. دسترسی دوربین را در تنظیمات مرورگر فعال کنید یا تصویر کیوآر را انتخاب کنید.";
  if (/notfound|not found|no camera/i.test(message))
    return "دوربینی پیدا نشد. می‌توانید تصویر کیوآر بلیت را انتخاب کنید.";
  return "دوربین باز نشد. برنامه‌های دیگری که از دوربین استفاده می‌کنند را ببندید و دوباره تلاش کنید، یا تصویر کیوآر را انتخاب کنید.";
}

export default function ScannerPage() {
  const [retryCount, setRetryCount] = useState(0);
  const [event, setEvent] = useState<ScannerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [scanError, setScanError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const keyRef = useRef("");
  const sessionRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const imageBusyRef = useRef(false);
  const startingRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => {
    function loadScanner() {
      sessionRef.current?.abort();
      scannerRef.current?.destroy();
      scannerRef.current = null;
      armedRef.current = false;
      startingRef.current = false;
      busyRef.current = false;
      imageBusyRef.current = false;
      const controller = new AbortController();
      sessionRef.current = controller;
      // Keep the staff capability in the fragment; it must never enter a URL query or referrer.
      const key = window.location.hash.slice(1);
      keyRef.current = key;
      setEvent(null);
      setResult(null);
      setScanError("");
      setCameraError("");
      setCamera("off");
      setBusy(false);
      setImageBusy(false);
      setLoadError("");
      setLoading(true);
      if (!/^[a-f0-9]{64}$/.test(key)) {
        setLoadError("لینک اسکنر کامل یا معتبر نیست. لینک مخصوص این ایونت را از میزبان بگیرید.");
        setLoading(false);
        return;
      }
      void scannerRequest<{ event: ScannerEvent }>(key, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setEvent(data.event);
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted) setLoadError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }
    loadScanner();
    window.addEventListener("hashchange", loadScanner);
    return () => {
      window.removeEventListener("hashchange", loadScanner);
      sessionRef.current?.abort();
      scannerRef.current?.destroy();
    };
  }, [retryCount]);

  async function checkTicket(qr: string) {
    const controller = sessionRef.current;
    if (!controller || controller.signal.aborted || busyRef.current || !armedRef.current) return;
    // Pause after every decoded QR so a ticket cannot be submitted repeatedly across video frames.
    armedRef.current = false;
    busyRef.current = true;
    scannerRef.current?.stop();
    setCamera("off");
    setResult(null);
    setScanError("");
    setBusy(true);
    try {
      if (!/^hg-ticket:v1:[a-f0-9]{64}$/.test(qr))
        throw new Error("این کیوآر متعلق به بلیت‌های هم‌قدم نیست. کیوآر اصلی بلیت را اسکن کنید.");
      const checked = await scannerRequest<ScanResult>(keyRef.current, controller.signal, qr);
      if (!controller.signal.aborted) setResult(checked);
    } catch (error) {
      if (!controller.signal.aborted) setScanError((error as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function startCamera() {
    const controller = sessionRef.current;
    if (!event || !controller || controller.signal.aborted || startingRef.current || busyRef.current || imageBusyRef.current) return;
    if (!window.isSecureContext) {
      setCameraError("برای استفاده از دوربین، لینک اسکنر را با اتصال امن باز کنید. انتخاب تصویر کیوآر هم در دسترس است.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("این مرورگر به دوربین دسترسی ندارد. لینک را در مرورگر گوشی باز کنید یا تصویر کیوآر را انتخاب کنید.");
      return;
    }
    startingRef.current = true;
    setCamera("starting");
    setCameraError("");
    try {
      const { default: Scanner } = await import("qr-scanner");
      if (controller.signal.aborted || !videoRef.current) return;
      if (!scannerRef.current) {
        scannerRef.current = new Scanner(videoRef.current, (decoded) => {
          if (!controller.signal.aborted) void checkTicket(decoded.data);
        }, {
          preferredCamera: "environment",
          returnDetailedScanResult: true,
          maxScansPerSecond: 8,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        });
      }
      const scanner = scannerRef.current;
      armedRef.current = true;
      await scanner.start();
      if (controller.signal.aborted) scanner.destroy();
      else setCamera(armedRef.current ? "on" : "off");
    } catch (error) {
      if (!controller.signal.aborted) {
        armedRef.current = false;
        scannerRef.current?.stop();
        setCamera("off");
        setCameraError(cameraMessage(error));
      }
    } finally {
      if (!controller.signal.aborted) startingRef.current = false;
    }
  }

  function stopCamera() {
    armedRef.current = false;
    scannerRef.current?.stop();
    setCamera("off");
  }

  async function scanImage(change: ChangeEvent<HTMLInputElement>) {
    const file = change.target.files?.[0];
    change.target.value = "";
    const controller = sessionRef.current;
    if (!file || !controller || controller.signal.aborted || busyRef.current || imageBusyRef.current || startingRef.current) return;
    stopCamera();
    imageBusyRef.current = true;
    setImageBusy(true);
    setResult(null);
    setScanError("");
    try {
      const { default: Scanner } = await import("qr-scanner");
      if (controller.signal.aborted) return;
      const decoded = await Scanner.scanImage(file, { returnDetailedScanResult: true });
      if (controller.signal.aborted) return;
      armedRef.current = true;
      await checkTicket(decoded.data);
    } catch {
      if (!controller.signal.aborted)
        setScanError("کیوآر خوانا در تصویر پیدا نشد. تصویر واضحِ یک بلیت را انتخاب کنید؛ فایل پی‌دی‌اف را ابتدا به تصویر تبدیل کنید.");
    } finally {
      if (!controller.signal.aborted) {
        imageBusyRef.current = false;
        setImageBusy(false);
      }
    }
  }

  return (
    <main className="scanner-page">
      <ScannerHeader />
      {loading ? (
        <Loading variant="scanner" />
      ) : loadError ? (
        <section className="scanner-empty scanner-invalid" role="alert">
          <AlertTriangle size={36} /><h1>اسکنر در دسترس نیست</h1><p>{loadError}</p>
          <button className="button outline" type="button" onClick={() => setRetryCount((value) => value + 1)}>تلاش دوباره</button>
        </section>
      ) : event ? (
        <>
          <section className="scanner-heading">
            <p className="scanner-eyebrow">یک اسکن، یک خوش‌آمدگویی</p>
            <h1>{event.title}</h1>
            <div><span><CalendarDays size={16} />{date(event.starts_at)} · {clock(event.starts_at)}</span><span><MapPin size={16} />{event.venue}</span></div>
          </section>
          <div className="scanner-layout">
            <section className="scanner-console" aria-label="اسکن بلیت">
              <div className={`scanner-camera ${camera === "on" ? "is-active" : ""}`}>
                <video ref={videoRef} muted playsInline aria-label="تصویر دوربین اسکنر" />
                {camera !== "on" && <div className="scanner-camera-overlay">
                  {camera === "starting" ? <LoaderCircle className="scanner-spin" size={42} /> : <ScanLine size={52} />}
                  <strong>{camera === "starting" ? "در حال باز کردن دوربین…" : "کیوآر بلیت را آماده کنید"}</strong>
                  <span>{camera === "starting" ? "اجازهٔ دسترسی به دوربین را تأیید کنید." : "دوربین پشت گوشی برای اسکن انتخاب می‌شود."}</span>
                </div>}
              </div>
              <div className="scanner-controls">
                <button
                  className={`button${camera === "on" ? " outline" : ""}`}
                  onClick={() => camera === "on" ? stopCamera() : void startCamera()}
                  disabled={camera !== "on" && (busy || imageBusy || camera === "starting")}
                  aria-busy={camera === "starting"}
                >
                  <ButtonLabel
                    state={camera === "on" ? "stop" : camera === "starting" ? "starting" : result || scanError ? "next" : "start"}
                    states={{
                      stop: <><Square size={18} />توقف دوربین</>,
                      starting: <><LoaderCircle className="scanner-spin" size={19} />در حال باز کردن دوربین…</>,
                      next: <><Camera size={19} />اسکن بلیت بعدی</>,
                      start: <><Camera size={19} />شروع اسکن با دوربین</>,
                    }}
                  />
                </button>
                <button className="button outline" onClick={() => fileRef.current?.click()} disabled={busy || imageBusy || camera === "starting"} aria-busy={imageBusy}>
                  <ButtonLabel busy={imageBusy} pending={<><LoaderCircle className="scanner-spin" size={19} />خواندن تصویر…</>}>
                    <ImageUp size={19} />انتخاب تصویر کیوآر
                  </ButtonLabel>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={(change) => void scanImage(change)} aria-label="انتخاب تصویر کیوآر بلیت" hidden />
              </div>
              {cameraError && <p className="scanner-notice" role="alert">{cameraError}</p>}
              <p className="scanner-hint">کیوآر را در قاب نگه دارید. پس از خواندن هر بلیت، دوربین متوقف می‌شود؛ برای نفر بعد «اسکن بلیت بعدی» را بزنید. ثبت ورود به اینترنت نیاز دارد.</p>
            </section>
            <section className="scanner-result-area" aria-label="نتیجهٔ بررسی بلیت" aria-live="polite" aria-atomic="true">
              <AnimatedRegion transitionKey={busy || imageBusy ? "checking" : result ? `${result.status}:${result.ticket.ordinal}:${result.ticket.checked_in_at}` : scanError || "ready"}>
              {busy || imageBusy ? <div className="scanner-result-placeholder" role="status"><LoaderCircle className="scanner-spin" size={36} /><h2>در حال بررسی بلیت…</h2><p>تا دریافت تأیید، اجازهٔ ورود ندهید.</p></div> : result ? (
                <article className={`scanner-result ${result.status === "checked_in" ? "is-success" : "is-duplicate"}`}>
                  <div className="scanner-result-status">
                    <span className="scanner-result-icon">{result.status === "checked_in" ? <Check size={42} strokeWidth={3} /> : <AlertTriangle size={36} />}</span>
                    <h2>{result.status === "checked_in" ? "ورود با موفقیت ثبت شد" : "این بلیت قبلاً استفاده شده"}</h2>
                    <p>{result.status === "checked_in" ? "خوش آمدید؛ بلیت تأیید شد." : "ورود دوباره تأیید نشد. با میزبان هماهنگ کنید."}</p>
                  </div>
                  <div className="scanner-ticket-details">
                    <span className="scanner-eyebrow">صاحب بلیت</span><h3>{result.ticket.name}</h3>
                    <dl>
                      <div><dt>ایونت</dt><dd>{result.ticket.title}</dd></div>
                      <div><dt>بلیت</dt><dd>شمارهٔ {fa(result.ticket.ordinal)}</dd></div>
                      <div><dt>زمان ایونت</dt><dd>{date(result.ticket.starts_at, true)}، {clock(result.ticket.starts_at)} تا {clock(result.ticket.ends_at)}</dd></div>
                      <div><dt>محل برگزاری</dt><dd>{result.ticket.venue}، {result.ticket.city}، {result.ticket.address}</dd></div>
                      <div><dt>ثبت ورود</dt><dd>{date(result.ticket.checked_in_at)}، {clock(result.ticket.checked_in_at)}</dd></div>
                    </dl>
                    <p className="scanner-result-retained">اطلاعات این بلیت تا اسکن بعدی روی صفحه می‌ماند.</p>
                  </div>
                </article>
              ) : scanError ? <div className="scanner-result-error" role="alert"><AlertTriangle size={38} /><h2>بلیت تأیید نشد</h2><p>{scanError}</p></div> :
                <div className="scanner-result-placeholder"><Ticket size={40} /><h2>آمادهٔ خوش‌آمدگویی</h2><p>پس از اسکن، نام مهمان و اطلاعات بلیت اینجا نمایش داده می‌شود. فقط تیک سبز به معنی ثبت ورود است.</p></div>}
              </AnimatedRegion>
            </section>
          </div>
          <p className="scanner-footer"><ShieldCheck size={16} />این اسکنر فقط بلیت‌های هم‌قدم برای همین ایونت را می‌پذیرد.</p>
        </>
      ) : null}
    </main>
  );
}
