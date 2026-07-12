"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input } from "@/components/dashboard/ui";
import {
  changePassword,
  type ChangePasswordState,
} from "@/features/auth/actions";

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState<
    ChangePasswordState,
    FormData
  >(changePassword, { status: "idle" });

  if (state.status === "done") {
    return (
      <Card className="flex flex-col items-center gap-3 px-8 py-12 text-center">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 font-serif text-lg text-gold-deep"
        >
          ✓
        </span>
        <p className="font-serif text-xl font-light">Password updated</p>
        <p className="max-w-sm text-sm text-stone">
          Use the new password the next time you sign in.
        </p>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <Card className="flex max-w-md flex-col gap-5 p-6">
        <Field label="New password" htmlFor="new-password">
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm-password">
          <Input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        <p className="text-xs text-stone">At least 8 characters.</p>

        {state.status === "error" && (
          <p role="alert" className="text-sm text-[#a04c40]">
            {state.error}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
