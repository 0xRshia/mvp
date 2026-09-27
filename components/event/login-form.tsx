"use client";
import { ButtonLabel } from "@/components/ui/button-label";
import { AppLink, useAppNavigate } from "@/components/event/app-navigation";
import { AnimatedRegion } from "@/components/ui/animated-region";
import { useState } from "react";
import { Smartphone, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api } from "@/lib/client";
import { loginDestination } from "@/lib/login-destination";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { useAuth } from "./app-shell";
import { ErrorBox } from "./shared";
import { digits, fa, faDigits, type AuthRequestResponse } from "@/lib/types";
import layouts from "./page-layouts.module.css";
export default function LoginForm({ host = false, admin = false }: { host?: boolean; admin?: boolean }) {
  const navigate = useAppNavigate();
  const { user, refresh, smsReady, loading, temporaryLoginEnabled } = useAuth();
  const [phone, setPhone] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [expiresAt, setExpiresAt] = useState<number>(),
    [resendAt, setResendAt] = useState<number>(),
    [serverNow, setServerNow] = useState<number>();
  const clockNow = useDeadlineClock(expiresAt, 1000, serverNow);
  const clockValue = clockNow ?? serverNow ?? 0;
  const wait = !resendAt ? 0 : Math.max(0, Math.ceil((resendAt - clockValue) / 1000));
  const secondsLeft = !expiresAt ? null : Math.max(0, Math.ceil((expiresAt - clockValue) / 1000));
  function destination(isAdmin = user?.isAdmin ?? false) {
    if (admin && !isAdmin) throw new Error("این شمارهٔ همراه دسترسی مدیر سایت ندارد.");
    return loginDestination(new URLSearchParams(window.location.search).get("next"), host, admin);
  }
  async function request() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<AuthRequestResponse>(
        "/api/auth/request",
        { phone: digits(phone), name },
      );
      // TODO(PRODUCTION): REMOVE_TEMP_LOGIN — immediate sessions bypass the OTP screen.
      if ("user" in r) {
        if (admin && !r.user.isAdmin) throw new Error("این شمارهٔ همراه دسترسی مدیر سایت ندارد.");
        await refresh();
        navigate(destination(r.user.isAdmin));
        return;
      }
      setChallenge(r.challengeId);
      setCode("");
      const receivedAt = Date.now();
      setServerNow(r.serverNow ?? receivedAt);
      setResendAt(r.resendAt ?? receivedAt + r.resendAfter * 1000);
      setExpiresAt(r.expiresAt ?? receivedAt + r.expiresIn * 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: { isAdmin?: boolean } }>("/api/auth/verify", {
        challengeId: challenge,
        code: digits(code),
        name,
      });
      if (admin && !result.user.isAdmin) throw new Error("این شمارهٔ همراه دسترسی مدیر سایت ندارد.");
      await refresh();
      navigate(destination(!!result.user.isAdmin));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main data-motion-group className={`auth-page container ${layouts.authPage}`}>
      <AppLink className="back-link" href="/">
        <ArrowRight size={17} />
        بازگشت به ایونت‌ها
      </AppLink>
      <div data-motion-group className={layouts.authLayout}>
        <aside className={layouts.authWelcome}>
          <span className="eyebrow">{admin ? "پنل مدیریت هم‌قدم" : "هم‌قدم، همراه تجربه‌های تازه"}</span>
          <h2>{host ? "قرارهای ماندگار، از شما شروع می‌شوند." : admin ? "مدیریت تجربه‌های هم‌قدم." : "برای یک قرار خوب، هم‌قدم پیدا کن."}</h2>
          <p>{host ? "ایونت‌ها، بلیت‌ها و ورود مهمان‌ها را در یک فضای ساده مدیریت کنید." : admin ? "برای ادامه، شمارهٔ مدیر سایت را با کد پیامکی تأیید کنید." : "ایونت‌های شهر را کشف کن، بلیت بگیر و برای تجربهٔ بعدی آماده شو."}</p>
          <div className={layouts.welcomeArt} aria-hidden="true">
            <span />
            <span />
          </div>
          <span className={layouts.welcomeNote}><ShieldCheck size={17} />یک حساب برای همهٔ قرارهایت</span>
        </aside>
      <div data-motion-group className={`auth-card ${layouts.authCard}`}>
        <div className="dialog-symbol">
          {host || admin ? <ShieldCheck size={30} /> : <Smartphone size={30} />}
        </div>
        <h1>
          {host ? "به پنل میزبان خوش آمدید" : admin ? "ورود مدیر سایت" : "قرار بعدی، از اینجا شروع می‌شود"}
        </h1>
        <p>
          {challenge
            ? `کد پیامک‌شده به ${faDigits(phone)} را وارد کنید.`
            : admin ? "با شمارهٔ همراه مدیر سایت وارد شوید."
            : host
              ? "با شمارهٔ همراه تأییدشدهٔ میزبان وارد شوید."
              : "برای گرفتن بلیت، با شمارهٔ همراهت وارد شو."}
        </p>
        <AnimatedRegion transitionKey={user ? "signed-in" : challenge ? "code" : "phone"}>
        {user ? (
          <div data-motion-group className="auth-form">
            <p>شما وارد حساب خود شده‌اید.</p>
            <button type="button" onClick={() => { try { navigate(destination()); } catch (cause) { setError((cause as Error).message); } }} className="button full">
              {host ? "رفتن به پنل میزبان" : admin ? "رفتن به پنل مدیریت" : "ادامه به حساب یا رزرو"}
            </button>
            {error && <ErrorBox message={error} />}
          </div>
        ) : (
          <form
            data-motion-group
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              void (challenge ? verify() : request());
            }}
          >
            <div data-motion-group className="auth-fields">
            {!challenge ? (
              <>
                <label>
                  شمارهٔ همراه
                  <input
                    aria-label="شمارهٔ همراه"
                    inputMode="tel"
                    type="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="۰۹۱۲ ۱۲۳ ۴۵۶۷"
                    value={faDigits(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={17}
                    required
                  />
                </label>
                <label>
                  <span>نام شما <span className="muted">(اختیاری)</span></span>
                  <input
                    aria-label="نام شما"
                    autoComplete="given-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="نامی که دوست داری صدایت کنیم"
                  />
                </label>
              </>
            ) : (
              <>
                <div dir="ltr" className="otp-wrap">
                  <InputOTP
                    aria-label="کد تأیید شش‌رقمی"
                    maxLength={6}
                    value={code}
                    onChange={(v) => setCode(digits(v))}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    aria-describedby="otp-countdown"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot className="otp-slot" key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {secondsLeft !== null && <p className="otp-countdown" id="otp-countdown" role="timer" aria-live="off">{secondsLeft > 0 ? `اعتبار کد: ${fa(secondsLeft)} ثانیه` : "کد منقضی شده؛ کد تازه بگیرید."}</p>}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                setChallenge("");
                    setExpiresAt(undefined);
                    setResendAt(undefined);
                    setServerNow(undefined);
                    setError("");
                  }}
                >
                  ویرایش شمارهٔ همراه
                </button>
              </>
            )}
            </div>
            {error && <ErrorBox message={error} />}
            <button
              className="button full"
              disabled={busy || !!(challenge && (code.length !== 6 || secondsLeft === 0))}
              aria-busy={busy}
            >
              <ButtonLabel
                state={busy ? "pending" : challenge ? "verify" : "request"}
                states={{ pending: "لطفاً صبر کنید…", verify: "تأیید و ورود", request: "ادامه" }}
              />
              <ArrowLeft size={17} />
            </button>
            {challenge && (
              <button
                className="text-button"
                type="button"
                disabled={wait > 0 || busy}
                onClick={request}
              >
                {wait > 0
                  ? `ارسال دوباره تا ${fa(wait)} ثانیهٔ دیگر`
                  : "ارسال دوبارهٔ کد"}
              </button>
            )}
            {/* TODO(PRODUCTION): REMOVE_TEMP_LOGIN — restore the SMS-only notice. */}
            {!loading && (temporaryLoginEnabled || !smsReady) && (
              <div className={`notice ${layouts.serviceNotice}`}>
                {temporaryLoginEnabled && <p>ورود آزمایشی فعال است؛ شماره‌های آزمایشی بدون کد پیامکی وارد می‌شوند.</p>}
                {!smsReady && <p>{temporaryLoginEnabled
                  ? "ورود پیامکی برای سایر شماره‌ها هنوز فعال نشده است."
                  : "ورود پیامکی هنوز فعال نشده است؛ پس از راه‌اندازی سرویس پیامک می‌توانید وارد شوید."}</p>}
              </div>
            )}
          </form>
        )}
        </AnimatedRegion>
        <div className="auth-note">
          <ShieldCheck size={16} />
          شمارهٔ شما فقط برای حساب و رزروها استفاده می‌شود.
        </div>
      </div>
      </div>
    </main>
  );
}
