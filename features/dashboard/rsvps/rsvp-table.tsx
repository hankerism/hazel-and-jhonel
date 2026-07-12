"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, EmptyState, Input, Select } from "@/components/dashboard/ui";
import { Drawer } from "@/components/dashboard/drawer";
import { useToast } from "@/components/dashboard/toast";
import {
  RSVP_STATUSES,
  type RsvpRecord,
  type RsvpStatus,
} from "@/types/wedding";
import { resendConfirmationEmail, updateRsvpStatus } from "./actions";

type AttendanceFilter = "all" | "attending" | "declining";
type StatusFilter = "all" | RsvpStatus;

const STATUS_STYLES: Record<RsvpStatus, string> = {
  pending: "border-gold/50 bg-gold/10 text-gold-deep",
  confirmed: "border-[#9db894] bg-[#eef3ec] text-[#4c6a44]",
  contacted: "border-line bg-white/70 text-stone",
};

export function RsvpTable({ initial }: { initial: RsvpRecord[] }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [attendance, setAttendance] = useState<AttendanceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // "/" focuses search — the one keyboard shortcut worth having here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (attendance !== "all" && row.attendance !== attendance) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return `${row.firstName} ${row.lastName} ${row.email}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, attendance, status]);

  const active = rows.find((r) => r.id === activeId) ?? null;

  const changeStatus = async (row: RsvpRecord, next: RsvpStatus) => {
    const prev = rows;
    setRows(rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const result = await updateRsvpStatus(row.id, next);
    if (!result.ok) {
      setRows(prev);
      toast(result.error, "error");
      return;
    }

    const { email } = result;
    if (email.attempted && email.sent) {
      setRows((current) =>
        current.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: next,
                confirmationEmailStatus: "sent",
                confirmationEmailSentAt: email.sentAt,
                confirmationEmailMessageId: email.messageId,
                confirmationEmailError: null,
              }
            : r,
        ),
      );
      toast("Marked as confirmed — confirmation email sent");
    } else if (email.attempted && !email.sent) {
      setRows((current) =>
        current.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: next,
                confirmationEmailStatus: "failed",
                confirmationEmailError: email.error,
              }
            : r,
        ),
      );
      toast(`Status saved, but the email failed — you can resend later`, "error");
    } else if (email.reason === "already-sent") {
      toast("Marked as confirmed — confirmation was already emailed");
    } else if (email.reason === "not-configured") {
      toast("Marked as confirmed — set up email in Settings to notify guests");
    } else {
      toast(`Marked as ${next}`);
    }
  };

  const resend = async (row: RsvpRecord) => {
    setResending(true);
    const result = await resendConfirmationEmail(row.id);
    if (result.ok && result.email.attempted && result.email.sent) {
      const { sentAt, messageId } = result.email;
      setRows((current) =>
        current.map((r) =>
          r.id === row.id
            ? {
                ...r,
                confirmationEmailStatus: "sent",
                confirmationEmailSentAt: sentAt,
                confirmationEmailMessageId: messageId,
                confirmationEmailError: null,
              }
            : r,
        ),
      );
      toast("Confirmation email sent");
    } else {
      const error =
        result.ok && result.email.attempted && !result.email.sent
          ? result.email.error
          : !result.ok
            ? result.error
            : "Sending failed.";
      setRows((current) =>
        current.map((r) =>
          r.id === row.id
            ? { ...r, confirmationEmailStatus: "failed", confirmationEmailError: error }
            : r,
        ),
      );
      toast(error, "error");
    }
    setResending(false);
  };

  const exportCsv = () => {
    const header = [
      "First Name","Last Name","Email","Phone","Attendance","Guest Count",
      "Plus One","Meal","Dietary Notes","Song Request","Message","Status","Submitted",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const lines = filtered.map((r) =>
      [
        r.firstName, r.lastName, r.email, r.phone, r.attendance, r.guestCount,
        r.plusOneName, r.mealPreference, r.dietaryRestrictions, r.songRequest,
        r.message, r.status, new Date(r.createdAt).toISOString(),
      ].map(escape).join(","),
    );
    const blob = new Blob([[header.map(escape).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} responses`);
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No responses yet"
        hint="RSVPs land here the moment guests submit them on the website. If responses exist but this list is empty, run migration 00002 so the dashboard may read them."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…  ( / )"
          className="max-w-xs"
          aria-label="Search responses"
        />
        <Select
          value={attendance}
          onChange={(e) => setAttendance(e.target.value as AttendanceFilter)}
          aria-label="Filter by attendance"
          className="w-auto"
        >
          <option value="all">All responses</option>
          <option value="attending">Accepted</option>
          <option value="declining">Declined</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
          className="w-auto"
        >
          <option value="all">Any status</option>
          {RSVP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-xs text-stone">
          {filtered.length} of {rows.length}
        </span>
        <Button variant="ghost" size="sm" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-172 text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Guest", "Attendance", "Guests", "Meal", "Status", "Submitted"].map(
                (h) => (
                  <th
                    key={h}
                    className="eyebrow px-5 py-3.5 text-[0.5625rem] font-medium text-stone"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                onClick={() => setActiveId(row.id)}
                className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-white/60"
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium">
                    {row.firstName} {row.lastName}
                  </p>
                  <p className="text-xs text-stone">{row.email}</p>
                </td>
                <td className="px-5 py-3.5">
                  {row.attendance === "attending" ? (
                    <span className="text-[#4c6a44]">✓ Accepted</span>
                  ) : (
                    <span className="text-stone">✕ Declined</span>
                  )}
                </td>
                <td className="px-5 py-3.5 tabular-nums">{row.guestCount || "—"}</td>
                <td className="px-5 py-3.5">{row.mealPreference ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs capitalize ${STATUS_STYLES[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs whitespace-nowrap text-stone">
                  {new Date(row.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-stone">
                  Nothing matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Detail drawer */}
      <Drawer
        open={active !== null}
        onClose={() => setActiveId(null)}
        title={active ? `${active.firstName} ${active.lastName}` : ""}
      >
        {active && (
          <div className="flex flex-col gap-5">
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                active.attendance === "attending"
                  ? "border-[#9db894] bg-[#eef3ec] text-[#4c6a44]"
                  : "border-line bg-white/60 text-stone"
              }`}
            >
              {active.attendance === "attending"
                ? `Joyfully accepts · ${active.guestCount} ${active.guestCount === 1 ? "guest" : "guests"}`
                : "Regretfully declines"}
            </div>

            <dl className="flex flex-col gap-4">
              {(
                [
                  ["Email", active.email],
                  ["Phone", active.phone],
                  ["Plus one", active.plusOneName],
                  ["Meal", active.mealPreference],
                  ["Dietary notes", active.dietaryRestrictions],
                  ["Song request", active.songRequest],
                  ["Message", active.message],
                  [
                    "Submitted",
                    new Date(active.createdAt).toLocaleString("en-US", {
                      dateStyle: "long",
                      timeStyle: "short",
                    }),
                  ],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt className="eyebrow text-[0.5625rem] text-stone">{label}</dt>
                    <dd className="mt-1 text-sm leading-relaxed whitespace-pre-line">
                      {value}
                    </dd>
                  </div>
                ) : null,
              )}
            </dl>

            <div className="border-t border-line pt-5">
              <p className="eyebrow mb-2 text-[0.5625rem] text-stone">Status</p>
              <div className="flex gap-2">
                {RSVP_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(active, s)}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors ${
                      active.status === s
                        ? STATUS_STYLES[s]
                        : "border-line text-stone hover:border-charcoal/40 hover:text-charcoal"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmation email log */}
            <div className="border-t border-line pt-5">
              <p className="eyebrow mb-3 text-[0.5625rem] text-stone">
                Confirmation Email
              </p>
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-stone">Status</dt>
                  <dd>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${
                        active.confirmationEmailStatus === "sent"
                          ? "border-[#9db894] bg-[#eef3ec] text-[#4c6a44]"
                          : active.confirmationEmailStatus === "failed"
                            ? "border-[#c4a09a] bg-[#f7ece9] text-[#8c4a3e]"
                            : "border-line bg-white/70 text-stone"
                      }`}
                    >
                      {active.confirmationEmailStatus === "sent"
                        ? "Sent"
                        : active.confirmationEmailStatus === "failed"
                          ? "Failed"
                          : "Not Sent"}
                    </span>
                  </dd>
                </div>
                {active.confirmationEmailSentAt && (
                  <div className="flex items-center justify-between">
                    <dt className="text-stone">Sent at</dt>
                    <dd className="text-xs">
                      {new Date(active.confirmationEmailSentAt).toLocaleString(
                        "en-US",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </dd>
                  </div>
                )}
                {active.confirmationEmailMessageId && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="shrink-0 text-stone">Message ID</dt>
                    <dd className="truncate font-mono text-[0.6875rem] text-stone">
                      {active.confirmationEmailMessageId}
                    </dd>
                  </div>
                )}
              </dl>

              {active.confirmationEmailError && (
                <details className="mt-3 rounded-xl border border-[#c4a09a] bg-[#f7ece9]/60 px-4 py-2.5">
                  <summary className="cursor-pointer text-xs font-medium text-[#8c4a3e]">
                    Last error
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed break-words text-[#8c4a3e]">
                    {active.confirmationEmailError}
                  </p>
                </details>
              )}

              {active.status === "confirmed" &&
                active.attendance === "attending" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4"
                    disabled={resending}
                    onClick={() => resend(active)}
                  >
                    {resending
                      ? "Sending…"
                      : active.confirmationEmailStatus === "sent"
                        ? "Resend Confirmation Email"
                        : "Send Confirmation Email"}
                  </Button>
                )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
