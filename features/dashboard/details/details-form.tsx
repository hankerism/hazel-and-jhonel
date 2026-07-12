"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/dashboard/ui";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import type { Wedding } from "@/types/wedding";
import { updateWeddingDetails, type WeddingDetailsInput } from "./actions";

const toInput = (wedding: Wedding): WeddingDetailsInput => ({
  brideName: wedding.brideName,
  groomName: wedding.groomName,
  weddingDate: wedding.weddingDate,
  ceremonyTime: wedding.ceremonyTime,
  ceremonyVenue: wedding.ceremonyVenue,
  ceremonyAddress: wedding.ceremonyAddress.join("\n"),
  receptionTime: wedding.receptionTime,
  receptionVenue: wedding.receptionVenue,
  receptionAddress: wedding.receptionAddress.join("\n"),
  rsvpDeadline: wedding.rsvpDeadline,
  dressCode: wedding.dressCode,
  weddingColors: wedding.weddingColors.join(", "),
  parkingNote: wedding.parkingNote,
  welcomeMessage: wedding.welcomeMessage,
  heroImage: wedding.heroImage,
});

export function DetailsForm({ wedding }: { wedding: Wedding }) {
  const [saved, setSaved] = useState(() => toInput(wedding));
  const [input, setInput] = useState(saved);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  const dirty = useMemo(
    () => JSON.stringify(input) !== JSON.stringify(saved),
    [input, saved],
  );

  // Unsaved-changes guard + topbar indicator.
  useEffect(() => {
    setStatus(dirty ? "dirty" : "idle");
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, setStatus]);

  const set =
    (key: keyof WeddingDetailsInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setInput((current) => ({ ...current, [key]: e.target.value }));

  const save = async () => {
    setPending(true);
    setStatus("saving");
    const result = await updateWeddingDetails(wedding.id, input);
    if (result.ok) {
      setSaved(input);
      setStatus("saved");
      toast("Wedding details saved");
    } else {
      setStatus("error");
      toast(result.error, "error");
    }
    setPending(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && !pending) void save();
      }}
      className="flex flex-col gap-6"
    >
      <Card className="grid gap-5 p-6 sm:grid-cols-2">
        <Field label="Bride">
          <Input value={input.brideName} onChange={set("brideName")} />
        </Field>
        <Field label="Groom">
          <Input value={input.groomName} onChange={set("groomName")} />
        </Field>
        <Field label="Wedding date">
          <Input type="date" value={input.weddingDate} onChange={set("weddingDate")} />
        </Field>
        <Field label="RSVP deadline">
          <Input type="date" value={input.rsvpDeadline} onChange={set("rsvpDeadline")} />
        </Field>
      </Card>

      <Card className="grid gap-5 p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-5">
          <p className="eyebrow text-[0.5625rem] text-gold-deep">Ceremony</p>
          <Field label="Time">
            <Input
              type="time"
              value={input.ceremonyTime}
              onChange={set("ceremonyTime")}
            />
          </Field>
          <Field label="Venue">
            <Input value={input.ceremonyVenue} onChange={set("ceremonyVenue")} />
          </Field>
          <Field label="Address (one line per row)">
            <Textarea
              rows={3}
              value={input.ceremonyAddress}
              onChange={set("ceremonyAddress")}
            />
          </Field>
        </div>
        <div className="flex flex-col gap-5">
          <p className="eyebrow text-[0.5625rem] text-gold-deep">Reception</p>
          <Field label="Time">
            <Input
              type="time"
              value={input.receptionTime}
              onChange={set("receptionTime")}
            />
          </Field>
          <Field label="Venue">
            <Input value={input.receptionVenue} onChange={set("receptionVenue")} />
          </Field>
          <Field label="Address (one line per row)">
            <Textarea
              rows={3}
              value={input.receptionAddress}
              onChange={set("receptionAddress")}
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-5 p-6 sm:grid-cols-2">
        <Field label="Dress code">
          <Input value={input.dressCode} onChange={set("dressCode")} />
        </Field>
        <Field label="Color palette (comma separated)">
          <Input
            value={input.weddingColors}
            onChange={set("weddingColors")}
            placeholder="Black, Gold"
          />
        </Field>
        <Field label="Welcome message" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={input.welcomeMessage}
            onChange={set("welcomeMessage")}
          />
        </Field>
        <Field label="Parking note" className="sm:col-span-2">
          <Textarea rows={2} value={input.parkingNote} onChange={set("parkingNote")} />
        </Field>
        <Field label="Hero image URL" className="sm:col-span-2">
          <Input value={input.heroImage} onChange={set("heroImage")} />
        </Field>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={!dirty || pending} className="shadow-lg">
          {pending ? "Saving…" : dirty ? "Save Changes" : "Saved"}
        </Button>
      </div>
    </form>
  );
}
