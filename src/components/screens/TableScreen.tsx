"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check, Mic, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { ReachCanvas, type Seat } from "@/components/table/ReachCanvas";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/controls";
import { useToast } from "@/components/ui/Toast";
import { HEARING_SHORT, initials, seatAngles } from "@/core/listeners";
import { REACH_MAX_M, SEAT_WORD, seatMarginDb, seatState } from "@/core/reach";
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

type SetupKey = "people" | "room" | "selfTest";

const SETUP: ReadonlyArray<{ key: SetupKey; href: string; todo: string; done: string }> = [
  { key: "people", href: "/people", todo: "Add the people at your table", done: "People added" },
  { key: "room", href: "/room", todo: "Listen to the room for ten seconds", done: "Room measured" },
  {
    key: "selfTest",
    href: "/self-test",
    todo: "Run the two-minute self-test",
    done: "Self-test done",
  },
];

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

  const { headline, sub } = describe(
    seats,
    snap.reach?.well ?? null,
    snap.reach?.some ?? null,
    live,
  );
  const status = STATUS[snap.status];
  const StatusIcon = status.icon;
  const setup: Record<SetupKey, boolean> = {
    people: listeners.length > 0,
    room: room.noiseDba !== null,
    selfTest: selfTest !== null,
  };
  const setupComplete = setup.people && setup.room && setup.selfTest;

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
            <Button
              size="xl"
              variant="secondary"
              icon={<Square size={22} aria-hidden />}
              onClick={stop}
            >
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

        {seats.length > 0 ? (
          <div style={{ marginTop: 28 }}>
            <ul className="hi-seatlist">
              {seats.map((seat) => (
                <li className="hi-seat" key={seat.id}>
                  <span className="hi-seat__chip" aria-hidden>
                    {initials(seat.label)}
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
          </div>
        ) : null}

        {!live && !setupComplete ? (
          <div style={{ marginTop: 32 }}>
            <SetupSteps state={setup} />
          </div>
        ) : null}
      </aside>
    </div>
  );
}

/* The three things to set up, each done or one tap away; gone once all three are. */
function SetupSteps({ state }: { state: Record<SetupKey, boolean> }) {
  return (
    <section aria-labelledby="hi-setup-title">
      <h2 id="hi-setup-title" className="hi-setup__title">
        Before the first dinner
      </h2>
      <ul className="hi-setup">
        {SETUP.map((step) => {
          const done = state[step.key];
          return (
            <li key={step.key} className="hi-setup__row" data-done={done ? "true" : undefined}>
              <span className="hi-setup__mark" data-done={done ? "true" : undefined} aria-hidden>
                {done ? <Check size={15} strokeWidth={3} /> : null}
              </span>
              {done ? (
                <span>{step.done}</span>
              ) : (
                <Link href={step.href} className="hi-setup__link">
                  {step.todo}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function reachSentence(well: number, some: number | null): string {
  if (well >= REACH_MAX_M && (some === null || some >= REACH_MAX_M)) {
    return "Your voice carries across the whole room, even for someone with some trouble in noise.";
  }
  const forSome =
    some === null ? "" : `, and ${fmtMeters(some)} for someone with some trouble in noise`;
  return `Your voice reaches ${fmtMeters(well)} for someone who hears well${forSome}.`;
}

function describe(
  seats: Seat[],
  reachWell: number | null,
  reachSome: number | null,
  live: boolean,
) {
  if (!live) {
    return {
      headline: "Sit down, tap Start, and talk.",
      sub: "The map shows how far your voice reaches, and who at the table can hear you. One earbud in, the phone facing the family.",
    };
  }
  if (reachWell === null) {
    return { headline: "Say something.", sub: "The first sentence sets the map." };
  }
  const reachLine = reachSentence(reachWell, reachSome);
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
      sub:
        straining.length > 0
          ? `${listNames(straining)} ${straining.length === 1 ? "is" : "are"} straining. ${reachLine}`
          : reachLine,
    };
  }
  return {
    headline: `${listNames(straining)} ${straining.length === 1 ? "is" : "are"} straining to hear you.`,
    sub: reachLine,
  };
}
