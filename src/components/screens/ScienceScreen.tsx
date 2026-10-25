import { PageHead, Region } from "@/components/ui/structure";
import { BRAND } from "@/lib/brand";

const CITATIONS: ReadonlyArray<{ label: string; href: string; what: string }> = [
  {
    label: "Lombard 1911",
    href: "https://en.wikipedia.org/wiki/Lombard_effect",
    what: "the reflex: people speak louder when they hear noise.",
  },
  {
    label: "Pick and colleagues 1989",
    href: "https://pubmed.ncbi.nlm.nih.gov/2926004/",
    what: "the response is automatic; watching a loudness meter is the one thing that suppresses it.",
  },
  {
    label: "Ho, Bradshaw and Iansek 2000",
    href: "https://pubmed.ncbi.nlm.nih.gov/11104195/",
    what: "many people with Parkinson's hear their quiet voice as normal, so reminders fade.",
  },
  {
    label: "Adams and Lang 1992",
    href: "https://pubmed.ncbi.nlm.nih.gov/1446099/",
    what: "all ten patients spoke louder in noise; portable voice-activated maskers proposed.",
  },
  {
    label: "Stathopoulos and colleagues 2014",
    href: "https://pubmed.ncbi.nlm.nih.gov/24438910/",
    what: "26 of 33 people with Parkinson's spoke louder with babble in one ear.",
  },
  {
    label: "Adams and colleagues 2020",
    href: "https://pubmed.ncbi.nlm.nih.gov/32389143/",
    what: "a $70 player with nonstop 80 dB noise gained 7 to 10 dB; nobody was still using it at four months.",
  },
  {
    label: "Richardson and colleagues 2022",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9937051/",
    what: "a one-ear, speech-triggered device matched eight weeks of voice therapy at about 3 dB with far less effort; the gain ends when the noise ends.",
  },
  {
    label: "Bottalico and colleagues 2022",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9023576/",
    what: "adults over 60 rise about 0.3 to 0.5 dB per dB of noise, above roughly 58 dBA.",
  },
  {
    label: "Bauer and colleagues 2006",
    href: "https://pubmed.ncbi.nlm.nih.gov/16642849/",
    what: "the voice answers a loudness change in about 157 ms, which is why the first part of each sentence is not counted.",
  },
  {
    label: "Summers and colleagues 1988",
    href: "https://pubmed.ncbi.nlm.nih.gov/3183209/",
    what: "speech produced in noise is clearer than quiet speech turned up to the same level.",
  },
  {
    label: "Killion and colleagues 2004",
    href: "https://pubmed.ncbi.nlm.nih.gov/15532670/",
    what: "QuickSIN: how far above babble a listener needs speech, and how hearing loss raises it.",
  },
  {
    label: "MacPherson and Akeroyd 2014",
    href: "https://pubmed.ncbi.nlm.nih.gov/24906905/",
    what: "the median intelligibility slope, 6.6 percentage points per dB.",
  },
  {
    label: "NIOSH",
    href: "https://www.cdc.gov/niosh/noise/about/noise.html",
    what: "85 dBA for 8 hours, halving per 3 dB: the dose accounting in Report.",
  },
];

export function ScienceScreen() {
  return (
    <>
      <PageHead
        title="Science"
        lead="A reflex from 1911, a thermostat, and a little acoustics."
        rest="Every number the app shows traces to one of the sources below. Nothing here is a diagnosis or a treatment."
      />

      <div className="hi-page--measure">
        <Region title="How it works">
          <div className="hi-prose">
            <p>
              When you hear noise, you speak louder without deciding to. That is the Lombard reflex,
              first described in 1911, and it still works in Parkinson&apos;s and in older voices.{" "}
              {BRAND.name} plays soft chatter into one earbud only while you are speaking, so the
              reflex lifts your voice and the chatter stops the moment you stop.
            </p>
            <p>
              After each sentence the app measures how loud you were and moves the chatter toward
              the least level that keeps you at your target, down to none. The only low-cost device
              ever tried played noise nonstop at 80 dB, and every patient quit within four months.
              Gating and this thermostat are the answer to why they quit.
            </p>
            <p>
              The map turns decibels into meters. Your voice falls about 5 dB each time the distance
              doubles in a room. A listener who hears well needs your voice about 8 dB above the
              noise around them to catch nearly all the words; someone with some trouble in noise
              needs about 13 dB, and someone with hearing aids or a lot of trouble about 19 dB. From
              your level and the room&apos;s noise, the app draws how far you reach for each.
            </p>
            <p>
              Why not just remind someone to speak up? Because many people with Parkinson&apos;s
              hear their quiet voice as normal, so a reminder fades in seconds, while the reflex
              keeps working even when the speaker is told to resist it. Hearing aids make everything
              louder, noise included. The only place signal-to-noise is made is at the talker, and
              that is where this app works.
            </p>
          </div>
        </Region>

        <Region title="Honest limits">
          <div className="hi-prose">
            <p>
              The effect lasts only while the chatter plays. This is an aid you wear, like glasses,
              not training, and it is not a substitute for speech therapy. In the one controlled
              comparison, the gain disappeared when the device went silent.
            </p>
            <p>
              The map is a model. It uses a room slope of 5 dB per doubling and published thresholds
              for average listeners, so it is right about direction and proportion before it is
              right about centimeters, and every distance it shows is an estimate. Hearing is
              described in each person&apos;s own words, not tested. Past the point where a
              room&apos;s echo takes over, the map overstates distance and understates how much
              clarity the room takes.
            </p>
            <p>
              Levels are estimates from your phone until you calibrate against a meter, and the
              level in your ear is estimated from the volume, never measured. Telling your voice
              from a partner&apos;s is a heuristic built on distance, pitch and your own voice from
              the self-test; a partner with a similar voice can still open the chatter. The app has
              not been tested in people with cognitive impairment, and chatter while you think costs
              attention, which is why it only plays while you speak.
            </p>
            <p>
              A voice that changed suddenly, or hoarseness lasting more than three weeks, deserves a
              doctor&apos;s visit. If you have tinnitus or find sounds painful, keep the level low
              or leave the chatter off.
            </p>
          </div>
        </Region>

        <Region title="What came before">
          <div className="hi-prose">
            <p>
              SpeechVive is an ear-worn device that plays babble when its wearer speaks, calibrated
              once in a clinic to about 3 dB and sold for about $2,600; the company also published a
              free demonstration app in 2018 whose store link is gone. Voice amplifiers add 1 to 5
              dB and leave a breathy voice breathy. Loudness meter apps show a number and intervene
              in nothing. What this app adds, on screen: the chatter level finds itself for every
              room and every conversation and turns off when it is not needed; a randomized
              self-test prints your own gain; the map shows who at the table can hear you; the dose
              is counted; and it runs on the phone you already own.
            </p>
          </div>
        </Region>

        <Region title="Privacy">
          <div className="hi-prose">
            <p>
              No sound is ever recorded or sent anywhere. The microphone feeds a level meter fifty
              times a second and the samples are discarded. People, the room, your self-test and
              your reports are kept on this phone, and you can clear them in Settings. There are no
              accounts.
            </p>
          </div>
        </Region>

        <Region title="Sources">
          <ul className="hi-cites">
            {CITATIONS.map((c) => (
              <li key={c.href}>
                <a href={c.href} target="_blank" rel="noreferrer">
                  {c.label}
                </a>
                : {c.what}
              </li>
            ))}
          </ul>
        </Region>
      </div>
    </>
  );
}
