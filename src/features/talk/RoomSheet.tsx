"use client";

import { useState } from "react";
import { Ear } from "lucide-react";
import { noiseCostM } from "@/core/reach";
import { NOISE_KIND_LABEL, ROOM_LISTEN_SECONDS } from "@/core/room";
import { useEngine } from "@/hooks/useEngine";
import { useStore } from "@/hooks/useStore";
import { fmtDate, fmtMetersShort } from "@/lib/format";
import { engine } from "@/platform/engine";
import { calibrationStore, roomStore, selfTestStore } from "@/platform/storage";
import { Button } from "@/ui/Button";
import { Sheet } from "@/ui/Sheet";
import { Banner, Stat } from "@/ui/structure";

/** A typical conversational voice at 1 m, used until the voice check knows yours. */
const TYPICAL_VOICE_DBA = 62;

export function RoomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const room = useStore(roomStore);
  const selfTest = useStore(selfTestStore);
  const calibration = useStore(calibrationStore);
  const snap = useEngine();
  const [listening, setListening] = useState(false);

  const talking = snap.phase === "live" && snap.mode === "table";
  const noise = talking ? snap.noiseDba : room.noiseDba;
  const voiceDba = selfTest ? selfTest.baselineDb + calibration.offsetDb : TYPICAL_VOICE_DBA;
  const cost =
    noise === null
      ? null
      : noiseCostM(voiceDba, noise, "well", room.alphaDbPerDoubling, room.kind ?? "voices");
  const progress = snap.roomProgress;
  const secondsLeft =
    progress === null ? ROOM_LISTEN_SECONDS : Math.ceil(ROOM_LISTEN_SECONDS * (1 - progress));

  async function listen() {
    if (listening || talking) return;
    setListening(true);
    try {
      await engine.start("room");
      if (engine.getSnapshot().phase !== "live") return;
      const result = await engine.measureRoom(ROOM_LISTEN_SECONDS);
      roomStore.set((prev) => ({
        ...prev,
        noiseDba: Math.round(result.laeqDba * 10) / 10,
        kind: result.kind,
        measuredAt: new Date().toISOString(),
      }));
      await engine.stop();
    } finally {
      setListening(false);
    }
  }

  const kindLabel = room.kind ? NOISE_KIND_LABEL[room.kind] : null;
  const caption = talking
    ? "Measured live while you talk."
    : room.measuredAt
      ? `${kindLabel ? `${kindLabel.charAt(0).toUpperCase()}${kindLabel.slice(1)}, ` : ""}${fmtDate(room.measuredAt)}`
      : "Not measured yet.";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Room"
      footer={
        <Button
          variant="primary"
          size="large"
          block
          icon={<Ear size={20} strokeWidth={2.25} aria-hidden />}
          loading={listening}
          loadingLabel={progress === null ? "Starting" : `Stay quiet, ${secondsLeft} s`}
          disabled={talking}
          onClick={() => void listen()}
        >
          Listen for {ROOM_LISTEN_SECONDS} seconds
        </Button>
      }
    >
      <div className="hi-room">
        {noise === null ? (
          <div className="hi-room__lead">
            <h2>Check the room</h2>
            <p className="hi-quiet">
              Stay quiet for ten seconds while Hear It listens to the room around your table.
            </p>
          </div>
        ) : (
          <div>
            <p className="hi-room__value">
              {Math.round(noise)}
              <small>dB</small>
            </p>
            <p className="hi-subhead">{caption}</p>
          </div>
        )}
        {listening ? (
          <div className="hi-meter" aria-hidden>
            <div
              className="hi-meter__fill"
              style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
            />
          </div>
        ) : null}
        {snap.phase === "error" && snap.error ? <Banner>{snap.error}</Banner> : null}
        {noise === null ? null : (
          <>
            <div className="hi-stats">
              <Stat
                value={noise < 45 ? "Quiet" : noise < 55 ? "Busy" : "Loud"}
                label="How it sounds"
              />
              <Stat
                value={cost === null || cost < 0.05 ? "None" : fmtMetersShort(cost)}
                label="Reach it costs"
              />
            </div>
            <p className="hi-subhead">
              Every 5 dB of noise halves how far a voice carries, for someone who hears well.
            </p>
          </>
        )}
        {talking ? (
          <p className="hi-subhead">Stop talking to take a fresh ten-second reading.</p>
        ) : null}
      </div>
    </Sheet>
  );
}
