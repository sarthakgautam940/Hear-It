"use client";

import { useEffect, useState } from "react";
import { AudioLines, Mic } from "lucide-react";
import { SELF_TEST_SENTENCES } from "@/core/selftest";
import { useEngine } from "@/hooks/useEngine";
import { engine } from "@/platform/engine";
import { calibrationStore } from "@/platform/storage";
import { Button } from "@/ui/Button";
import { Fieldset, TextInput } from "@/ui/controls";
import { Sheet } from "@/ui/Sheet";
import { Banner } from "@/ui/structure";
import { useToast } from "@/ui/Toast";

const METER_MIN_DBA = 40;
const METER_MAX_DBA = 100;

function release(): void {
  engine.setForcedChatter(null);
  if (engine.getSnapshot().mode === "selftest") void engine.stop();
}

/**
 * Read one sentence while a sound meter 1 m away shows its A-weighted average.
 * The offset is that reading minus what the phone heard, and it is the one
 * place an absolute level enters the app.
 */
export function CalibrateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const snap = useEngine();
  const toast = useToast();
  const [heardDbfs, setHeardDbfs] = useState<number | null>(null);
  const [meter, setMeter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHeardDbfs(null);
    setMeter("");
    setError(null);
    return engine.onUtterance((u) => {
      if (u.leqDbfs !== null) setHeardDbfs(u.leqDbfs);
    });
  }, [open]);

  async function listen() {
    await engine.start("selftest");
    engine.setForcedChatter(false);
  }

  function close() {
    release();
    onClose();
  }

  function save() {
    const value = Number(meter.replace(",", "."));
    if (heardDbfs === null) {
      setError("Read the sentence out loud first.");
      return;
    }
    if (!Number.isFinite(value) || value < METER_MIN_DBA || value > METER_MAX_DBA) {
      setError(`Type the meter’s reading in dBA, between ${METER_MIN_DBA} and ${METER_MAX_DBA}.`);
      return;
    }
    calibrationStore.set({
      offsetDb: Math.round((value - heardDbfs) * 10) / 10,
      measuredAt: new Date().toISOString(),
    });
    toast.show("Calibrated. Levels are now in dBA at 1 m.");
    close();
  }

  const listening = snap.phase === "live" && snap.mode === "selftest";
  const talking = snap.phase === "live" && snap.mode === "table";

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Calibrate"
      footer={
        <Button variant="primary" size="large" block disabled={heardDbfs === null} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="hi-vc">
        <p className="hi-quiet">
          Set a sound meter to its A-weighted average and hold it 1 m from your mouth. Tap Listen,
          read the sentence, then type what the meter shows.
        </p>
        <p className="hi-vc__sentence">{SELF_TEST_SENTENCES[0]}</p>
        {talking ? (
          <Banner>Stop the conversation first, then listen.</Banner>
        ) : listening ? (
          <p className="hi-vc__status" aria-live="polite">
            <AudioLines size={20} strokeWidth={2.25} aria-hidden />
            {heardDbfs === null
              ? snap.speaking
                ? "Hearing you"
                : "Listening. Read the sentence."
              : "Heard it. Read it again to replace it."}
          </p>
        ) : (
          <Button
            variant="secondary"
            size="large"
            block
            icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
            loading={snap.phase === "starting"}
            loadingLabel="Starting"
            onClick={() => void listen()}
          >
            Listen
          </Button>
        )}
        {snap.phase === "error" && snap.error ? <Banner>{snap.error}</Banner> : null}
        <Fieldset label="The meter’s reading, in dBA" error={error}>
          <TextInput
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="62"
            aria-label="The meter’s reading, in dBA"
            invalid={Boolean(error)}
            value={meter}
            onChange={(e) => {
              setMeter(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
        </Fieldset>
      </div>
    </Sheet>
  );
}
