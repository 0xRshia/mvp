import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import { getSiteContent } from "@/lib/site-content";
import type { FaqContent } from "@/lib/content-shapes";
import styles from "@/components/content/site-pages.module.css";

export const metadata = { title: "پرسش‌های پرتکرار | هم‌قدم" };

export default async function FaqPage() {
  const content = await getSiteContent<FaqContent>("faq");
  return <main className={`container ${styles.page}`}>
    <header className={styles.hero}>
      <span className={styles.eyebrow}><MessageCircleQuestion size={16} />{content.eyebrow}</span>
      <h1>{content.title}</h1><p>{content.intro}</p>
    </header>
    <section className={styles.faqList} aria-label="پاسخ پرسش‌ها">
      {content.items.map((item, index) => <details className={styles.faqItem} key={`${item.question}-${index}`}>
        <summary><span>{item.question}</span><ChevronDown size={19} /></summary>
        <p>{item.answer}</p>
      </details>)}
    </section>
    <div className={styles.cta}><span>پاسخت را پیدا نکردی؟</span><AppLink className="button" href="/contact">با ما در تماس باش</AppLink></div>
  </main>;
}
