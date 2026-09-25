/** Only app-owned customer routes may be supplied as login return destinations. */
export function loginDestination(next: string | null, host = false) {
  if (host) return "/host";
  if (next && (
    /^\/(account|reservations)(\?[^#\s\\]*)?$/.test(next) ||
    /^\/events\/[\w-]+(?:\?quantity=[1-6])?$/.test(next)
  )) return next;
  return "/account";
}
