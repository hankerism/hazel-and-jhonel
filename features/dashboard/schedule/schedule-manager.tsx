"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input } from "@/components/dashboard/ui";
import { ReorderHandle, SortableList } from "@/components/dashboard/sortable-list";
import { useConfirm } from "@/components/dashboard/confirm";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import { formatTime12h } from "@/lib/datetime";
import type { ScheduleItem } from "@/types/wedding";
import {
  addScheduleItem,
  deleteScheduleItem,
  reorderScheduleItems,
  updateScheduleItem,
  type ScheduleInput,
} from "./actions";

interface ScheduleManagerProps {
  weddingId: string;
  initial: ScheduleItem[];
}

export function ScheduleManager({ weddingId, initial }: ScheduleManagerProps) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
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
      const result = await reorderScheduleItems(ids);
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

  const removeItem = async (item: ScheduleItem) => {
    if (
      !(await confirm({
        title: `Delete “${item.title}”?`,
        body: "This removes the event from the schedule on the live website.",
      }))
    )
      return;
    const prev = items;
    setItems(items.filter((i) => i.id !== item.id));
    setStatus("saving");
    const result = await deleteScheduleItem(item.id);
    if (result.ok) {
      setStatus("saved");
      toast("Event deleted");
    } else {
      setItems(prev);
      setStatus("error");
      toast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SortableList
        items={items}
        onReorder={applyOrder}
        renderItem={(item, index) => (
          <ScheduleRow
            item={item}
            index={index}
            total={items.length}
            onMove={moveByIndex}
            onDelete={() => removeItem(item)}
            onSaved={(updated) =>
              setItems((current) =>
                current.map((i) => (i.id === item.id ? { ...i, ...updated } : i)),
              )
            }
          />
        )}
      />

      {adding ? (
        <ScheduleEditor
          heading="New event"
          initial={{ time: "", title: "", description: "" }}
          submitLabel="Add Event"
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            setStatus("saving");
            const result = await addScheduleItem(weddingId, input, items.length + 1);
            if (result.ok) {
              setStatus("saved");
              toast("Event added");
              setAdding(false);
              setItems((current) => [
                ...current,
                {
                  id: result.id!,
                  time: input.time,
                  title: input.title,
                  description: input.description || null,
                  sortOrder: current.length + 1,
                },
              ]);
            } else {
              setStatus("error");
              toast(result.error, "error");
            }
          }}
        />
      ) : (
        <Button variant="ghost" onClick={() => setAdding(true)} className="self-start">
          + Add event
        </Button>
      )}
    </div>
  );
}

function ScheduleRow({
  item,
  index,
  total,
  onMove,
  onDelete,
  onSaved,
}: {
  item: ScheduleItem;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
  onSaved: (updated: Partial<ScheduleItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  if (editing) {
    return (
      <ScheduleEditor
        heading={`Edit “${item.title}”`}
        initial={{
          time: item.time,
          title: item.title,
          description: item.description ?? "",
        }}
        submitLabel="Save Changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          setStatus("saving");
          const result = await updateScheduleItem(item.id, input);
          if (result.ok) {
            setStatus("saved");
            toast("Event saved");
            onSaved({
              time: input.time,
              title: input.title,
              description: input.description || null,
            });
            setEditing(false);
          } else {
            setStatus("error");
            toast(result.error, "error");
          }
        }}
      />
    );
  }

  return (
    <Card className="flex items-center gap-4 px-5 py-4">
      <ReorderHandle index={index} total={total} onMove={onMove} />
      <span className="eyebrow w-20 shrink-0 text-[0.625rem] text-gold-deep">
        {item.time ? formatTime12h(item.time) : "—"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-light">{item.title}</p>
        {item.description && (
          <p className="truncate text-sm text-stone">{item.description}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}

function ScheduleEditor({
  heading,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  heading: string;
  initial: ScheduleInput;
  submitLabel: string;
  onSubmit: (input: ScheduleInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initial);
  const [pending, setPending] = useState(false);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="eyebrow text-[0.5625rem] text-gold-deep">{heading}</p>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Time">
          <Input
            type="time"
            value={input.time}
            onChange={(e) => setInput({ ...input, time: e.target.value })}
          />
        </Field>
        <Field label="Title">
          <Input
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            placeholder="Cocktail Hour"
          />
        </Field>
      </div>
      <Field label="Description (optional)">
        <Input
          value={input.description}
          onChange={(e) => setInput({ ...input, description: e.target.value })}
          placeholder="A short note guests will see under the title"
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await onSubmit(input);
            setPending(false);
          }}
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </Card>
  );
}
