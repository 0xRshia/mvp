import { AtSign, MapPin, MessageSquare, Phone } from "lucide-react";
import { getSiteContent } from "@/lib/site-content";
import type { ContactContent } from "@/lib/content-shapes";
import { ContactForm } from "@/components/content/contact-form";
import styles from "@/components/content/site-pages.module.css";

export const metadata = { title: "تماس با ما | هم‌قدم" };

export default async function ContactPage() {
  const content = await getSiteContent<ContactContent>("contact");
  const hasDetails = !!(content.email || content.phone || content.address);
  return <main className={`container ${styles.page}`}>
    <header className={styles.hero}>
      <span className={styles.eyebrow}><MessageSquare size={16} />{content.eyebrow}</span>
      <h1>{content.title}</h1><p>{content.intro}</p>
    </header>
    <div className={styles.contactLayout}>
      <section className={styles.contactPanel} aria-labelledby="contact-form-heading">
        <h2 id="contact-form-heading">پیامت را بنویس</h2><ContactForm />
      </section>
      <aside className={styles.contactAside}>
        <h2>در ارتباط باشیم</h2>
        <p>برای پیگیری پیام، ایمیل یا شمارهٔ همراهت را در فرم وارد کن.</p>
        {hasDetails ? <ul className={styles.contactInfo}>
          {content.email && <li><a href={`mailto:${content.email}`}><AtSign size={18} />{content.email}</a></li>}
          {content.phone && <li><a href={`tel:${content.phone}`}><Phone size={18} />{content.phone}</a></li>}
          {content.address && <li><span><MapPin size={18} />{content.address}</span></li>}
        </ul> : <p>پیامت ثبت می‌شود و از پنل تماس پیگیری خواهد شد.</p>}
      </aside>
    </div>
  </main>;
}
