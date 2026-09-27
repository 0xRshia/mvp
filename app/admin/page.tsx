"use client";
import { BookOpen, FileText, MessageSquare, ShieldCheck } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import { useAuth } from "@/components/event/app-shell";
import { Blank, Loading } from "@/components/event/shared";
import { AdminNav } from "@/components/content/admin-nav";
import styles from "@/components/content/admin-pages.module.css";

const sections = [
  ["/admin/articles", BookOpen, "مقاله‌ها", "پیش‌نویس‌ها را ویرایش و مقاله‌ها را منتشر کن."],
  ["/admin/content", FileText, "صفحه‌های سایت", "متن پرسش‌های پرتکرار، درباره و تماس را به‌روز کن."],
  ["/admin/contact", MessageSquare, "پیام‌های تماس", "پیام‌های ثبت‌شده را ببین و وضعیت پیگیری را مشخص کن."],
  ["/admin/reviews", ShieldCheck, "دیدگاه‌ها", "دیدگاه‌ها و پاسخ‌های میزبان را بررسی کن."],
] as const;

export default function AdminHome() {
  const { user, loading } = useAuth();
  if (loading) return <main className="container subpage"><Loading variant="host" /></main>;
  if (!user?.isAdmin) return <main className="container subpage"><Blank title="ورود مدیر لازم است" description="برای دسترسی به پنل، با شمارهٔ مدیر سایت وارد شو."><AppLink className="button" href="/admin/login">ورود مدیر</AppLink></Blank></main>;
  return <main className={`container ${styles.adminPage}`}>
    <AdminNav active="/admin" />
    <header className={styles.adminHeading}><div><span className="eyebrow">پنل مدیریت هم‌قدم</span><h1>مدیریت محتوای سایت</h1><p>مقاله‌ها، اطلاعات راهنما و پیام‌های تماس را از یک جا پیگیری کن.</p></div></header>
    <div className={styles.adminGrid}>{sections.map(([href, Icon, title, detail]) => <AppLink className={styles.adminTile} href={href} key={href}><Icon size={22} /><strong>{title}</strong><span>{detail}</span></AppLink>)}</div>
  </main>;
}
