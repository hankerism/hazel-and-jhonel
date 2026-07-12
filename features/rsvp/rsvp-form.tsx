"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type {
  Attendance,
  RsvpFieldConfig,
  RsvpFormConfig,
} from "@/types/wedding";
import { submitRsvp, type RsvpFormState } from "./actions";
import type { RsvpFieldValues } from "./validation";

const inputClass =
  "w-full border-b border-ivory/25 bg-transparent py-2.5 text-sm text-ivory placeholder:text-ivory/35 transition-colors focus:border-gold focus:outline-none";

const labelClass = "eyebrow text-[0.5625rem] text-ivory/60";

const initialState: RsvpFormState = { status: "idle" };

interface RsvpFormProps {
  /** Display names for copy, e.g. "Hazel Jean & Jhonel Rhey". */
  coupleNames: string;
  /** The couple's form configuration (fields, meals, limits). */
  config: RsvpFormConfig;
}

/** "Label" or "Label (optional)" — the form's original convention. */
const fieldLabel = (cfg: RsvpFieldConfig) =>
  cfg.required ? cfg.label : `${cfg.label} (optional)`;

/**
 * Two-step RSVP. Step 1 asks only for the response — accept or decline —
 * like the reply card of a printed invitation. Step 2 reveals a form sized
 * to that answer, rendered entirely from the couple's configuration:
 * visibility, requiredness, labels, placeholders, help text, meal options,
 * and guest limits all come from the dashboard.
 */
export function RsvpForm({ coupleNames, config }: RsvpFormProps) {
  const [state, formAction, isPending] = useActionState(submitRsvp, initialState);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const detailsRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const fields = config.fields;
  const mealVisible =
    fields.mealPreference.visible && config.mealOptions.length > 0;

  // Restore the guest's chosen count after a validation round-trip (the
  // select is controlled so the plus-one visibility can react to it).
  useEffect(() => {
    if (state.status === "error" && state.values.guestCount) {
      setGuestCount(state.values.guestCount);
    }
  }, [state]);

  // Bring the newly revealed step into view.
  useEffect(() => {
    if (!attendance || !detailsRef.current) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    detailsRef.current.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [attendance]);

  if (state.status === "success") {
    return <SuccessPanel attendance={state.attendance} firstName={state.firstName} />;
  }

  if (state.status === "duplicate") {
    const declining = attendance === "declining";
    return (
      <div className="flex flex-col items-center gap-4 border border-gold/40 px-8 py-14 text-center">
        <p className="font-serif text-2xl font-light">
          {declining
            ? "We've Already Received Your Response"
            : "You're already on our list"}
        </p>
        {declining ? (
          <div className="flex max-w-sm flex-col gap-3 text-sm leading-relaxed text-ivory/70">
            <p>
              Thank you for letting us know. We&apos;ve already received an RSVP
              associated with this email address.
            </p>
            <p>
              {`If your plans have changed or you'd like to update your response, please reach out to ${coupleNames} and we'll be happy to assist you.`}
            </p>
          </div>
        ) : (
          <p className="max-w-sm text-sm leading-relaxed text-ivory/70">
            We&apos;ve received an RSVP with this email address before. If anything
            has changed, please reach out to us directly and we&apos;ll take care
            of it.
          </p>
        )}
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // React resets uncontrolled fields after every action; these defaults
  // restore what the guest typed when validation sends them back.
  const values: RsvpFieldValues = state.status === "error" ? state.values : {};
  const attending = attendance === "attending";

  const guests = Number.parseInt(guestCount, 10) || 1;
  const plusOneShown =
    fields.plusOneName.visible &&
    (!config.plusOneConditional || guests > 1);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-10">
      {/* Attendance travels via this controlled input: the visual cards
          below are display-only and immune to the post-action form reset. */}
      <input type="hidden" name="attendance" value={attendance ?? ""} />

      {/* Step 1 — the reply card */}
      <fieldset>
        <legend className="sr-only">Will you be celebrating with us?</legend>
        <div
          className={`grid grid-cols-1 gap-4 ${
            config.allowDecline ? "sm:grid-cols-2" : "mx-auto w-full max-w-sm"
          }`}
        >
          <AttendanceCard
            glyph="✓"
            label="Joyfully Accepts"
            checked={attendance === "attending"}
            onChange={() => setAttendance("attending")}
          />
          {config.allowDecline && (
            <AttendanceCard
              glyph="✕"
              label="Regretfully Declines"
              checked={attendance === "declining"}
              onChange={() => setAttendance("declining")}
            />
          )}
        </div>
        <FieldError message={errors.attendance} />
      </fieldset>

      {/* Step 2 — revealed once the guest has answered. Keyed by response
          so switching replays the entrance. */}
      {attendance !== null && (
        <div
          key={attendance}
          ref={detailsRef}
          className="fade-slide-in flex flex-col gap-8"
        >
          <p className="text-center font-serif text-lg font-light italic text-ivory/70">
            {attending
              ? "Wonderful — just a few details so we can set your place."
              : "We're sorry you can't make it — leave us a line before you go."}
          </p>

          {/* Identity */}
          <div className="grid gap-6 sm:grid-cols-2">
            <ConfiguredInput
              cfg={fields.firstName}
              name="firstName"
              id={`${formId}-first`}
              autoComplete="given-name"
              defaultValue={values.firstName}
              error={errors.firstName}
            />
            <ConfiguredInput
              cfg={fields.lastName}
              name="lastName"
              id={`${formId}-last`}
              autoComplete="family-name"
              defaultValue={values.lastName}
              error={errors.lastName}
            />
            <ConfiguredInput
              cfg={fields.email}
              name="email"
              id={`${formId}-email`}
              type="email"
              autoComplete="email"
              defaultValue={values.email}
              error={errors.email}
              className={
                attending && fields.phone.visible ? "" : "sm:col-span-2"
              }
            />
            {attending && fields.phone.visible && (
              <ConfiguredInput
                cfg={fields.phone}
                name="phone"
                id={`${formId}-phone`}
                type="tel"
                autoComplete="tel"
                defaultValue={values.phone}
                error={errors.phone}
              />
            )}
          </div>

          {/* Celebration details — acceptances only */}
          {attending && (
            <div className="grid gap-6 sm:grid-cols-2">
              {fields.guestCount.visible && (
                <Field
                  label={fieldLabel(fields.guestCount)}
                  help={fields.guestCount.helpText}
                  error={errors.guestCount}
                  id={`${formId}-guests`}
                >
                  <select
                    id={`${formId}-guests`}
                    name="guestCount"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {Array.from({ length: config.maxGuests }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n} className="text-charcoal">
                          {n} {n === 1 ? "guest" : "guests"}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              )}
              {plusOneShown && (
                <ConfiguredInput
                  cfg={fields.plusOneName}
                  name="plusOneName"
                  id={`${formId}-plusone`}
                  defaultValue={values.plusOneName}
                  error={errors.plusOneName}
                />
              )}
              {mealVisible && (
                <Field
                  label={fieldLabel(fields.mealPreference)}
                  help={fields.mealPreference.helpText}
                  error={errors.mealPreference}
                  id={`${formId}-meal`}
                >
                  <select
                    id={`${formId}-meal`}
                    name="mealPreference"
                    defaultValue={values.mealPreference || ""}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="" disabled className="text-charcoal">
                      {fields.mealPreference.placeholder || "Choose a meal"}
                    </option>
                    {config.mealOptions.map((meal) => (
                      <option
                        key={meal.id}
                        value={meal.label}
                        className="text-charcoal"
                      >
                        {meal.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {fields.dietaryRestrictions.visible && (
                <ConfiguredInput
                  cfg={fields.dietaryRestrictions}
                  name="dietaryRestrictions"
                  id={`${formId}-diet`}
                  defaultValue={values.dietaryRestrictions}
                  error={errors.dietaryRestrictions}
                />
              )}
              {fields.songRequest.visible && (
                <ConfiguredInput
                  cfg={fields.songRequest}
                  name="songRequest"
                  id={`${formId}-song`}
                  defaultValue={values.songRequest}
                  error={errors.songRequest}
                  className="sm:col-span-2"
                />
              )}
            </div>
          )}

          {fields.message.visible && (
            <Field
              label={
                attending
                  ? fieldLabel(fields.message)
                  : "A Message for the Couple (optional)"
              }
              help={attending ? fields.message.helpText : null}
              error={errors.message}
              id={`${formId}-message`}
            >
              <textarea
                id={`${formId}-message`}
                name="message"
                rows={3}
                placeholder={
                  attending
                    ? (fields.message.placeholder ?? undefined)
                    : `We'll be celebrating from afar. Leave a message for ${coupleNames}.`
                }
                defaultValue={values.message}
                className={`${inputClass} resize-none`}
              />
            </Field>
          )}

          {state.status === "error" && (
            <p role="alert" className="text-center text-sm text-[#c98d7f]">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="eyebrow mx-auto mt-2 cursor-pointer border border-gold bg-gold px-12 py-4 text-ink transition-colors duration-300 hover:bg-transparent hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Sending…" : attending ? "Submit RSVP" : "Send Response"}
          </button>
        </div>
      )}
    </form>
  );
}

/* ---------------------------------------------------------- subcomponents */

function AttendanceCard({
  glyph,
  label,
  checked,
  onChange,
}: {
  glyph: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center gap-3 border px-6 py-8 text-center transition-colors duration-300 ${
        checked
          ? "border-gold bg-gold/10 text-gold"
          : "border-ivory/25 text-ivory/70 hover:border-ivory/50"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`flex h-10 w-10 items-center justify-center rounded-full border text-base transition-colors duration-300 ${
          checked ? "border-gold text-gold" : "border-ivory/30 text-ivory/50"
        }`}
      >
        {glyph}
      </span>
      <span className="font-serif text-xl font-light tracking-wide">{label}</span>
    </label>
  );
}

/** A configured text input: label, placeholder, and help text from config. */
function ConfiguredInput({
  cfg,
  name,
  id,
  error,
  className = "",
  ...rest
}: {
  cfg: RsvpFieldConfig;
  name: string;
  id: string;
  error?: string;
  className?: string;
} & React.ComponentProps<"input">) {
  return (
    <Field label={fieldLabel(cfg)} help={cfg.helpText} error={error} id={id} className={className}>
      <input
        id={id}
        name={name}
        placeholder={cfg.placeholder ?? undefined}
        className={inputClass}
        {...rest}
      />
    </Field>
  );
}

function Field({
  label,
  id,
  help,
  error,
  className = "",
  children,
}: {
  label: string;
  id: string;
  help?: string | null;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {help && <p className="mt-1 text-xs leading-relaxed text-ivory/45">{help}</p>}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-[#c98d7f]">{message}</p>;
}

function SuccessPanel({
  attendance,
  firstName,
}: {
  attendance: Attendance;
  firstName: string;
}) {
  const attending = attendance === "attending";
  return (
    <div className="flex flex-col items-center gap-6 border border-gold/40 px-8 py-16 text-center">
      {/* Gold ring with a drawn check */}
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          strokeDasharray="189"
          strokeDashoffset="189"
          style={{ animation: "rsvp-draw 1s ease-out forwards" }}
        />
        <path
          d="M20 33 L29 42 L45 24"
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="40"
          strokeDashoffset="40"
          style={{ animation: "rsvp-draw 0.6s ease-out 0.7s forwards" }}
        />
      </svg>
      <style>{`@keyframes rsvp-draw { to { stroke-dashoffset: 0; } }`}</style>

      <p className="font-serif text-3xl font-light">
        Thank you, {firstName}
      </p>
      <p className="max-w-sm text-sm leading-relaxed text-ivory/70">
        {attending
          ? "Your response is in — we can hardly wait to celebrate with you. See you on the dance floor."
          : "We'll miss you dearly, and we're so grateful you let us know. You'll be in our hearts on the day."}
      </p>
    </div>
  );
}
