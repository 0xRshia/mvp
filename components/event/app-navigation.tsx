"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext, Suspense, useCallback, useContext, useEffect, useLayoutEffect,
  useRef, type ComponentProps, type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

type NavigateOptions = { replace?: boolean; scroll?: boolean };
type Navigate = (href: string, options?: NavigateOptions) => void;
const NavigationContext = createContext<Navigate | null>(null);

type PendingNavigation = {
  from: string;
  finish: () => void;
  cancel: () => void;
};

function RouteCommit({ onCommit }: { onCommit: (key: string) => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useLayoutEffect(() => onCommit(`${pathname}?${search}`), [pathname, search, onCommit]);
  return null;
}

export function AppNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pending = useRef<PendingNavigation | null>(null);
  const routeAnimation = useRef<Animation | null>(null);
  const lastRoute = useRef<string | null>(null);

  const onCommit = useCallback((key: string) => {
    const changed = lastRoute.current !== null && lastRoute.current !== key;
    lastRoute.current = key;
    if (pending.current && pending.current.from !== key) {
      pending.current.finish();
    } else if (changed && !prefersReducedMotion()) {
      routeAnimation.current?.cancel();
      routeAnimation.current = document.querySelector<HTMLElement>("[data-route-content]")?.animate(
        [{ opacity: 0.3, translate: "0 6px" }, { opacity: 1, translate: "0 0" }],
        { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" },
      ) ?? null;
    }
  }, []);

  const navigate = useCallback<Navigate>((href, options = {}) => {
    const target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin) {
      window.location.assign(target.href);
      return;
    }
    pending.current?.cancel();
    const destination = target.pathname + target.search + target.hash;
    const commit = () => {
      if (options.replace) router.replace(destination, { scroll: options.scroll ?? true });
      else router.push(destination, { scroll: options.scroll ?? true });
    };
    const from = `${window.location.pathname}?${new URLSearchParams(window.location.search)}`;
    const to = `${target.pathname}?${target.searchParams}`;
    if (from === to && target.hash === window.location.hash) return;
    if (from === to || prefersReducedMotion() || !document.startViewTransition) {
      commit();
      return;
    }

    let resolveCommit: () => void;
    const committed = new Promise<void>((resolve) => { resolveCommit = resolve; });
    let transition: ViewTransition | undefined;
    let timeout: ReturnType<typeof setTimeout>;
    const job: PendingNavigation = {
      from,
      finish: () => {
        clearTimeout(timeout);
        resolveCommit();
      },
      cancel: () => {
        job.finish();
        transition?.skipTransition();
        if (pending.current === job) pending.current = null;
      },
    };
    pending.current = job;
    routeAnimation.current?.cancel();
    try {
      transition = document.startViewTransition(async () => {
        if (pending.current !== job) return;
        commit();
        await committed;
      });
      void transition.ready.catch(() => {});
      // Slow or failed requests must never leave a frozen transition overlay.
      timeout = setTimeout(job.cancel, 1500);
      void transition.finished.catch(() => {}).finally(() => {
        clearTimeout(timeout);
        if (pending.current === job) pending.current = null;
      });
    } catch {
      job.cancel();
      commit();
    }
  }, [router]);

  useEffect(() => {
    const cancel = () => pending.current?.cancel();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      if (media.matches) {
        cancel();
        routeAnimation.current?.cancel();
      }
    };
    window.addEventListener("popstate", cancel);
    media.addEventListener("change", onMotionChange);
    return () => {
      cancel();
      routeAnimation.current?.cancel();
      window.removeEventListener("popstate", cancel);
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <NavigationContext.Provider value={navigate}>
      <Suspense fallback={null}><RouteCommit onCommit={onCommit} /></Suspense>
      {children}
    </NavigationContext.Provider>
  );
}

export function useAppNavigate() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("App navigation requires AppNavigation.");
  return navigate;
}

export function AppLink({ href, onNavigate, replace, scroll, ...props }:
  Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const navigate = useAppNavigate();
  return (
    <Link {...props} href={href} replace={replace} scroll={scroll} onNavigate={(event) => {
      let cancelled = false;
      onNavigate?.({ preventDefault: () => { cancelled = true; } });
      event.preventDefault();
      if (!cancelled) navigate(href, { replace, scroll });
    }} />
  );
}
