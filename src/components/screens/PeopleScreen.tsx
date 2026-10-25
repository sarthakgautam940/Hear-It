"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash, Users } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, Input, SegmentedControl } from "@/components/ui/controls";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { PageHead, Standing } from "@/components/ui/structure";
import { useToast } from "@/components/ui/Toast";
import {
  HEARING_LABEL,
  HEARING_SHORT,
  initials,
  MAX_LABEL_LENGTH,
  MAX_LISTENERS,
  newListener,
  SEAT_DISTANCES_M,
} from "@/core/listeners";
import type { Hearing, Listener } from "@/core/types";
import { useStore } from "@/hooks/useStore";
import { fmtMetersShort } from "@/lib/format";
import { listenersStore, newId } from "@/platform/storage";

const HEARING_OPTIONS = [
  { value: "well" as const, label: "Hears well" },
  { value: "some" as const, label: "Some trouble" },
  { value: "alot" as const, label: "A lot, or aids" },
];

type Draft = { id: string | null; label: string; hearing: Hearing; distanceM: number };

const EMPTY_DRAFT: Draft = { id: null, label: "", hearing: "well", distanceM: 1.5 };

export function PeopleScreen() {
  const listeners = useStore(listenersStore);
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<Listener | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      window.history.replaceState(null, "", "/people");
      setDraft(EMPTY_DRAFT);
    }
  }, []);

  const full = listeners.length >= MAX_LISTENERS;

  function save() {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) {
      setError("Give them a name or initials.");
      return;
    }
    const listener = newListener(draft.id ?? newId(), label, draft.hearing, draft.distanceM);
    listenersStore.set((prev) =>
      draft.id ? prev.map((l) => (l.id === draft.id ? listener : l)) : [...prev, listener],
    );
    setDraft(null);
    setError(null);
  }

  function remove(listener: Listener) {
    const snapshot = listenersStore.get();
    listenersStore.set((prev) => prev.filter((l) => l.id !== listener.id));
    setRemoving(null);
    toast.show(`${listener.label} removed from the table.`, {
      action: { label: "Undo", onAction: () => listenersStore.set(snapshot) },
    });
  }

  return (
    <>
      <PageHead
        title="People"
        lead="Who sits at your table, and how they hear."
        rest="Each seat is drawn on the map at its distance from you, with the reach a listener like them needs."
        actions={
          <Button
            variant="primary"
            icon={<Plus size={18} aria-hidden />}
            disabled={full}
            onClick={() => {
              setError(null);
              setDraft(EMPTY_DRAFT);
            }}
          >
            Add a person
          </Button>
        }
      />

      {listeners.length === 0 ? (
        <Standing
          icon={<Users size={32} aria-hidden />}
          head="Nobody at the table yet"
          note="Add the people you talk with most. Hearing is described in their own words, never as a diagnosis."
          actions={
            <Button variant="primary" onClick={() => setDraft(EMPTY_DRAFT)}>
              Add the first person
            </Button>
          }
        />
      ) : (
        <div className="hi-panel" style={{ padding: "4px 24px" }}>
          <ul className="hi-seatlist">
            {listeners.map((l) => (
              <li className="hi-seat" key={l.id}>
                <span className="hi-seat__chip" aria-hidden>
                  {initials(l.label)}
                </span>
                <span className="hi-seat__body">
                  <span className="hi-seat__name">{l.label}</span>
                  <span className="hi-seat__meta">
                    {HEARING_LABEL[l.hearing]}. Sits {fmtMetersShort(l.distanceM)} away.
                  </span>
                </span>
                <span className="hi-seat__actions">
                  <IconButton
                    label={`Edit ${l.label}`}
                    onClick={() => {
                      setError(null);
                      setDraft({
                        id: l.id,
                        label: l.label,
                        hearing: l.hearing,
                        distanceM: l.distanceM,
                      });
                    }}
                  >
                    <Pencil size={18} aria-hidden />
                  </IconButton>
                  <IconButton label={`Remove ${l.label}`} onClick={() => setRemoving(l)}>
                    <Trash size={18} aria-hidden />
                  </IconButton>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {full ? (
        <p className="hi-micro" style={{ marginTop: 16 }}>
          Six seats is the most the map can show clearly.
        </p>
      ) : null}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit this person" : "Add a person"}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="hi-form">
            <Field label="Name or initials" error={error}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={draft.label}
                  maxLength={MAX_LABEL_LENGTH}
                  autoComplete="off"
                  autoFocus
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save();
                  }}
                />
              )}
            </Field>
            <div className="hi-field">
              <span className="hi-field__label">How do they hear in noise?</span>
              <SegmentedControl
                aria-label="How they hear in noise"
                block
                options={HEARING_OPTIONS}
                value={draft.hearing}
                onChange={(hearing) => setDraft({ ...draft, hearing })}
              />
              <span className="hi-field__hint">{HEARING_LABEL[draft.hearing]}</span>
            </div>
            <div className="hi-field">
              <span className="hi-field__label">How far from you do they sit?</span>
              <SegmentedControl
                aria-label="Seat distance"
                block
                options={SEAT_DISTANCES_M.map((m) => ({
                  value: String(m),
                  label: fmtMetersShort(m),
                }))}
                value={String(draft.distanceM)}
                onChange={(v) => setDraft({ ...draft, distanceM: Number(v) })}
              />
              <span className="hi-field__hint">
                Across a dinner table is about 1.5 m. The far end of a long table is about 2.5 m.
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove(removing);
        }}
        title="Remove from the table?"
        consequence={
          removing
            ? `${removing.label} (${HEARING_SHORT[removing.hearing]}) leaves the map. You can undo this for a few seconds.`
            : ""
        }
        confirmLabel="Remove"
      />
    </>
  );
}
