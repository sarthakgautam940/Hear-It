/**
 * Keeps the screen on while the table is live, so the phone does not suspend
 * the audio at dinner. Returns a release function; a no-op where unsupported.
 */
export async function keepScreenAwake(): Promise<() => void> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return () => {};
  let sentinel: WakeLockSentinel | null = null;
  const acquire = async () => {
    try {
      sentinel = await navigator.wakeLock.request("screen");
    } catch {
      sentinel = null;
    }
  };
  // The lock is released by the platform when the page is hidden; take it back on return.
  const onVisible = () => {
    if (document.visibilityState === "visible" && sentinel === null) void acquire();
  };
  await acquire();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    void sentinel?.release();
    sentinel = null;
  };
}
