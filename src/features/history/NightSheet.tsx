"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { initials } from "@/core/listeners";
import { reachAll } from "@/core/reach";
import { sessionSeconds, summarizeSession, type SeatShare } from "@/core/session";
import type { Room, Session } from "@/core/types";
import { useStore } from "@/hooks/useStore";
import { nightTitle } from "@/lib/when";
import { calibrationStore, listenersStore, roomStore, sessionsStore } from "@/platform/storage";
import { Button } from "@/ui/Button";
import { Sheet } from "@/ui/Sheet";
import { Group, Section } from "@/ui/structure";
import type { TableSeat } from "@/features/talk/table";
import { TableMap } from "@/features/talk/TableMap";
import { describeNight, shareState } from "./describeNight";
import { useDeleteSession } from "./useDeleteSession";

/** Used for reach when neither the conversation nor the room measured the noise. */
const ASSUMED_NOISE_DBA = 50;

export function NightSheet({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const sessions = useStore(sessionsStore);
  const deleteSession = useDeleteSession();
  const current = sessions.find((s) => s.id === sessionId) ?? null;
  // The last night shown stays on screen while the sheet slides away, even after a delete.
  const [shown, setShown] = useState<Session | null>(current);
  useEffect(() => {
    if (current) setShown(current);
  }, [current]);
  const session = current ?? shown;

  function remove() {
    if (!session) return;
    deleteSession(session.id);
    onClose();
  }

  return (
    <Sheet
      open={current !== null}
      onClose={onClose}
      title={session ? nightTitle(session.startedAt) : "Conversation"}
      size="full"
      footer={
        <>
          <Button variant="primary" size="large" block onClick={onClose}>
            Done
          </Button>
          <Button
            variant="plain"
            block
            data-tone="danger"
            icon={<Trash2 size={18} strokeWidth={2.25} aria-hidden />}
            onClick={remove}
          >
            Delete this conversation
          </Button>
        </>
      }
    >
      {session ? <NightBody session={session} /> : null}
    </Sheet>
  );
}

function NightBody({ session }: { session: Session }) {
  const listeners = useStore(listenersStore);
  const room = useStore(roomStore);
  const calibration = useStore(calibrationStore);
  const summary = summarizeSession(session);
  const reach = reachBoth(summary.meanOnDba, summary.meanOffDba, session, room);
  const shareOf = (id: string) => {
    const s = summary.seatShares[id];
    return s?.on ?? s?.off ?? null;
  };
  const nameOf = (id: string) => listeners.find((l) => l.id === id)?.label ?? "Someone who left";
  // Only people still at the table are drawn; the list below names everyone who was there.
  const seats: TableSeat[] = session.listenerIds.flatMap((id) => {
    const l = listeners.find((p) => p.id === id);
    return l ? [{ ...l, state: shareState(shareOf(id)) }] : [];
  });
  const words = describeNight({
    people: session.listenerIds.map((id) => ({ name: nameOf(id), share: shareOf(id) })),
    sentences: summary.utteranceCount,
    seconds: sessionSeconds(session),
    gainDb: summary.gainDb,
    clarityDb: summary.clarityChangeDb,
    reachOnM: reach.main,
    reachOffM: reach.without,
    chatterSeconds: summary.chatterSeconds,
    dosePercent: summary.dosePercent,
    course: summary.chatter,
    estimated: calibration.measuredAt === null,
  });
  const heardBy = (s: TableSeat) => {
    const share = shareOf(s.id);
    return share === null
      ? `Nothing was measured for ${s.label}.`
      : `${s.label} heard ${Math.round(share * 100)}% of what you said.`;
  };

  return (
    <>
      {seats.length > 0 ? (
        <div className="hi-night__table">
          <TableMap
            seats={seats}
            description={`${words.headline}. ${seats.map(heardBy).join(" ")}`}
          />
        </div>
      ) : null}
      <div className="hi-night__head">
        <h3 className="hi-night__headline">{words.headline}</h3>
        <p className="hi-night__sub">{words.sub}</p>
      </div>

      {session.listenerIds.length > 0 ? (
        <Section title="At the table">
          <Group>
            {session.listenerIds.map((id) => (
              <SeatShareRow key={id} name={nameOf(id)} share={summary.seatShares[id]} />
            ))}
          </Group>
        </Section>
      ) : null}

      <Section title="Your voice">
        <div className="hi-night__voice">
          {words.voice.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Section>
    </>
  );
}

function SeatShareRow({ name, share }: { name: string; share: SeatShare | undefined }) {
  const on = share?.on ?? null;
  const off = share?.off ?? null;
  const main = on ?? off;
  return (
    <div className="hi-share">
      <span className="hi-avatar" aria-hidden>
        {initials(name)}
      </span>
      <div className="hi-share__body">
        <div className="hi-share__top">
          <span className="hi-share__name">{name}</span>
          <span className="hi-share__value">
            {main === null ? "No sentences" : `${Math.round(main * 100)}%`}
          </span>
        </div>
        <div className="hi-share__track" aria-hidden>
          <div className="hi-share__fill" style={{ width: `${Math.round((main ?? 0) * 100)}%` }} />
        </div>
        {on !== null && off !== null ? (
          <span className="hi-share__without">{Math.round(off * 100)}% without the chatter</span>
        ) : null}
      </div>
    </div>
  );
}

/** Reach for someone who hears well, with the chatter and, when there is a comparison, without it. */
function reachBoth(
  meanOnDba: number | null,
  meanOffDba: number | null,
  session: Session,
  room: Room,
): { main: number | null; without: number | null } {
  const noise = session.noiseDba ?? room.noiseDba ?? ASSUMED_NOISE_DBA;
  const kind = room.kind ?? "voices";
  const at = (level: number | null) =>
    level === null ? null : reachAll(level, noise, room.alphaDbPerDoubling, kind).well;
  const on = at(meanOnDba);
  const off = at(meanOffDba);
  return on === null ? { main: off, without: null } : { main: on, without: off };
}
