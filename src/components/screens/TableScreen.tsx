"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Mic, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { ReachCanvas, type Seat } from "@/components/table/ReachCanvas";
import { Button, LinkButton } from "@/components/ui/Button";
import { Banner } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { HEARING_SHORT, seatAngles } from "@/core/listeners";
import { seatMarginDb, seatState, type SeatState } from "@/core/reach";
import { useEngine } from "@/hooks/useEngine";
import { useStore } from "@/hooks/useStore";
import { fmtDba, fmtMeters, fmtMetersShort, listNames } from "@/lib/format";
import { engine, type LiveStatus } from "@/platform/engine";
import { listenersStore, roomStore, selfTestStore } from "@/platform/storage";

const STATUS: Record<LiveStatus, { word: string; tone: string; icon: typeof Mic }> = {
  off: { word: "Not listening", tone: "off", icon: Mic },
  starting: { word: "Starting", tone: "off", icon: Mic },
  listening: { word: "Listening", tone: "listening", icon: Mic },
  boosting: { word: "Boosting", tone: "boosting", icon: Volume2 },
  "not-needed": { word: "Chatter not needed", tone: "listening", icon: VolumeX },
  paused: { word: "Paused", tone: "paused", icon: Pause },
};

const MIC_HELP: Record<string, string> = {
  denied: "Allow the microphone for this site in your browser settings, then tap Start again.",
  busy: "Close the other app that is using the microphone, then tap Start again.",
  unsupported: "Open this page in Safari on iPhone or Chrome on Android.",
  unknown: "Try again. If it keeps failing, reload the page.",
};

export function TableScreen() {
  const snap = useEngine();
  const listeners = useStore(listenersStore);
  const room = useStore(roomStore);
  const selfTest = useStore(selfTestStore);
  const toast = useToast();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("start") === "1") {
      window.history.replaceState(null, "", "/");
      void engine.start("table");
    }
  }, []);

  const live = snap.phase === "live" && snap.mode === "table";
  const starting = snap.phase === "starting";
  const kind = room.kind ?? "voices";
  const angles = seatAngles(listeners.length);
  const seats: Seat[] = listeners.map((l, i) => ({
    ...l,
    angleDeg: angles[i] ?? 0,
    state:
      live && snap.l1Dba !== null && snap.noiseDba !== null
        ? seatState(seatMarginDb(snap.l1Dba, snap.noiseDba, l, room.alphaDbPerDoubling, kind))
        : null,
  }));

  const { headline, sub } = describe(seats, snap.reach?.well ?? null, snap.reach?.some ?? null, live);
  const status = STATUS[snap.status];
  const StatusIcon = status.icon;

  async function stop() {
    const count = snap.utteranceCount;
    await engine.stop();
    if (count > 0) toast.show("Tonight is saved in Report.");
  }

  const description = live
    ? `Your voice reaches ${snap.reach ? fmtMeters(snap.reach.well) : "an unknown distance"} for a listener who hears well. ${seats
        .map((s) => `${s.label}: ${s.state ? SEAT_WORD[s.state] : HEARING_SHORT[s.hearing]}.`)
        .join(" ")}`
    : "A map of the table with your seat at the bottom and the people you add around it.";

  return (
    <div className="hi-table">
      <div className="hi-tablemap">
        <ReachCanvas
          seats={seats}
          reach={live ? snap.reach : null}
          previewReach={live ? snap.previewReach : null}
          chatterAudible={snap.chatterAudible}
          rippleAt={snap.rippleAt}
          live={live}
          description={description}
        />
        {live ? (
          <div className="hi-tablemap__caption" aria-hidden>
            <span>
              Room <b>{snap.noiseDba === null ? "listening" : fmtDba(snap.noiseDba)}</b>
            </span>
            <span>
              Your voice <b>{snap.l1Dba === null ? "waiting" : fmtDba(snap.l1Dba)}</b>
              {snap.estimated ? " estimated" : ""}
            </span>
          </div>
        ) : null}
      </div>

      <aside>
        <h1 className="hi-headline">{headline}</h1>
        <p className="hi-headline__sub">{sub}</p>
        <div className="hi-statusword" data-tone={status.tone} aria-live="polite">
          <StatusIcon size={20} className="hi-statusword__icon" aria-hidden />
          {status.word}
        </div>

        <div className="hi-start" style={{ marginTop: 24 }}>
          {live ? (
            <Button size="xl" variant="secondary" icon={<Square size={22} aria-hidden />} onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button
              size="xl"
              variant="primary"
              icon={<Play size={22} aria-hidden />}
              loading={starting}
              loadingLabel="Starting"
              onClick={() => void engine.start("table")}
            >
              Start
            </Button>
          )}
        </div>

        {snap.phase === "error" && snap.error ? (
          <div style={{ marginTop: 16 }}>
            <Banner tone="alarm">
              {snap.error} {MIC_HELP[snap.errorKind ?? "unknown"]}
            </Banner>
          </div>
        ) : null}

        {live && snap.babbleSource === "synthesized" ? (
          <p className="hi-micro" style={{ marginTop: 14 }}>
            Playing the built-in chatter. Add the recorded six-talker file to use it instead.
          </p>
        ) : null}

        <div style={{ marginTop: 28 }}>
          {seats.length === 0 ? (
            <p className="hi-prose" style={{ fontSize: 17 }}>
              Add the people at your table and the map will show who can hear you.{" "}
              <Link href="/people">Add people</Link>
            </p>
          ) : (
            <ul className="hi-seatlist">
              {seats.map((seat) => (
                <li className="hi-seat" key={seat.id}>
                  <span className="hi-seat__chip" aria-hidden>
                    {initialsOf(seat.label)}
                  </span>
                  <span className="hi-seat__body">
                    <span className="hi-seat__name">{seat.label}</span>
                    <span className="hi-seat__meta">
                      {HEARING_SHORT[seat.hearing]}, {fmtMetersShort(seat.distanceM)} away
                    </span>
                  </span>
                  <span className="hi-seat__state" data-tone={seat.state ?? undefined}>
                    {seat.state ? SEAT_WORD[seat.state] : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!selfTest ? (
          <div style={{ marginTop: 24 }}>
            <LinkButton href="/self-test" variant="ghost">
              Run the two-minute self-test to learn your own gain
            </LinkButton>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

const SEAT_WORD: Record<SeatState, string> = { hears: "hears you", straining: "straining", far: "too far" };

function initialsOf(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0] ?? "").slice(0, 2).toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[words.length - 1]?.[0] ?? "")).toUpperCase();
}

function describe(seats: Seat[], reachWell: number | null, reachSome: number | null, live: boolean) {
  if (!live) {
    return {
      headline: "Sit down, tap Start, and talk.",
      sub: "The map shows how far your voice reaches, and who at the table can hear you. One earbud in, the phone facing the family.",
    };
  }
  if (reachWell === null) {
    return { headline: "Say something.", sub: "The first sentence sets the map." };
  }
  const reachLine = `Your voice reaches ${fmtMeters(reachWell)} for someone who hears well${
    reachSome !== null ? `, and ${fmtMeters(reachSome)} for someone with some trouble in noise` : ""
  }.`;
  if (seats.length === 0) {
    return { headline: `Reaches ${fmtMeters(reachWell)}`, sub: reachLine };
  }
  const far = seats.filter((s) => s.state === "far").map((s) => s.label);
  const straining = seats.filter((s) => s.state === "straining").map((s) => s.label);
  if (far.length === 0 && straining.length === 0) {
    return { headline: "Everyone can hear you.", sub: reachLine };
  }
  if (far.length > 0) {
    return {
      headline: `${listNames(far)} can't hear you.`,
      sub: straining.length > 0 ? `${listNames(straining)} ${straining.length === 1 ? "is" : "are"} straining. ${reachLine}` : reachLine,
    };
  }
  return {
    headline: `${listNames(straining)} ${straining.length === 1 ? "is" : "are"} straining to hear you.`,
    sub: reachLine,
  };
}
