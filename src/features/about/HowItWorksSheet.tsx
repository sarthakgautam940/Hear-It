"use client";

import { Ear, Mic, Ruler, Volume2 } from "lucide-react";
import { Sheet } from "@/ui/Sheet";
import { Group, RowStatic, RowIcon, Section } from "@/ui/structure";

const SOURCES: ReadonlyArray<{ label: string; href: string; what: string }> = [
  {
    label: "Lombard, 1911",
    href: "https://en.wikipedia.org/wiki/Lombard_effect",
    what: "People speak louder when they hear noise, without deciding to.",
  },
  {
    label: "Pick and colleagues, 1989",
    href: "https://pubmed.ncbi.nlm.nih.gov/2926004/",
    what: "The reflex is automatic; watching a loudness readout is what suppresses it.",
  },
  {
    label: "Ho, Bradshaw and Iansek, 2000",
    href: "https://pubmed.ncbi.nlm.nih.gov/11104195/",
    what: "Many people with Parkinson’s hear their quiet voice as normal.",
  },
  {
    label: "Adams and Lang, 1992",
    href: "https://pubmed.ncbi.nlm.nih.gov/1446099/",
    what: "Every patient tested spoke louder in noise; voice-activated maskers proposed.",
  },
  {
    label: "Adams and colleagues, 2020",
    href: "https://pubmed.ncbi.nlm.nih.gov/32389143/",
    what: "Nonstop 80 dB noise worked, and nobody kept using it. Gating answers why.",
  },
  {
    label: "Richardson and colleagues, 2022",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9937051/",
    what: "Speech-triggered noise in one ear matched eight weeks of voice therapy at about 3 dB.",
  },
  {
    label: "Summers and colleagues, 1988",
    href: "https://pubmed.ncbi.nlm.nih.gov/3183209/",
    what: "Speech made in noise is clearer than quiet speech turned up.",
  },
  {
    label: "Killion and colleagues, 2004",
    href: "https://pubmed.ncbi.nlm.nih.gov/15532670/",
    what: "How far above background voices a listener needs speech, and how hearing loss raises it.",
  },
  {
    label: "NIOSH",
    href: "https://www.cdc.gov/niosh/noise/about/noise.html",
    what: "85 dBA for 8 hours, halving every 3 dB: how the safe-listening share is counted.",
  },
];

export function HowItWorksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="How it works" size="full">
      <Section>
        <Group>
          <RowStatic
            icon={
              <RowIcon>
                <Mic size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="You talk the way you always do"
            sub="The earbud’s microphone hears when it is you speaking."
          />
          <RowStatic
            icon={
              <RowIcon>
                <Volume2 size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="Soft chatter plays in one ear"
            sub="Only while you speak, and only as much as it takes."
          />
          <RowStatic
            icon={
              <RowIcon>
                <Ear size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="Your voice rises on its own"
            sub="A reflex first described in 1911, still at work in Parkinson’s."
          />
          <RowStatic
            icon={
              <RowIcon>
                <Ruler size={20} strokeWidth={2.25} />
              </RowIcon>
            }
            title="The map shows who it reaches"
            sub="Your level, the room’s noise and how each person hears, turned into meters."
          />
        </Group>
      </Section>

      <Section title="Why not just speak up?">
        <div className="hi-prose">
          <p>
            Many people with Parkinson’s hear their own quiet voice as normal, so a reminder fades
            in seconds. The reflex keeps working without anyone asking. Hearing aids make everything
            louder, the room included; Hear It makes the person louder.
          </p>
        </div>
      </Section>

      <Section title="Honest limits">
        <ul className="hi-list">
          <li>
            It works while the chatter plays. It is an aid you wear, like glasses, not therapy.
          </li>
          <li>Distances are estimates from a model, right about direction before centimeters.</li>
          <li>How someone hears is in their own words, never a test.</li>
          <li>A voice that changed suddenly, or hoarseness past three weeks, deserves a doctor.</li>
        </ul>
      </Section>

      <Section title="Sources">
        <div className="hi-prose">
          {SOURCES.map((s) => (
            <p key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label}
              </a>
              . {s.what}
            </p>
          ))}
        </div>
      </Section>
    </Sheet>
  );
}
