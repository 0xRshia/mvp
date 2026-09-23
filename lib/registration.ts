export const REGISTRATION_DAY = 24 * 60 * 60 * 1000;
export const REGISTRATION_WINDOW = 2 * REGISTRATION_DAY;
export const REGISTRATION_CLOSED = "مهلت ثبت‌نام پایان یافته";

export function defaultRegistrationDeadline(start: number, now: number) {
  // At exactly 24 hours, subtracting a day would produce an invalid (present) deadline.
  return start - REGISTRATION_DAY > now ? start - REGISTRATION_DAY : start;
}

export function validRegistrationDeadline(deadline: number, start: number, now: number) {
  return Number.isFinite(deadline) && deadline > now && deadline <= start &&
    deadline % (5 * 60 * 1000) === 0;
}

export function registrationCountdownSeconds(deadline: number, now: number): number | null {
  const remaining = deadline - now;
  if (!Number.isFinite(remaining) || remaining >= REGISTRATION_WINDOW) return null;
  // A positive fraction of a second must not display zero before registration closes.
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function registrationClockDelay(deadline: number | undefined, now: number, refreshIntervalMs = 60000) {
  const remaining = deadline === undefined ? Infinity : deadline - now;
  const untilWindow = remaining - REGISTRATION_WINDOW + 1;
  // Only the visible, running digital timer needs a faster cadence.
  const interval = remaining > 0 && remaining < REGISTRATION_WINDOW ? refreshIntervalMs : 60000;
  return Math.max(1, Math.min(60000, interval, remaining > 0 ? remaining : 60000,
    untilWindow > 0 ? untilWindow : 60000));
}

export function registrationState(
  event: { starts_at: number; registration_ends_at: number; remaining: number | null },
  now: number,
) {
  if (event.starts_at <= now) return "started";
  if (event.registration_ends_at <= now) return "expired";
  if (event.remaining === 0) return "sold_out";
  return "open";
}
