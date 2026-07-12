"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Button, Card, Field, Input } from "@/components/dashboard/ui";
import { ReorderHandle, SortableList } from "@/components/dashboard/sortable-list";
import { useConfirm } from "@/components/dashboard/confirm";
import { useSaveStatus } from "@/components/dashboard/save-status";
import { useToast } from "@/components/dashboard/toast";
import type { GalleryImage } from "@/types/wedding";
import {
  addGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  updateGalleryCaption,
} from "./actions";

interface GalleryManagerProps {
  weddingId: string;
  initial: GalleryImage[];
}

export function GalleryManager({ weddingId, initial }: GalleryManagerProps) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState({ imageUrl: "", caption: "" });
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
      const result = await reorderGalleryImages(ids);
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

  const removeImage = async (item: GalleryImage) => {
    if (
      !(await confirm({
        title: "Delete this photo?",
        body: "It will disappear from the gallery on the live website.",
      }))
    )
      return;
    const prev = items;
    setItems(items.filter((i) => i.id !== item.id));
    setStatus("saving");
    const result = await deleteGalleryImage(item.id);
    if (result.ok) {
      setStatus("saved");
      toast("Photo deleted");
    } else {
      setItems(prev);
      setStatus("error");
      toast(result.error, "error");
    }
  };

  const addImage = async () => {
    setPending(true);
    setStatus("saving");
    const result = await addGalleryImage(weddingId, draft, items.length + 1);
    if (result.ok) {
      setStatus("saved");
      toast("Photo added");
      setItems((current) => [
        ...current,
        {
          id: result.id!,
          src: draft.imageUrl.trim(),
          caption: draft.caption.trim() || null,
          displayOrder: current.length + 1,
        },
      ]);
      setDraft({ imageUrl: "", caption: "" });
    } else {
      setStatus("error");
      toast(result.error, "error");
    }
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Add form — Supabase Storage upload slots in here later; URLs for now. */}
      <Card className="flex flex-col gap-4 p-5">
        <p className="eyebrow text-[0.5625rem] text-gold-deep">Add a photo</p>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Image URL">
            <Input
              value={draft.imageUrl}
              onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Caption (optional)">
            <Input
              value={draft.caption}
              onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              placeholder="Golden hour"
            />
          </Field>
          <Button onClick={addImage} disabled={pending || !draft.imageUrl.trim()}>
            {pending ? "Adding…" : "Add Photo"}
          </Button>
        </div>
      </Card>

      <SortableList
        items={items}
        onReorder={applyOrder}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        renderItem={(item, index) => (
          <GalleryCard
            item={item}
            index={index}
            total={items.length}
            onMove={moveByIndex}
            onDelete={() => removeImage(item)}
            onCaptionSaved={(caption) =>
              setItems((current) =>
                current.map((i) => (i.id === item.id ? { ...i, caption } : i)),
              )
            }
          />
        )}
      />
    </div>
  );
}

function GalleryCard({
  item,
  index,
  total,
  onMove,
  onDelete,
  onCaptionSaved,
}: {
  item: GalleryImage;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete: () => void;
  onCaptionSaved: (caption: string | null) => void;
}) {
  const [caption, setCaption] = useState(item.caption ?? "");
  const dirty = caption !== (item.caption ?? "");
  const toast = useToast();
  const { setStatus } = useSaveStatus();

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[3/2] w-full bg-parchment">
        <Image
          src={item.src}
          alt={item.caption ?? "Gallery photo"}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex items-center gap-3 p-4">
        <ReorderHandle index={index} total={total} onMove={onMove} />
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption"
          className="flex-1"
        />
        {dirty ? (
          <Button
            size="sm"
            onClick={async () => {
              setStatus("saving");
              const result = await updateGalleryCaption(item.id, caption);
              if (result.ok) {
                setStatus("saved");
                onCaptionSaved(caption.trim() || null);
                toast("Caption saved");
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
      </div>
    </Card>
  );
}
