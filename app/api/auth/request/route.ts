import { database, config } from "@/db";
import { temporaryAccount } from "@/lib/temporary-login";
import {
  ApiError,
  boundary,
  body,
  json,
  otpHash,
  phoneNumber,
  rateLimit,
  sameOrigin,
  smsReady,
  hash,
  createSession,
} from "@/lib/server";
export const POST = (req: Request) =>
  boundary(async () => {
    sameOrigin(req);
    const data = await body(req);
    const p = phoneNumber(data.phone);
    const ip = req.headers.get("cf-connecting-ip") ?? "local";
    // TODO(PRODUCTION): REMOVE_TEMP_LOGIN — only explicitly enabled demo accounts skip SMS.
    const temporary = temporaryAccount(p);
    if (temporary) {
      await rateLimit("temp-login-ip:" + (await hash(ip)), 20);
      await rateLimit("temp-login-phone:" + p, 20);
      return createSession(req, p, data.name, temporary.name);
    }
    if (!smsReady())
      throw new ApiError(
        503,
        "ورود پیامکی هنوز فعال نشده است. لطفاً بعداً مراجعه کنید.",
      );
    await rateLimit("otp-ip:" + (await hash(ip)), 20);
    await rateLimit("otp-phone:" + p, 5, 60000);
    const id = crypto.randomUUID();
    const code = String(
      (crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000,
    );
    const db = database();
    await db
      .prepare(
        "INSERT INTO challenges(id,phone,hash,expires_at) VALUES(?,?,?,?)",
      )
      .bind(id, p, await otpHash(id, p, code), Date.now() + 300000)
      .run();
    try {
      const c = config();
      const r = await fetch(
        `https://api.kavenegar.com/v1/${encodeURIComponent(c.KAVENEGAR_API_KEY!)}/verify/lookup.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: new URLSearchParams({
            receptor: p,
            token: code,
            template: c.KAVENEGAR_TEMPLATE!,
            type: "sms",
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
      const data = (await r.json()) as { return?: { status: number } };
      if (!r.ok || data.return?.status !== 200)
        throw Error("SMS delivery rejected");
    } catch {
      await db.prepare("DELETE FROM challenges WHERE id=?").bind(id).run();
      throw new ApiError(
        503,
        "ارسال پیامک انجام نشد. یک دقیقه دیگر دوباره تلاش کنید.",
      );
    }
    return json({ challengeId: id, resendAfter: 60, expiresIn: 300 });
  });
