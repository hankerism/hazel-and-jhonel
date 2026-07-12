"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "wedding-music-preference"; // "on" | "off"
const TARGET_VOLUME = 0.38;
const FADE_IN_MS = 2000;
const FADE_OUT_MS = 500;

type Phase =
  | "hidden" // pre-mount / audio missing
  | "card" // expanded floating card
  | "chip"; // collapsed circular button

interface MusicPlayerProps {
  /** Audio source under /public (or an absolute URL). */
  src?: string;
  title?: string;
  /** When false, music only starts from an explicit tap on the player. */
  autoplay?: boolean;
}

/**
 * Floating background-music player that starts playing as soon as it can.
 *
 * True autoplay is attempted on load; browsers block un-muted audio until
 * the page has received a user gesture, so when that happens a one-time
 * listener starts the music (with its fade-in) on the guest's first
 * tap/click/keypress anywhere. A guest who explicitly pauses is remembered
 * in localStorage and never auto-started again. The chip in the corner
 * expands into a small card with the pause/resume control.
 *
 * All playback logic lives here; the audio element is created lazily and
 * only after a HEAD check, so a missing file degrades to "no player"
 * without console noise.
 *
 * Known limit: iOS Safari ignores HTMLAudioElement.volume, so the fade
 * becomes a hard start at system volume there.
 */
export function MusicPlayer({
  src = "/audio/bgm.mp3",
  title = "Our Wedding Song",
  autoplay = true,
}: MusicPlayerProps) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [playing, setPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const availableRef = useRef<boolean | null>(null); // null = unchecked

  /** Does the audio file exist? Checked once, without console noise. */
  const ensureAvailable = useCallback(async (): Promise<boolean> => {
    if (availableRef.current !== null) return availableRef.current;
    try {
      const res = await fetch(src, { method: "HEAD" });
      availableRef.current = res.ok;
    } catch {
      availableRef.current = false;
    }
    return availableRef.current;
  }, [src]);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = "auto";
      // In the DOM (hidden) so devtools can inspect playback state.
      audio.hidden = true;
      document.body.appendChild(audio);
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [src]);

  const cancelFade = useCallback(() => {
    if (fadeRef.current !== null) {
      window.clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  // Interval + wall clock rather than requestAnimationFrame: rAF freezes in
  // hidden tabs, which would strand a fade mid-way if the guest tabs out.
  const fadeTo = useCallback(
    (target: number, duration: number, onDone?: () => void) => {
      const audio = getAudio();
      cancelFade();
      const from = audio.volume;
      const start = Date.now();
      fadeRef.current = window.setInterval(() => {
        const t = Math.min((Date.now() - start) / duration, 1);
        audio.volume = from + (target - from) * t;
        if (t >= 1) {
          cancelFade();
          onDone?.();
        }
      }, 50);
    },
    [cancelFade, getAudio],
  );

  /** Start playback with a gentle fade-in. Returns whether it started. */
  const play = useCallback(async (): Promise<boolean> => {
    if (!(await ensureAvailable())) {
      setPhase("hidden");
      return false;
    }
    const audio = getAudio();
    try {
      cancelFade();
      audio.volume = 0;
      await audio.play(); // rejects without a user gesture — caller decides
      fadeTo(TARGET_VOLUME, FADE_IN_MS);
      setPlaying(true);
      return true;
    } catch {
      return false;
    }
  }, [cancelFade, ensureAvailable, fadeTo, getAudio]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    fadeTo(0, FADE_OUT_MS, () => audio.pause());
    setPlaying(false);
    localStorage.setItem(STORAGE_KEY, "off");
  }, [fadeTo]);

  const resume = useCallback(async () => {
    const started = await play();
    if (started) localStorage.setItem(STORAGE_KEY, "on");
  }, [play]);

  // Boot: attempt autoplay unless the guest previously paused. When the
  // browser blocks it, wait for the first gesture anywhere on the page.
  useEffect(() => {
    let cancelled = false;
    let disarm: (() => void) | null = null;

    const armFirstGestureStart = () => {
      const onFirstGesture = (e: Event) => {
        // Interactions with the player itself are handled by its buttons.
        if (
          e.target instanceof Node &&
          containerRef.current?.contains(e.target)
        ) {
          return;
        }
        // Disarm only once playback truly starts; otherwise keep listening —
        // a gesture the browser doesn't credit must not spend our one shot.
        void play().then((started) => {
          if (started) disarm?.();
        });
      };
      window.addEventListener("pointerdown", onFirstGesture, true);
      window.addEventListener("keydown", onFirstGesture, true);
      disarm = () => {
        window.removeEventListener("pointerdown", onFirstGesture, true);
        window.removeEventListener("keydown", onFirstGesture, true);
        disarm = null;
      };
    };

    const boot = async () => {
      if (!(await ensureAvailable())) return; // no file → no player
      if (cancelled) return;

      setPhase("chip");

      const pref = localStorage.getItem(STORAGE_KEY);
      if (pref === "off") return; // they chose silence
      // Autoplay disabled by the couple: only resume for guests who
      // explicitly turned music on before.
      if (!autoplay && pref !== "on") return;

      const started = await play();
      if (!started && !cancelled) armFirstGestureStart();
    };
    void boot();

    return () => {
      cancelled = true;
      disarm?.();
      cancelFade();
      audioRef.current?.pause();
      audioRef.current?.remove();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      ref={containerRef}
      className="fixed right-5 bottom-5 z-40"
      onKeyDown={(e) => {
        if (e.key === "Escape" && phase === "card") setPhase("chip");
      }}
    >
      {phase === "card" ? (
        <div
          role="region"
          aria-label="Background music"
          className="fade-slide-in w-64 rounded-2xl border border-line bg-ivory/85 p-5 shadow-[0_8px_40px_rgba(26,24,21,0.12)] backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-deep"
              >
                <NoteIcon />
              </span>
              <div>
                <p className="font-serif text-base font-medium text-charcoal">
                  {title}
                </p>
                <p className="text-xs text-stone">Enhance your experience</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhase("chip")}
              aria-label="Minimize music player"
              className="-mt-1 -mr-1 cursor-pointer p-1 text-stone transition-colors hover:text-charcoal"
            >
              <MinimizeIcon />
            </button>
          </div>

          <button
            type="button"
            onClick={playing ? pause : resume}
            className="eyebrow mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-charcoal/20 bg-charcoal px-4 py-2.5 text-[0.625rem] text-ivory transition-colors duration-300 hover:bg-gold-deep"
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
            {playing ? "Pause Music" : "Play Music"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPhase("card")}
          aria-label={
            playing
              ? "Music is playing — open music player"
              : "Music is paused — open music player"
          }
          className="fade-slide-in flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line bg-ivory/85 text-gold-deep shadow-[0_6px_28px_rgba(26,24,21,0.14)] backdrop-blur-md transition-transform duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:transform-none"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ icons */

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M6 13.5a2 2 0 1 1-1.5-1.937V4.25a.75.75 0 0 1 .55-.723l6.5-1.857A.75.75 0 0 1 12.5 2.4v8.6a2 2 0 1 1-1.5-1.937V5.443L6 6.729V13.5z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M4.5 2.9a.6.6 0 0 1 .92-.507l8.05 5.1a.6.6 0 0 1 0 1.014l-8.05 5.1a.6.6 0 0 1-.92-.507V2.9z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3.5" y="2.5" width="3.2" height="11" rx="0.8" />
      <rect x="9.3" y="2.5" width="3.2" height="11" rx="0.8" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 8h10" />
    </svg>
  );
}
