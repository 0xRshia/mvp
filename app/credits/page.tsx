import { ArrowRight, ImageIcon, MapPin, ShieldCheck } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import layouts from "@/components/event/page-layouts.module.css";

export default function Credits() {
  return (
    <main className={`container subpage ${layouts.page} ${layouts.credits}`}>
      <AppLink className="back-link" href="/"><ArrowRight size={17} />بازگشت به ایونت‌ها</AppLink>
      <header className={layouts.creditsIntro}>
        <span className="eyebrow">شفاف و روشن، قدم به قدم</span>
        <h1>دربارهٔ ایونت‌ها و تصاویر</h1>
        <p>منابع تصاویر، ایونت‌های نمونه و نحوهٔ استفاده از اطلاعات شما در هم‌قدم.</p>
      </header>
      <section className={layouts.creditSection} aria-labelledby="sample-events-heading">
        <h2 id="sample-events-heading"><MapPin size={21} />ایونت‌های نمونهٔ تهران</h2>
        <p>
          ایونت‌های دارای برچسب نمونه، برای بررسی این نسخهٔ اولیه ساخته شده‌اند.
          عنوان، قیمت، زمان، ظرفیت و نشانی آن‌ها برنامهٔ اعلام‌شدهٔ کافه‌ها
          نیستند. تصاویر ایونت‌ها ممکن است صرفاً نمایشی باشند. ایونت‌های واقعی
          توسط میزبان‌های تأییدشده منتشر می‌شوند.
        </p>
      </section>
      <section className={layouts.creditSection} aria-labelledby="image-sources-heading">
        <h2 id="image-sources-heading"><ImageIcon size={21} />منابع تصاویر</h2>
        <ul>
          <li>
            <a href="https://commons.wikimedia.org/wiki/File:Sam_Cafe,_Tehran_(39662980492).jpg">
              کافه سام تهران، عکس دنیل هارت برای بورس و بازار / ایران اوپن آلبوم
            </a>
            ، با مجوز{" "}
            <a href="https://creativecommons.org/licenses/by/2.0/">کریتیو کامنز انتساب ۲٫۰</a>.
            تصویر برای نمایش در کارت‌ها برش خورده است.
          </li>
          <li><a href="https://unsplash.com/photos/hands-shaping-clay-on-a-pottery-wheel-c4BwtY4L-hc">سفالگری: عکاسی جاناتان کازنز، آن‌اسپلش</a></li>
          <li><a href="https://unsplash.com/photos/a-book-and-a-cup-of-coffee-on-a-table-9eppPl9-5T8">کتاب و قهوه: بهنام نوروزی، آن‌اسپلش</a></li>
          <li><a href="https://unsplash.com/photos/a-close-up-of-a-board-game-on-a-table-nX5JRgNedCE">بازی رومیزی: هال گیت‌وود، آن‌اسپلش</a></li>
        </ul>
      </section>
      <section className={layouts.creditSection} aria-labelledby="privacy-heading">
        <h2 id="privacy-heading"><ShieldCheck size={21} />موقعیت و حریم خصوصی</h2>
        <p>
          دسترسی به موقعیت اختیاری است. موقعیت دقیق شما فقط در همین نشست برای
          محاسبهٔ فاصلهٔ مستقیم استفاده می‌شود و به سرور ارسال یا ذخیره نمی‌شود.
          بدون دسترسی به موقعیت هم می‌توانید شهر و محله را انتخاب کنید.
          شمارهٔ همراه شما فقط در حساب خودتان و فهرست شرکت‌کنندگان میزبان همان
          ایونت قابل مشاهده است.
        </p>
      </section>
    </main>
  );
}
