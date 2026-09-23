"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { fa } from "@/lib/types";
import styles from "./event-media.module.css";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function EventGallery({
  images,
  title,
}: {
  images: Array<{ id: string; url: string }>;
  title: string;
}) {
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const headingId = useId();
  const slideId = useId();
  const reducedMotion = useReducedMotion();
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const multiple = images.length > 1;
  const [viewportRef, carousel] = useEmblaCarousel({
    loop: true,
    direction: "rtl",
    active: multiple,
    duration: reducedMotion ? 0 : 25,
  });
  const subscribeSelection = useCallback((callback: () => void) => {
    if (!carousel) return () => {};
    carousel.on("select", callback).on("reInit", callback);
    return () => { carousel.off("select", callback).off("reInit", callback); };
  }, [carousel]);
  const active = useSyncExternalStore(
    subscribeSelection,
    () => carousel?.selectedScrollSnap() ?? 0,
    () => 0,
  );
  const automatic = multiple && playing && visible && !reducedMotion && !hovered;

  useEffect(() => {
    if (!automatic || !carousel) return;
    const timer = window.setInterval(
      () => carousel.scrollTo((carousel.selectedScrollSnap() + 1) % images.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [automatic, carousel, images.length]);

  useEffect(() => {
    if (!carousel) return;
    const pause = () => setPlaying(false);
    carousel.on("pointerDown", pause);
    return () => { carousel.off("pointerDown", pause); };
  }, [carousel]);

  function show(next: number) {
    setPlaying(false);
    carousel?.scrollTo((next + images.length) % images.length, reducedMotion);
  }

  if (!images.length) return null;

  return (
    <section
      className={styles.gallery}
      aria-labelledby={headingId}
      aria-roledescription={multiple ? "نمایش اسلاید" : undefined}
      dir="rtl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        // The rotation button must retain its current action when it gains focus.
        if (!(event.target instanceof HTMLElement) || !event.target.closest("[data-rotation-control]")) {
          setPlaying(false);
        }
      }}
      onKeyDown={(event) => {
        if (!multiple) return;
        const next = event.key === "ArrowLeft"
          ? active + 1
          : event.key === "ArrowRight"
            ? active - 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? images.length - 1
                : null;
        if (next === null) return;
        event.preventDefault();
        show(next);
      }}
    >
      <div className={styles.galleryHeading}>
        <h2 id={headingId}>تصاویر ایونت</h2>
        {multiple && !reducedMotion && (
          <button
            type="button"
            data-rotation-control
            className={styles.rotation}
            aria-label={playing ? "توقف نمایش خودکار تصاویر" : "شروع نمایش خودکار تصاویر"}
            onClick={() => setPlaying((current) => !current)}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "توقف" : "پخش"}
          </button>
        )}
      </div>
      <div
        className={styles.viewport}
        ref={viewportRef}
        tabIndex={multiple ? 0 : undefined}
        aria-label={multiple ? "تصاویر؛ با کلیدهای چپ و راست یا کشیدن تصویر جابه‌جا شوید" : undefined}
      >
        <div
          id={slideId}
          className={styles.track}
          aria-live={automatic ? "off" : "polite"}
        >
          {images.map((image, position) => (
            <div
              key={image.id}
              className={styles.slide}
              role="group"
              aria-roledescription={multiple ? "اسلاید" : undefined}
              aria-label={`${fa(position + 1)} از ${fa(images.length)}`}
              aria-hidden={position !== active}
            >
              <img
                src={image.url}
                alt={`${title}، تصویر ${fa(position + 1)}`}
                loading={position < 2 ? "eager" : "lazy"}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
      {multiple && (
        <div className={styles.galleryControls}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="تصویر قبلی"
            aria-controls={slideId}
            onClick={() => show(active - 1)}
          >
            <ArrowRight size={20} />
          </button>
          <div className={styles.indicators} aria-label="انتخاب تصویر">
            {images.map((image, position) => (
              <button
                type="button"
                key={image.id}
                className={styles.indicator}
                aria-label={`نمایش تصویر ${fa(position + 1)} از ${fa(images.length)}`}
                aria-current={active === position ? "true" : undefined}
                aria-controls={slideId}
                onClick={() => show(position)}
              >
                <span />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.arrow}
            aria-label="تصویر بعدی"
            aria-controls={slideId}
            onClick={() => show(active + 1)}
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      )}
    </section>
  );
}
