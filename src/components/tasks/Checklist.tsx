"use client";

import { useState, useTransition, useOptimistic } from "react";
import {
  toggleChecklistItem,
  addChecklistItem,
  removeChecklistItem,
} from "@/app/actions/tasks";
import type { ChecklistItem } from "@/lib/services";

export default function Checklist({
  taskId,
  items,
}: {
  taskId: string;
  items: ChecklistItem[];
}) {
  const [optimisticItems, setOptimisticItems] = useOptimistic(items);
  const [isPending, startTransition] = useTransition();
  const [newItemText, setNewItemText] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const doneCount = optimisticItems.filter((i) => i.done).length;
  const totalCount = optimisticItems.length;

  async function handleToggle(itemId: string) {
    const nextItems = optimisticItems.map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i,
    );
    startTransition(async () => {
      setOptimisticItems(nextItems);
      await toggleChecklistItem(taskId, itemId);
    });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const text = newItemText.trim();
    const tempId = `temp-${Date.now()}`;
    const nextItems = [
      ...optimisticItems,
      { id: tempId, text, done: false },
    ];
    setNewItemText("");
    setShowAdd(false);
    startTransition(async () => {
      setOptimisticItems(nextItems);
      await addChecklistItem(taskId, text);
    });
  }

  async function handleRemove(itemId: string) {
    const nextItems = optimisticItems.filter((i) => i.id !== itemId);
    startTransition(async () => {
      setOptimisticItems(nextItems);
      await removeChecklistItem(taskId, itemId);
    });
  }

  return (
    <div className="mt-2 pl-7">
      <div className="flex items-center justify-between text-xs text-ink-2">
        <span>
          子任务 {doneCount}/{totalCount}
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-accent hover:underline"
        >
          {showAdd ? "取消" : "+ 添加"}
        </button>
      </div>
      {totalCount > 0 ? (
        <div className="mt-2 space-y-1">
          {optimisticItems.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => handleToggle(item.id)}
                disabled={isPending}
                className="h-3.5 w-3.5 accent-accent"
              />
              <span
                className={`flex-1 ${
                  item.done ? "text-ink-2 line-through" : "text-ink"
                }`}
              >
                {item.text}
              </span>
              <button
                onClick={() => handleRemove(item.id)}
                className="text-xs text-ink-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent"
              >
                删
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {showAdd ? (
        <form onSubmit={handleAdd} className="mt-2 flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="子任务内容"
            className="flex-1 border border-hairline bg-paper px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="bg-accent px-2 py-1 text-xs font-semibold text-white"
          >
            添加
          </button>
        </form>
      ) : null}
    </div>
  );
}
