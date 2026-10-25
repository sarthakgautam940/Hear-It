"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { AudioLines, ChevronLeft, Mic, Plus } from "lucide-react";
import { SELF_TEST_SENTENCES, SENTENCE_COUNT } from "@/core/selftest";
import type { EarMode } from "@/core/types";
import { usePeopleEditor } from "@/features/people/usePeopleEditor";
import type { TableSeat } from "@/features/talk/table";
import { TableMap } from "@/features/talk/TableMap";
import { EarScene } from "./EarScene";
import { useHydrated } from "@/hooks/useHydrated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStore } from "@/hooks/useStore";
import { BRAND } from "@/lib/brand";
import { isOnboarded, markOnboarded, subscribeOnboarded } from "@/lib/theme";
import { MicrophoneError, requestMicrophoneAccess } from "@/platform/audio";
import { settingsStore } from "@/platform/storage";
import { openVoiceCheck } from "@/shell/overlays";
import { stepTransition } from "@/shell/transitions";
import { MIC_HELP } from "@/shell/talking";
import { Button } from "@/ui/Button";
import { ChoiceList, type Choice } from "@/ui/controls";
import { Banner } from "@/ui/structure";

const STEP_COUNT = 4;

const EAR_CHOICES: readonly Choice<EarMode>[] = [
  { value: "left", title: "Left ear" },
  { value: "right", title: "Right ear" },
  { value: "both", title: "Both ears", sub: "Louder, and hides the room" },
];

/**
 * Shown once: the idea in one picture, the table, the earbud, and the voice
 * check. Every step after the welcome can be skipped, and nothing here is
 * asked again; the main screens carry status, never instructions.
 */
export function FirstRun() {
  const hydrated = useHydrated();
  const onboarded = useSyncExternalStore(subscribeOnboarded, isOnboarded, () => false);
  const [step, setStep] = useState(0);
  if (hydrated && onboarded) return null;

  function finish(thenCheck: boolean) {
    stepTransition("forward", () => {
      setStep(0);
      markOnboarded();
    });
    if (thenCheck) openVoiceCheck();
  }

  const back = () => stepTransition("back", () => setStep((s) => Math.max(0, s - 1)));
  const forward = () =>
    stepTransition("forward", () => setStep((s) => Math.min(STEP_COUNT - 1, s + 1)));

  return (
    <div
      className="hi-firstrun"
      data-pending={!hydrated}
      role="dialog"
      aria-modal="true"
      aria-label={`Welcome to ${BRAND.name}`}
    >
      {step === 0 ? <Welcome key="welcome" onNext={forward} /> : null}
      {step === 1 ? <TableStep key="table" onBack={back} onNext={forward} /> : null}
      {step === 2 ? <EarStep key="ear" onBack={back} onNext={forward} /> : null}
      {step === 3 ? <CheckStep key="check" onBack={back} onFinish={finish} /> : null}
    </div>
  );
}

/* The idea in two beats: a quiet voice reaches only the nearest seat; with chatter, everyone turns to you. */
const STORY: readonly Omit<TableSeat, "state">[] = [
  { id: "ana", label: "Ana", hearing: "well", seat: "L1" },
  { id: "jane", label: "Jane", hearing: "some", seat: "R2" },
  { id: "tom", label: "Tom", hearing: "well", seat: "L3" },
];
const LIGHT_AFTER_MS = 1400;

function Welcome({ onNext }: { onNext: () => void }) {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (reduced) {
      setLit(true);
      return;
    }
    const timer = window.setTimeout(() => setLit(true), LIGHT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [reduced]);
  const seats: TableSeat[] = STORY.map((s) => ({
    ...s,
    state: lit || s.seat === "L1" ? "hears" : "far",
  }));

  return (
    <div className="hi-fr hi-fr--welcome">
      <div className="hi-fr__art">
        <div className="hi-fr__card">
          <TableMap
            seats={seats}
            top={64}
            description="A dinner table seen from above. A quiet voice reaches only the nearest person; with soft chatter in one ear, everyone at the table turns to listen."
          />
        </div>
      </div>
      <div className="hi-fr__text">
        <h1>{BRAND.tagline}</h1>
        <p>Soft chatter in one earbud lifts your voice. The table shows who hears you.</p>
      </div>
      <div className="hi-fr__actions">
        <Button variant="primary" size="large" block onClick={onNext}>
          Get started
        </Button>
      </div>
    </div>
  );
}

function StepFrame({
  step,
  onBack,
  onSkip,
  art,
  compactArt = false,
  title,
  text,
  children,
  actions,
}: {
  step: number;
  onBack: () => void;
  onSkip?: () => void;
  art?: ReactNode;
  /** The picture gives way to a step's choices, so the action stays on screen. */
  compactArt?: boolean;
  title: string;
  text: string;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className={art ? "hi-fr" : "hi-fr hi-fr--plain"}>
      <div className="hi-fr__top">
        <button type="button" className="hi-ibtn" aria-label="Back" onClick={onBack}>
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
        </button>
        <div className="hi-dots" role="img" aria-label={`Step ${step + 1} of ${STEP_COUNT}`}>
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span key={i} data-on={i === step} />
          ))}
        </div>
        {onSkip ? (
          <Button variant="plain" className="hi-fr__skip" onClick={onSkip}>
            Skip
          </Button>
        ) : (
          <span className="hi-fr__skip" aria-hidden />
        )}
      </div>
      {art ? (
        <div className={compactArt ? "hi-fr__art hi-fr__art--compact" : "hi-fr__art"}>{art}</div>
      ) : null}
      <div className="hi-fr__text">
        <h1>{title}</h1>
        <p>{text}</p>
        {children}
      </div>
      <div className="hi-fr__actions">{actions}</div>
    </div>
  );
}

function TableStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { listeners, full, add, edit, sheet } = usePeopleEditor();
  const seated = listeners.length > 0;

  return (
    <>
      <StepFrame
        step={1}
        onBack={onBack}
        onSkip={onNext}
        art={
          <div className="hi-fr__card">
            <TableMap
              seats={listeners.map((l) => ({ ...l, state: null }))}
              onAdd={add}
              onSeat={edit}
              description={
                seated
                  ? `Your table, with ${listeners.map((l) => l.label).join(", ")}. Tap someone to change or remove them.`
                  : "An empty table with three open chairs."
              }
            />
          </div>
        }
        title="Who sits at your table?"
        text={
          seated
            ? "Tap anyone at the table to change how they hear, or to remove them."
            : "Add the people you talk with most, and how each one hears in a busy room."
        }
        actions={
          seated ? (
            <>
              <Button variant="primary" size="large" block onClick={onNext}>
                Continue
              </Button>
              <Button
                variant="plain"
                block
                icon={<Plus size={18} strokeWidth={2.25} aria-hidden />}
                disabled={full}
                onClick={() => add()}
              >
                Add another person
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="large"
              block
              icon={<Plus size={20} strokeWidth={2.25} aria-hidden />}
              onClick={() => add()}
            >
              Add a person
            </Button>
          )
        }
      />
      {sheet}
    </>
  );
}

function EarStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const settings = useStore(settingsStore);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function allow() {
    setAsking(true);
    try {
      await requestMicrophoneAccess();
      onNext();
    } catch (err) {
      setProblem(MIC_HELP[err instanceof MicrophoneError ? err.kind : "unknown"]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <StepFrame
      step={2}
      onBack={onBack}
      onSkip={onNext}
      compactArt
      art={
        <div className="hi-fr__card">
          <EarScene ear={settings.ear} />
        </div>
      }
      title="Put one earbud in"
      text="The chatter plays in it only while you speak. Choose the ear that hears better."
      actions={
        problem ? (
          <>
            <Banner>{problem}</Banner>
            <Button variant="primary" size="large" block onClick={onNext}>
              Continue
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="large"
              block
              icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
              loading={asking}
              loadingLabel="Waiting for your answer"
              onClick={() => void allow()}
            >
              Allow the microphone
            </Button>
            <p className="hi-fr__note">It measures how loud you are. Nothing is recorded.</p>
          </>
        )
      }
    >
      <ChoiceList
        label="Earbud ear"
        choices={EAR_CHOICES}
        value={settings.ear}
        onChange={(ear) => settingsStore.set((s) => ({ ...s, ear }))}
      />
    </StepFrame>
  );
}

function CheckStep({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: (thenCheck: boolean) => void;
}) {
  return (
    <StepFrame
      step={3}
      onBack={onBack}
      art={<ReadingPreview />}
      title="Check your voice"
      text="Read ten short sentences. Five get chatter at random, and Hear It compares the two. About two minutes."
      actions={
        <>
          <Button
            variant="primary"
            size="large"
            block
            icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
            onClick={() => onFinish(true)}
          >
            Start the voice check
          </Button>
          <Button variant="plain" block onClick={() => onFinish(false)}>
            Later
          </Button>
        </>
      }
    />
  );
}

/* The reading screen in miniature: the next two minutes, shown rather than described. */
const PREVIEW_AT = 3;

function ReadingPreview() {
  return (
    <div className="hi-card hi-fr__preview" aria-hidden>
      <div className="hi-steps">
        {Array.from({ length: SENTENCE_COUNT }, (_, i) => (
          <span key={i} data-done={i < PREVIEW_AT} data-current={i === PREVIEW_AT} />
        ))}
      </div>
      <p className="hi-vc__count">
        Sentence {PREVIEW_AT + 1} of {SENTENCE_COUNT}
      </p>
      <p className="hi-fr__preview-sentence">{SELF_TEST_SENTENCES[PREVIEW_AT]}</p>
      <p className="hi-vc__status">
        <AudioLines size={20} strokeWidth={2.25} aria-hidden />
        Hearing you
      </p>
    </div>
  );
}
