"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Switch,
} from "@/components/dashboard/ui";
import { ReorderHandle, SortableList } from "@/components/dashboard/sortable-list";
import { useConfirm } from "@/components/dashboard/confirm";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import {
  LOCKED_RSVP_FIELDS,
  RSVP_FIELD_KEYS,
  type MealOption,
  type RsvpFieldConfig,
  type RsvpFieldKey,
  type RsvpFormConfig,
} from "@/types/wedding";
import { RSVP_FIELD_TITLES } from "@/content/rsvp-form-defaults";
import {
  addMealOption,
  deleteMealOption,
  reorderMealOptions,
  saveFieldConfig,
  saveRsvpFormSettings,
  updateMealOption,
  type FieldConfigInput,
} from "./actions";

interface RsvpFormManagerProps {
  weddingId: string;
  config: RsvpFormConfig;
  rsvpDeadline: string;
}

export function RsvpFormManager({
  weddingId,
  config,
  rsvpDeadline,
}: RsvpFormManagerProps) {
  return (
    <div className="flex flex-col gap-10">
      <SettingsCard
        weddingId={weddingId}
        config={config}
        rsvpDeadline={rsvpDeadline}
      />

      <section aria-labelledby="fields-heading" className="flex flex-col gap-4">
        <div>
          <h2 id="fields-heading" className="font-serif text-2xl font-light">
            Fields
          </h2>
          <p className="mt-1 text-sm text-stone">
            Show, hide, require, and re-word each question guests see.
          </p>
        </div>
        {RSVP_FIELD_KEYS.map((key) => (
          <FieldCard
            key={key}
            weddingId={weddingId}
            fieldKey={key}
            initial={config.fields[key]}
          />
        ))}
      </section>

      <MealOptionsCard weddingId={weddingId} initial={config.mealOptions} />
    </div>
  );
}

/* ---------------------------------------------------------- form settings */

function SettingsCard({
  weddingId,
  config,
  rsvpDeadline,
}: {
  weddingId: string;
  config: RsvpFormConfig;
  rsvpDeadline: string;
}) {
  const [saved, setSaved] = useState({
    maxGuests: config.maxGuests,
    rsvpDeadline,
    allowDecline: config.allowDecline,
    plusOneConditional: config.plusOneConditional,
  });
  const [input, setInput] = useState(saved);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  const dirty = JSON.stringify(input) !== JSON.stringify(saved);

  const save = async () => {
    setPending(true);
    setStatus("saving");
    const result = await saveRsvpFormSettings(weddingId, input);
    if (result.ok) {
      setSaved(input);
      setStatus("saved");
      toast("Form settings saved");
    } else {
      setStatus("error");
      toast(result.error, "error");
    }
    setPending(false);
  };

  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="font-serif text-2xl font-light">Form Settings</h2>
        <p className="mt-1 text-sm text-stone">
          The rules of the reply card.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Maximum guests per RSVP" htmlFor="max-guests">
          <Input
            id="max-guests"
            type="number"
            min={1}
            max={20}
            value={input.maxGuests}
            onChange={(e) =>
              setInput({ ...input, maxGuests: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="RSVP deadline" htmlFor="rsvp-deadline">
          <Input
            id="rsvp-deadline"
            type="date"
            value={input.rsvpDeadline}
            onChange={(e) => setInput({ ...input, rsvpDeadline: e.target.value })}
          />
        </Field>
      </div>

      <Switch
        checked={input.allowDecline}
        onChange={(v) => setInput({ ...input, allowDecline: v })}
        label="Allow guests to decline"
        hint="When off, the form shows only “Joyfully Accepts”."
      />
      <Switch
        checked={input.plusOneConditional}
        onChange={(v) => setInput({ ...input, plusOneConditional: v })}
        label="Plus-one only for parties of two or more"
        hint="Hides the plus-one field until the guest count is above one."
      />

      <div className="flex justify-end">
        <Button onClick={save} disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ field cards */

function FieldCard({
  weddingId,
  fieldKey,
  initial,
}: {
  weddingId: string;
  fieldKey: RsvpFieldKey;
  initial: RsvpFieldConfig;
}) {
  const locked = LOCKED_RSVP_FIELDS.includes(fieldKey);
  const toInput = (cfg: RsvpFieldConfig): FieldConfigInput => ({
    visible: cfg.visible,
    required: cfg.required,
    label: cfg.label,
    placeholder: cfg.placeholder ?? "",
    helpText: cfg.helpText ?? "",
  });

  const [saved, setSaved] = useState(() => toInput(initial));
  const [input, setInput] = useState(saved);
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  const dirty = useMemo(
    () => JSON.stringify(input) !== JSON.stringify(saved),
    [input, saved],
  );

  const save = async () => {
    setPending(true);
    setStatus("saving");
    const result = await saveFieldConfig(weddingId, fieldKey, input);
    if (result.ok) {
      setSaved(input);
      setStatus("saved");
      toast(`${RSVP_FIELD_TITLES[fieldKey]} saved`);
    } else {
      setStatus("error");
      toast(result.error, "error");
    }
    setPending(false);
  };

  return (
    <Card className={`flex flex-col gap-4 p-5 ${input.visible ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow text-[0.5625rem] text-gold-deep">
          {RSVP_FIELD_TITLES[fieldKey]}
        </p>
        {locked ? (
          <span className="rounded-full border border-line bg-white/60 px-3 py-1 text-[0.6875rem] text-stone">
            Always required — identifies the response
          </span>
        ) : (
          <div className="flex gap-5">
            <Switch
              checked={input.visible}
              onChange={(v) => setInput({ ...input, visible: v })}
              label="Visible"
            />
            <Switch
              checked={input.required}
              onChange={(v) => setInput({ ...input, required: v })}
              label="Required"
              disabled={!input.visible}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Label">
          <Input
            value={input.label}
            onChange={(e) => setInput({ ...input, label: e.target.value })}
          />
        </Field>
        <Field label="Placeholder (optional)">
          <Input
            value={input.placeholder}
            onChange={(e) => setInput({ ...input, placeholder: e.target.value })}
          />
        </Field>
        <Field label="Help text (optional)">
          <Input
            value={input.helpText}
            onChange={(e) => setInput({ ...input, helpText: e.target.value })}
          />
        </Field>
      </div>

      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save Field"}
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ meal options */

function MealOptionsCard({
  weddingId,
  initial,
}: {
  weddingId: string;
  initial: MealOption[];
}) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { setStatus } = useSaveStatus();
  const [, startTransition] = useTransition();

  const applyOrder = (ids: string[]) => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const prev = items;
    setItems(ids.map((id) => byId.get(id)!).filter(Boolean));
    setStatus("saving");
    startTransition(async () => {
      const result = await reorderMealOptions(ids);
      if (result.ok) {
        setStatus("saved");
      } else {
        setItems(prev);
        setStatus("error");
        toast(result.error, "error");
      }
    });
  };

  const moveByIndex = (from: number, to: number) => {
    const ids = items.map((i) => i.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    applyOrder(ids);
  };

  const add = async () => {
    setPending(true);
    setStatus("saving");
    const result = await addMealOption(weddingId, draft, items.length + 1);
    if (result.ok) {
      setStatus("saved");
      toast("Meal option added");
      setItems((current) => [
        ...current,
        { id: result.id!, label: draft.trim(), sortOrder: current.length + 1 },
      ]);
      setDraft("");
    } else {
      setStatus("error");
      toast(result.error, "error");
    }
    setPending(false);
  };

  const remove = async (item: MealOption) => {
    if (
      !(await confirm({
        title: `Delete “${item.label}”?`,
        body: "Guests will no longer be able to choose it. Existing responses keep the meals they already picked.",
      }))
    )
      return;
    const prev = items;
    setItems(items.filter((i) => i.id !== item.id));
    setStatus("saving");
    const result = await deleteMealOption(item.id);
    if (result.ok) {
      setStatus("saved");
      toast("Meal option deleted");
    } else {
      setItems(prev);
      setStatus("error");
      toast(result.error, "error");
    }
  };

  return (
    <section aria-labelledby="meals-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="meals-heading" className="font-serif text-2xl font-light">
          Meal Options
        </h2>
        <p className="mt-1 text-sm text-stone">
          The choices behind the meal preference field. Drag to reorder. With
          no options, the field disappears from the form.
        </p>
      </div>

      <SortableList
        items={items}
        onReorder={applyOrder}
        renderItem={(item, index) => (
          <MealRow
            item={item}
            index={index}
            total={items.length}
            onMove={moveByIndex}
            onDelete={() => remove(item)}
            onSaved={(label) =>
              setItems((current) =>
                current.map((i) => (i.id === item.id ? { ...i, label } : i)),
              )
            }
          />
        )}
      />

      <Card className="flex items-end gap-4 p-5">
        <Field label="New option" className="flex-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Lamb"
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim() && !pending) {
                e.preventDefault();
                void add();
              }
            }}
          />
        </Field>
        <Button onClick={add} disabled={pending || !draft.trim()}>
          {pending ? "Adding…" : "Add Option"}
        </Button>
      </Card>
    </section>
  );
}

function MealRow({
  item,
  index,
  total,
  onMove,
  onDelete,
  onSaved,
}: {
  item: MealOption;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
  onSaved: (label: string) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const dirty = label.trim() !== item.label && label.trim() !== "";
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  return (
    <Card className="flex items-center gap-4 px-5 py-3">
      <ReorderHandle index={index} total={total} onMove={onMove} />
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        aria-label={`Meal option ${item.label}`}
        className="flex-1"
      />
      {dirty ? (
        <Button
          size="sm"
          onClick={async () => {
            setStatus("saving");
            const result = await updateMealOption(item.id, label);
            if (result.ok) {
              setStatus("saved");
              onSaved(label.trim());
              toast("Meal option saved");
            } else {
              setStatus("error");
              toast(result.error, "error");
            }
          }}
        >
          Save
        </Button>
      ) : (
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      )}
    </Card>
  );
}
