"use client";

import { useState } from "react";
import { MAX_LISTENERS, newListener, seatsTaken } from "@/core/listeners";
import { freeSeat, type SeatSlot } from "@/core/seats";
import { useStore } from "@/hooks/useStore";
import { listenersStore, newId } from "@/platform/storage";
import { useToast } from "@/ui/Toast";
import { newPerson, PersonSheet, type PersonDraft } from "./PersonSheet";

/**
 * Adding, changing and removing the people at the table, the same way on every
 * screen that shows them: a new person is offered the first free chair, or the
 * chair that was tapped, and a removal can be undone.
 */
export function usePeopleEditor() {
  const listeners = useStore(listenersStore);
  const toast = useToast();
  const [draft, setDraft] = useState<PersonDraft | null>(null);
  const full = listeners.length >= MAX_LISTENERS;

  function add(seat?: SeatSlot) {
    const chair = seat ?? freeSeat(listeners.map((l) => l.seat));
    if (chair && !full) setDraft(newPerson(chair));
  }

  function edit(id: string) {
    const l = listeners.find((p) => p.id === id);
    if (l) setDraft({ id: l.id, label: l.label, hearing: l.hearing, seat: l.seat });
  }

  function save(next: PersonDraft) {
    const listener = newListener(next.id ?? newId(), next.label, next.hearing, next.seat);
    listenersStore.set((all) =>
      next.id ? all.map((l) => (l.id === next.id ? listener : l)) : [...all, listener],
    );
    setDraft(null);
  }

  function remove(id: string) {
    const before = listenersStore.get();
    const person = before.find((l) => l.id === id);
    listenersStore.set((all) => all.filter((l) => l.id !== id));
    setDraft(null);
    if (person) {
      toast.show(`${person.label} left the table.`, {
        label: "Undo",
        onAction: () => listenersStore.set(before),
      });
    }
  }

  const sheet = (
    <PersonSheet
      draft={draft}
      taken={seatsTaken(listeners, draft?.id ?? null)}
      onClose={() => setDraft(null)}
      onSave={save}
      onRemove={remove}
    />
  );

  return { listeners, full, add, edit, remove, sheet };
}
