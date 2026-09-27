import { ArrowLeft, Compass, ShieldCheck, UsersRound } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import { getSiteContent } from "@/lib/site-content";
import type { AboutContent } from "@/lib/content-shapes";
import { faDigits } from "@/lib/types";
import styles from "@/components/content/site-pages.module.css";

export const metadata = { title: "دربارهٔ هم‌قدم" };

const icons = [Compass, UsersRound, ShieldCheck];

export default async function AboutPage() {
  const content = await getSiteContent<AboutContent>("about");
  return <main className={`container ${styles.page}`}>
    <header className={`${styles.hero} ${styles.aboutHero}`}>
      <span className={styles.eyebrow}>✦ {content.eyebrow}</span>
      <h1>{content.title}</h1><p>{content.intro}</p>
      <AppLink className={styles.heroLink} href="/">ایونت‌های پیش رو را ببین <ArrowLeft size={17} /></AppLink>
    </header>
    <div className={styles.aboutGrid}>
      {content.sections.map((section, index) => {
        const Icon = icons[index % icons.length];
        return <section className={styles.aboutCard} key={section.heading}>
          <span className={styles.iconTile}><Icon size={22} /></span>
          <span className={styles.sectionNumber}>{faDigits(String(index + 1).padStart(2, "0"))}</span>
          <h2>{section.heading}</h2><p>{section.body}</p>
        </section>;
      })}
    </div>
  </main>;
}
