"use client";
import { AppLink } from "@/components/event/app-navigation";
import styles from "./admin-pages.module.css";

const links = [
  ["/admin", "پنل مدیر"],
  ["/admin/articles", "مقاله‌ها"],
  ["/admin/content", "صفحه‌های سایت"],
  ["/admin/contact", "پیام‌های تماس"],
  ["/admin/reviews", "مدیریت دیدگاه‌ها"],
] as const;

export function AdminNav({ active }: { active: string }) {
  return <nav className={styles.adminNav} aria-label="بخش‌های مدیریت">{links.map(([href, label]) => <AppLink className={active === href ? styles.active : ""} key={href} href={href}>{label}</AppLink>)}</nav>;
}
