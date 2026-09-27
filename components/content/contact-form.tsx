"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { api, ClientError } from "@/lib/client";
import { ButtonLabel } from "@/components/ui/button-label";
import styles from "./site-pages.module.css";

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/contact", form);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ClientError ? cause.message : "ارسال پیام انجام نشد. دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  }
  if (sent) return <div className={styles.sentState} role="status"><CheckCircle2 size={32} /><h2>پیامت ثبت شد</h2><p>پیامت در بخش پیگیری پیام‌ها ثبت شد. اطلاعاتی که برای پاسخ‌گویی وارد کردی همراه پیام ذخیره شده است.</p><button type="button" className="button outline" onClick={() => { setSent(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}>ارسال پیام دیگر</button></div>;
  return <form className={styles.contactForm} onSubmit={(event) => void submit(event)}>
    <div className={styles.fieldPair}>
      <label>نام<input value={form.name} onChange={(e) => change("name", e.target.value)} autoComplete="name" maxLength={80} required /></label>
      <label>موضوع<input value={form.subject} onChange={(e) => change("subject", e.target.value)} maxLength={120} required /></label>
    </div>
    <div className={styles.fieldPair}>
      <label>ایمیل <span className={styles.optional}>(یکی از دو راه تماس)</span><input type="email" value={form.email} onChange={(e) => change("email", e.target.value)} autoComplete="email" maxLength={254} /></label>
      <label>شمارهٔ همراه <span className={styles.optional}>(یکی از دو راه تماس)</span><input type="tel" value={form.phone} onChange={(e) => change("phone", e.target.value)} autoComplete="tel" dir="ltr" maxLength={32} /></label>
    </div>
    <label>متن پیام<textarea value={form.message} onChange={(e) => change("message", e.target.value)} rows={6} maxLength={4000} required /></label>
    {error && <p className={styles.formError} role="alert">{error}</p>}
    <button className="button" type="submit" disabled={busy} aria-busy={busy}><ButtonLabel state={busy ? "pending" : "send"} states={{ pending: "در حال ثبت…", send: "ثبت و ارسال پیام" }} /><Send size={17} /></button>
  </form>;
}
