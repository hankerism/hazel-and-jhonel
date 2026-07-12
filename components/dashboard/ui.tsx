import type { ComponentProps, ReactNode } from "react";

/* Shared dashboard primitives — glass ivory, thin borders, soft radii. */

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white/60 shadow-[0_4px_24px_rgba(26,24,21,0.04)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-light tracking-wide">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-stone">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const buttonBase =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-[0.8125rem] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "sm";
}) {
  const variants = {
    primary: "bg-charcoal text-ivory hover:bg-gold-deep",
    ghost: "border border-line bg-white/50 text-charcoal hover:border-charcoal/40",
    danger: "border border-[#c4a09a] bg-white/50 text-[#8c4a3e] hover:bg-[#f7ece9]",
  };
  const sizes = { md: "px-5 py-2.5", sm: "px-3.5 py-1.5 text-xs" };
  return (
    <button
      type="button"
      className={`${buttonBase} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}

const fieldClass =
  "w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-gold disabled:opacity-50";

export function Field({
  label,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={`flex flex-col gap-1.5 ${className}`}>
      <span className="eyebrow text-[0.5625rem] text-stone">{label}</span>
      {children}
    </label>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${fieldClass} resize-none ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: ComponentProps<"select">) {
  return (
    <select className={`${fieldClass} cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  );
}

/** Labeled toggle. Interactive — use within client components. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-fit cursor-pointer items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300 ${
          checked ? "border-gold-deep bg-gold" : "border-line bg-white/70"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[1.15rem] w-[1.15rem] rounded-full bg-ivory shadow transition-all duration-300 ${
            checked ? "left-[1.35rem]" : "left-0.5"
          }`}
        />
      </span>
      <span className="text-sm">
        {label}
        {hint && <span className="block text-xs text-stone">{hint}</span>}
      </span>
    </button>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <p className="font-serif text-xl font-light">{title}</p>
      {hint && <p className="max-w-md text-sm text-stone">{hint}</p>}
      {action}
    </Card>
  );
}
