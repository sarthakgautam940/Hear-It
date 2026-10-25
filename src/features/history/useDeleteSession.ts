"use client";

import { sessionsStore } from "@/platform/storage";
import { useToast } from "@/ui/Toast";

/** Deletes a conversation, from its row or its report, with an Undo. */
export function useDeleteSession(): (id: string) => void {
  const toast = useToast();
  return (id) => {
    const before = sessionsStore.get();
    sessionsStore.set((all) => all.filter((s) => s.id !== id));
    toast.show("Conversation deleted.", {
      label: "Undo",
      onAction: () => sessionsStore.set(before),
    });
  };
}
