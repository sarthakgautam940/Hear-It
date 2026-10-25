"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { HEARING_SHORT, initials } from "@/core/listeners";
import { SEAT_SLOTS, seatDistanceM } from "@/core/seats";
import { fmtMetersShort } from "@/lib/format";
import { Screen } from "@/shell/Screen";
import { TableMap } from "@/features/talk/TableMap";
import { Button, GlassButton } from "@/ui/Button";
import { Empty, Group, RowButton, Section } from "@/ui/structure";
import { SwipeRow } from "@/ui/SwipeRow";
import { usePeopleEditor } from "./usePeopleEditor";

const away = (m: number) => `${fmtMetersShort(m)} away`;

export function PeopleScreen() {
  const { listeners, full, add, edit, remove, sheet } = usePeopleEditor();
  const bySeat = [...listeners].sort(
    (a, b) => SEAT_SLOTS.indexOf(a.seat) - SEAT_SLOTS.indexOf(b.seat),
  );

  return (
    <Screen
      title="People"
      sub={listeners.length > 0 ? "Who sits at your table, and how they hear." : undefined}
      trailing={
        <GlassButton label="Add a person" onClick={() => add()} disabled={full}>
          <Plus size={22} strokeWidth={2.25} aria-hidden />
        </GlassButton>
      }
    >
      {listeners.length === 0 ? (
        <Empty
          art={
            <div className="hi-emptytable">
              <TableMap
                seats={[]}
                onAdd={add}
                description="An empty table with three open chairs."
              />
            </div>
          }
          title="Nobody at the table yet"
          action={
            <Button
              variant="primary"
              size="large"
              icon={<Plus size={20} strokeWidth={2.25} aria-hidden />}
              onClick={() => add()}
            >
              Add a person
            </Button>
          }
        >
          Add the people you talk with most. They will take their seats at your table.
        </Empty>
      ) : (
        <>
          <div className="hi-preview">
            <TableMap
              named={false}
              seats={listeners.map((l) => ({ ...l, state: null }))}
              onSeat={edit}
              description={`Your table: ${bySeat.map((l) => `${l.label}, ${away(seatDistanceM(l.seat))}`).join("; ")}.`}
            />
          </div>
          <Section note={full ? "Six people is the most one table seats here." : undefined}>
            <Group label="People at the table">
              {bySeat.map((l) => (
                <SwipeRow
                  key={l.id}
                  actions={[
                    {
                      label: "Edit",
                      icon: <Pencil size={20} strokeWidth={2.25} aria-hidden />,
                      onAction: () => edit(l.id),
                    },
                    {
                      label: "Remove",
                      icon: <Trash2 size={20} strokeWidth={2.25} aria-hidden />,
                      destructive: true,
                      onAction: () => remove(l.id),
                    },
                  ]}
                >
                  <RowButton
                    onClick={() => edit(l.id)}
                    icon={
                      <span className="hi-avatar" aria-hidden>
                        {initials(l.label)}
                      </span>
                    }
                    title={l.label}
                    sub={`${HEARING_SHORT[l.hearing]}, ${away(seatDistanceM(l.seat))}`}
                  />
                </SwipeRow>
              ))}
            </Group>
          </Section>
        </>
      )}
      {sheet}
    </Screen>
  );
}
