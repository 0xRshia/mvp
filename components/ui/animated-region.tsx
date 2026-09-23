"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export function AnimatedRegion({
  children,
  className,
  contentClassName,
  transitionKey,
  animateHeight = true,
  ...props
}: ComponentProps<"div"> & {
  contentClassName?: string;
  transitionKey?: string | number;
  animateHeight?: boolean;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);
  const previousKey = useRef(transitionKey);
  const heightAnimation = useRef<Animation | null>(null);
  const entranceAnimation = useRef<Animation | null>(null);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !animateHeight) return;

    function measure() {
      if (!outer || !inner) return;
      const nextHeight = inner.getBoundingClientRect().height;
      const lastHeight = previousHeight.current;
      previousHeight.current = nextHeight;
      if (lastHeight === null || Math.abs(nextHeight - lastHeight) < 1) return;
      const startHeight = heightAnimation.current
        ? outer.getBoundingClientRect().height
        : lastHeight;
      heightAnimation.current?.cancel();
      if (reducedMotion) return;
      const animation = outer.animate(
        [{ height: `${startHeight}px` }, { height: `${nextHeight}px` }],
        { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
      heightAnimation.current = animation;
      outer.dataset.resizing = "true";
      void animation.finished.catch(() => {}).finally(() => {
        if (heightAnimation.current !== animation) return;
        heightAnimation.current = null;
        delete outer.dataset.resizing;
      });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [reducedMotion, animateHeight]);

  useLayoutEffect(() => {
    if (previousKey.current === transitionKey) return;
    previousKey.current = transitionKey;
    entranceAnimation.current?.cancel();
    if (!reducedMotion) {
      entranceAnimation.current = innerRef.current?.animate(
        [{ opacity: 0.35, translate: "0 6px" }, { opacity: 1, translate: "0 0" }],
        { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)" },
      ) ?? null;
    }
  }, [transitionKey, reducedMotion]);

  useLayoutEffect(() => {
    if (reducedMotion) {
      heightAnimation.current?.cancel();
      entranceAnimation.current?.cancel();
    }
    return () => {
      heightAnimation.current?.cancel();
      entranceAnimation.current?.cancel();
    };
  }, [reducedMotion]);

  return (
    <div ref={outerRef} className={cn("animated-region", className)} {...props}>
      <div ref={innerRef} className={cn("animated-region-content", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
