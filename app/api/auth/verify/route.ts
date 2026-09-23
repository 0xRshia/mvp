import { database } from "@/db";
import { digits } from "@/lib/types";
import {
  ApiError,
  boundary,
  body,
  otpHash,
  hash,
  sameOrigin,
  rateLimit,
  createSession,
} from "@/lib/server";
export const POST = (req: Request) =>
  boundary(async () => {
    sameOrigin(req);
    const data = await body(req);
    const code = digits(String(data.code ?? ""));
    if (typeof data.challengeId !== "string" || !/^\d{6}$/.test(code))
      throw new ApiError(400, "کد شش‌رقمی را وارد کنید.");
    await rateLimit(
      "verify-ip:" +
        (await hash(req.headers.get("cf-connecting-ip") ?? "local")),
      100,
    );
    const db = database();
    const challenge = await db
      .prepare(
        "UPDATE challenges SET attempts=attempts+1 WHERE id=? AND consumed=0 AND expires_at>? AND attempts<5 RETURNING phone",
      )
      .bind(data.challengeId, Date.now())
      .first<{ phone: string }>();
    if (!challenge)
      throw new ApiError(
        400,
        "کد منقضی شده یا تعداد تلاش‌ها بیش از حد است. کد تازه بگیرید.",
      );
    const consumed = await db
      .prepare(
        "UPDATE challenges SET consumed=1 WHERE id=? AND hash=? AND consumed=0 AND expires_at>? RETURNING phone",
      )
      .bind(
        data.challengeId,
        await otpHash(data.challengeId, challenge.phone, code),
        Date.now(),
      )
      .first<{ phone: string }>();
    if (!consumed) throw new ApiError(400, "کد واردشده درست نیست.");
    return createSession(req, consumed.phone, data.name);
  });
