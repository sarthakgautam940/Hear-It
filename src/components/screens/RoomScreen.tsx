"use client";

import { useEffect, useRef, useState } from "react";
import { Ear } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/controls";
import { Measure, PageHead, Region } from "@/components/ui/structure";
import { noiseCostM, QUIET_ROOM_DBA } from "@/core/reach";
import { NOISE_KIND_LABEL, ROOM_LISTEN_SECONDS } from "@/core/room";
import { useEngine } from "@/hooks/useEngine";
import { useStore } from "@/hooks/useStore";
import { fmtDate, fmtDba, fmtMeters } from "@/lib/format";
import { engine } from "@/platform/engine";
import { calibrationStore, roomStore, selfTestStore } from "@/platform/storage";

/** A typical conversational voice at 1 m, used until the self-test knows yours. */
const TYPICAL_VOICE_DBA = 62;

export function RoomScreen() {
  const room = useStore(roomStore);
  const selfTest = useStore(selfTestStore);
  const calibration = useStore(calibrationStore);
  const snap = useEngine();
  const [listening, setListening] = useState(false);
  const started = useRef(false);

  const voiceDba = selfTest ? selfTest.baselineDb + calibration.offsetDb : TYPICAL_VOICE_DBA;

  async function listen() {
    if (listening) return;
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

  useEffect(() => {
    if (started.current) return;
    if (new URLSearchParams(window.location.search).get("listen") === "1") {
      started.current = true;
      window.history.replaceState(null, "", "/room");
      void listen();
    }
    // Runs once; `listen` reads live stores when it executes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = snap.roomProgress;
  const secondsLeft = progress === null ? ROOM_LISTEN_SECONDS : Math.ceil(ROOM_LISTEN_SECONDS * (1 - progress));
  const cost = room.noiseDba === null ? null : noiseCostM(voiceDba, room.noiseDba, "well", room.alphaDbPerDoubling, room.kind ?? "voices");

  return (
    <>
      <PageHead
        title="Room"
        lead="Every 5 dB of room noise halves how far your voice reaches."
        rest="Listen for ten seconds with nobody talking. The map uses the result until the live floor takes over."
        actions={
          <Button
            variant="primary"
            size="lg"
            icon={<Ear size={20} aria-hidden />}
            loading={listening}
            loadingLabel={progress === null ? "Starting" : `Listening, ${secondsLeft} s`}
            onClick={() => void listen()}
          >
            Listen for {ROOM_LISTEN_SECONDS} seconds
          </Button>
        }
      />

      {snap.phase === "error" && snap.error ? (
        <div style={{ marginBottom: 24 }}>
          <Banner tone="alarm">{snap.error}</Banner>
        </div>
      ) : null}

      {listening ? (
        <Region title="Stay quiet" note="Set the phone down where you will sit. Any voice during these seconds counts as room noise.">
          <div className="hi-bars">
            <div className="hi-bar">
              <span>Listening</span>
              <span className="hi-bar__track" aria-hidden>
                <span className="hi-bar__fill" data-tone="accent" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
              </span>
              <span className="hi-bar__val">{secondsLeft} s</span>
            </div>
          </div>
        </Region>
      ) : null}

      <Region title="This room">
        <div className="hi-band">
          <Measure
            label="Room noise"
            value={room.noiseDba === null ? "Not measured" : Math.round(room.noiseDba)}
            unit={room.noiseDba === null ? undefined : "dBA"}
            empty={room.noiseDba === null}
            note={
              room.noiseDba === null
                ? "Tap Listen with nobody talking."
                : `${room.kind ? NOISE_KIND_LABEL[room.kind].charAt(0).toUpperCase() + NOISE_KIND_LABEL[room.kind].slice(1) : "Measured"}${
                    room.measuredAt ? `, ${fmtDate(room.measuredAt)}` : ""
                  }${calibration.measuredAt ? "" : ". Estimated until you calibrate."}`
            }
          />
          <Measure
            label="What it costs you"
            value={cost === null ? "Unknown" : cost < 0.05 ? "Nothing" : fmtMeters(cost).replace("about ", "")}
            empty={cost === null}
            note={
              cost === null
                ? "Reach lost against a quiet room."
                : `Reach lost against a quiet ${QUIET_ROOM_DBA} dBA room, for someone who hears well, with ${
                    selfTest ? "your usual voice" : "a typical voice"
                  } of ${fmtDba(voiceDba)}.`
            }
          />
        </div>
      </Region>

      <Region title="What the number means" tight>
        <div className="hi-prose">
          <p>
            A listener needs your voice to stand clearly above the noise around them: about 8 dB above it for someone who hears
            well in noise, 13 dB for someone with some trouble, and 19 dB for someone with hearing aids or a lot of trouble.
            Voices in the background mask more than a steady hum, so the kind of noise matters as well as the level.
          </p>
          <p>
            Your voice falls about {room.alphaDbPerDoubling} dB each time the distance doubles. Put the two together and the map
            can draw how far you reach, and how much of that this room takes away.
          </p>
        </div>
      </Region>
    </>
  );
}
