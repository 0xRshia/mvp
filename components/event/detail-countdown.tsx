"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { REGISTRATION_CLOSED, registrationCountdownSeconds } from "@/lib/registration";
import { fa } from "@/lib/types";
import styles from "./detail-countdown.module.css";

function RollingDigit({ digit }: { digit: string }) {
  const [frame, setFrame] = useState({ current: digit, previous: digit });
  // Retain the outgoing glyph only when this digit changes, without an effect or another timer.
  if (frame.current !== digit) setFrame({ current: digit, previous: frame.current });
  return (
    <span className={styles.digit}>
      <span key={frame.current} className={styles.frame} data-changing={frame.current !== frame.previous || undefined}>
        <span className={styles.previous}>{frame.previous}</span>
        <span className={styles.current}>{frame.current}</span>
      </span>
    </span>
  );
}

export function DetailCountdown({ deadline }: { deadline: number }) {
  const now = useDeadlineClock(deadline, 1000);
  const remaining = now === null ? null : registrationCountdownSeconds(deadline, now);
  if (remaining === null) return null;
  if (remaining === 0) {
    return (
      <div className={styles.countdown}>
        <span className={styles.label}><Clock3 size={18} aria-hidden="true" />{REGISTRATION_CLOSED}</span>
      </div>
    );
  }
  const units = [
    { value: Math.floor(remaining / 3600), label: "ساعت" },
    { value: Math.floor(remaining / 60) % 60, label: "دقیقه" },
    { value: remaining % 60, label: "ثانیه" },
  ];
  const description = units.map(({ value, label }) => `${fa(value)} ${label}`).join(" و ");
  return (
    <div className={styles.countdown} role="timer" aria-live="off" aria-label={`زمان باقی‌مانده تا پایان ثبت‌نام: ${description}`}>
      <span className={styles.label} aria-hidden="true"><Clock3 size={18} />زمان باقی‌مانده تا پایان ثبت‌نام</span>
      <div className={styles.units} dir="ltr" aria-hidden="true">
        {units.map(({ value, label }) => (
          <div className={styles.unit} key={label}>
            <span className={styles.digits}>
              {fa(value).padStart(2, "۰").split("").map((digit, position) => (
                <RollingDigit key={position} digit={digit} />
              ))}
            </span>
            <span className={styles.unitLabel} dir="rtl">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
