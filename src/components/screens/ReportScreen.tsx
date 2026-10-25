"use client";

import { ClipboardList } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { DefList, Measure, PageHead, Region, Standing } from "@/components/ui/structure";
import { reachAll } from "@/core/reach";
import { summarizeSession } from "@/core/session";
import { useStore } from "@/hooks/useStore";
import { fmtDate, fmtDuration, fmtMeters, fmtPercent, fmtSignedDb } from "@/lib/format";
import { listenersStore, roomStore, sessionsStore } from "@/platform/storage";

export function ReportScreen() {
  const sessions = useStore(sessionsStore);
  const listeners = useStore(listenersStore);
  const room = useStore(roomStore);
  const latest = sessions[0];

  if (!latest) {
    return (
      <>
        <PageHead title="Report" lead="What happened the last time you talked." />
        <Standing
          icon={<ClipboardList size={32} aria-hidden />}
          head="No conversation yet"
          note="Start at the table and talk. When you tap Stop, tonight's numbers land here: how much louder, how much clearer, and who could hear you."
          actions={
            <LinkButton href="/" variant="primary">
              Go to the table
            </LinkButton>
          }
        />
      </>
    );
  }

  const summary = summarizeSession(latest);
  const noise = latest.noiseDba ?? room.noiseDba ?? 50;
  const kind = room.kind ?? "voices";
  const reachOn = summary.meanOnDba === null ? null : reachAll(summary.meanOnDba, noise, room.alphaDbPerDoubling, kind);
  const reachOff = summary.meanOffDba === null ? null : reachAll(summary.meanOffDba, noise, room.alphaDbPerDoubling, kind);
  const nameOf = (id: string) => listeners.find((l) => l.id === id)?.label ?? "Someone no longer at the table";
  const duration = latest.endedAt ? (new Date(latest.endedAt).getTime() - new Date(latest.startedAt).getTime()) / 1000 : null;

  return (
    <>
      <PageHead
        title="Report"
        lead={summary.gainDb === null ? "Tonight, as it happened." : `Tonight you were ${fmtSignedDb(summary.gainDb)} louder with the chatter.`}
        rest={`${fmtDate(latest.startedAt)}${duration ? `, ${fmtDuration(duration)} at the table` : ""}. ${summary.utteranceCount} sentences measured. Levels are estimates from your phone.`}
      />

      <Region title="Louder and clearer">
        <div className="hi-band">
          <Measure label="Louder" value={summary.gainDb === null ? "Not yet" : fmtSignedDb(summary.gainDb)} empty={summary.gainDb === null} note="Chatter on against chatter off." />
          <Measure label="Clearer" value={summary.clarityChangeDb === null ? "Not yet" : fmtSignedDb(summary.clarityChangeDb)} empty={summary.clarityChangeDb === null} note="Consonant energy over vowel energy. An amplifier cannot change this." />
          <Measure label="You spoke" value={fmtDuration(summary.speechSeconds)} />
          <Measure label="Chatter played" value={fmtDuration(summary.chatterSeconds)} note={`${fmtPercent(summary.dosePercent)} of a day's safe listening, estimated.`} />
        </div>
      </Region>

      {reachOn || reachOff ? (
        <Region title="How far your voice reached" note="For a listener who hears well, with some trouble, and with hearing aids or a lot of trouble.">
          <DefList
            rows={[
              { term: "Without chatter", value: reachOff ? `${fmtMeters(reachOff.well)}, ${fmtMeters(reachOff.some)}, ${fmtMeters(reachOff.alot)}` : "Not measured", empty: !reachOff },
              { term: "With chatter", value: reachOn ? `${fmtMeters(reachOn.well)}, ${fmtMeters(reachOn.some)}, ${fmtMeters(reachOn.alot)}` : "Not measured", empty: !reachOn },
              { term: "Room noise", value: `${Math.round(noise)} dBA` },
            ]}
          />
        </Region>
      ) : null}

      {latest.listenerIds.length > 0 ? (
        <Region title="Who could hear you" note="The share of your sentences that reached each seat.">
          <DefList
            rows={latest.listenerIds.map((id) => {
              const share = summary.seatShares[id];
              const on = share?.on ?? null;
              const off = share?.off ?? null;
              const parts = [
                on === null ? null : `${Math.round(on * 100)}% with chatter`,
                off === null ? null : `${Math.round(off * 100)}% without`,
              ].filter(Boolean);
              return { term: nameOf(id), value: parts.length ? parts.join(", ") : "No sentences", empty: parts.length === 0 };
            })}
          />
        </Region>
      ) : null}

      {sessions.length > 1 ? (
        <Region title="Earlier">
          <DefList
            rows={sessions.slice(1, 11).map((s) => {
              const sum = summarizeSession(s);
              return {
                term: fmtDate(s.startedAt),
                value: `${sum.utteranceCount} sentences${sum.gainDb === null ? "" : `, ${fmtSignedDb(sum.gainDb)}`}`,
              };
            })}
          />
        </Region>
      ) : null}
    </>
  );
}
