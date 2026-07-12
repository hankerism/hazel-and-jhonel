"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Switch } from "@/components/dashboard/ui";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import type { Wedding } from "@/types/wedding";
import { updateMusicSettings } from "./actions";

export function SettingsForm({ wedding }: { wedding: Wedding }) {
  const [musicUrl, setMusicUrl] = useState(wedding.musicUrl);
  const [autoplay, setAutoplay] = useState(wedding.musicAutoplay);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  const dirty =
    musicUrl !== wedding.musicUrl || autoplay !== wedding.musicAutoplay;

  const save = async () => {
    setPending(true);
    setStatus("saving");
    const result = await updateMusicSettings(wedding.id, {
      musicUrl,
      musicAutoplay: autoplay,
    });
    if (result.ok) {
      setStatus("saved");
      toast("Music settings saved");
    } else {
      setStatus("error");
      toast(result.error, "error");
    }
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 p-6">
        <div>
          <p className="font-serif text-xl font-light">Background Music</p>
          <p className="mt-1 text-sm text-stone">
            The song that plays on the wedding website.
          </p>
        </div>

        <Field label="Music URL">
          <Input
            value={musicUrl}
            onChange={(e) => setMusicUrl(e.target.value)}
            placeholder="/audio/bgm.mp3 or https://…"
          />
        </Field>

        <Switch
          checked={autoplay}
          onChange={setAutoplay}
          label="Start music automatically"
          hint="When off, guests start the music themselves from the corner player."
        />

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <p className="font-serif text-xl font-light">Account</p>
          <p className="mt-1 text-sm text-stone">
            Signing in and keeping the dashboard yours.
          </p>
        </div>
        <a
          href="/dashboard/settings/password"
          className="eyebrow w-fit rounded-full border border-line bg-white/50 px-5 py-2.5 text-[0.625rem] transition-colors hover:border-charcoal/40"
        >
          Change Password
        </a>
      </Card>

      <Card className="p-6">
        <p className="font-serif text-xl font-light">Coming Soon</p>
        <p className="mt-1 text-sm leading-relaxed text-stone">
          Theme colors, fonts, and hero image management will live here. The
          hero image can already be changed under Wedding Details.
        </p>
      </Card>
    </div>
  );
}
