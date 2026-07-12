"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/dashboard/ui";
import { ReorderHandle, SortableList } from "@/components/dashboard/sortable-list";
import { useConfirm } from "@/components/dashboard/confirm";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import type { Faq } from "@/types/wedding";
import {
  addFaq,
  deleteFaq,
  reorderFaqs,
  updateFaq,
  type FaqInput,
} from "./actions";

interface FaqManagerProps {
  weddingId: string;
  initial: Faq[];
}

export function FaqManager({ weddingId, initial }: FaqManagerProps) {
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
      const result = await reorderFaqs(ids);
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

  const remove = async (item: Faq) => {
    if (
      !(await confirm({
        title: "Delete this question?",
        body: `“${item.question}” will disappear from the live website.`,
      }))
    )
      return;
    const prev = items;
    setItems(items.filter((i) => i.id !== item.id));
    setStatus("saving");
    const result = await deleteFaq(item.id);
    if (result.ok) {
      setStatus("saved");
      toast("Question deleted");
    } else {
      setItems(prev);
      setStatus("error");
      toast(result.error, "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Accordion preview — exactly how guests see it. */}
      <SortableList
        items={items}
        onReorder={applyOrder}
        renderItem={(item, index) => (
          <FaqRow
            item={item}
            index={index}
            total={items.length}
            onMove={moveByIndex}
            onDelete={() => remove(item)}
            onSaved={(updated) =>
              setItems((current) =>
                current.map((i) => (i.id === item.id ? { ...i, ...updated } : i)),
              )
            }
          />
        )}
      />

      {adding ? (
        <FaqEditor
          heading="New question"
          initial={{ question: "", answer: "" }}
          submitLabel="Add Question"
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            setStatus("saving");
            const result = await addFaq(weddingId, input, items.length + 1);
            if (result.ok) {
              setStatus("saved");
              toast("Question added");
              setAdding(false);
              setItems((current) => [
                ...current,
                {
                  id: result.id!,
                  question: input.question,
                  answer: input.answer,
                  displayOrder: current.length + 1,
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
          + Add question
        </Button>
      )}
    </div>
  );
}

function FaqRow({
  item,
  index,
  total,
  onMove,
  onDelete,
  onSaved,
}: {
  item: Faq;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
  onSaved: (updated: Partial<Faq>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  if (editing) {
    return (
      <FaqEditor
        heading="Edit question"
        initial={{ question: item.question, answer: item.answer }}
        submitLabel="Save Changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          setStatus("saving");
          const result = await updateFaq(item.id, input);
          if (result.ok) {
            setStatus("saved");
            toast("Question saved");
            onSaved(input);
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
    <Card className="px-5 py-1">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
          <ReorderHandle index={index} total={total} onMove={onMove} />
          <span className="flex-1 font-serif text-lg font-light">{item.question}</span>
          <span
            aria-hidden
            className="text-xl font-light text-gold transition-transform duration-300 group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="flex flex-col gap-3 pb-5 pl-16">
          <p className="text-sm leading-relaxed text-stone">{item.answer}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </details>
    </Card>
  );
}

function FaqEditor({
  heading,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  heading: string;
  initial: FaqInput;
  submitLabel: string;
  onSubmit: (input: FaqInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initial);
  const [pending, setPending] = useState(false);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="eyebrow text-[0.5625rem] text-gold-deep">{heading}</p>
      <Field label="Question">
        <Input
          value={input.question}
          onChange={(e) => setInput({ ...input, question: e.target.value })}
          placeholder="What is the dress code?"
        />
      </Field>
      <Field label="Answer">
        <Textarea
          rows={3}
          value={input.answer}
          onChange={(e) => setInput({ ...input, answer: e.target.value })}
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
