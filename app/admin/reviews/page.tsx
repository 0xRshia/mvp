"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, EyeOff, X } from "lucide-react";
import { useAuth } from "@/components/event/app-shell";
import { AppLink } from "@/components/event/app-navigation";
import { Blank, ErrorBox, Loading } from "@/components/event/shared";
import { NumberedPagination } from "@/components/ui/numbered-pagination";
import { api } from "@/lib/client";
import { date, fa } from "@/lib/types";
import "../../host/attendees.css";
type Item = {
  id: string;
  record_id: string;
  kind: "review" | "reply";
  event_id: string;
  event_title: string;
  host_name: string;
  author_name: string;
  rating: number;
  comment: string;
  status: string;
  created_at: number;
  reply_comment: string | null;
};
type Result = {
  items: Item[];
  total: number;
  page: number;
  totalPages: number;
  status: string;
  kind: string;
};
export default function AdminReviews() {
  const { user } = useAuth();
  return <AdminReviewsSession key={user?.id ?? "guest"} />;
}
function AdminReviewsSession() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1),
    [status, setStatus] = useState("pending"),
    [kind, setKind] = useState("all"),
    [data, setData] = useState<Result | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState<string | null>(null);
  const version = useRef(0);
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const request = ++version.current;
      try {
        const result = await api<Result>(
          `/api/admin/reviews?page=${page}&status=${status}&kind=${kind}`,
        );
        if (request === version.current && isCurrent()) setData(result);
      } catch (e) {
        if (request === version.current && isCurrent())
          setError((e as Error).message);
      } finally {
        if (request === version.current && isCurrent()) setLoading(false);
      }
    },
    [page, status, kind],
  );
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled && user?.isAdmin) void load(() => !cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [load, user]);
  async function moderate(item: Item, next: string) {
    setSaving(item.id);
    setError("");
    try {
      await api(
        `/api/admin/reviews/${encodeURIComponent(item.id)}`,
        { kind: item.kind, status: next },
        "PATCH",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  }
  if (authLoading || (user?.isAdmin && loading && !data))
    return (
      <main className="container subpage">
        <Loading variant="host" />
      </main>
    );
  if (!user?.isAdmin)
    return (
      <main className="container subpage">
        <Blank
          title="دسترسی مدیر سایت لازم است"
          description="این صفحه برای بررسی و انتشار بازخوردهاست."
        />
      </main>
    );
  return (
    <main className="container subpage host-reviews">
      <header className="page-heading host-heading">
        <div>
          <div className="eyebrow">بررسی و انتشار بازخورد</div>
          <h1>مدیریت دیدگاه‌ها</h1>
          <p>
            دیدگاه‌ها و پاسخ‌های میزبان را جداگانه تأیید، رد، پنهان یا
            بازگردانید.
          </p>
        </div>
        <AppLink className="button outline" href="/admin">
          پنل مدیریت
        </AppLink>
      </header>
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <div className="host-review-filter">
        <label htmlFor="admin-review-status">وضعیت</label>
        <select
          id="admin-review-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="pending">در انتظار بررسی</option>
          <option value="published">منتشرشده</option>
          <option value="rejected">ردشده</option>
          <option value="hidden">پنهان‌شده</option>
          <option value="withdrawn">پس‌گرفته‌شده</option>
        </select>
        <label htmlFor="admin-review-kind">نوع</label>
        <select
          id="admin-review-kind"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">همه</option>
          <option value="review">دیدگاه</option>
          <option value="reply">پاسخ میزبان</option>
        </select>
        <span>{fa(data?.total ?? 0)} مورد</span>
      </div>
      {data?.items.length ? (
        <div className="host-review-list">
          {data.items.map((item) => (
            <article
              className="host-review-card"
              key={`${item.kind}:${item.id}`}
            >
              <div className="host-review-card-heading">
                <div>
                  <strong>
                    {item.kind === "review"
                      ? "دیدگاه شرکت‌کننده"
                      : "پاسخ میزبان"}{" "}
                    · {item.event_title}
                  </strong>
                  <span>
                    {item.kind === "review" ? item.author_name : item.host_name}{" "}
                    · {date(item.created_at)}
                  </span>
                </div>
                {item.kind === "review" && (
                  <span className="host-review-rating">
                    {fa(item.rating)} از ۵
                  </span>
                )}
              </div>
              {item.kind === "review" ? (
                <p>{item.comment || "بدون متن"}</p>
              ) : (
                <>
                  <p className="host-review-context">
                    متن دیدگاه · {item.author_name}:{" "}
                    {item.comment || "بدون متن"}
                  </p>
                  <p>{item.reply_comment}</p>
                </>
              )}
              <span className="status">{item.status}</span>
              <div className="host-review-actions">
                <button
                  className="button"
                  disabled={saving === item.id || item.status === "withdrawn"}
                  onClick={() => void moderate(item, "published")}
                >
                  <Check size={16} />
                  {item.status === "published"
                    ? "منتشرشده"
                    : "تأیید / بازگردانی"}
                </button>
                <button
                  className="button outline"
                  disabled={saving === item.id || item.status === "withdrawn"}
                  onClick={() => void moderate(item, "rejected")}
                >
                  <X size={16} />
                  رد
                </button>
                <button
                  className="button outline"
                  disabled={saving === item.id || item.status === "withdrawn"}
                  onClick={() => void moderate(item, "hidden")}
                >
                  <EyeOff size={16} />
                  پنهان
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Blank
          title="موردی برای این فیلتر نیست"
          description="موارد تازهٔ در انتظار بررسی بعداً در این فهرست ظاهر می‌شوند."
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
