declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MEDIA_PATH?: string;
    KAVENEGAR_API_KEY?: string;
    KAVENEGAR_TEMPLATE?: string;
    OTP_SECRET?: string;
    ZARINPAL_MERCHANT_ID?: string;
    SKIP_PAY_DEV?: string;
    APP_ORIGIN?: string;
    HOST_PHONES?: string;
    // TODO(PRODUCTION): REMOVE_TEMP_LOGIN
    TEMP_LOGIN_ENABLED?: string;
    SEED_SAMPLE_EVENTS?: string;
  }
}
