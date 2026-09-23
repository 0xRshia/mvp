import {
  boundary,
  currentUser,
  json,
  paymentReady,
  skipPayDevEnabled,
  smsReady,
} from "@/lib/server";
import { temporaryLoginEnabled } from "@/lib/temporary-login";
export const GET = (req: Request) =>
  boundary(async () =>
    json({
      user: await currentUser(req),
      smsReady: smsReady(),
      // TODO(PRODUCTION): REMOVE_TEMP_LOGIN
      temporaryLoginEnabled: temporaryLoginEnabled(),
      paymentReady: paymentReady(),
      skipPayDevEnabled: skipPayDevEnabled(),
    }),
  );
