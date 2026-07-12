"use client";

import { useRef, useState, type ReactNode } from "react";

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

/**
 * Dependency-free reorderable list: HTML5 drag-and-drop via the row handle,
 * plus keyboard-accessible up/down arrows rendered by the handle component.
 * Purely presentational about order — the parent owns the array and
 * persistence.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className = "",
}: SortableListProps<T>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commitDrop = () => {
    if (dragId && overId && dragId !== overId) {
      const ids = items.map((i) => i.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(overId);
      ids.splice(to, 0, ...ids.splice(from, 1));
      onReorder(ids);
    }
    setDragId(null);
    setOverId(null);
  };

  return (
    <ul ref={listRef} className={`flex flex-col gap-3 ${className}`}>
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={(e) => {
            setDragId(item.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (item.id !== overId) setOverId(item.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            commitDrop();
          }}
          onDragEnd={commitDrop}
          className={`transition-opacity ${dragId === item.id ? "opacity-40" : ""} ${
            overId === item.id && dragId !== item.id
              ? "rounded-2xl outline-2 outline-offset-2 outline-gold/60"
              : ""
          }`}
        >
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

/** Reorder handle: drag affordance + keyboard up/down buttons. */
export function ReorderHandle({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  const btn =
    "cursor-pointer px-1 text-[0.5625rem] leading-none text-stone transition-colors hover:text-charcoal disabled:opacity-30 disabled:cursor-default";
  return (
    <span className="flex select-none items-center gap-1 text-stone">
      <span aria-hidden className="cursor-grab text-sm tracking-tighter">
        ⠿
      </span>
      <span className="flex flex-col">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className={btn}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className={btn}
        >
          ▼
        </button>
      </span>
    </span>
  );
}
