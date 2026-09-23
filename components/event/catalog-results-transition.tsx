"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatedRegion } from "@/components/ui/animated-region";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type ResultFrame = { key: string; children: ReactNode };

export function CatalogResultsTransition({ children, transitionKey }: {
  children: ReactNode;
  transitionKey: string;
}) {
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState<ResultFrame>({ key: transitionKey, children });
  const latest = useRef(frame);
  const contentRef = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const phase = useRef<"idle" | "out" | "commit" | "in">("idle");

  // Keep live data fresh without replaying motion for unchanged result identities.
  if ((reducedMotion || frame.key === transitionKey) &&
    (frame.key !== transitionKey || frame.children !== children)) {
    setFrame({ key: transitionKey, children });
  }

  useLayoutEffect(() => {
    latest.current = { key: transitionKey, children };
  }, [transitionKey, children]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    if (reducedMotion) {
      animation.current?.cancel();
      animation.current = null;
      phase.current = "idle";
      content.inert = false;
      return;
    }

    const changed = frame.key !== transitionKey;
    if (changed && phase.current === "out") return;
    if (!changed && (phase.current === "idle" || phase.current === "in")) return;

    const opacity = getComputedStyle(content).opacity;
    animation.current?.cancel();
    content.inert = changed;
    phase.current = changed ? "out" : "in";
    const current = content.animate(
      [{ opacity }, { opacity: changed ? 0 : 1 }],
      { duration: changed ? 80 : 120, easing: "ease-out", fill: "both" },
    );
    animation.current = current;
    void current.finished.then(() => {
      if (animation.current !== current) return;
      if (changed) {
        // Read at completion so rapid selections replace, rather than queue, updates.
        phase.current = "commit";
        setFrame(latest.current);
      } else {
        phase.current = "idle";
        animation.current = null;
        current.cancel();
      }
    }, () => {});
  }, [frame.key, transitionKey, reducedMotion]);

  useLayoutEffect(() => () => {
    animation.current?.cancel();
    animation.current = null;
    phase.current = "idle";
  }, []);

  return (
    <AnimatedRegion className="catalog-results">
      <div ref={contentRef} className="catalog-results-content">{frame.children}</div>
    </AnimatedRegion>
  );
}
