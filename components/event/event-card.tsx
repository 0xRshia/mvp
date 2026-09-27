import { AppLink } from "@/components/event/app-navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import { RegistrationCountdown } from "./registration-countdown";
import { categories, fa, date, clock, type EventItem } from "@/lib/types";
import styles from "./event-card.module.css";

export function EventCard({
  event,
  priority = false,
  mobilePair = false,
  serverNow,
}: {
  event: EventItem;
  serverNow?: number;
  priority?: boolean;
  mobilePair?: boolean;
}) {
  const image = event.image || event.thumbnail;
  const category = categories.find((item) => item.id === event.category)?.label;
  const rating = event;
  const startsAt = new Date(event.starts_at).toISOString();

  return (
    <AppLink
      data-motion-item
      className={`event-card ${styles.card}${mobilePair ? ` ${styles.mobilePair}` : ""}`}
      href={`/events/${event.id}`}
      aria-label={`مشاهدهٔ ایونت ${event.title}`}
    >
      <div
        className={`${styles.surface}${image ? "" : ` ${styles.withoutImage}`}`}
      >
        {image && (
          <img
            className={styles.image}
            src={image}
            alt=""
            loading={priority ? "eager" : "lazy"}
            draggable={false}
          />
        )}
        <div className={styles.topline}>
          <span
            className={`${styles.capacity}${event.remaining === 0 ? ` ${styles.soldOut}` : ""}`}
          >
            <Users size={15} aria-hidden="true" />
            {event.remaining === null
              ? "ظرفیت نامحدود"
              : event.remaining === 0
                ? "تکمیل ظرفیت"
                : `${fa(event.remaining)} نفر باقی مانده`}
          </span>
          <RegistrationCountdown
            deadline={event.registration_ends_at}
            serverNow={serverNow}
            compact
            squareTiles={mobilePair}
          />
        </div>
        <div className={styles.spacer} />
        <div className={styles.content}>
          <div className={styles.categoryRow}>
            {category && <span className={styles.category}>{category}</span>}
            <time
              className={styles.dateStamp}
              dateTime={startsAt}
              aria-label={date(event.starts_at, true)}
            >
              <strong>
                {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                  day: "numeric",
                  timeZone: "Asia/Tehran",
                }).format(event.starts_at)}
              </strong>
              <span>
                {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                  month: "long",
                  timeZone: "Asia/Tehran",
                }).format(event.starts_at)}
              </span>
            </time>
          </div>
          <h3 className={styles.title}>{event.title}</h3>
          {rating.rating_count ? (
            <span
              className={styles.rating}
              aria-label={`${rating.rating_average?.toFixed(1) ?? ""} از ۵، ${fa(rating.rating_count)} دیدگاه`}
            >
              <Star size={15} fill="currentColor" aria-hidden="true" />
              <strong>
                {rating.rating_average === null ||
                rating.rating_average === undefined
                  ? ""
                  : fa(Math.round(rating.rating_average * 10) / 10)}
              </strong>
              <small>({fa(rating.rating_count)})</small>
            </span>
          ) : null}
          <p className={styles.venue}>
            <MapPin size={16} aria-hidden="true" />
            <span>
              {event.venue}، {event.city}
            </span>
          </p>
          <div className={styles.facts}>
            <time dateTime={startsAt}>
              <CalendarDays size={14} aria-hidden="true" />
              {date(event.starts_at)}
            </time>
            <span>
              <Clock3 size={14} aria-hidden="true" />
              ساعت {clock(event.starts_at)}
            </span>
            {event.distance !== undefined && (
              <span>{fa(Math.round(event.distance * 10) / 10)} کیلومتر</span>
            )}
          </div>
          <div className={styles.price}>
            <span>هزینهٔ هر نفر</span>
            <strong>
              {event.price ? fa(event.price) : "رایگان"}
              {event.price > 0 && <small> تومان</small>}
            </strong>
          </div>
          <span className={styles.action}>
            مشاهدهٔ ایونت
            <ArrowLeft size={18} aria-hidden="true" />
          </span>
        </div>
      </div>
    </AppLink>
  );
}
