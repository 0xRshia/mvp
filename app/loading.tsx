"use client";

import { usePathname } from "next/navigation";
import { LoadingPage, type LoadingVariant } from "@/components/event/loading";
import "./scanner/scanner.css";

export default function Loading() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  // The root boundary can stream before the nested route boundary is ready.
  let variant: LoadingVariant;
  if (pathname === "/") variant = "discovery";
  else if (pathname === "/events" || pathname === "/events/free") variant = "catalog";
  else if (pathname.startsWith("/events/")) variant = "event";
  else if (pathname === "/reservations") variant = "reservations";
  else if (pathname === "/host") variant = "host";
  else if (pathname.startsWith("/host/events/")) variant = "host-event";
  else if (pathname === "/scanner") variant = "scanner";
  else return null;
  return <LoadingPage variant={variant} />;
}
