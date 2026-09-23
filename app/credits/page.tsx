import { AppLink } from "@/components/event/app-navigation";
export default function Credits() {
  return (
    <main className="container subpage prose-page">
      <h1>دربارهٔ ایونت‌ها و تصاویر</h1>
      <h2>ایونت‌های نمونهٔ تهران</h2>
      <p>
        ایونت‌های دارای برچسب نمونه، برای بررسی این نسخهٔ اولیه ساخته شده‌اند.
        عنوان، قیمت، زمان، ظرفیت و نشانی آن‌ها برنامهٔ اعلام‌شدهٔ کافه‌ها
        نیستند. تصاویر ایونت‌ها ممکن است صرفاً نمایشی باشند. ایونت‌های واقعی
        توسط میزبان‌های تأییدشده منتشر می‌شوند.
      </p>
      <h2>منابع تصاویر</h2>
      <ul>
        <li>
          <a href="https://commons.wikimedia.org/wiki/File:Sam_Cafe,_Tehran_(39662980492).jpg">
            کافه سام تهران، عکس Danielle Harte برای Bourse & Bazaar /
            IranOpenAlbum
          </a>
          ، با مجوز{" "}
          <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>.
          تصویر برای نمایش در کارت‌ها برش خورده است.
        </li>
        <li>
          <a href="https://unsplash.com/photos/hands-shaping-clay-on-a-pottery-wheel-c4BwtY4L-hc">
            سفالگری: Jonathan Cosens Photography، Unsplash
          </a>
        </li>
        <li>
          <a href="https://unsplash.com/photos/a-book-and-a-cup-of-coffee-on-a-table-9eppPl9-5T8">
            کتاب و قهوه: Behnam Norouzi، Unsplash
          </a>
        </li>
        <li>
          <a href="https://unsplash.com/photos/a-close-up-of-a-board-game-on-a-table-nX5JRgNedCE">
            بازی رومیزی: Hal Gatewood، Unsplash
          </a>
        </li>
      </ul>
      <h2>موقعیت و حریم خصوصی</h2>
      <p>
        موقعیت دقیق شما فقط در همین صفحه برای محاسبهٔ فاصلهٔ مستقیم استفاده
        می‌شود و به سرور ارسال یا ذخیره نمی‌شود. بدون دسترسی به موقعیت هم
        می‌توانید شهر و محله را انتخاب کنید. شمارهٔ همراه شما فقط در حساب خودتان
        و فهرست شرکت‌کنندگان میزبان همان ایونت قابل مشاهده است.
      </p>
      <AppLink className="button" href="/">
        بازگشت به ایونت‌ها
      </AppLink>
    </main>
  );
}
