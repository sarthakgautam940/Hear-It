import { describe, expect, it } from "vitest";
import {
  controllerStep,
  DEFAULT_CONTROLLER,
  gainToLevel,
  levelToGain,
  utteranceLeq,
  utterancesToSettle,
  type ControllerConfig,
} from "@/core/controller";
import type { Frame } from "@/core/types";

const cfg: ControllerConfig = { ...DEFAULT_CONTROLLER, targetDb: -24 };

function frame(levelADb: number, i: number, clipped = false): Frame {
  return {
    tMs: i * 20,
    levelDb: levelADb,
    levelADb,
    loDb: levelADb,
    hiDb: levelADb,
    f0Hz: null,
    clipped,
  };
}

describe("controller", () => {
  it("maps levels to gains and back", () => {
    expect(levelToGain(0)).toBe("off");
    expect(levelToGain(1)).toBe(-24);
    expect(levelToGain(3)).toBe(-12);
    expect(levelToGain(5)).toBe(0);
    expect(gainToLevel("off")).toBe(0);
    expect(gainToLevel(-24)).toBe(1);
    expect(gainToLevel(-7)).toBe(4);
  });

  it("settles from a 6 dB error within six, three, two and two utterances", () => {
    expect(utterancesToSettle(0.3, 6, cfg)).toBeLessThanOrEqual(6);
    expect(utterancesToSettle(0.5, 6, cfg)).toBeLessThanOrEqual(3);
    expect(utterancesToSettle(0.8, 6, cfg)).toBeLessThanOrEqual(2);
    expect(utterancesToSettle(1.0, 6, cfg)).toBeLessThanOrEqual(2);
  });

  it("never reverses the sign of the error on the way down", () => {
    for (const slope of [0.3, 0.5, 0.8, 1.0]) {
      let gain: number | "off" = cfg.minGainDb;
      const baseline = cfg.targetDb - 6;
      for (let n = 0; n < 20; n++) {
        const voice = baseline + slope * ((gain === "off" ? cfg.minGainDb : gain) - cfg.minGainDb);
        expect(cfg.targetDb - voice).toBeGreaterThanOrEqual(-1e-9);
        gain = controllerStep(gain, voice, cfg);
      }
    }
  });

  it("clamps a large step to 3 dB and never leaves the range", () => {
    expect(controllerStep(-24, cfg.targetDb - 20, cfg)).toBe(-21);
    expect(controllerStep(0, cfg.targetDb - 20, cfg)).toBe(0);
    expect(controllerStep(-24, cfg.targetDb + 20, cfg)).toBe("off");
  });

  it("holds inside the dead-band", () => {
    expect(controllerStep(-12, cfg.targetDb - 1.5, cfg)).toBe(-12);
    expect(controllerStep(-12, cfg.targetDb + 1.4, cfg)).toBe(-12);
    expect(controllerStep("off", cfg.targetDb + 0.5, cfg)).toBe("off");
  });

  it("enters from off at the lowest level and leaves to off from the lowest level", () => {
    expect(controllerStep("off", cfg.targetDb - 4, cfg)).toBe(-24);
    expect(controllerStep("off", cfg.targetDb + 4, cfg)).toBe("off");
    expect(controllerStep(-24, cfg.targetDb + 2, cfg)).toBe("off");
    expect(controllerStep(-18, cfg.targetDb + 2, cfg)).toBe(-20);
  });

  it("measures an utterance after the reflex latency and ignores clipped frames", () => {
    const frames = [
      frame(-10, 0),
      frame(-10, 1),
      frame(-10, 2),
      frame(-10, 3),
      frame(-10, 4),
      frame(-10, 5),
      frame(-10, 6),
      frame(-10, 7),
    ];
    for (let i = 8; i < 60; i++) frames.push(frame(-30, i, i === 20));
    const open = frames.map(() => true);
    const result = utteranceLeq(frames, open, true);
    expect(result).not.toBeNull();
    expect(result ?? 0).toBeCloseTo(-30, 5);
  });

  it("refuses an utterance that is too short or barely gated", () => {
    const short = Array.from({ length: 30 }, (_, i) => frame(-30, i));
    expect(
      utteranceLeq(
        short,
        short.map(() => true),
        true,
      ),
    ).toBeNull();
    const long = Array.from({ length: 60 }, (_, i) => frame(-30, i));
    expect(
      utteranceLeq(
        long,
        long.map((_, i) => i < 30),
        true,
      ),
    ).toBeNull();
    expect(
      utteranceLeq(
        long,
        long.map((_, i) => i < 30),
        false,
      ),
    ).not.toBeNull();
  });
});
