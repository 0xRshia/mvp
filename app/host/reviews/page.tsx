"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Star } from "lucide-react";
import { AppLink } from "@/components/event/app-navigation";
import { useAuth } from "@/components/event/app-shell";
import { Blank, ErrorBox, Loading } from "@/components/event/shared";
import { NumberedPagination } from "@/components/ui/numbered-pagination";
import { api } from "@/lib/client";
import { date, fa } from "@/lib/types";
import "../attendees.css";
type Item = {
  id: string;
  event_id: string;
  event_title: string;
  author_name: string;
  rating: number;
  comment: string;
  status: string;
  created_at: number;
  reply_id: string | null;
  reply_comment: string | null;
  reply_status: string | null;
};
type Result = {
  items: Item[];
  total: number;
  page: number;
  totalPages: number;
  status: string;
};
const labels: Record<string, string> = {
  pending: "در انتظار بررسی سایت",
  published: "منتشرشده",
  rejected: "ردشده",
  hidden: "پنهان‌شده",
};
export default function HostReviews() {
  const { user } = useAuth();
  return <HostReviewsSession key={user?.id ?? "guest"} />;
}
function HostReviewsSession() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("all"),
    [data, setData] = useState<Result | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [saving, setSaving] = useState<string | null>(null);
  const version = useRef(0);
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const request = ++version.current;
      try {
        const result = await api<Result>(
          `/api/host/reviews?page=${page}&status=${status}`,
        );
        if (request === version.current && isCurrent()) {
          setData(result);
          setDrafts(
            Object.fromEntries(
              result.items.map((item) => [item.id, item.reply_comment ?? ""]),
            ),
          );
        }
      } catch (e) {
        if (request === version.current && isCurrent())
          setError((e as Error).message);
      } finally {
        if (request === version.current && isCurrent()) setLoading(false);
      }
    },
    [page, status],
  );
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled && user?.isHost) void load(() => !cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [load, user]);
  async function reply(item: Item) {
    setSaving(item.id);
    try {
      await api(
        `/api/host/reviews/${encodeURIComponent(item.id)}`,
        { comment: drafts[item.id] ?? "" },
        "PUT",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  }
  if (authLoading || (user?.isHost && loading && !data))
    return (
      <main className="container subpage">
        <Loading variant="host" />
      </main>
    );
  if (!user?.isHost)
    return (
      <main className="container subpage">
        <Blank
          title="دسترسی میزبان لازم است"
          description="برای دیدن بازخوردها وارد حساب میزبان شوید."
        />
      </main>
    );
  return (
    <main className="container subpage host-reviews">
      <header className="page-heading host-heading">
        <div>
          <div className="eyebrow">بازخورد خریداران واقعی</div>
          <h1>دیدگاه‌ها</h1>
          <p>
            امتیاز و دیدگاه را ببینید و برای هر دیدگاه یک پاسخ برای بررسی سایت
            بفرستید.
          </p>
        </div>
        <AppLink className="button outline" href="/host">
          <MessageSquare size={17} />
          بازگشت به پنل
        </AppLink>
      </header>
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <div className="host-review-filter">
        <label htmlFor="host-review-status">وضعیت</label>
        <select
          id="host-review-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">همه</option>
          <option value="pending">در انتظار بررسی سایت</option>
          <option value="published">منتشرشده</option>
          <option value="rejected">ردشده</option>
          <option value="hidden">پنهان‌شده</option>
        </select>
        <span>{fa(data?.total ?? 0)} دیدگاه</span>
      </div>
      {data?.items.length ? (
        <div className="host-review-list">
          {data.items.map((item) => (
            <article className="host-review-card" key={item.id}>
              <div className="host-review-card-heading">
                <div>
                  <strong>{item.event_title}</strong>
                  <span>
                    {item.author_name} · {date(item.created_at)}
                  </span>
                </div>
                <span className="host-review-rating">
                  <Star size={16} fill="currentColor" />
                  {fa(item.rating)} از ۵
                </span>
              </div>
              <span
                className={`status ${item.status === "published" ? "success" : ""}`}
              >
                {labels[item.status] ?? item.status}
              </span>
              {item.comment && <p>{item.comment}</p>}
              {item.reply_status && (
                <p className="host-review-reply-state">
                  وضعیت پاسخ: {labels[item.reply_status] ?? item.reply_status}
                </p>
              )}
              <label>
                پاسخ شما
                <textarea
                  maxLength={1200}
                  rows={3}
                  value={drafts[item.id] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <small>پاسخ هم برای نمایش عمومی به تأیید سایت نیاز دارد.</small>
              <button
                className="button"
                disabled={saving === item.id || !(drafts[item.id] ?? "").trim()}
                onClick={() => void reply(item)}
              >
                {saving === item.id
                  ? "در حال ارسال…"
                  : item.reply_id
                    ? "ویرایش و ارسال دوباره"
                    : "ارسال پاسخ"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Blank
          title="دیدگاهی برای نمایش نیست"
          description="با ثبت دیدگاه تأییدشده برای ایونت‌های شما، اینجا نمایش داده می‌شود."
        />
      )}
      {data && (
        <NumberedPagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
          disabled={loading}
        />
      )}
    </main>
  );
}
