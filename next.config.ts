import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

/* The recorded six-talker babble is optional; the app only fetches the files that exist at build time. */
const RECORDED_BABBLE = ["six-talker.m4a", "six-talker.ogg"];
const AUDIO_SCRIPT = path.join(process.cwd(), "scripts", "build-audio.mjs");
const AUDIO_BUNDLES = ["public/audio/level-processor.js", "public/sw.js"].map((file) =>
  path.join(process.cwd(), file),
);

const config = (phase: string): NextConfig => {
  // The worklet and the service worker are bundled here rather than by a pre-script,
  // so every way of building, and the dev server, ships them. The bundler is a dev
  // dependency, so it runs in its own process, only in the phases that build, and
  // only when a source is newer than the bundles, because Next loads this file in
  // each of its worker processes too.
  if (
    (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER) &&
    !audioBundlesFresh()
  ) {
    execFileSync(process.execPath, [AUDIO_SCRIPT], { stdio: "inherit" });
  }
  const babbleFiles = RECORDED_BABBLE.filter((file) =>
    existsSync(path.join(process.cwd(), "public", "babble", file)),
  );
  return {
    poweredByHeader: false,
    reactStrictMode: true,
    env: { NEXT_PUBLIC_BABBLE_FILES: babbleFiles.join(",") },
    async headers() {
      return [
        {
          // A long-cached service worker would pin every visitor to a stale build.
          source: "/sw.js",
          headers: [{ key: "Cache-Control", value: "no-cache" }],
        },
        {
          source: "/babble/:file*",
          headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
        },
      ];
    },
  };
};

function audioBundlesFresh(): boolean {
  const newestSource = Math.max(
    newestMtimeMs(path.join(process.cwd(), "src")),
    statSync(AUDIO_SCRIPT).mtimeMs,
  );
  return AUDIO_BUNDLES.every((file) => existsSync(file) && statSync(file).mtimeMs > newestSource);
}

function newestMtimeMs(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    newest = Math.max(newest, statSync(path.join(entry.parentPath, entry.name)).mtimeMs);
  }
  return newest;
}

export default config;
