import Link from "next/link";
import { Card, PageHeader } from "@/components/dashboard/ui";
import { Countdown } from "@/components/countdown";
import { Reveal } from "@/components/ui/reveal";
import { formatLongDate, toInstantIso } from "@/lib/datetime";
import { listRsvps } from "@/services/rsvp-admin-service";
import { getWeddingContent } from "@/services/wedding-service";

export default async function OverviewPage() {
  const { wedding } = await getWeddingContent();
  const rsvps = await listRsvps(wedding.id);

  const accepted = rsvps.filter((r) => r.attendance === "attending");
  const declined = rsvps.filter((r) => r.attendance === "declining");
  const pending = rsvps.filter((r) => r.status === "pending");
  const guestsComing = accepted.reduce((sum, r) => sum + r.guestCount, 0);
  const acceptanceRate =
    rsvps.length > 0 ? Math.round((accepted.length / rsvps.length) * 100) : null;

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: "Total Responses", value: String(rsvps.length) },
    { label: "Accepted", value: String(accepted.length) },
    { label: "Declined", value: String(declined.length) },
    {
      label: "Acceptance",
      value: acceptanceRate === null ? "—" : `${acceptanceRate}%`,
    },
    { label: "Guests Coming", value: String(guestsComing), hint: "seats to set" },
    { label: "Pending Review", value: String(pending.length), hint: "status: pending" },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description={`${formatLongDate(wedding.weddingDate)} · ${wedding.ceremonyVenue}`}
      />

      {/* Countdown */}
      <Reveal>
        <Card className="mb-6 flex flex-col items-center gap-4 px-6 py-8">
          <p className="eyebrow text-[0.5625rem] text-gold-deep">Until the wedding</p>
          <Countdown
            target={toInstantIso(
              wedding.weddingDate,
              wedding.ceremonyTime,
              wedding.timezone,
            )}
          />
        </Card>
      </Reveal>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={i * 60}>
            <Card className="flex h-full flex-col gap-1 px-5 py-5">
              <p className="eyebrow text-[0.5625rem] text-stone">{stat.label}</p>
              <p className="font-serif text-4xl font-light tabular-nums">
                {stat.value}
              </p>
              {stat.hint && <p className="text-xs text-stone">{stat.hint}</p>}
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Recent responses */}
      <Reveal delay={200} className="mt-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-serif text-xl font-light">Recent Responses</p>
            <Link
              href="/dashboard/rsvps"
              className="eyebrow text-[0.5625rem] text-gold-deep underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </div>
          {rsvps.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone">
              No responses yet — they'll appear here the moment guests RSVP.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {rsvps.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      r.attendance === "attending" ? "bg-[#7a9471]" : "bg-stone/50"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {r.firstName} {r.lastName}
                    <span className="ml-2 text-xs text-stone">
                      {r.attendance === "attending"
                        ? `accepts · ${r.guestCount} ${r.guestCount === 1 ? "guest" : "guests"}`
                        : "declines"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-stone">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
    </>
  );
}
