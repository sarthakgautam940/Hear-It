"use client";

import { useState } from "react";
import { AudioLines, Ear, Gauge, Mic, Square, Volume2 } from "lucide-react";
import { HEARING_SHORT } from "@/core/listeners";
import { SEAT_WORD, seatMarginDb, seatState } from "@/core/reach";
import { useEngine } from "@/hooks/useEngine";
import { useElapsed } from "@/hooks/useNow";
import { useStore } from "@/hooks/useStore";
import { fmtMeters } from "@/lib/format";
import { engine } from "@/platform/engine";
import { roomStore, settingsStore } from "@/platform/storage";
import { MIC_HELP, STATUS_WORD, stopTalking } from "@/shell/talking";
import { usePeopleEditor } from "@/features/people/usePeopleEditor";
import { Button } from "@/ui/Button";
import { Banner } from "@/ui/structure";
import { describeTable } from "./describe";
import { RoomSheet } from "./RoomSheet";
import type { TableSeat } from "./table";
import { TableMap } from "./TableMap";

const EAR_LINE = {
  left: "Earbud in your left ear",
  right: "Earbud in your right ear",
  both: "Earbuds in both ears",
};

/** The room's button sits over the floor above the table, in the card's top corner. */
const ROOM_BUTTON_ROOM = 58;

export function TalkScreen() {
  const snap = useEngine();
  const room = useStore(roomStore);
  const settings = useStore(settingsStore);
  const [roomOpen, setRoomOpen] = useState(false);
  const { listeners, edit, sheet } = usePeopleEditor();
  const elapsed = useElapsed(snap.liveSince);

  const live = snap.phase === "live" && snap.mode === "table";
  const kind = room.kind ?? "voices";
  const seats: TableSeat[] = listeners.map((l) => ({
    ...l,
    state:
      live && snap.l1Dba !== null && snap.noiseDba !== null
        ? seatState(seatMarginDb(snap.l1Dba, snap.noiseDba, l, room.alphaDbPerDoubling, kind))
        : null,
  }));
  const copy = describeTable({ live, reachWell: snap.reach?.well ?? null, seats });
  const noise = live ? snap.noiseDba : room.noiseDba;
  const description = live
    ? `Your table. Your voice reaches ${snap.reach ? fmtMeters(snap.reach.well) : "an unknown distance"}. ${seats
        .map((s) => `${s.label}: ${s.state ? SEAT_WORD[s.state] : HEARING_SHORT[s.hearing]}.`)
        .join(" ")}`
    : `Your table, with you at the near end${seats.length ? ` and ${seats.map((s) => s.label).join(", ")} along the sides` : ""}.`;

  const [before, after] =
    copy.emphasis && copy.sub.includes(copy.emphasis)
      ? copy.sub.split(copy.emphasis)
      : [copy.sub, null];

  return (
    <div className="hi-talk">
      <div className="hi-talk__head" aria-live="polite">
        <h1>{copy.headline}</h1>
        <p>
          {before}
          {after !== null ? (
            <>
              <b>{copy.emphasis}</b>
              {after}
            </>
          ) : null}
        </p>
      </div>

      <section className="hi-tablecard" aria-label="Your table">
        <button
          type="button"
          className="hi-roombtn"
          onClick={() => setRoomOpen(true)}
          aria-label={
            noise === null
              ? "Check the room's noise"
              : `Room noise, ${Math.round(noise)} decibels. Check the room.`
          }
        >
          <Gauge size={18} strokeWidth={2.25} aria-hidden />
          {noise === null ? (
            "Check room"
          ) : (
            <span className="hi-roombtn__value">{Math.round(noise)} dB</span>
          )}
        </button>

        <div className="hi-tablecard__art">
          <TableMap
            seats={seats}
            description={description}
            top={ROOM_BUTTON_ROOM}
            onSeat={live ? undefined : edit}
          />
        </div>

        <div className="hi-tablecard__dock">
          {snap.phase === "error" && snap.error ? (
            <Banner>
              {snap.error} {MIC_HELP[snap.errorKind ?? "unknown"]}
            </Banner>
          ) : (
            <div className="hi-tablecard__status" aria-live="polite">
              {live ? (
                <>
                  {snap.status === "boosting" ? (
                    <Volume2 size={20} strokeWidth={2.25} aria-hidden />
                  ) : (
                    <AudioLines size={20} strokeWidth={2.25} aria-hidden />
                  )}
                  {STATUS_WORD[snap.status]}
                  <span className="hi-tablecard__time">{elapsed}</span>
                </>
              ) : (
                <>
                  <Ear size={20} strokeWidth={2.25} aria-hidden />
                  {EAR_LINE[settings.ear]}
                </>
              )}
            </div>
          )}
          {live ? (
            <Button
              variant="stage"
              size="large"
              block
              icon={<Square size={18} strokeWidth={2.5} aria-hidden />}
              onClick={() => void stopTalking()}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="stage"
              size="large"
              block
              icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
              loading={snap.phase === "starting"}
              loadingLabel="Starting"
              onClick={() => void engine.start("table")}
            >
              Start talking
            </Button>
          )}
        </div>
      </section>

      <RoomSheet open={roomOpen} onClose={() => setRoomOpen(false)} />
      {sheet}
    </div>
  );
}
