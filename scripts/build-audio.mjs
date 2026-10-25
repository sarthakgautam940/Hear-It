import { build } from "esbuild";

const common = {
  bundle: true,
  target: "es2020",
  minify: true,
  legalComments: "none",
  logLevel: "info",
};

await Promise.all([
  // The worklet runs in AudioWorkletGlobalScope and is loaded as a module.
  build({
    ...common,
    format: "esm",
    entryPoints: ["src/platform/worklet/level-processor.ts"],
    outfile: "public/audio/level-processor.js",
  }),
  // The service worker is registered as a classic script, which every engine
  // that runs the app supports; module workers are not yet universal.
  build({
    ...common,
    format: "iife",
    entryPoints: ["src/platform/sw/service-worker.ts"],
    outfile: "public/sw.js",
  }),
]);
