"use client";

import { ChevronRight, Mic, Trash2 } from "lucide-react";
import { everyoneShare, sessionSeconds, shareTrend, summarizeSession } from "@/core/session";
import type { Listener, Session } from "@/core/types";
import { useStore } from "@/hooks/useStore";
import { fmtDuration, fmtSignedDb, listNames } from "@/lib/format";
import { clockTime, nightTitle } from "@/lib/when";
import { listenersStore, sessionsStore } from "@/platform/storage";
import { openNight } from "@/shell/overlays";
import { Screen } from "@/shell/Screen";
import { LinkButton } from "@/ui/Button";
import { Empty, Section } from "@/ui/structure";
import { SwipeRow } from "@/ui/SwipeRow";
import { PlaceScene } from "./PlaceScene";
import { useDeleteSession } from "./useDeleteSession";

const TREND_COUNT = 10;

export function HistoryScreen() {
  const sessions = useStore(sessionsStore);
  const listeners = useStore(listenersStore);
  const deleteSession = useDeleteSession();

  if (sessions.length === 0) {
    return (
      <Screen title="History">
        <Empty
          art={<PlaceScene />}
          title="No conversations yet"
          action={
            <LinkButton
              href="/"
              variant="primary"
              size="large"
              icon={<Mic size={20} strokeWidth={2.25} aria-hidden />}
            >
              Start talking
            </LinkButton>
          }
        >
          Each time you talk at the table, it lands here with who heard you.
        </Empty>
      </Screen>
    );
  }

  const trend = shareTrend(sessions, TREND_COUNT);
  return (
    <Screen title="History">
      {trend.mean !== null ? <Trend values={trend.values} mean={trend.mean} /> : null}
      <Section title="Conversations">
        <div className="hi-nights">
          {sessions.map((s) => (
            <SwipeRow
              key={s.id}
              actions={[
                {
                  label: "Delete",
                  icon: <Trash2 size={22} strokeWidth={2.25} aria-hidden />,
                  destructive: true,
                  onAction: () => deleteSession(s.id),
                },
              ]}
            >
              <NightCard session={s} listeners={listeners} />
            </SwipeRow>
          ))}
        </div>
      </Section>
    </Screen>
  );
}

function Trend({ values, mean }: { values: Array<number | null>; mean: number }) {
  const seated = values.filter((v) => v !== null).length;
  const percent = Math.round(mean * 100);
  const across =
    seated === 1 ? "From your one conversation so far" : `Across ${seated} conversations`;
  return (
    <section
      className="hi-card hi-trend"
      aria-label={`${across}, ${percent}% of what you said reached everyone.`}
    >
      <div className="hi-trend__top" aria-hidden>
        <span className="hi-trend__value">
          {percent}
          <small>%</small>
        </span>
        <span className="hi-trend__line">of what you said reached everyone</span>
        <span className="hi-subhead">{across}</span>
      </div>
      {values.length > 1 ? (
        <div className="hi-trend__bars" aria-hidden>
          {values.map((v, i) => (
            <span
              key={i}
              className="hi-trend__bar"
              data-last={i === values.length - 1}
              data-empty={v === null}
              style={{ height: `${Math.max(6, Math.round((v ?? 0) * 100))}%` }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NightCard({ session, listeners }: { session: Session; listeners: readonly Listener[] }) {
  const share = everyoneShare(session);
  const { gainDb, utteranceCount: count } = summarizeSession(session);
  const seconds = sessionSeconds(session);
  const duration = seconds === null ? null : fmtDuration(seconds);
  const names = session.listenerIds
    .map((id) => listeners.find((l) => l.id === id)?.label)
    .filter((name): name is string => Boolean(name));
  const sentences = `${count} ${count === 1 ? "sentence" : "sentences"}`;
  const company =
    names.length === 0 ? null : names.length <= 3 ? listNames(names) : `${names.length} people`;
  const main =
    share !== null
      ? `${Math.round(share * 100)}% reached everyone`
      : gainDb !== null
        ? `${fmtSignedDb(gainDb)} louder with the chatter`
        : sentences;
  const meta = company
    ? duration
      ? `${duration} with ${company}`
      : `With ${company}`
    : [duration, sentences].filter(Boolean).join(", ");

  return (
    <button type="button" className="hi-night" onClick={() => openNight(session.id)}>
      <span className="hi-night__when">
        {nightTitle(session.startedAt)}, {clockTime(session.startedAt)}
        <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="hi-night__main">{main}</span>
      {share !== null ? (
        <span className="hi-night__track" aria-hidden>
          <span style={{ width: `${Math.round(share * 100)}%` }} />
        </span>
      ) : null}
      <span className="hi-night__meta">{meta}</span>
    </button>
  );
}
