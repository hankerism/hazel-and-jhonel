"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/dashboard/ui";
import { ReorderHandle, SortableList } from "@/components/dashboard/sortable-list";
import { useConfirm } from "@/components/dashboard/confirm";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import type { StoryMilestone } from "@/types/wedding";
import {
  addMilestone,
  deleteMilestone,
  reorderMilestones,
  updateMilestone,
  type MilestoneInput,
} from "./actions";

interface StoryManagerProps {
  weddingId: string;
  initial: StoryMilestone[];
}

export function StoryManager({ weddingId, initial }: StoryManagerProps) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { setStatus } = useSaveStatus();
  const [, startTransition] = useTransition();

  const applyOrder = (ids: string[]) => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const next = ids.map((id) => byId.get(id)!).filter(Boolean);
    const prev = items;
    setItems(next);
    setStatus("saving");
    startTransition(async () => {
      const result = await reorderMilestones(ids);
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

  const removeItem = async (item: StoryMilestone) => {
    if (
      !(await confirm({
        title: `Delete “${item.title}”?`,
        body: "This removes the milestone from your story on the live website.",
      }))
    )
      return;
    const prev = items;
    setItems(items.filter((i) => i.id !== item.id));
    setStatus("saving");
    const result = await deleteMilestone(item.id);
    if (result.ok) {
      setStatus("saved");
      toast("Milestone deleted");
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
          <MilestoneRow
            key={item.id}
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
        <MilestoneEditor
          heading="New milestone"
          initial={{ title: "", body: "", imageUrl: "" }}
          submitLabel="Add Milestone"
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            setStatus("saving");
            const result = await addMilestone(weddingId, input, items.length + 1);
            if (result.ok) {
              setStatus("saved");
              toast("Milestone added");
              setAdding(false);
              setItems((current) => [
                ...current,
                {
                  id: result.id!,
                  title: input.title,
                  body: input.body,
                  imageUrl: input.imageUrl || null,
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
          + Add milestone
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- rows */

function MilestoneRow({
  item,
  index,
  total,
  onMove,
  onDelete,
  onSaved,
}: {
  item: StoryMilestone;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
  onSaved: (updated: Partial<StoryMilestone>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  if (editing) {
    return (
      <MilestoneEditor
        heading={`Edit “${item.title}”`}
        initial={{ title: item.title, body: item.body, imageUrl: item.imageUrl ?? "" }}
        submitLabel="Save Changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          setStatus("saving");
          const result = await updateMilestone(item.id, input);
          if (result.ok) {
            setStatus("saved");
            toast("Milestone saved");
            onSaved({
              title: input.title,
              body: input.body,
              imageUrl: input.imageUrl || null,
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
    <Card className="flex items-start gap-4 p-5">
      <ReorderHandle index={index} total={total} onMove={onMove} />
      {item.imageUrl && (
        <span className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-full sm:block">
          <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-light">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm whitespace-pre-line text-stone">
          {item.body}
        </p>
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

function MilestoneEditor({
  heading,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  heading: string;
  initial: MilestoneInput;
  submitLabel: string;
  onSubmit: (input: MilestoneInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initial);
  const [pending, setPending] = useState(false);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="eyebrow text-[0.5625rem] text-gold-deep">{heading}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            placeholder="How We Met"
          />
        </Field>
        <Field label="Image URL (optional)">
          <Input
            value={input.imageUrl}
            onChange={(e) => setInput({ ...input, imageUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="Story">
        <Textarea
          rows={3}
          value={input.body}
          onChange={(e) => setInput({ ...input, body: e.target.value })}
          placeholder="A short, sweet paragraph…"
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
