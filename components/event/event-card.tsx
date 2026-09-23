import { AppLink } from "@/components/event/app-navigation";
import { ArrowUpLeft, Clock3, MapPin, Users } from "lucide-react";
import { useDeadlineClock } from "@/hooks/use-deadline-clock";
import { registrationCountdown } from "@/lib/registration";
import {
  categories,
  fa,
  date,
  type EventItem,
} from "@/lib/types";
import mediaStyles from "./event-media.module.css";

function PaidRegistrationCountdown({ deadline }: { deadline: number }) {
  const now = useDeadlineClock(deadline);
  const countdown = now === null ? null : registrationCountdown(deadline, now);
  return countdown ? (
    <p className="event-registration">
      <Clock3 size={15} aria-hidden="true" />
      <span>{countdown}</span>
    </p>
  ) : null;
}

export function EventCard({
  event,
  priority = false,
  highlight = false,
}: {
  event: EventItem;
  priority?: boolean;
  highlight?: boolean;
}) {
  return (
    <AppLink className="event-card" href={`/events/${event.id}`}>
      <div className={event.thumbnail ? "event-image" : mediaStyles.cardHeader}>
        {event.thumbnail && (
          <img
            src={event.thumbnail}
            alt={`تصویر ${event.title}`}
            loading={priority ? "eager" : "lazy"}
            draggable={false}
          />
        )}
        {highlight && event.remaining !== 0 && (
          <span className="editor-pick">
            وقت یک تجربهٔ تازه <span>✦</span>
          </span>
        )}
        <div className="event-image-footer">
          <span className={`event-capacity${event.remaining === 0 ? " sold-out" : ""}`}>
            <Users size={15} aria-hidden="true" />
            {event.remaining === null
              ? "ظرفیت نامحدود"
              : event.remaining === 0
                ? "تکمیل ظرفیت"
                : `${fa(event.remaining)} نفر باقی‌مانده`}
          </span>
          <time className="date-stamp" dateTime={new Date(event.starts_at).toISOString()}
            aria-label={date(event.starts_at, true)}>
            <strong>
              {new Intl.DateTimeFormat("fa-IR", {
                day: "numeric",
                timeZone: "Asia/Tehran",
              }).format(event.starts_at)}
            </strong>
            <span>
              {new Intl.DateTimeFormat("fa-IR", {
                month: "long",
                timeZone: "Asia/Tehran",
              }).format(event.starts_at)}
            </span>
          </time>
        </div>
      </div>
      <div className="event-content">
        <div className="event-meta">
          <span>
            <MapPin size={15} />
            {event.venue}
          </span>
          <span>
            {event.distance !== undefined
              ? `${fa(Math.round(event.distance * 10) / 10)} کیلومتر`
              : event.city}
          </span>
        </div>
        <p className="event-category">{categories.find((category) => category.id === event.category)?.label}</p>
        <h3>{event.title}</h3>
        {event.price > 0 && <PaidRegistrationCountdown deadline={event.registration_ends_at} />}
        <div className="card-bottom">
          <strong className={event.price === 0 ? "free" : ""}>
            {event.price ? fa(event.price) : "رایگان"}
            {event.price > 0 && <small> تومان</small>}
          </strong>
          <span className="ticket-link">
            دیدن ایونت
            <ArrowUpLeft size={18} />
          </span>
        </div>
      </div>
    </AppLink>
  );
}
