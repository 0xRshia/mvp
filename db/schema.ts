import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default(""),
  created_at: integer("created_at").notNull(),
});
export const sessions = sqliteTable(
  "sessions",
  {
    hash: text("hash").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    expires_at: integer("expires_at").notNull(),
  },
  (t) => [index("idx_sessions_expiry").on(t.expires_at)],
);
export const challenges = sqliteTable("challenges", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  hash: text("hash").notNull(),
  expires_at: integer("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumed: integer("consumed").notNull().default(0),
});
export const limits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resets_at: integer("resets_at").notNull(),
  last_at: integer("last_at").notNull(),
});
export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    host_id: text("host_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    venue: text("venue").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    maps_url: text("maps_url"),
    starts_at: integer("starts_at").notNull(),
    ends_at: integer("ends_at").notNull(),
    // Zero fails closed for inserts that omit a registration deadline.
    registration_ends_at: integer("registration_ends_at").notNull().default(0),
    price: integer("price").notNull(),
    capacity: integer("capacity"),
    image: text("image"),
    published: integer("published").notNull().default(1),
    sample: integer("sample").notNull().default(0),
    created_at: integer("created_at"),
  },
  (t) => [
    index("idx_events_city_start").on(t.city, t.starts_at),
    index("idx_events_host").on(t.host_id),
  ],
);
export const eventMedia = sqliteTable("event_media", {
  id: text("id").primaryKey(),
  event_id: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["cover", "gallery"] }).notNull(),
  position: integer("position").notNull(),
  storage_key: text("storage_key").notNull().unique(),
  content_type: text("content_type").notNull(),
  byte_size: integer("byte_size").notNull(),
  created_at: integer("created_at").notNull(),
}, (t) => [uniqueIndex("idx_event_media_position").on(t.event_id, t.role, t.position)]);
export const reservations = sqliteTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    event_id: text("event_id")
      .notNull()
      .references(() => events.id),
    quantity: integer("quantity").notNull(),
    total: integer("total").notNull(),
    amount_rial: integer("amount_rial").notNull(),
    status: text("status").notNull(),
    request_key: text("request_key").notNull(),
    created_at: integer("created_at").notNull(),
    expires_at: integer("expires_at"),
    authority: text("authority"),
    reference: text("reference"),
    payment_state: text("payment_state").notNull().default("none"),
    attendee_name: text("attendee_name"),
    attendee_phone: text("attendee_phone"),
  },
  (t) => [
    uniqueIndex("idx_reservations_request").on(t.user_id, t.request_key),
    uniqueIndex("idx_reservations_authority").on(t.authority),
    index("idx_reservations_event_status").on(
      t.event_id,
      t.status,
      t.expires_at,
    ),
    index("idx_reservations_user_created").on(t.user_id, t.created_at),
  ],
);
export const tickets = sqliteTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    reservation_id: text("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    token: text("token").notNull(),
    created_at: integer("created_at").notNull(),
    checked_in_at: integer("checked_in_at"),
  },
  (t) => [
    uniqueIndex("idx_tickets_reservation_ordinal").on(t.reservation_id, t.ordinal),
    uniqueIndex("idx_tickets_token").on(t.token),
  ],
);
export const eventScanners = sqliteTable("event_scanners", {
  event_id: text("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  created_at: integer("created_at").notNull(),
});
