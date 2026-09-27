"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import type { ReceiptResponse } from "@/lib/account-types";
import { reservationAmountLabel, reservationStatusLabel } from "@/lib/account-types";
import { date, clock, fa, faDigits } from "@/lib/types";
import { LoadingPage } from "@/components/event/loading";
import { ErrorBox } from "@/components/event/shared";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { AppLink } from "@/components/event/app-navigation";
import { ArrowRight, Printer } from "lucide-react";
import styles from "@/components/event/page-layouts.module.css";

export default function ReceiptView() {
  return <Suspense fallback={<LoadingPage variant="account" />}><ReceiptContent /></Suspense>;
}
function ReceiptContent() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [receipt, setReceipt] = useState<ReceiptResponse["receipt"] | null>(null);
  const [error, setError] = useState("");
  const [serverNow, setServerNow] = useState<number>();
  const currentTime = useDeadlineClock(undefined, 60000, serverNow);
  useEffect(() => {
    if (!id) return;
    let active = true;
    api<ReceiptResponse>(`/api/reservations/${encodeURIComponent(id)}/receipt`)
      .then(({ receipt: result, serverNow: responseTime }) => { if (active) { setReceipt(result); setServerNow(responseTime); } })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [id]);
  if (!id || error) return <main className={`container subpage ${styles.page}`}><ErrorBox message={error || "شناسهٔ رزرو معتبر نیست."} /></main>;
  if (!receipt) return <LoadingPage variant="account" />;
  const state = reservationStatusLabel(receipt.status, receipt.payment_state, receipt.total,
    receipt.status === "hold" ? (receipt.expires_at ?? 0) : receipt.ends_at, currentTime ?? serverNow ?? 0);
  return <main className={`container subpage ${styles.page} receipt-print-page`}>
    <div className="receipt-print-actions"><AppLink className="back-link" href="/account"><ArrowRight size={17} /> بازگشت به حساب</AppLink><button className="button outline" type="button" onClick={() => window.print()}><Printer size={17} /> چاپ رسید</button></div>
    <article className="receipt-paper" dir="rtl">
      <header><span>هم‌قدم</span><h1>رسید رزرو</h1></header>
      <dl>
        <div><dt>عنوان ایونت</dt><dd>{receipt.title}</dd></div>
        <div><dt>نام خریدار</dt><dd>{receipt.name || "ثبت نشده"}</dd></div>
        <div><dt>شمارهٔ همراه</dt><dd><bdi>{faDigits(receipt.phone)}</bdi></dd></div>
        <div><dt>تاریخ رزرو</dt><dd>{date(receipt.created_at, true)}، ساعت {clock(receipt.created_at)}</dd></div>
        <div><dt>زمان ایونت</dt><dd>{date(receipt.starts_at, true)}، ساعت {clock(receipt.starts_at)} تا {clock(receipt.ends_at)}</dd></div>
        <div><dt>محل برگزاری</dt><dd>{receipt.venue} · {receipt.city}<br />{receipt.address}</dd></div>
        <div><dt>تعداد بلیت</dt><dd>{fa(receipt.quantity)} نفر</dd></div>
        <div><dt>مبلغ رزرو</dt><dd>{reservationAmountLabel(receipt.status, receipt.payment_state, receipt.total)}</dd></div>
        <div><dt>وضعیت</dt><dd>{state}</dd></div>
        <div><dt>شناسهٔ رزرو</dt><dd><bdi>{receipt.id}</bdi></dd></div>
        <div><dt>شناسهٔ پرداخت</dt><dd><bdi>{receipt.reference ?? "ثبت نشده"}</bdi></dd></div>
      </dl>
      <p className="receipt-disclaimer">این سند رسید رزرو است و فاکتور مالیاتی محسوب نمی‌شود.</p>
    </article>
  </main>;
}
