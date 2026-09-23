import EventCatalogBrowser from "@/components/event/event-catalog-browser";

export default async function EventsPage({ searchParams }: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  return <EventCatalogBrowser view={view === "suggested" || view === "new" ? view : "all"} />;
}
