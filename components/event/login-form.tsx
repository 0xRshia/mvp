"use client";
import { ButtonLabel } from "@/components/ui/button-label";
import { AppLink, useAppNavigate } from "@/components/event/app-navigation";
import { AnimatedRegion } from "@/components/ui/animated-region";
import { useEffect, useState } from "react";
import { Smartphone, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { api } from "@/lib/client";
import { useAuth } from "./app-shell";
import { ErrorBox } from "./shared";
import { digits, fa, type AuthRequestResponse } from "@/lib/types";
export default function LoginForm({ host = false }: { host?: boolean }) {
  const navigate = useAppNavigate();
  const { user, refresh, smsReady, loading, temporaryLoginEnabled } = useAuth();
  const [phone, setPhone] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  function destination(toHost = host) {
    if (toHost) return "/host";
    const raw = new URLSearchParams(window.location.search).get("next");
    return raw &&
      /^\/(events\/[\w-]+(?:\?quantity=[1-6])?|reservations)$/.test(raw)
      ? raw
      : "/reservations";
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
        await refresh();
        navigate(destination(r.user.isHost));
        return;
      }
      setChallenge(r.challengeId);
      setCode("");
      setWait(r.resendAfter);
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
      await api("/api/auth/verify", {
        challengeId: challenge,
        code: digits(code),
        name,
      });
      await refresh();
      navigate(destination());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page container">
      <AppLink className="back-link" href="/">
        <ArrowRight size={17} />
        بازگشت به ایونت‌ها
      </AppLink>
      <div className="auth-card">
        <div className="dialog-symbol">
          {host ? <ShieldCheck size={30} /> : <Smartphone size={30} />}
        </div>
        <h1>
          {host ? "به پنل میزبان خوش آمدید" : "قرار بعدی، از اینجا شروع می‌شود"}
        </h1>
        <p>
          {challenge
            ? `کد پیامک‌شده به ${phone} را وارد کنید.`
            : host
              ? "با شمارهٔ همراه تأییدشدهٔ میزبان وارد شوید."
              : "برای گرفتن بلیت، با شمارهٔ همراهت وارد شو."}
        </p>
        <AnimatedRegion transitionKey={user ? "signed-in" : challenge ? "code" : "phone"}>
        {user ? (
          <div className="auth-form">
            <p>شما وارد حساب خود شده‌اید.</p>
            <AppLink href={host ? "/host" : "/reservations"} className="button full">
              {host ? "رفتن به پنل میزبان" : "دیدن بلیت‌های من"}
            </AppLink>
          </div>
        ) : (
          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              void (challenge ? verify() : request());
            }}
          >
            <div className="auth-fields">
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={17}
                    required
                  />
                </label>
                <label>
                  نام شما <span className="muted"></span>
                  <input
                    aria-label="نام شما"
                    autoComplete="given-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder=""
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
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot className="otp-slot" key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setChallenge("");
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
              disabled={busy || !!(challenge && code.length !== 6)}
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
            {!loading && temporaryLoginEnabled && (
              <p className="notice">
                ورود آزمایشی فعال است؛ شماره‌های آزمایشی بدون کد پیامکی وارد
                می‌شوند.
              </p>
            )}
            {!loading && !smsReady && (
              <p className="notice">
                {temporaryLoginEnabled
                  ? "ورود پیامکی برای سایر شماره‌ها هنوز فعال نشده است."
                  : "ورود پیامکی هنوز فعال نشده است؛ پس از راه‌اندازی سرویس پیامک می‌توانید وارد شوید."}
              </p>
            )}
          </form>
        )}
        </AnimatedRegion>
        <div className="auth-note">
          <ShieldCheck size={16} />
          شمارهٔ شما فقط برای حساب و رزروها استفاده می‌شود.
        </div>
        {!host && (
          <AppLink className="text-button" href="/host/login">
            میزبان هستید؟ ورود به پنل میزبان
          </AppLink>
        )}
      </div>
    </main>
  );
}
