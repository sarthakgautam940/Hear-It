"use client";

import { useEffect, useReducer } from "react";
import { AudioLines, Mic, RotateCcw } from "lucide-react";
import { CheckScene } from "@/brand/scenes";
import { reachFactor } from "@/core/reach";
import {
  makeSchedule,
  SELF_TEST_SENTENCES,
  SENTENCE_COUNT,
  summarizeSelfTest,
  WEAK_GAIN_DB,
} from "@/core/selftest";
import type { EarMode, SelfTestResult, SelfTestSentence } from "@/core/types";
import { useEngine } from "@/hooks/useEngine";
import { useStore } from "@/hooks/useStore";
import { fmtDate, fmtDba, fmtSignedDb } from "@/lib/format";
import { engine } from "@/platform/engine";
import { calibrationStore, roomStore, selfTestStore, settingsStore } from "@/platform/storage";
import { Button } from "@/ui/Button";
import { Fieldset, Segmented, type Option } from "@/ui/controls";
import { Sheet } from "@/ui/Sheet";
import { Banner, Section, Stat } from "@/ui/structure";
import { LevelPlot } from "./LevelPlot";

const EARS: readonly Option<EarMode>[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
];

const EAR_WORD: Record<EarMode, string> = {
  left: "left ear",
  right: "right ear",
  both: "both ears",
};

interface Run {
  stage: "intro" | "reading" | "result";
  schedule: boolean[];
  index: number;
  sentences: SelfTestSentence[];
  result: SelfTestResult | null;
  failed: boolean;
}

type Action =
  | { type: "begin"; schedule: boolean[] }
  | { type: "heard"; sentence: Omit<SelfTestSentence, "boosted">; ear: EarMode; at: string }
  | { type: "skip"; ear: EarMode; at: string }
  | { type: "reset" };

const IDLE: Run = {
  stage: "intro",
  schedule: [],
  index: 0,
  sentences: [],
  result: null,
  failed: false,
};

function next(run: Run, sentences: SelfTestSentence[], ear: EarMode, at: string): Run {
  const index = run.index + 1;
  if (index < SENTENCE_COUNT) return { ...run, index, sentences };
  const result = summarizeSelfTest(sentences, ear, at);
  return result ? { ...run, stage: "result", index, sentences, result } : { ...IDLE, failed: true };
}

function reduce(run: Run, action: Action): Run {
  switch (action.type) {
    case "begin":
      return { ...IDLE, stage: "reading", schedule: action.schedule };
    case "heard":
      if (run.stage !== "reading") return run;
      return next(
        run,
        [...run.sentences, { ...action.sentence, boosted: run.schedule[run.index] ?? false }],
        action.ear,
        action.at,
      );
    case "skip":
      return run.stage === "reading" ? next(run, run.sentences, action.ear, action.at) : run;
    case "reset":
      return IDLE;
  }
}

function stopCheck(): void {
  engine.setForcedChatter(null);
  if (engine.getSnapshot().mode === "selftest") void engine.stop();
}

/**
 * Ten sentences, five with chatter at random. Nothing is shown while you read:
 * watching a loudness readout is the one thing shown to suppress the reflex
 * this check measures.
 */
export function VoiceCheckSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snap = useEngine();
  const [run, dispatch] = useReducer(reduce, IDLE);
  const reading = run.stage === "reading";

  useEffect(() => {
    if (open) dispatch({ type: "reset" });
  }, [open]);

  useEffect(() => {
    if (!reading) return;
    engine.setForcedChatter(run.schedule[run.index] ?? false);
  }, [reading, run.schedule, run.index]);

  useEffect(() => {
    if (!reading) return;
    return engine.onUtterance((u) => {
      if (u.leqDbfs === null) return;
      dispatch({
        type: "heard",
        sentence: { leqDb: u.leqDbfs, f0s: u.f0s, clarityDb: u.clarityDb },
        ear: settingsStore.get().ear,
        at: new Date().toISOString(),
      });
    });
  }, [reading]);

  useEffect(() => {
    if (!reading) stopCheck();
  }, [reading]);

  useEffect(() => {
    if (run.result) selfTestStore.set(run.result);
  }, [run.result]);

  useEffect(() => () => stopCheck(), []);

  async function begin() {
    const schedule = makeSchedule(Date.now() % 65536);
    await engine.start("selftest");
    if (engine.getSnapshot().phase === "live") dispatch({ type: "begin", schedule });
  }

  function close() {
    dispatch({ type: "reset" });
    onClose();
  }

  const starting = snap.phase === "starting" && snap.mode === "selftest";
  const talking = snap.phase === "live" && snap.mode === "table";

  let footer;
  if (run.stage === "reading") {
    footer = (
      <Button
        variant="secondary"
        size="large"
        block
        onClick={() =>
          dispatch({ type: "skip", ear: settingsStore.get().ear, at: new Date().toISOString() })
        }
      >
        Skip this sentence
      </Button>
    );
  } else if (run.stage === "result") {
    footer = (
      <>
        <Button variant="primary" size="large" block onClick={close}>
          Done
        </Button>
        <Button
          variant="plain"
          block
          icon={<RotateCcw size={18} strokeWidth={2.25} aria-hidden />}
          onClick={() => dispatch({ type: "reset" })}
        >
          Run it again
        </Button>
      </>
    );
  } else {
    footer = (
      <Button
        variant="primary"
        size="large"
        block
        icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
        loading={starting}
        loadingLabel="Starting"
        disabled={talking}
        onClick={() => void begin()}
      >
        Begin
      </Button>
    );
  }

  return (
    <Sheet open={open} onClose={close} title="Voice check" size="full" footer={footer}>
      {run.stage === "reading" ? (
        <Reading index={run.index} speaking={snap.speaking} />
      ) : run.stage === "result" && run.result ? (
        <Result result={run.result} />
      ) : (
        <Intro
          failed={run.failed}
          talking={talking}
          error={snap.phase === "error" ? snap.error : null}
        />
      )}
    </Sheet>
  );
}

function Intro({
  failed,
  talking,
  error,
}: {
  failed: boolean;
  talking: boolean;
  error: string | null;
}) {
  const settings = useStore(settingsStore);
  const stored = useStore(selfTestStore);
  return (
    <div className="hi-vc">
      <div className="hi-vc__lead">
        <h3 className="hi-title2">How much louder you get</h3>
        <p className="hi-quiet">
          Read ten short sentences in your normal voice. Five get soft chatter in your ear at
          random, and Hear It compares the two.
        </p>
      </div>
      <CheckScene />
      <Fieldset
        label="Which ear has the earbud?"
        hint="Use the ear that hears better. Both is louder and hides the room."
      >
        <Segmented
          label="Earbud"
          options={EARS}
          value={settings.ear}
          onChange={(ear) => settingsStore.set((s) => ({ ...s, ear }))}
        />
      </Fieldset>
      {talking ? <Banner>Stop the conversation first, then begin.</Banner> : null}
      {failed ? (
        <Banner>
          Too few sentences were heard to compare. Try again somewhere a little quieter.
        </Banner>
      ) : null}
      {error ? <Banner>{error}</Banner> : null}
      {stored ? (
        <p className="hi-subhead">
          Last time, {fmtSignedDb(stored.gainDb)} with the {EAR_WORD[stored.ear]} on{" "}
          {fmtDate(stored.measuredAt)}.
        </p>
      ) : null}
    </div>
  );
}

function Reading({ index, speaking }: { index: number; speaking: boolean }) {
  return (
    <div className="hi-vc" data-stage="reading">
      <div className="hi-steps" aria-hidden>
        {Array.from({ length: SENTENCE_COUNT }, (_, i) => (
          <span key={i} data-done={i < index} data-current={i === index} />
        ))}
      </div>
      <p className="hi-vc__count">
        Sentence {index + 1} of {SENTENCE_COUNT}
      </p>
      <p className="hi-vc__sentence" aria-live="polite">
        {SELF_TEST_SENTENCES[index]}
      </p>
      <p className="hi-vc__status">
        <AudioLines size={20} strokeWidth={2.25} aria-hidden />
        {speaking ? "Hearing you" : "Read it out loud"}
      </p>
    </div>
  );
}

function Result({ result }: { result: SelfTestResult }) {
  const calibration = useStore(calibrationStore);
  const room = useStore(roomStore);
  const strong = result.gainDb >= WEAK_GAIN_DB;
  const factor = reachFactor(result.gainDb, room.alphaDbPerDoubling);
  const estimated = calibration.measuredAt === null;
  return (
    <>
      <div className="hi-hero">
        <span className="hi-hero__value">{fmtSignedDb(result.gainDb)}</span>
        <span className="hi-hero__line">
          {strong ? "louder with the chatter" : "The reflex looks weak today"}
        </span>
        <span className="hi-hero__sub">
          {strong
            ? `Your voice carries about ${factor.toFixed(1)} times as far with it.`
            : "Hearing loss in the earbud ear can do this. Try the other ear, both ears, or a higher level."}
        </span>
      </div>
      <Section
        title="Your ten sentences"
        note={`Each dot is one sentence, at 1 m${estimated ? ", estimated until you calibrate" : ""}. The mark is each group’s average.`}
      >
        <LevelPlot sentences={result.sentences} offsetDb={calibration.offsetDb} />
      </Section>
      <Section title="What it learned">
        <div className="hi-stats">
          <Stat
            value={fmtDba(result.baselineDb + calibration.offsetDb)}
            label="Your usual voice"
            note="At 1 m, without the chatter."
          />
          <Stat
            value={
              result.clarityChangeDb === null
                ? "No comparison"
                : fmtSignedDb(result.clarityChangeDb)
            }
            label="Clearer"
            note="Consonants against vowels."
            empty={result.clarityChangeDb === null}
          />
        </div>
      </Section>
    </>
  );
}
