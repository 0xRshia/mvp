"use client";
import { AppLink } from "@/components/event/app-navigation";
import { AnimatedRegion } from "@/components/ui/animated-region";
import { ButtonLabel } from "@/components/ui/button-label";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Users,
  Ticket,
  CalendarDays,
  Wallet,
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsPanels } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { useAuth } from "@/components/event/app-shell";
import { EventForm } from "@/components/event/event-form";
import { Blank, Choice, ErrorBox, Loading } from "@/components/event/shared";
import { api } from "@/lib/client";
import {
  date,
  clock,
  fa,
  type EventItem,
  type Reservation,
} from "@/lib/types";
import "./attendees.css";
type HostData = {
  stats: { revenue: number; people: number; bookings: number; reviews: number };
  attendeeTotal: number;
  events: EventItem[];
  attendees: Reservation[];
  sales: { day: string; sales: number; tickets: number }[];
};
export default function Host() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(0),
    [activeTab, setActiveTab] = useState("events");
  const [data, setData] = useState<HostData>({
      events: [],
      attendees: [],
      sales: [],
      stats: { revenue: 0, people: 0, bookings: 0, reviews: 0 },
      attendeeTotal: 0,
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [selected, setSelected] = useState("all");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const filters = useRef({ page: 0, event: "all" });
  async function load() {
    const version = ++requestVersion.current;
    setError("");
    setLoading(true);
    try {
      const result = await api<HostData>(
        `/api/host?page=${filters.current.page}&event=${encodeURIComponent(filters.current.event)}`,
      );
      if (version !== requestVersion.current) return;
      setData(result);
      setHasLoaded(true);
    } catch (e) {
      if (version === requestVersion.current) setError((e as Error).message);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    filters.current = { page, event: selected };
    if (user?.isHost) void load();
    else if (!authLoading) setLoading(false);
    return () => { requestVersion.current++; };
  }, [user, authLoading, page, selected]);
  async function publish(e: EventItem) {
    if (publishing) return;
    setPublishing(e.id);
    try {
      await api("/api/host", {
        action: "publish",
        id: e.id,
        published: !e.published,
      });
      await load();
      toast.success(
        e.published
          ? "فروش متوقف شد؛ رزروهای قبلی حفظ شدند."
          : "ایونت منتشر شد.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPublishing(null);
    }
  }
  // The server filters these rows; retain the last result while the next one loads.
  const attendees = data.attendees;
  const revenue = data.stats.revenue;
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    return {
      label: date(+d),
      sales: data.sales.find((s) => s.day === day)?.sales ?? 0,
    };
  });
  function exportCsv() {
    const cell = (x: unknown) =>
      '"' +
      String(x ?? "")
        .replace(/^[\s\u0000-\u001f]*[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const content =
      "\uFEFF" +
      [
        [
          "ایونت",
          "نام",
          "شماره همراه",
          "تعداد",
          "مبلغ تومان",
          "وضعیت",
          "کد رزرو",
        ],
        ...attendees.map((a) => [
          a.title,
          a.name,
          a.phone,
          a.quantity,
          a.total,
          a.status === "confirmed"
            ? (a.payment_state === "skipped_dev" ? "تأییدشده؛ آزمایشی بدون پرداخت" : "تأییدشده")
            : "نیازمند پیگیری",
          a.id,
        ]),
      ]
        .map((row) => row.map(cell).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "hamghadam-attendees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="container subpage">
      <div className="page-heading host-heading">
        <div>
          <div className="eyebrow">خانهٔ ایونت‌های شما</div>
          <h1>پنل میزبان</h1>
          <p>
            {user?.name ? `${user.name}، خوش آمدید. ` : ""}از اولین ثبت‌نام تا
            آخرین صندلی، همه‌چیز اینجاست.
          </p>
        </div>
        {user?.isHost && (
          <button
            className="button"
            onClick={() => {
              setOpen(true);
            }}
          >
            <Plus size={19} />
            ایونت جدید
          </button>
        )}
      </div>
      <AnimatedRegion animateHeight={false} aria-busy={hasLoaded && loading} transitionKey={authLoading || (loading && !hasLoaded) ? "loading" : !user ? "signed-out" : user.isHost ? "host" : "not-host"}>
      {authLoading || (loading && !hasLoaded) ? (
        <Loading variant="host" />
      ) : !user ? (
        <Blank
          title="یک قرار خوب، با شما شروع می‌شود"
          description="برای ساخت ایونت، دیدن فروش و مدیریت شرکت‌کنندگان وارد پنل میزبان شوید."
        >
          <AppLink className="button" href="/host/login">
            ورود میزبان
            <ArrowLeft size={17} />
          </AppLink>
        </Blank>
      ) : !user.isHost ? (
        <Blank
          title="شمارهٔ شما هنوز میزبان نیست"
          description="برای دسترسی به پنل، مدیر سامانه باید شمارهٔ همراه شما را به فهرست میزبان‌های تأییدشده اضافه کند."
        >
          <AppLink className="button outline" href="/">
            بازگشت به ایونت‌ها
          </AppLink>
        </Blank>
      ) : error ? (
        <ErrorBox message={error} retry={load} />
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                label: "فروش کل",
                value: fa(revenue),
                unit: "تومان",
                Icon: Wallet,
              },
              {
                label: "شرکت‌کنندگان",
                value: fa(data.stats.people),
                unit: "نفر",
                Icon: Users,
              },
              {
                label: "ایونت‌های شما",
                value: fa(data.events.length),
                unit: "ایونت",
                Icon: CalendarDays,
              },
              {
                label: "رزروهای تأییدشده",
                value: fa(data.stats.bookings),
                unit: "رزرو",
                Icon: Ticket,
              },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div>
                  <span>{s.label}</span>
                  <s.Icon size={21} />
                </div>
                <strong>
                  {s.value}
                  <small>{s.unit}</small>
                </strong>
              </div>
            ))}
          </div>
          {data.stats.reviews > 0 && (
            <div className="error-box">
              یک پرداخت بدون ظرفیت کافی ثبت شده است. در فهرست شرکت‌کنندگان،
              موارد نیازمند پیگیری را بررسی کنید و مبلغ را از پنل درگاه
              بازگردانید.
            </div>
          )}
          <div className="charts-grid">
            <section className="chart-panel">
              <h2>
                <BarChart3 size={19} /> فروش ۷ روز گذشته <small>تومان</small>
              </h2>
              <ChartContainer
                className="host-chart"
                config={{ sales: { label: "فروش", color: "var(--chart-1)" } }}
              >
                <BarChart data={chart} accessibilityLayer>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    fontSize={13}
                    tick={{ fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    tickFormatter={(v) => fa(v)}
                    width={65}
                    axisLine={false}
                    tickLine={false}
                    fontSize={13}
                    tick={{ fill: "var(--text-muted)" }}
                  />
                  <Tooltip
                    formatter={(v) => [`${fa(Number(v))} تومان`, "فروش"]}
                    contentStyle={{
                      direction: "rtl",
                      borderRadius: 12,
                      fontFamily: "var(--font-app)",
                      fontSize: 14,
                      backgroundColor: "var(--popover)",
                      color: "var(--popover-foreground)",
                      borderColor: "var(--border)",
                    }}
                    labelStyle={{ color: "var(--text-muted)" }}
                    itemStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar
                    dataKey="sales"
                    fill="var(--color-sales)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ChartContainer>
              {revenue === 0 && (
                <p className="chart-caption">هنوز فروشی ثبت نشده است.</p>
              )}
            </section>
            <section className="chart-panel">
              <h2>
                <Users size={19} /> ثبت‌نام به تفکیک ایونت
              </h2>
              {data.events.length ? (
                <div className="attendance-bars">
                  {data.events.slice(0, 5).map((e) => (
                    <div key={e.id}>
                      <p>
                        <span>{e.title}</span>
                        <strong>{fa(e.attendees)} نفر</strong>
                      </p>
                      <div className="bar-track">
                        <span
                          style={{
                            width: `${Math.min(100, e.capacity ? (e.attendees / e.capacity) * 100 : e.attendees ? 100 : 0)}%`,
                          }}
                        />
                      </div>
                      <small>
                        {e.capacity
                          ? `ظرفیت ${fa(e.capacity)} نفر`
                          : "بدون محدودیت ظرفیت"}
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <Blank
                  title="اولین ایونتتان را بسازید"
                  description="آمار ثبت‌نام بعد از ساخت ایونت در اینجا نمایش داده می‌شود."
                />
              )}
            </section>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <TabsList className="page-tabs">
              <TabsTrigger value="events">
                ایونت‌ها ({fa(data.events.length)})
              </TabsTrigger>
              <TabsTrigger value="attendees">
                شرکت‌کنندگان ({fa(data.attendeeTotal)})
              </TabsTrigger>
            </TabsList>
            <TabsPanels>
          <TabsContent value="events">
              {data.events.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ایونت</TableHead>
                      <TableHead>زمان</TableHead>
                      <TableHead>ثبت‌نام / ظرفیت</TableHead>
                      <TableHead>قیمت</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>مدیریت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <AppLink href={`/events/${e.id}`} className="table-event">
                            {e.title}
                            <small>{e.venue}</small>
                          </AppLink>
                        </TableCell>
                        <TableCell>
                          {date(e.starts_at)}
                          <br />
                          {clock(e.starts_at)}
                        </TableCell>
                        <TableCell>
                          {fa(e.attendees)} /{" "}
                          {e.capacity ? fa(e.capacity) : "نامحدود"}
                        </TableCell>
                        <TableCell>
                          {e.price ? `${fa(e.price)} تومان` : "رایگان"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`status ${e.published ? "success" : ""}`}
                          >
                            {e.published ? "منتشرشده" : "فروش متوقف"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="host-event-actions">
                            <AppLink
                              className="button outline"
                              href={`/host/events/${encodeURIComponent(e.id)}`}
                            >
                              <Users size={16} />
                              مدیریت شرکت‌کنندگان و ورود
                            </AppLink>
                            <button
                              type="button"
                              disabled={!!publishing || loading}
                              aria-busy={publishing === e.id}
                              className="text-button"
                              onClick={() => publish(e)}
                            >
                              <ButtonLabel
                                state={publishing === e.id ? "pending" : e.published ? "published" : "paused"}
                                states={{
                                  pending: "در حال ذخیره…",
                                  published: <><EyeOff size={16} /> توقف فروش</>,
                                  paused: <><Eye size={16} /> انتشار</>,
                                }}
                              />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Blank title="هنوز ایونتی نساخته‌اید">
                  <button className="button" onClick={() => setOpen(true)}>
                    <Plus size={17} />
                    ساخت اولین ایونت
                  </button>
                </Blank>
              )}
            </TabsContent>
            <TabsContent value="attendees">
              <div className="table-toolbar">
                <Choice
                  label="فیلتر ایونت شرکت‌کنندگان"
                  value={selected}
                  onChange={(v) => {
                    setSelected(v);
                    setPage(0);
                  }}
                  options={[
                    { value: "all", label: "همهٔ ایونت‌ها" },
                    ...data.events.map((e) => ({
                      value: e.id,
                      label: e.title,
                    })),
                  ]}
                />
                {selected !== "all" && (
                  <AppLink
                    className="button outline"
                    href={`/host/events/${encodeURIComponent(selected)}`}
                  >
                    <Users size={16} />
                    جستجو و مدیریت این ایونت
                  </AppLink>
                )}
                <button
                  className="button outline"
                  disabled={loading || !attendees.length}
                  onClick={exportCsv}
                >
                  <Download size={16} />
                  دریافت این صفحه
                </button>
              </div>
              {attendees.length ? (
                <AnimatedRegion animateHeight={false} aria-busy={loading} transitionKey={data.attendees.map((attendee) => attendee.id).join(",")}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام</TableHead>
                      <TableHead>شمارهٔ همراه</TableHead>
                      <TableHead>ایونت</TableHead>
                      <TableHead>تعداد</TableHead>
                      <TableHead>مبلغ</TableHead>
                      <TableHead>وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendees.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.name || "بدون نام"}</TableCell>
                        <TableCell>
                          <bdi>{a.phone}</bdi>
                        </TableCell>
                        <TableCell>{a.title}</TableCell>
                        <TableCell>{fa(a.quantity)}</TableCell>
                        <TableCell>{fa(a.total)} تومان</TableCell>
                        <TableCell>
                          {a.status === "confirmed"
                            ? (a.payment_state === "skipped_dev" ? "تأییدشده؛ آزمایشی بدون پرداخت" : "تأییدشده")
                            : "نیازمند پیگیری پرداخت"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </AnimatedRegion>
              ) : (
                <Blank
                  title="هنوز کسی ثبت‌نام نکرده است"
                  description="با اولین ثبت‌نام، اطلاعات شرکت‌کننده اینجا نمایش داده می‌شود."
                />
              )}
              {data.attendeeTotal > 50 && (
                <Pagination className="pagination-controls">
                  <PaginationContent>
                    <PaginationItem>
                      <button
                        className="button outline"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        صفحهٔ قبل
                      </button>
                    </PaginationItem>
                    <PaginationItem>
                      <span>
                        صفحهٔ {fa(page + 1)} از{" "}
                        {fa(Math.ceil(data.attendeeTotal / 50))}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <button
                        className="button outline"
                        disabled={(page + 1) * 50 >= data.attendeeTotal}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        صفحهٔ بعد
                      </button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </TabsContent>
          </TabsPanels>
        </Tabs>
        </>
      )}
      </AnimatedRegion>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!saving) setOpen(v);
        }}
      >
        <DialogContent
          className="app-dialog event-form-dialog"
          dir="rtl"
          showCloseButton={false}
        >
          <DialogTitle>یک قرار تازه بسازید</DialogTitle>
          <DialogDescription>
            اطلاعات دقیق به شرکت‌کنندگان کمک می‌کند راحت‌تر انتخاب کنند.
          </DialogDescription>
          <EventForm
            saving={saving}
            onSavingChange={setSaving}
            onCancel={() => setOpen(false)}
            onCreated={async () => {
              setOpen(false);
              await load();
              toast.success("ایونت شما منتشر شد.");
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
