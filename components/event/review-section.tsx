"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { useAuth } from "@/components/event/app-shell";
import { api } from "@/lib/client";
import { fa, date } from "@/lib/types";
import detail from "./event-detail.module.css";
type Review = {
  id: string;
  rating: number;
  comment: string;
  author_name: string;
  created_at: number;
  reply: string | null;
  reply_created_at: number | null;
};
type Result = {
  reviews: Review[];
  total: number;
  page: number;
  totalPages: number;
  rating_count: number;
  rating_average: number | null;
  viewerReview: {
    id: string;
    rating: number;
    comment: string;
    status: string;
    updated_at: number;
  } | null;
  canReview: boolean;
};
export function ReviewSection({
  eventId,
  sample,
}: {
  eventId: string;
  sample: boolean;
}) {
  const { user } = useAuth();
  const [page, setPage] = useState(1),
    [data, setData] = useState<Result | null>(null),
    [loading, setLoading] = useState(true),
    [rating, setRating] = useState(0),
    [comment, setComment] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const version = useRef(0);
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const request = ++version.current;
      try {
        const result = await api<Result>(
          `/api/events/${encodeURIComponent(eventId)}/reviews?page=${page}`,
        );
        if (request === version.current && isCurrent()) {
          setData(result);
          if (result.viewerReview) {
            setRating(result.viewerReview.rating);
            setComment(result.viewerReview.comment);
          }
        }
      } catch (e) {
        if (request === version.current && isCurrent())
          setError((e as Error).message);
      } finally {
        if (request === version.current && isCurrent()) setLoading(false);
      }
    },
    [eventId, page],
  );
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) void load(() => !cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [load, user?.id]);
  async function submit() {
    setSaving(true);
    setError("");
    try {
      await api(`/api/events/${encodeURIComponent(eventId)}/reviews`, {
        rating,
        comment,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function withdraw() {
    if (!data?.viewerReview) return;
    setSaving(true);
    try {
      await api(
        `/api/reviews/${encodeURIComponent(data.viewerReview.id)}`,
        undefined,
        "DELETE",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const viewer = data?.viewerReview;
  const canWrite = !!user && !!data?.canReview;
  return (
    <section
      className={detail.reviewSection}
      aria-labelledby="event-reviews-title"
      data-motion-group
    >
      <header className={detail.reviewHeading}>
        <div>
          <div className="eyebrow">تجربهٔ شرکت‌کنندگان</div>
          <h2 id="event-reviews-title">امتیاز و دیدگاه</h2>
        </div>
        {data && (
          <div
            className={detail.ratingSummary}
            aria-label={
              data.rating_average
                ? `میانگین ${data.rating_average.toFixed(1)} از ۵، ${data.rating_count} دیدگاه`
                : "هنوز دیدگاهی ثبت نشده"
            }
          >
            <Star size={19} fill="currentColor" />
            <strong>
              {data.rating_average
                ? fa(Math.round(data.rating_average * 10) / 10)
                : "—"}
            </strong>
            <span>{fa(data.rating_count)} دیدگاه</span>
          </div>
        )}
      </header>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {canWrite && (
        <form
          className={detail.reviewForm}
          onSubmit={(event) => {
            event.preventDefault();
            if (rating) void submit();
          }}
        >
          <h3>
            {viewer?.status === "published"
              ? "ویرایش تجربهٔ شما"
              : "تجربه‌تان را ثبت کنید"}
          </h3>
          <fieldset disabled={saving}>
            <legend>امتیاز شما</legend>
            <div
              className={detail.ratingOptions}
              role="radiogroup"
              aria-label="امتیاز از ۱ تا ۵"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={`rating-${eventId}`}
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />
                  <span aria-hidden="true">
                    <Star
                      fill={value <= rating ? "currentColor" : "none"}
                      size={24}
                    />
                  </span>
                  <span className={detail.srOnly}>{value} از ۵</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className={detail.commentField}>
            دیدگاه اختیاری
            <textarea
              value={comment}
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
            />
          </label>
          <div className={detail.reviewFormActions}>
            <button className="button" disabled={saving || !rating}>
              {saving ? "در حال ثبت…" : "ارسال برای بررسی"}
            </button>
            {viewer && (
              <button
                type="button"
                className="text-button"
                disabled={saving}
                onClick={() => void withdraw()}
              >
                <Trash2 size={15} />
                پس‌گرفتن دیدگاه
              </button>
            )}
          </div>
          <p className={detail.reviewNote}>
            این بخش فقط برای شرکت‌کنندگان تأییدشده باز است. دیدگاه پس از بررسی
            نمایش داده می‌شود.
          </p>
        </form>
      )}
      {!user && !sample && (
        <p className={detail.reviewNote}>
          برای ثبت تجربه پس از پایان ایونت، وارد حساب خریدار ایونت شوید.
        </p>
      )}
      {viewer?.status === "pending" && (
        <p className={detail.reviewNote}>
          دیدگاه شما پس از بررسی نمایش داده می‌شود.
        </p>
      )}
      {viewer?.status === "rejected" && (
        <p className={detail.reviewNote}>
          این دیدگاه منتشر نشد. می‌توانید متن آن را ویرایش و دوباره ارسال کنید.
        </p>
      )}
      {loading && !data ? (
        <p aria-live="polite">در حال دریافت دیدگاه‌ها…</p>
      ) : data?.reviews.length ? (
        <ul className={detail.reviewList}>
          {data.reviews.map((review) => (
            <li key={review.id} className={detail.reviewCard}>
              <div className={detail.reviewMeta}>
                <strong>{review.author_name || "شرکت‌کننده"}</strong>
                <time>{date(review.created_at)}</time>
                <span
                  aria-label={`${review.rating} از ۵`}
                  className={detail.reviewStars}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={15}
                      fill={index < review.rating ? "currentColor" : "none"}
                    />
                  ))}
                </span>
              </div>
              {review.comment && <p>{review.comment}</p>}
              {review.reply && (
                <div className={detail.hostReply}>
                  <strong>پاسخ میزبان</strong>
                  <p>{review.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={detail.reviewEmpty}>
          {loading
            ? "در حال دریافت دیدگاه‌ها…"
            : "هنوز دیدگاه تأییدشده‌ای ثبت نشده است."}
        </p>
      )}
      {data && data.totalPages > 1 && (
        <nav
          className={detail.reviewPagination}
          aria-label="صفحه‌های دیدگاه‌ها"
        >
          <button
            className="button outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            قبلی
          </button>
          <span>
            صفحهٔ {fa(page)} از {fa(data.totalPages)}
          </span>
          <button
            className="button outline"
            disabled={page >= data.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            بعدی
          </button>
        </nav>
      )}
    </section>
  );
}
