"use client";

import { useActionState, useState } from "react";
import {
  requestMagicLink,
  requestPasswordReset,
  signIn,
  type EmailFlowState,
  type LoginState,
} from "./actions";

type Mode = "password" | "magic" | "reset";

const inputClass =
  "rounded-xl border border-line bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-gold";

const submitClass =
  "eyebrow mt-2 cursor-pointer rounded-full bg-charcoal py-3.5 text-[0.625rem] text-ivory transition-colors duration-300 hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-50";

interface LoginFormProps {
  /** Set when the guard redirected here after the session lapsed. */
  sessionExpired?: boolean;
  /** Set when an email link was invalid or already used. */
  invalidLink?: boolean;
}

export function LoginForm({ sessionExpired, invalidLink }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>("password");

  return (
    <div className="mt-8">
      {sessionExpired && (
        <Notice>Your session expired — please sign in again.</Notice>
      )}
      {invalidLink && (
        <Notice>
          That link is invalid or has expired. Request a fresh one below.
        </Notice>
      )}

      {/* Mode switch */}
      {mode !== "reset" && (
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="mb-6 grid grid-cols-2 rounded-full border border-line bg-white/50 p-1"
        >
          {(
            [
              ["password", "Password"],
              ["magic", "Email Link"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`eyebrow cursor-pointer rounded-full py-2 text-[0.5625rem] transition-colors duration-300 ${
                mode === value
                  ? "bg-charcoal text-ivory"
                  : "text-stone hover:text-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "password" && <PasswordForm onForgot={() => setMode("reset")} />}
      {mode === "magic" && <MagicLinkForm />}
      {mode === "reset" && <ResetForm onBack={() => setMode("password")} />}
    </div>
  );
}

/* ------------------------------------------------------------------ modes */

function PasswordForm({ onForgot }: { onForgot: () => void }) {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    signIn,
    { error: null },
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <EmailField />
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between">
          <span className="eyebrow text-[0.5625rem] text-stone">Password</span>
          <button
            type="button"
            onClick={onForgot}
            className="cursor-pointer text-[0.6875rem] text-gold-deep underline-offset-4 hover:underline"
          >
            Forgot password?
          </button>
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {state.error && <ErrorText>{state.error}</ErrorText>}

      <button type="submit" disabled={isPending} className={submitClass}>
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

function MagicLinkForm() {
  const [state, formAction, isPending] = useActionState<EmailFlowState, FormData>(
    requestMagicLink,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <SentPanel>
        If that email is registered, a sign-in link is on its way. It's valid
        for one hour — you can close this page.
      </SentPanel>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <EmailField />
      {state.status === "error" && <ErrorText>{state.error}</ErrorText>}
      <button type="submit" disabled={isPending} className={submitClass}>
        {isPending ? "Sending…" : "Email Me a Sign-In Link"}
      </button>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [state, formAction, isPending] = useActionState<EmailFlowState, FormData>(
    requestPasswordReset,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <SentPanel>
        If that email is registered, a reset link is on its way. Follow it to
        choose a new password.
      </SentPanel>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-stone">
        Enter your email and we&apos;ll send a link to reset your password.
      </p>
      <EmailField />
      {state.status === "error" && <ErrorText>{state.error}</ErrorText>}
      <button type="submit" disabled={isPending} className={submitClass}>
        {isPending ? "Sending…" : "Send Reset Link"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer text-center text-[0.6875rem] text-stone underline-offset-4 hover:underline"
      >
        Back to sign in
      </button>
    </form>
  );
}

/* ------------------------------------------------------------- fragments */

function EmailField() {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow text-[0.5625rem] text-stone">Email</span>
      <input
        name="email"
        type="email"
        autoComplete="email"
        required
        className={inputClass}
      />
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-center text-xs leading-relaxed text-gold-deep">
      {children}
    </p>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-center text-xs text-[#a04c40]">
      {children}
    </p>
  );
}

function SentPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white/50 px-6 py-8 text-center">
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 font-serif text-lg text-gold-deep"
      >
        ✓
      </span>
      <p className="text-sm leading-relaxed text-stone">{children}</p>
    </div>
  );
}
