import type { Reservation } from "@/lib/types";

export function confirmedReservationSql(alias = "") {
  return `${alias}status='confirmed'`;
}

export function outstandingReservationSql(alias = "") {
  return `((${alias}status='hold' AND ${alias}expires_at>?) OR ${alias}status='paid_unfulfilled')`;
}

export type AccountSummary = {
  user: { id: string; phone: string; name: string; isHost: boolean; isAdmin: boolean };
  latestPurchase: Reservation | null;
  latestOutstanding: Reservation | null;
  reservationCount: number;
  confirmedCount: number;
  outstandingCount: number;
  serverNow: number;
};

export type ReceiptResponse = {
  receipt: {
    id: string;
    event_id: string;
    title: string;
    venue: string;
    address: string;
    city: string;
    starts_at: number;
    ends_at: number;
    quantity: number;
    total: number;
    status: string;
    payment_state: string;
    reference: string | null;
    created_at: number;
    expires_at: number | null;
    name: string;
    phone: string;
  };
  serverNow?: number;
};

export function reservationStatusLabel(status: string, paymentState: string, total: number, endsAt: number, now: number) {
  if (status === "confirmed") {
    if (total === 0) return endsAt > now ? "رزرو رایگان تأییدشده" : "برگزارشده";
    if (paymentState === "skipped_dev") return "رزرو تأییدشده؛ وجهی دریافت نشده";
    if (paymentState === "paid") return endsAt > now ? "پرداخت تأییدشده؛ رزرو قطعی" : "پرداخت تأییدشده؛ ایونت برگزارشده";
    return endsAt > now ? "رزرو تأییدشده" : "برگزارشده";
  }
  if (status === "paid_unfulfilled") return "پرداخت انجام شده؛ رزرو نیازمند پیگیری";
  if (status === "hold") {
    if (endsAt <= now) return "مهلت رزرو پایان یافته";
    if (paymentState === "verification_pending") return "تأیید پرداخت در حال بررسی";
    if (paymentState === "not_verified") return "پرداخت تأیید نشد";
    if (paymentState === "requesting" || paymentState === "request_unknown") return "در حال آماده‌سازی پرداخت";
    return "در انتظار پرداخت";
  }
  if (status === "cancelled") return "لغوشده";
  if (paymentState === "paid") return "پرداخت انجام شده؛ وضعیت رزرو ناموفق";
  return "پرداخت ناموفق";
}

export function reservationAmountLabel(status: string, paymentState: string, total: number) {
  if (total === 0) return "رایگان";
  if (paymentState === "skipped_dev") return "وجهی دریافت نشده";
  if (paymentState === "paid") return `${new Intl.NumberFormat("fa-IR").format(total)} تومان · پرداخت‌شده`;
  if (status === "hold") return `${new Intl.NumberFormat("fa-IR").format(total)} تومان · مبلغ قابل پرداخت`;
  return `${new Intl.NumberFormat("fa-IR").format(total)} تومان · مبلغ رزرو`;
}
