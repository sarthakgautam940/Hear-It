"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { MAX_LABEL_LENGTH } from "@/core/listeners";
import { seatDistanceM, seatName, type SeatSlot } from "@/core/seats";
import type { Hearing } from "@/core/types";
import { Button } from "@/ui/Button";
import { ChoiceList, Fieldset, TextInput } from "@/ui/controls";
import { Sheet } from "@/ui/Sheet";
import { SeatPicker } from "./SeatPicker";

export interface PersonDraft {
  id: string | null;
  label: string;
  hearing: Hearing;
  seat: SeatSlot;
}

/** A new person, in the chair they were offered. */
export function newPerson(seat: SeatSlot): PersonDraft {
  return { id: null, label: "", hearing: "well", seat };
}

const HEARING_CHOICES = [
  { value: "well" as const, title: "Hears well", sub: "Follows along in a busy room" },
  { value: "some" as const, title: "Some trouble", sub: "Misses words when others talk" },
  {
    value: "alot" as const,
    title: "A lot of trouble",
    sub: "Hearing aids, or struggles in noise",
  },
];

export function PersonSheet({
  draft,
  taken,
  onClose,
  onSave,
  onRemove,
}: {
  draft: PersonDraft | null;
  /** Chairs other people sit in, with their names. */
  taken: ReadonlyMap<SeatSlot, string>;
  onClose: () => void;
  onSave: (draft: PersonDraft) => void;
  onRemove: (id: string) => void;
}) {
  const [value, setValue] = useState<PersonDraft>(draft ?? newPerson("L1"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setValue(draft);
      setError(null);
    }
  }, [draft]);

  function save() {
    if (!value.label.trim()) {
      setError("Give them a name or initials.");
      return;
    }
    onSave({ ...value, label: value.label.trim() });
  }

  const editing = value.id !== null;
  return (
    <Sheet
      open={draft !== null}
      onClose={onClose}
      title={editing ? "Edit person" : "New person"}
      size="full"
      footer={
        <>
          <Button variant="primary" size="large" block onClick={save}>
            {editing ? "Save" : "Add to the table"}
          </Button>
          {editing ? (
            <Button
              variant="plain"
              block
              icon={<Trash2 size={18} strokeWidth={2.25} aria-hidden />}
              data-tone="danger"
              onClick={() => value.id && onRemove(value.id)}
            >
              Remove from the table
            </Button>
          ) : null}
        </>
      }
    >
      <Fieldset label="Name" error={error}>
        <TextInput
          value={value.label}
          maxLength={MAX_LABEL_LENGTH}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Name or initials"
          invalid={Boolean(error)}
          aria-label="Name"
          data-autofocus
          onChange={(e) => {
            setValue({ ...value, label: e.target.value });
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />
      </Fieldset>
      <Fieldset label="How do they hear in a busy room?">
        <ChoiceList
          label="How they hear in a busy room"
          choices={HEARING_CHOICES}
          value={value.hearing}
          onChange={(hearing) => setValue({ ...value, hearing })}
        />
      </Fieldset>
      <Fieldset
        label="Where do they sit?"
        hint={`${seatName(value.seat)}, about ${seatDistanceM(value.seat).toFixed(1)} m from you.`}
      >
        <SeatPicker
          value={value.seat}
          taken={taken}
          onChange={(seat) => setValue({ ...value, seat })}
        />
      </Fieldset>
    </Sheet>
  );
}
