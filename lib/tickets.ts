import { database } from "@/db";
import { randomToken } from "@/lib/server";

export const TICKET_PREFIX = "hg-ticket:v1:";

// Unique reservation/ordinal pairs preserve QR identities across retries and downloads.
// Each insert rechecks confirmation, so cancellation and unfinished payments cannot issue tickets.
export async function ensureTickets(reservationId: string) {
  const db = database();
  await db.batch(Array.from({ length: 6 }, (_, index) =>
    db.prepare(`INSERT INTO tickets(id,reservation_id,ordinal,token,created_at)
      SELECT ?1,r.id,?2,?3,?4 FROM reservations r
      WHERE r.id=?5 AND r.status='confirmed' AND r.quantity>=?2
      ON CONFLICT(reservation_id,ordinal) DO NOTHING`)
      .bind(crypto.randomUUID(), index + 1, randomToken(), Date.now(), reservationId),
  ));
}
