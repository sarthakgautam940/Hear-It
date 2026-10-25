"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, SegmentedControl, Stepper, Switch } from "@/components/ui/controls";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { DefList, PageHead, Region, SettingGroup, SettingRow } from "@/components/ui/structure";
import { useToast } from "@/components/ui/Toast";
import { SELF_TEST_SENTENCES } from "@/core/selftest";
import type { ChatterLevel, EarMode, Sensitivity } from "@/core/types";
import { useEngine } from "@/hooks/useEngine";
import { useStore } from "@/hooks/useStore";
import { fmtDate, fmtSignedDb } from "@/lib/format";
import {
  applyContrast,
  applyMotion,
  applyTextSize,
  applyTheme,
  applyVision,
  CONTRAST_CHOICES,
  CONTRAST_KEY,
  MOTION_CHOICES,
  MOTION_KEY,
  readPreference,
  TEXTSIZE_CHOICES,
  TEXTSIZE_KEY,
  THEME_CHOICES,
  THEME_KEY,
  VISION_CHOICES,
  VISION_KEY,
  type ContrastChoice,
  type MotionChoice,
  type TextSizeChoice,
  type ThemeChoice,
  type VisionChoice,
} from "@/lib/theme";
import { engine } from "@/platform/engine";
import { calibrationStore, clearAllData, selfTestStore, settingsStore } from "@/platform/storage";

const EAR_OPTIONS: ReadonlyArray<{ value: EarMode; label: string }> = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
];

const SENSITIVITY_OPTIONS: ReadonlyArray<{ value: Sensitivity; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function SettingsScreen() {
  const settings = useStore(settingsStore);
  const calibration = useStore(calibrationStore);
  const selfTest = useStore(selfTestStore);
  const [calibrating, setCalibrating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const toast = useToast();

  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [motion, setMotion] = useState<MotionChoice>("system");
  const [contrast, setContrast] = useState<ContrastChoice>("system");
  const [vision, setVision] = useState<VisionChoice>("default");
  const [textSize, setTextSize] = useState<TextSizeChoice>("default");

  useEffect(() => {
    setTheme(readPreference(THEME_KEY, THEME_CHOICES, "system"));
    setMotion(readPreference(MOTION_KEY, MOTION_CHOICES, "system"));
    setContrast(readPreference(CONTRAST_KEY, CONTRAST_CHOICES, "system"));
    setVision(readPreference(VISION_KEY, VISION_CHOICES, "default"));
    setTextSize(readPreference(TEXTSIZE_KEY, TEXTSIZE_CHOICES, "default"));
  }, []);

  const update = (patch: Partial<typeof settings>) => settingsStore.set((s) => ({ ...s, ...patch }));

  return (
    <>
      <PageHead title="Settings" lead="How the chatter plays, and how the app reads your phone." />

      <Region title="Chatter">
        <SettingGroup>
          <SettingRow
            title="Level"
            note="How loud the chatter plays when it plays. Off keeps the map without any chatter."
            control={
              <Stepper
                label="chatter level"
                value={settings.chatterLevel}
                min={0}
                max={5}
                format={(v) => (v === 0 ? "Off" : `Level ${v}`)}
                onChange={(v) => update({ chatterLevel: v as ChatterLevel })}
              />
            }
          />
          <SettingRow
            title="Find the least chatter that works"
            note={
              selfTest
                ? "After each sentence the level moves toward your target, down to none when your voice already reaches it."
                : "Needs your usual voice from the self-test first."
            }
            disabled={!selfTest}
            control={<Switch label="Adaptive chatter" checked={settings.adaptive} disabled={!selfTest} onChange={(adaptive) => update({ adaptive })} />}
          />
          <SettingRow
            title="Target"
            note="How much louder than your usual voice the chatter aims for. Trials of a clinic device landed near 3 dB in one ear."
            disabled={!settings.adaptive || !selfTest}
            control={
              <Stepper
                label="target gain"
                value={settings.targetGainDb}
                min={3}
                max={8}
                format={(v) => fmtSignedDb(v, 0)}
                disabled={!settings.adaptive || !selfTest}
                onChange={(targetGainDb) => update({ targetGainDb })}
              />
            }
          />
          <SettingRow
            title="Earbud"
            note="One ear leaves the other free for the table. Both ears is louder and hides the room: restaurant mode."
            control={<SegmentedControl aria-label="Earbud ear" options={EAR_OPTIONS} value={settings.ear} onChange={(ear) => update({ ear })} />}
          />
          <SettingRow
            title="Sensitivity"
            note="How readily the app decides you are speaking. Raise it if the chatter misses your first words; lower it if the room sets it off."
            control={<SegmentedControl aria-label="Sensitivity" options={SENSITIVITY_OPTIONS} value={settings.sensitivity} onChange={(sensitivity) => update({ sensitivity })} />}
          />
        </SettingGroup>
      </Region>

      <Region title="Measurement">
        <SettingGroup>
          <SettingRow
            title="Calibration"
            note={
              calibration.measuredAt
                ? `Measured against a meter on ${fmtDate(calibration.measuredAt)}. Levels on the map are in dBA at 1 m.`
                : "Estimated from a typical phone microphone. Read one sentence beside a sound meter 1 m away to make the numbers real."
            }
            control={<Button onClick={() => setCalibrating(true)}>Calibrate with a meter</Button>}
          />
          <SettingRow
            title="Self-test"
            note={selfTest ? `Your gain was ${fmtSignedDb(selfTest.gainDb)} on ${fmtDate(selfTest.measuredAt)}.` : "Not run yet."}
            control={
              <Button onClick={() => (window.location.href = "/self-test")}>{selfTest ? "Run again" : "Run it"}</Button>
            }
          />
        </SettingGroup>
      </Region>

      <Region title="Appearance" note="These describe the phone you read on, so they are kept per browser.">
        <SettingGroup>
          <SettingRow
            title="Theme"
            note="System follows your phone and changes with it."
            control={
              <SegmentedControl
                aria-label="Theme"
                value={theme}
                onChange={(next) => {
                  setTheme(next);
                  applyTheme(next);
                }}
                options={[
                  { value: "paper", label: "Paper" },
                  { value: "night", label: "Night" },
                  { value: "system", label: "System" },
                ]}
              />
            }
          />
          <SettingRow
            title="Text size"
            note="Scales the whole screen, so the layout keeps its proportions."
            control={
              <SegmentedControl
                aria-label="Text size"
                value={textSize}
                onChange={(next) => {
                  setTextSize(next);
                  applyTextSize(next);
                }}
                options={[
                  { value: "default", label: "Default" },
                  { value: "large", label: "Large" },
                  { value: "larger", label: "Larger" },
                ]}
              />
            }
          />
          <SettingRow
            title="Contrast"
            note="High darkens the quiet text and makes faint lines real lines."
            control={
              <SegmentedControl
                aria-label="Contrast"
                value={contrast}
                onChange={(next) => {
                  setContrast(next);
                  applyContrast(next);
                }}
                options={[
                  { value: "system", label: "System" },
                  { value: "high", label: "High" },
                ]}
              />
            }
          />
          <SettingRow
            title="Colour-blind safe"
            note="Swaps the accent, caution and alarm colours for ones that differ in brightness too. Every state is also a word."
            control={
              <SegmentedControl
                aria-label="Colour-blind safe palette"
                value={vision}
                onChange={(next) => {
                  setVision(next);
                  applyVision(next);
                }}
                options={[
                  { value: "default", label: "Default" },
                  { value: "cvd", label: "On" },
                ]}
              />
            }
          />
          <SettingRow
            title="Motion"
            note="Reduced stills the map's ripples and every animation, whatever your phone says."
            control={
              <SegmentedControl
                aria-label="Motion"
                value={motion}
                onChange={(next) => {
                  setMotion(next);
                  applyMotion(next);
                }}
                options={[
                  { value: "system", label: "System" },
                  { value: "reduced", label: "Reduced" },
                ]}
              />
            }
          />
        </SettingGroup>
      </Region>

      <Region title="This phone">
        <DeviceCheck />
      </Region>

      <Region title="Your data" note="Nothing leaves this phone. There are no accounts and no recordings; the app keeps levels, never sound.">
        <SettingGroup>
          <SettingRow
            title="Clear everything"
            note="Removes the people, the room, your self-test, your calibration and every report from this phone."
            control={
              <Button variant="danger-ghost" onClick={() => setClearing(true)}>
                Clear all data
              </Button>
            }
          />
        </SettingGroup>
      </Region>

      <CalibrationModal open={calibrating} onClose={() => setCalibrating(false)} />
      <ConfirmModal
        open={clearing}
        onClose={() => setClearing(false)}
        onConfirm={() => {
          clearAllData();
          setClearing(false);
          toast.show("Everything on this phone was cleared.");
        }}
        title="Clear all data?"
        consequence="The people, the room, your self-test, your calibration and every report are removed from this phone. This cannot be undone."
        confirmLabel="Clear everything"
      />
    </>
  );
}

function DeviceCheck() {
  const snap = useEngine();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    try {
      await engine.start("room");
      await new Promise((r) => setTimeout(r, 1200));
      setChecked(true);
      await engine.stop();
    } finally {
      setBusy(false);
    }
  }

  const caps = snap.caps;
  return (
    <SettingGroup>
      <SettingRow
        title="Check this phone"
        note="Opens the microphone for a second to confirm the browser left the signal unprocessed and to see which chatter it will play."
        control={
          <Button loading={busy} loadingLabel="Checking" onClick={() => void check()}>
            Check
          </Button>
        }
      />
      {checked && caps ? (
        <div className="hi-setrow">
          <DefList
            rows={[
              { term: "Unprocessed microphone", value: caps.rawAudio ? "Yes" : "No, the browser kept some processing on" },
              { term: "Sample rate", value: `${caps.sampleRate} Hz` },
              { term: "Chatter", value: snap.babbleSource === "recorded" ? "Recorded six-talker file" : "Built-in synthesized chatter" },
              { term: "Audio session control", value: caps.audioSession ? "Yes" : "Not on this browser" },
            ]}
          />
        </div>
      ) : null}
      {snap.phase === "error" && snap.error ? <div className="hi-setrow hi-micro">{snap.error}</div> : null}
    </SettingGroup>
  );
}

/**
 * Calibration: read one sentence while a sound meter 1 m away shows its
 * A-weighted average. The offset is that number minus what the phone heard.
 */
function CalibrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snap = useEngine();
  const [heardDbfs, setHeardDbfs] = useState<number | null>(null);
  const [meter, setMeter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setHeardDbfs(null);
    setMeter("");
    setError(null);
    return engine.onUtterance((u) => {
      if (u.leqDbfs !== null) setHeardDbfs(u.leqDbfs);
    });
  }, [open]);

  async function startListening() {
    await engine.start("selftest");
    engine.setForcedChatter(false);
  }

  function close() {
    engine.setForcedChatter(null);
    void engine.stop();
    onClose();
  }

  function save() {
    const value = Number(meter);
    if (heardDbfs === null) {
      setError("Read the sentence first.");
      return;
    }
    if (!Number.isFinite(value) || value < 40 || value > 100) {
      setError("Enter the meter's reading in dBA, between 40 and 100.");
      return;
    }
    calibrationStore.set({ offsetDb: Math.round((value - heardDbfs) * 10) / 10, measuredAt: new Date().toISOString() });
    toast.show("Calibrated. Levels on the map are now in dBA at 1 m.");
    close();
  }

  const live = snap.phase === "live";
  return (
    <Modal
      open={open}
      onClose={close}
      title="Calibrate with a meter"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={heardDbfs === null}>
            Save
          </Button>
        </>
      }
    >
      <div className="hi-stack">
        <p>
          Put a sound meter 1 m from your mouth, set to the A-weighted average. Keep the phone where you will wear it. Tap Listen, read the
          sentence below, then type what the meter shows.
        </p>
        <p className="hi-sentence" style={{ fontSize: 22, lineHeight: "30px" }}>
          {SELF_TEST_SENTENCES[0]}
        </p>
        {!live ? (
          <Button variant="primary" loading={snap.phase === "starting"} loadingLabel="Starting" onClick={() => void startListening()}>
            Listen
          </Button>
        ) : (
          <p className="hi-micro" aria-live="polite">
            {heardDbfs === null ? (snap.speaking ? "Hearing you." : "Listening. Read the sentence.") : `Heard the sentence at ${heardDbfs.toFixed(1)} dB relative to full scale. Read again to replace it.`}
          </p>
        )}
        <Field label="The meter's reading, dBA" error={error}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} aria-describedby={describedBy} invalid={invalid} inputMode="decimal" value={meter} onChange={(e) => setMeter(e.target.value)} placeholder="62" />
          )}
        </Field>
      </div>
    </Modal>
  );
}
