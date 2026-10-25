import { describe, expect, it } from "vitest";
import { createGate, gateIsOpen } from "@/core/gate";
import type { Frame } from "@/core/types";
import { createVad, DEFAULT_VAD, sensitivityMargin } from "@/core/vad";

function frame(levelADb: number, i: number, f0Hz: number | null = null): Frame {
  return { tMs: i * 20, levelDb: levelADb, levelADb, loDb: levelADb, hiDb: levelADb - 10, f0Hz, clipped: false };
}

function makeVad(extra: Partial<Parameters<typeof createVad>[0]> = {}) {
  return createVad({ ...DEFAULT_VAD, marginDb: 10, baselineDb: null, f0Range: null, ...extra });
}

/* Seeds the floor at -60 with 25 quiet frames, then returns the next frame index. */
function seed(vad: ReturnType<typeof createVad>): number {
  for (let i = 0; i < 25; i++) vad.step(frame(-60, i));
  return 25;
}

describe("voice detection", () => {
  it("maps sensitivity to the onset margin", () => {
    expect(sensitivityMargin("low")).toBe(12);
    expect(sensitivityMargin("medium")).toBe(10);
    expect(sensitivityMargin("high")).toBe(8);
  });

  it("opens on the third consecutive frame above the margin, not the second", () => {
    const vad = makeVad();
    let i = seed(vad);
    expect(vad.step(frame(-40, i++)).speaking).toBe(false);
    expect(vad.step(frame(-40, i++)).speaking).toBe(false);
    expect(vad.step(frame(-60, i++)).speaking).toBe(false);
    expect(vad.step(frame(-40, i++)).speaking).toBe(false);
    expect(vad.step(frame(-40, i++)).speaking).toBe(false);
    expect(vad.step(frame(-40, i++)).speaking).toBe(true);
  });

  it("closes exactly fifteen frames after the voice stops", () => {
    const vad = makeVad();
    let i = seed(vad);
    for (let k = 0; k < 5; k++) vad.step(frame(-40, i++));
    for (let k = 0; k < 14; k++) expect(vad.step(frame(-60, i++)).speaking).toBe(true);
    expect(vad.step(frame(-60, i++)).speaking).toBe(false);
  });

  it("keeps the floor near the quiet level and lets it rise slowly while loud", () => {
    const vad = makeVad();
    let i = seed(vad);
    // A frame equal to the floor counts as "not quieter", so the floor takes one step up.
    let state = vad.step(frame(-60, i++));
    expect(state.floorDb).toBeCloseTo(-60 + 0.06, 6);
    for (let k = 0; k < 50; k++) state = vad.step(frame(-30, i++));
    expect(state.floorDb).toBeCloseTo(-60 + 51 * 0.06, 6);
    state = vad.step(frame(-62, i++));
    expect(state.floorDb).toBe(-62);
  });

  it("vetoes an opening when the pitch sits outside the user's range", () => {
    const vad = makeVad({ f0Range: { lo: 180, hi: 260 } });
    let i = seed(vad);
    for (let k = 0; k < 5; k++) expect(vad.step(frame(-40, i++, 110)).speaking).toBe(false);
    const own = makeVad({ f0Range: { lo: 180, hi: 260 } });
    i = seed(own);
    const results = [0, 1, 2].map(() => own.step(frame(-40, i++, 220)).speaking);
    expect(results[2]).toBe(true);
  });

  it("uses the baseline minus 8 dB as the threshold once a self-test exists", () => {
    const vad = makeVad({ baselineDb: -30 });
    let i = seed(vad);
    for (let k = 0; k < 5; k++) expect(vad.step(frame(-42, i++)).speaking).toBe(false);
    for (let k = 0; k < 3; k++) vad.step(frame(-36, i++));
    expect(vad.step(frame(-36, i++)).speaking).toBe(true);
  });
});

describe("gate", () => {
  it("ramps up on onset, settles, ramps down on offset and returns to idle", () => {
    const gate = createGate(40, 150);
    const a = gate.step(true, 0);
    expect(a.state).toBe("attack");
    expect(a.ramp).toEqual({ to: 1, durationMs: 40 });
    expect(gate.step(true, 20).ramp).toBeNull();
    expect(gate.step(true, 40).state).toBe("on");
    const b = gate.step(false, 60);
    expect(b.state).toBe("release");
    expect(b.ramp).toEqual({ to: 0, durationMs: 150 });
    expect(gate.step(false, 200).state).toBe("release");
    expect(gate.step(false, 210).state).toBe("idle");
  });

  it("re-opens from release without passing through idle", () => {
    const gate = createGate();
    gate.step(true, 0);
    gate.step(true, 100);
    gate.step(false, 120);
    const r = gate.step(true, 160);
    expect(r.state).toBe("attack");
    expect(r.ramp?.to).toBe(1);
    expect(gateIsOpen(r.state)).toBe(true);
    expect(gateIsOpen("release")).toBe(false);
  });
});
