"use client";

import { AudioLines, Square, Volume2 } from "lucide-react";
import { useEngine } from "@/hooks/useEngine";
import { useElapsed } from "@/hooks/useNow";
import { Button } from "@/ui/Button";
import { STATUS_WORD, stopTalking } from "./talking";
import { useTabNavigate } from "./transitions";

/** While a conversation runs, it follows you to every tab. */
export function LiveBar() {
  const snap = useEngine();
  const go = useTabNavigate();
  const elapsed = useElapsed(snap.liveSince);
  return (
    <div className="hi-livebar" role="region" aria-label="Conversation in progress">
      <button type="button" className="hi-livebar__open" onClick={() => go("/")}>
        {snap.status === "boosting" ? (
          <Volume2 size={20} strokeWidth={2.25} aria-hidden />
        ) : (
          <AudioLines size={20} strokeWidth={2.25} aria-hidden />
        )}
        <span className="hi-livebar__word">{STATUS_WORD[snap.status]}</span>
        <span className="hi-livebar__time">{elapsed}</span>
      </button>
      <Button
        variant="secondary"
        icon={<Square size={16} strokeWidth={2.5} aria-hidden />}
        onClick={() => void stopTalking()}
      >
        Stop
      </Button>
    </div>
  );
}
