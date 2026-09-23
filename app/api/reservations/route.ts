import { database, config } from "@/db";
import { MIN_PAID_TOMAN, MAX_ORDER_TOMAN } from "@/lib/payment-limits";
import { getEvent, eventThumbnail } from "@/lib/events";
import { reserveSql } from "@/lib/booking-sql";
import { startPayment, type StoredBooking } from "@/lib/payments";
import { ensureTickets } from "@/lib/tickets";
import {
  ApiError,
  boundary,
  body,
  json,
  paymentReady,
  skipPayDevEnabled,
  requireUser,
  sameOrigin,
  rateLimit,
} from "@/lib/server";
export const GET = (req: Request) =>
  boundary(async () => {
    const user = await requireUser(req);
    const { results } = await database()
      .prepare(
        `SELECT r.id,r.event_id,r.quantity,r.total,r.status,r.created_at,r.expires_at,r.reference,r.payment_state,COALESCE(r.attendee_name,u.name) name,COALESCE(r.attendee_phone,u.phone) phone,e.title,e.venue,e.address,e.city,${eventThumbnail} image,e.starts_at,e.ends_at FROM reservations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id WHERE r.user_id=? ORDER BY r.created_at DESC`,
      )
      .bind(user.id)
      .all();
    return json({ reservations: results });
  });
export const POST = (req: Request) =>
  boundary(async () => {
    sameOrigin(req);
    const user = await requireUser(req);
    const data = await body(req);
    if (
      typeof data.eventId !== "string" ||
      typeof data.requestKey !== "string" ||
      !/^[\w-]{16,80}$/.test(data.requestKey) ||
      !Number.isInteger(data.quantity) ||
      data.quantity < 1 ||
      data.quantity > 6
    )
      throw new ApiError(400, "اطلاعات رزرو معتبر نیست.");
    await rateLimit("book:" + user.id, 60);
    const db = database();
    const existing = await db
      .prepare("SELECT * FROM reservations WHERE user_id=? AND request_key=?")
      .bind(user.id, data.requestKey)
      .first<StoredBooking>();
    if (existing) {
      if (
        existing.event_id !== data.eventId ||
        existing.quantity !== data.quantity
      )
        throw new ApiError(
          409,
          "این درخواست قبلاً برای رزرو دیگری استفاده شده است.",
        );
      if (existing.status === "confirmed") await ensureTickets(existing.id);
      return json({
        reservation: existing,
        paymentUrl:
          existing.authority &&
          existing.status === "hold" &&
          (existing.expires_at ?? 0) > Date.now()
            ? `https://payment.zarinpal.com/pg/StartPay/${encodeURIComponent(existing.authority)}`
            : null,
      });
    }
    const name = typeof data.name === "string" ? data.name.trim() : user.name.trim();
    if (name.length < 2 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name))
      throw new ApiError(400, "نام و نام خانوادگی خریدار را بین ۲ تا ۸۰ نویسه وارد کنید.");
    const event = await getEvent(data.eventId);
    if (
      !event ||
      (event.sample === 1 && config().SEED_SAMPLE_EVENTS === "false")
    )
      throw new ApiError(404, "ایونت پیدا نشد.");
    if (event.registration_ends_at <= Date.now() || event.starts_at <= Date.now())
      throw new ApiError(409, "مهلت ثبت‌نام این ایونت پایان یافته است.");
    if (
      event.price > 0 &&
      (event.price * data.quantity < MIN_PAID_TOMAN ||
        event.price * data.quantity > MAX_ORDER_TOMAN)
    )
      throw new ApiError(
        400,
        "مبلغ کل باید بین ۱٬۰۰۰ و ۱۰۰٬۰۰۰٬۰۰۰ تومان باشد. تعداد بلیت‌ها را تغییر دهید.",
      );
    const skipPayment = skipPayDevEnabled();
    if (event.price > 0 && event.sample === 1 && !skipPayment)
      throw new ApiError(
        409,
        "این ایونت نمونه است و امکان پرداخت واقعی ندارد.",
      );
    if (event.price > 0 && !skipPayment && !paymentReady())
      throw new ApiError(
        503,
        "خرید بلیت پس از فعال‌سازی درگاه پرداخت در دسترس خواهد بود.",
      );
    const now = Date.now();
    const booking = await db
      .prepare(reserveSql)
      .bind(
        crypto.randomUUID(),
        user.id,
        event.id,
        data.quantity,
        data.requestKey,
        now,
        now + 15 * 60000,
        name,
        skipPayment ? 1 : 0,
      )
      .first<StoredBooking>();
    if (!booking) {
      const retried = await db
        .prepare("SELECT * FROM reservations WHERE user_id=? AND request_key=?")
        .bind(user.id, data.requestKey)
        .first<StoredBooking>();
      if (retried) {
        if (
          retried.event_id !== data.eventId ||
          retried.quantity !== data.quantity
        )
          throw new ApiError(
            409,
            "این درخواست قبلاً برای رزرو دیگری استفاده شده است.",
          );
        if (retried.status === "confirmed") await ensureTickets(retried.id);
        return json({
          reservation: retried,
          paymentUrl:
            retried.authority &&
            retried.status === "hold" &&
            (retried.expires_at ?? 0) > Date.now()
              ? `https://payment.zarinpal.com/pg/StartPay/${encodeURIComponent(retried.authority)}`
              : null,
        });
      }
      throw new ApiError(
        409,
        "ظرفیت کافی نیست یا مهلت ثبت‌نام این ایونت پایان یافته است.",
      );
    }
    if (booking.status === "confirmed") await ensureTickets(booking.id);
    const paymentUrl =
      booking.status === "hold"
        ? await startPayment(booking, user.phone, event.title)
        : null;
    return json({ reservation: booking, paymentUrl }, 201);
  });
