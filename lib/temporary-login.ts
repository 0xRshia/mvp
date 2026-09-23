import { config } from "@/db";

// TODO(PRODUCTION): REMOVE_TEMP_LOGIN — delete this module after revoking demo sessions.
const accounts = new Map([
  ["09108624707", { isHost: false, name: "کاربر آزمایشی" }],
  ["09108624708", { isHost: true, name: "میزبان آزمایشی" }],
]);

export function temporaryLoginEnabled() {
  return config().TEMP_LOGIN_ENABLED === "true";
}

export function temporaryAccount(phone: string) {
  return temporaryLoginEnabled() ? accounts.get(phone) : undefined;
}
