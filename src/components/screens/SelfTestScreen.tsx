"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Banner, SegmentedControl } from "@/components/ui/controls";
import { Measure, PageHead, Region } from "@/components/ui/structure";
import { reachFactor } from "@/core/reach";
import { makeSchedule, SELF_TEST_SENTENCES, SENTENCE_COUNT, summarizeSelfTest, WEAK_GAIN_DB } from "@/core/selftest";
import type { EarMode, SelfTestSentence } from "@/core/types";
import { useEngine } from "@/hooks/useEngine";
import { useStore } from "@/hooks/useStore";
import { fmtDate, fmtDba, fmtSignedDb } from "@/lib/format";
import { engine } from "@/platform/engine";
import { calibrationStore, roomStore, selfTestStore, settingsStore } from "@/platform/storage";

type Stage = "intro" | "running" | "done";

const EAR_OPTIONS: ReadonlyArray<{ value: EarMode; label: string }> = [
  { value: "left", label: "Left ear" },
  { value: "right", label: "Right ear" },
  { value: "both", label: "Both ears" },
];

/**
 * Ten sentences, five with chatter at random. The map and every level are
 * hidden while you read: watching a meter is the one thing shown to suppress
 * the reflex this test measures.
 */
export function SelfTestScreen() {
  const settings = useStore(settingsStore);
  const calibration = useStore(calibrationStore);
  const room = useStore(roomStore);
  const stored = useStore(selfTestStore);
  const snap = useEngine();
  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const schedule = useRef<boolean[]>([]);
  const results = useRef<SelfTestSentence[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("start") === "1") {
      window.history.replaceState(null, "", "/self-test");
      void begin();
    }
    // The auto-start reads nothing that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => void engine.stop(), []);

  function arm(i: number) {
    indexRef.current = i;
    setIndex(i);
    engine.setForcedChatter(schedule.current[i] ?? false);
  }

  async function begin() {
    schedule.current = makeSchedule(Date.now() % 65536);
    results.current = [];
    await engine.start("selftest");
    if (engine.getSnapshot().phase !== "live") return;
    setStage("running");
    arm(0);
  }

  useEffect(() => {
    if (stage !== "running") return;
    return engine.onUtterance((u) => {
      if (u.leqDbfs === null) return;
      const i = indexRef.current;
      results.current.push({ boosted: schedule.current[i] ?? false, leqDb: u.leqDbfs, f0s: u.f0s });
      advance();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function advance() {
    const next = indexRef.current + 1;
    if (next >= SENTENCE_COUNT) {
      finish();
      return;
    }
    arm(next);
  }

  function finish() {
    const result = summarizeSelfTest(results.current, settingsStore.get().ear, new Date().toISOString());
    if (result) selfTestStore.set(result);
    engine.setForcedChatter(null);
    void engine.stop();
    setStage("done");
  }

  const boosted = schedule.current[index] ?? false;
  const result = stage === "done" ? stored : null;

  if (stage === "running") {
    return (
      <>
        <PageHead title="Self-test" lead={`Sentence ${index + 1} of ${SENTENCE_COUNT}.`} rest="Read it out loud at your normal voice, as if to someone across the table." />
        <Region>
          <p className="hi-sentence">{SELF_TEST_SENTENCES[index]}</p>
          <div className="hi-statusword" data-tone={snap.chatterAudible ? "boosting" : "listening"} aria-live="polite" style={{ marginTop: 24 }}>
            {snap.chatterAudible ? <Volume2 size={20} className="hi-statusword__icon" aria-hidden /> : <Mic size={20} className="hi-statusword__icon" aria-hidden />}
            {snap.speaking ? (boosted && snap.chatterAudible ? "Boosting" : "Hearing you") : "Listening"}
          </div>
        </Region>
        <Region>
          <div className="hi-strip" aria-label={`Progress, sentence ${index + 1} of ${SENTENCE_COUNT}`}>
            {Array.from({ length: SENTENCE_COUNT }, (_, i) => (
              <span key={i} className="hi-strip__cell" data-current={i === index ? "true" : undefined} data-done={i < index ? "true" : undefined}>
                {i + 1}
              </span>
            ))}
          </div>
          <div className="hi-row" style={{ marginTop: 20 }}>
            <Button variant="ghost" onClick={advance}>
              Skip this sentence
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                engine.setForcedChatter(null);
                void engine.stop();
                setStage("intro");
              }}
            >
              Stop the test
            </Button>
          </div>
        </Region>
      </>
    );
  }

  if (stage === "done" && result) {
    const factor = reachFactor(result.gainDb, room.alphaDbPerDoubling);
    return (
      <>
        <PageHead
          title="Your result"
          lead={result.gainDb >= WEAK_GAIN_DB ? "Chatter in one ear makes you louder without trying." : "The reflex looks weak for you today."}
          rest={
            result.gainDb >= WEAK_GAIN_DB
              ? "This is your own number, from your own ten sentences. The map uses it to preview your reach with chatter."
              : "Hearing loss in the earbud ear can do this. Try the other ear, both ears, or a higher chatter level, and run it again."
          }
          actions={
            <>
              <Button onClick={() => setStage("intro")}>Run again</Button>
              <LinkButton href="/" variant="primary">
                Back to the table
              </LinkButton>
            </>
          }
        />
        <Region>
          <div className="hi-band">
            <Measure label="Your gain" value={fmtSignedDb(result.gainDb)} note={`${result.sentences.filter((s) => s.boosted).length} sentences with chatter against ${result.sentences.filter((s) => !s.boosted).length} without, ${result.ear === "both" ? "both ears" : `${result.ear} ear`}.`} />
            <Measure label="Your usual voice" value={fmtDba(result.baselineDb + calibration.offsetDb)} note={calibration.measuredAt ? "At 1 m, from the sentences without chatter." : "Estimated until you calibrate against a meter."} />
            <Measure label="More reach" value={result.gainDb > 0 ? `${factor.toFixed(1)} times as far` : "None"} note={`At ${room.alphaDbPerDoubling} dB per doubling of distance.`} />
          </div>
        </Region>
        <Region title="Each sentence" note="Chatter played during the shaded ones. Levels are at 1 m, estimated until calibrated.">
          <div className="hi-strip">
            {result.sentences.map((s, i) => (
              <span key={i} className="hi-strip__cell" data-boosted={s.boosted ? "true" : undefined} data-done="true" title={`Sentence ${i + 1}`}>
                <span>{i + 1}</span>
                <span>{Math.round(s.leqDb + calibration.offsetDb)}</span>
              </span>
            ))}
          </div>
        </Region>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Self-test"
        lead="Two minutes. Ten sentences. Your own gain, measured."
        rest="Five sentences get soft chatter in your ear at random and five do not. Read each one at your normal voice; the app compares the two groups and keeps your usual level and your pitch, so the chatter never fires on someone else."
        actions={
          <Button variant="primary" size="lg" icon={<Mic size={20} aria-hidden />} loading={snap.phase === "starting"} loadingLabel="Starting" onClick={() => void begin()}>
            Begin
          </Button>
        }
      />
      {snap.phase === "error" && snap.error ? (
        <div style={{ marginBottom: 24 }}>
          <Banner tone="alarm">{snap.error}</Banner>
        </div>
      ) : null}
      <Region title="Before you start">
        <div className="hi-stack">
          <div className="hi-field">
            <span className="hi-field__label">Which ear has the earbud?</span>
            <SegmentedControl aria-label="Earbud ear" options={EAR_OPTIONS} value={settings.ear} onChange={(ear) => settingsStore.set((s) => ({ ...s, ear }))} />
            <span className="hi-field__hint">Use the ear that hears better, or the one without a hearing aid. Both ears is louder and hides the room.</span>
          </div>
          <p className="hi-prose">
            Put the phone where you will keep it, a lanyard or a shirt pocket, and face the room as you normally would. Do not try to be loud
            or quiet. The whole point is what your voice does on its own.
          </p>
        </div>
      </Region>
      {stored ? (
        <Region title="Last time" note={fmtDate(stored.measuredAt)}>
          <div className="hi-band">
            <Measure label="Gain" value={fmtSignedDb(stored.gainDb)} />
            <Measure label="Usual voice" value={fmtDba(stored.baselineDb + calibration.offsetDb)} />
          </div>
        </Region>
      ) : null}
    </>
  );
}
