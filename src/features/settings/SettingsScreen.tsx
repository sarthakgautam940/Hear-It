"use client";

import { useEffect, useState } from "react";
import { BookOpen, Gauge, Mic, ShieldCheck, Trash2 } from "lucide-react";
import { Mark } from "@/brand/Logo";
import { reachFactor } from "@/core/reach";
import { WEAK_GAIN_DB } from "@/core/selftest";
import type { ChatterLevel, EarMode, Sensitivity, Settings } from "@/core/types";
import { HowItWorksSheet } from "@/features/about/HowItWorksSheet";
import { PrivacySheet } from "@/features/about/PrivacySheet";
import { useStore } from "@/hooks/useStore";
import { BRAND } from "@/lib/brand";
import { fmtDate, fmtDba, fmtSignedDb } from "@/lib/format";
import { shortDate } from "@/lib/when";
import {
  applyMotion,
  applyTextSize,
  applyTheme,
  MOTION_CHOICES,
  MOTION_KEY,
  readPreference,
  TEXTSIZE_CHOICES,
  TEXTSIZE_KEY,
  THEME_CHOICES,
  THEME_KEY,
  type MotionChoice,
  type TextSizeChoice,
  type ThemeChoice,
} from "@/lib/theme";
import { calibrationStore, roomStore, selfTestStore, settingsStore } from "@/platform/storage";
import { openVoiceCheck } from "@/shell/overlays";
import { Screen } from "@/shell/Screen";
import { Button } from "@/ui/Button";
import { LevelBars, Segmented, Stepper, Switch, type Option } from "@/ui/controls";
import { ControlBlock, Group, RowButton, RowIcon, RowStatic, Section } from "@/ui/structure";
import { CalibrateSheet } from "./CalibrateSheet";
import { ClearSheet } from "./ClearSheet";

const EARS: readonly Option<EarMode>[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
];

const EAR_PHRASE: Record<EarMode, string> = {
  left: "the left earbud",
  right: "the right earbud",
  both: "both earbuds",
};

/** The target, in decibels above your usual voice. */
const TARGET_MIN_DB = 3;
const TARGET_MAX_DB = 8;

const SENSITIVITIES: readonly Option<Sensitivity>[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const THEMES: readonly Option<ThemeChoice>[] = [
  { value: "system", label: "Automatic" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const TEXT_SIZES: readonly Option<TextSizeChoice>[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "larger", label: "Larger" },
];

const MOTIONS: readonly Option<MotionChoice>[] = [
  { value: "system", label: "Automatic" },
  { value: "reduced", label: "Reduced" },
];

type SheetName = "how" | "privacy" | "calibrate" | "clear";

export function SettingsScreen() {
  const settings = useStore(settingsStore);
  const selfTest = useStore(selfTestStore);
  const calibration = useStore(calibrationStore);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [textSize, setTextSize] = useState<TextSizeChoice>("default");
  const [motion, setMotion] = useState<MotionChoice>("system");

  useEffect(() => {
    setTheme(readPreference(THEME_KEY, THEME_CHOICES, "system"));
    setTextSize(readPreference(TEXTSIZE_KEY, TEXTSIZE_CHOICES, "default"));
    setMotion(readPreference(MOTION_KEY, MOTION_CHOICES, "system"));
  }, []);

  const update = (patch: Partial<Settings>) => settingsStore.set((s) => ({ ...s, ...patch }));
  const checked = selfTest !== null;
  const adaptive = settings.adaptive && checked;
  const close = () => setSheet(null);

  return (
    <Screen title="Settings">
      <VoiceCard />

      <Section title="Chatter">
        <Group>
          <ControlBlock title="Earbud" sub="One ear leaves the other free for the table.">
            <Segmented
              label="Earbud"
              options={EARS}
              value={settings.ear}
              onChange={(ear) => update({ ear })}
            />
          </ControlBlock>
          <RowStatic
            title="Find the least that works"
            sub={
              checked
                ? "After each sentence the chatter moves toward your target, down to none."
                : "Needs the voice check first."
            }
            trail={
              <Switch
                label="Find the least chatter that works"
                checked={adaptive}
                disabled={!checked}
                onChange={(on) => update({ adaptive: on })}
              />
            }
          />
          <ControlBlock
            title={adaptive ? "Starting level" : "Level"}
            sub={adaptive ? "Where the chatter begins each time." : "How loud the chatter plays."}
          >
            <LevelBars
              label="Chatter level"
              max={5}
              value={settings.chatterLevel}
              onChange={(level) => update({ chatterLevel: level as ChatterLevel })}
            />
          </ControlBlock>
        </Group>
      </Section>

      <Section title="Fine-tuning">
        <Group>
          <ControlBlock
            title="Target"
            sub={
              adaptive
                ? "Decibels above your usual voice."
                : "Used once the chatter is finding the least that works."
            }
          >
            <Stepper
              label="Target"
              min={TARGET_MIN_DB}
              max={TARGET_MAX_DB}
              value={settings.targetGainDb}
              format={(db) => `+${db} dB`}
              disabled={!adaptive}
              onChange={(targetGainDb) => update({ targetGainDb })}
            />
          </ControlBlock>
          <ControlBlock
            title="Sensitivity"
            sub="Higher catches softer first words. Lower ignores more of the room."
          >
            <Segmented
              label="Sensitivity"
              options={SENSITIVITIES}
              value={settings.sensitivity}
              onChange={(sensitivity) => update({ sensitivity })}
            />
          </ControlBlock>
          <RowButton
            icon={
              <RowIcon>
                <Gauge size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="Calibrate with a meter"
            sub={
              calibration.measuredAt
                ? `Calibrated ${fmtDate(calibration.measuredAt)}`
                : "Levels are estimated until you do."
            }
            onClick={() => setSheet("calibrate")}
          />
        </Group>
      </Section>

      <Section title="Look">
        <Group>
          <ControlBlock title="Theme" sub="Automatic follows your phone, day and night.">
            <Segmented
              label="Theme"
              options={THEMES}
              value={theme}
              onChange={(next) => {
                setTheme(next);
                applyTheme(next);
              }}
            />
          </ControlBlock>
          <ControlBlock title="Text size">
            <Segmented
              label="Text size"
              options={TEXT_SIZES}
              value={textSize}
              onChange={(next) => {
                setTextSize(next);
                applyTextSize(next);
              }}
            />
          </ControlBlock>
          <ControlBlock title="Motion" sub="Reduced stills the map and every animation.">
            <Segmented
              label="Motion"
              options={MOTIONS}
              value={motion}
              onChange={(next) => {
                setMotion(next);
                applyMotion(next);
              }}
            />
          </ControlBlock>
        </Group>
      </Section>

      <Section title="About">
        <Group>
          <RowButton
            icon={
              <RowIcon>
                <BookOpen size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="How it works"
            sub="The reflex, the map and the science behind them"
            onClick={() => setSheet("how")}
          />
          <RowButton
            icon={
              <RowIcon>
                <ShieldCheck size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="Privacy"
            sub="Nothing is recorded, nothing is sent"
            onClick={() => setSheet("privacy")}
          />
        </Group>
      </Section>

      <Section>
        <Group>
          <RowButton
            tone="danger"
            chevron={false}
            icon={
              <RowIcon>
                <Trash2 size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="Clear everything"
            onClick={() => setSheet("clear")}
          />
        </Group>
      </Section>

      <footer className="hi-about">
        <Mark height={30} title={BRAND.name} />
        <span>{BRAND.tagline}</span>
      </footer>

      <CalibrateSheet open={sheet === "calibrate"} onClose={close} />
      <HowItWorksSheet open={sheet === "how"} onClose={close} />
      <PrivacySheet open={sheet === "privacy"} onClose={close} />
      <ClearSheet open={sheet === "clear"} onClose={close} />
    </Screen>
  );
}

function VoiceCard() {
  const selfTest = useStore(selfTestStore);
  const calibration = useStore(calibrationStore);
  const room = useStore(roomStore);
  const weak = selfTest !== null && selfTest.gainDb < WEAK_GAIN_DB;
  return (
    <section className="hi-card hi-voicecard" aria-labelledby="hi-voice-title">
      <div className="hi-voicecard__top">
        <h2 id="hi-voice-title" className="hi-voicecard__label">
          Your voice
        </h2>
        {selfTest ? (
          <>
            <p className="hi-voicecard__value" data-weak={weak || undefined}>
              {fmtSignedDb(selfTest.gainDb)}
            </p>
            <p className="hi-voicecard__line">
              {weak
                ? "The reflex looked weak last time. Try the other ear, both ears or a higher level, then run it again."
                : `louder with the chatter, so your voice carries about ${reachFactor(selfTest.gainDb, room.alphaDbPerDoubling).toFixed(1)} times as far`}
            </p>
          </>
        ) : (
          <>
            <p className="hi-voicecard__empty">Check your voice</p>
            <p className="hi-voicecard__line">
              Ten short sentences, about two minutes, so the chatter knows your usual voice.
            </p>
          </>
        )}
      </div>
      {selfTest ? (
        <p className="hi-voicecard__facts">
          Your usual voice is {fmtDba(selfTest.baselineDb + calibration.offsetDb)}, measured with{" "}
          {EAR_PHRASE[selfTest.ear]} on {shortDate(selfTest.measuredAt)}.
        </p>
      ) : null}
      <Button
        variant={selfTest ? "secondary" : "primary"}
        size="large"
        block
        icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
        onClick={openVoiceCheck}
      >
        {selfTest ? "Check again" : "Start the voice check"}
      </Button>
    </section>
  );
}
