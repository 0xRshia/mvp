"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import { useAuth } from "@/components/event/app-shell";
import { Blank, ErrorBox, Loading } from "@/components/event/shared";
import { AdminNav } from "@/components/content/admin-nav";
import styles from "@/components/content/admin-pages.module.css";
import { api } from "@/lib/client";
import type { AboutContent, ContactContent, FaqContent, SiteContent } from "@/lib/content-shapes";

type Entry = { [K in keyof SiteContent]: { key: K; content: SiteContent[K]; updated_at: number | null; updated_by: string | null } }[keyof SiteContent];
const names: Record<string, string> = { faq: "پرسش‌های پرتکرار", about: "دربارهٔ ما", contact: "تماس با ما" };
const keys: (keyof SiteContent)[] = ["faq", "about", "contact"];

export default function AdminContent() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<Partial<Record<keyof SiteContent, Entry>>>({});
  const [active, setActive] = useState<keyof SiteContent>("faq");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await api<{ items: Entry[] }>("/api/admin/content"); setEntries(Object.fromEntries(result.items.map((item) => [item.key, item]))); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (!user?.isAdmin) return; const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [user?.id, user?.isAdmin, authLoading, load]);
  const content = entries[active]?.content;
  function patchTop(field: "eyebrow" | "title" | "intro", value: string) {
    setEntries((current) => { const old = current[active]; if (!old) return current; return { ...current, [active]: { ...old, content: { ...old.content, [field]: value } as SiteContent[typeof active] } }; });
  }
  function patchFaq(index: number, field: "question" | "answer", value: string) {
    setEntries((current) => { const old = current.faq; if (!old || old.key !== "faq") return current; const items = [...old.content.items]; items[index] = { ...items[index], [field]: value }; return { ...current, faq: { ...old, content: { ...old.content, items } } }; });
  }
  function patchAbout(index: number, field: "heading" | "body", value: string) {
    setEntries((current) => { const old = current.about; if (!old || old.key !== "about") return current; const sections = [...old.content.sections]; sections[index] = { ...sections[index], [field]: value }; return { ...current, about: { ...old, content: { ...old.content, sections } } }; });
  }
  function addBlock() {
    setEntries((current) => {
      if (active === "faq" && current.faq?.key === "faq") return { ...current, faq: { ...current.faq, content: { ...current.faq.content, items: [...current.faq.content.items, { question: "", answer: "" }] } } };
      if (active === "about" && current.about?.key === "about") return { ...current, about: { ...current.about, content: { ...current.about.content, sections: [...current.about.content.sections, { heading: "", body: "" }] } } };
      return current;
    });
  }
  function removeBlock(index: number) {
    setEntries((current) => {
      if (active === "faq" && current.faq?.key === "faq") return { ...current, faq: { ...current.faq, content: { ...current.faq.content, items: current.faq.content.items.filter((_item, itemIndex) => itemIndex !== index) } } };
      if (active === "about" && current.about?.key === "about") return { ...current, about: { ...current.about, content: { ...current.about.content, sections: current.about.content.sections.filter((_section, itemIndex) => itemIndex !== index) } } };
      return current;
    });
  }
  async function save() {
    const entry = entries[active]; if (!entry || saving) return;
    setSaving(true); setError(""); setNotice("");
    try { await api("/api/admin/content", { key: active, content: entry.content }, "PATCH"); setNotice(`${names[active]} ذخیره شد.`); }
    catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
  }
  function patchContact(field: keyof ContactContent, value: string) {
    const old = entries.contact; if (!old || old.key !== "contact") return;
    setEntries((current) => ({ ...current, contact: { ...old, content: { ...old.content, [field]: value } } }));
  }
  if (authLoading) return <main className="container subpage"><Loading variant="host" /></main>;
  if (!user?.isAdmin) return <main className="container subpage"><Blank title="دسترسی مدیر سایت لازم است" description="ویرایش محتوای سایت فقط برای مدیر سایت فعال است."><AppLink className="button" href="/admin/login">ورود مدیر</AppLink></Blank></main>;
  if (loading) return <main className="container subpage"><Loading variant="host" /></main>;
  return <main className={`container ${styles.adminPage}`}>
    <AdminNav active="/admin/content" />
    <header className={styles.adminHeading}><div><span className="eyebrow">صفحه‌های عمومی</span><h1>ویرایش محتوای سایت</h1><p>تغییرها پس از ذخیره در صفحهٔ عمومی نمایش داده می‌شوند.</p></div><button className="button" disabled={saving || !content} onClick={() => void save()}><Save size={16} />{saving ? "در حال ذخیره…" : "ذخیرهٔ تغییرها"}</button></header>
    {error && <ErrorBox message={error} retry={() => void load()} />}{notice && <p className={styles.success} role="status">{notice}</p>}
    <div className={styles.adminControls} role="tablist" aria-label="انتخاب صفحه">{keys.map((key) => <button type="button" role="tab" aria-selected={active === key} className={active === key ? "button" : "button outline"} key={key} onClick={() => { setActive(key); setNotice(""); }}>{names[key]}</button>)}</div>
    {content && <section className={styles.adminCard}>
      <div className={styles.adminGrid}>
        <label className={styles.editorField}>برچسب بالای عنوان<input maxLength={300} value={content.eyebrow} onChange={(e) => patchTop("eyebrow", e.target.value)} /></label>
        <label className={styles.editorField}>عنوان صفحه<input maxLength={300} value={content.title} onChange={(e) => patchTop("title", e.target.value)} /></label>
      </div>
      <label className={styles.editorField}>متن معرفی<textarea rows={3} maxLength={300} value={content.intro} onChange={(e) => patchTop("intro", e.target.value)} /></label>
      {active === "faq" && content && "items" in content && <div className={styles.contentSection}><h2>پرسش‌ها و پاسخ‌ها</h2>{(content as FaqContent).items.map((item, index) => <div className={styles.contentItem} key={index}><label className={styles.editorField}>پرسش<input maxLength={300} value={item.question} onChange={(e) => patchFaq(index, "question", e.target.value)} /></label><label className={styles.editorField}>پاسخ<textarea rows={3} maxLength={3000} value={item.answer} onChange={(e) => patchFaq(index, "answer", e.target.value)} /></label><button className="button outline" type="button" aria-label="حذف پرسش" onClick={() => removeBlock(index)}><Trash2 size={16} /></button></div>)}<button type="button" className="button outline" onClick={addBlock}><Plus size={16} />افزودن پرسش</button></div>}
      {active === "about" && content && "sections" in content && <div className={styles.contentSection}><h2>بخش‌های معرفی</h2>{(content as AboutContent).sections.map((item, index) => <div className={styles.contentItem} key={index}><label className={styles.editorField}>عنوان بخش<input maxLength={300} value={item.heading} onChange={(e) => patchAbout(index, "heading", e.target.value)} /></label><label className={styles.editorField}>متن<textarea rows={3} maxLength={3000} value={item.body} onChange={(e) => patchAbout(index, "body", e.target.value)} /></label><button className="button outline" type="button" aria-label="حذف بخش" onClick={() => removeBlock(index)}><Trash2 size={16} /></button></div>)}<button type="button" className="button outline" onClick={addBlock}><Plus size={16} />افزودن بخش</button></div>}
      {active === "contact" && content && "email" in content && <div className={styles.contentSection}><h2>راه‌های تماس مستقیم (اختیاری)</h2><div className={styles.adminGrid}><label className={styles.editorField}>ایمیل<input type="email" maxLength={254} value={(content as ContactContent).email} onChange={(e) => patchContact("email", e.target.value)} /></label><label className={styles.editorField}>شمارهٔ تماس<input dir="ltr" maxLength={32} value={(content as ContactContent).phone} onChange={(e) => patchContact("phone", e.target.value)} /></label></div><label className={styles.editorField}>نشانی<textarea rows={2} maxLength={500} value={(content as ContactContent).address} onChange={(e) => patchContact("address", e.target.value)} /></label><p className={styles.messageMeta}>هر فیلد خالی در صفحهٔ تماس پنهان می‌ماند.</p></div>}
    </section>}
  </main>;
}
