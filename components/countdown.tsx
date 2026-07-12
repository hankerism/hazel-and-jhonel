"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  /** Absolute instant of the ceremony (ISO with offset). */
  target: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function remainingUntil(target: number): Remaining | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  };
}

/** Live countdown to the ceremony. Renders em dashes until mounted so the
 * server and client markup agree. */
export function Countdown({ target }: CountdownProps) {
  const [remaining, setRemaining] = useState<Remaining | null | "pending">(
    "pending",
  );

  useEffect(() => {
    const targetMs = new Date(target).getTime();
    const tick = () => setRemaining(remainingUntil(targetMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining === null) {
    return (
      <p className="font-serif text-2xl font-light italic tracking-wide">
        Today is the day
      </p>
    );
  }

  const units =
    remaining === "pending"
      ? [
          ["—", "Days"],
          ["—", "Hours"],
          ["—", "Minutes"],
          ["—", "Seconds"],
        ]
      : [
          [String(remaining.days), "Days"],
          [String(remaining.hours), "Hours"],
          [String(remaining.minutes), "Minutes"],
          [String(remaining.seconds), "Seconds"],
        ];

  return (
    <div
      className="flex items-start justify-center gap-3 sm:gap-14"
      role="timer"
      aria-label="Countdown to the wedding"
    >
      {units.map(([value, label], i) => (
        <div key={label} className="flex items-start gap-3 sm:gap-14">
          {i > 0 && (
            <span aria-hidden className="mt-1 font-serif text-2xl font-light text-gold sm:text-4xl">
              ·
            </span>
          )}
          <div className="flex w-13 flex-col items-center gap-2 sm:w-16">
            <span className="font-serif text-3xl font-light tabular-nums sm:text-5xl">
              {value}
            </span>
            <span className="eyebrow text-[0.5625rem] opacity-80">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
