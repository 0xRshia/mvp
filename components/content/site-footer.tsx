import { ArrowLeft, MapPin } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.inner}>
      <section className={styles.brandBlock}>
        <AppLink className={styles.brand} href="/">هم‌قدم<span>همراه تجربه‌های تازه</span></AppLink>
        <p>یک قرار خوب، همین نزدیکی.</p>
        <span className={styles.note}>کشف ایونت، رزرو بلیت و برنامه‌ریزی دورهمی‌های شهر</span>
      </section>
      <nav className={styles.links} aria-label="دسترسی‌های هم‌قدم">
        <h2>هم‌قدم</h2>
        <AppLink href="/about">دربارهٔ ما</AppLink>
        <AppLink href="/blog">مجله</AppLink>
        <AppLink href="/credits">منابع و شفافیت</AppLink>
      </nav>
      <nav className={styles.links} aria-label="راهنما و پشتیبانی">
        <h2>راهنما و پشتیبانی</h2>
        <AppLink href="/faq">پرسش‌های پرتکرار</AppLink>
        <AppLink href="/contact">تماس با ما</AppLink>
        <AppLink href="/reservations">بلیت‌های من</AppLink>
      </nav>
      <div className={styles.contact}>
        <h2>برای قرار بعدی آماده‌ای؟</h2>
        <p>ایونت‌های تازه را ببین و برای تجربه‌ای تازه هم‌قدم پیدا کن.</p>
        <AppLink className={styles.discover} href="/">رفتن به ایونت‌ها <ArrowLeft size={16} /></AppLink>
        <AppLink className={styles.social} href="/contact"><MapPin size={15} />پرسشی داری؟ از راه تماس با ما پیام بده</AppLink>
      </div>
    </div>
    <div className={styles.bottom}><span>هم‌قدم</span><span>تجربه‌های خوب، قدم‌به‌قدم.</span></div>
  </footer>;
}
