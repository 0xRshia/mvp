"use client";

import { useEffect, useState } from "react";
import { registrationClockDelay } from "@/lib/registration";

export function useDeadlineClock(deadline: number | undefined, refreshIntervalMs = 60000) {
  // Server and hydration render agree; the first timer supplies the browser clock.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      const current = Date.now();
      setNow(current);
      timer = setTimeout(tick, registrationClockDelay(deadline, current, refreshIntervalMs));
    }
    timer = setTimeout(tick, 0);
    function resume() {
      clearTimeout(timer);
      tick();
    }
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [deadline, refreshIntervalMs]);
  return now;
}
