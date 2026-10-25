import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/* The recorded six-talker babble is optional; the app only fetches the files that exist at build time. */
const RECORDED_BABBLE = ["six-talker.m4a", "six-talker.ogg"];
const babbleFiles = RECORDED_BABBLE.filter((file) =>
  existsSync(path.join(process.cwd(), "public", "babble", file)),
);

const nextConfig: NextConfig = {
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

export default nextConfig;
