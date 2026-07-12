"use client";

import { useState } from "react";
import { Button, Card } from "@/components/dashboard/ui";
import { useToast } from "@/components/dashboard/toast";
import { sendTestEmail, type TestEmailResult } from "./actions";

interface EmailCardProps {
  configured: boolean;
  /** Sender identity (not a secret) — shown so the couple knows the "from". */
  fromEmail: string | null;
  userEmail: string;
}

export function EmailCard({ configured, fromEmail, userEmail }: EmailCardProps) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TestEmailResult | null>(null);
  const toast = useToast();

  const send = async () => {
    setPending(true);
    setResult(null);
    const r = await sendTestEmail();
    setResult(r);
    if (r.ok) toast(`Test email sent to ${r.to}`);
    else toast("Test email failed", "error");
    setPending(false);
  };

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <p className="font-serif text-xl font-light">Email</p>
        <p className="mt-1 text-sm text-stone">
          Guests receive a confirmation email when you confirm their RSVP.
        </p>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-[#7a9471]" : "bg-gold"}`}
        />
        {configured ? (
          <span>
            Sending as <span className="font-medium">{fromEmail}</span>
          </span>
        ) : (
          <span className="text-stone">
            Not configured — set the <code className="text-xs">SMTP_*</code>{" "}
            variables in the environment (see <code className="text-xs">.env.example</code>).
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={send} disabled={pending || !configured}>
          {pending ? "Sending…" : "Send Test Email"}
        </Button>
        <span className="text-xs text-stone">
          Sends the real confirmation template to {userEmail}.
        </span>
      </div>

      {result && result.ok && (
        <div className="rounded-xl border border-[#9db894] bg-[#eef3ec] px-4 py-3 text-sm text-[#4c6a44]">
          Delivered to {result.to}
          <span className="mt-1 block font-mono text-[0.6875rem] break-all">
            {result.messageId}
          </span>
        </div>
      )}
      {result && !result.ok && (
        <details
          open
          className="rounded-xl border border-[#c4a09a] bg-[#f7ece9]/60 px-4 py-3"
        >
          <summary className="cursor-pointer text-sm font-medium text-[#8c4a3e]">
            Sending failed
          </summary>
          <p className="mt-2 text-xs leading-relaxed break-words text-[#8c4a3e]">
            {result.error}
          </p>
        </details>
      )}
    </Card>
  );
}
