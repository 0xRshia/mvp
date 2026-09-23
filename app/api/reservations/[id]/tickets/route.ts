import { database } from "@/db";
import { ApiError, boundary, json, requireUser } from "@/lib/server";
import { ensureTickets, TICKET_PREFIX } from "@/lib/tickets";
import type { TicketDownloadResponse } from "@/lib/ticket-types";

export const GET = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  boundary(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    const db = database();
    const reservation = await db.prepare(`SELECT r.id,r.quantity,r.status,
      COALESCE(r.attendee_name,u.name) name,COALESCE(r.attendee_phone,u.phone) phone,
      e.title,e.venue,e.address,e.city,e.starts_at,e.ends_at
      FROM reservations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id
      WHERE r.id=? AND r.user_id=?`).bind(id, user.id)
      .first<TicketDownloadResponse["reservation"] & { status: string }>();
    if (!reservation) throw new ApiError(404, "رزرو پیدا نشد.");
    if (reservation.status !== "confirmed")
      throw new ApiError(409, "بلیت فقط برای رزرو تأییدشده قابل دریافت است.");
    await ensureTickets(id);
    const { results } = await db.prepare(`SELECT t.id,t.ordinal,t.token,t.checked_in_at
      FROM tickets t JOIN reservations r ON r.id=t.reservation_id
      WHERE r.id=? AND r.status='confirmed' ORDER BY t.ordinal`).bind(id)
      .all<{ id: string; ordinal: number; token: string; checked_in_at: number | null }>();
    if (results.length !== reservation.quantity)
      throw new ApiError(409, "وضعیت رزرو تغییر کرده است. صفحه را دوباره بارگذاری کنید.");
    return json({ reservation, tickets: results.map(({ token, ...ticket }) => ({ ...ticket, qr: TICKET_PREFIX + token })) });
  });
