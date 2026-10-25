# Hear It

Hear It makes a quiet voice carry across the table and shows how far it reaches, so people with Parkinson's or an aging voice are heard.

It is a progressive web app for the phone you already own and one earbud. While you speak, and only while you speak, it plays soft six-talker chatter into that ear. The Lombard reflex, described in 1911, raises your voice without you trying. A controller finds the least chatter that keeps you at your target, down to none. A live map turns your measured voice level and the room's measured noise into meters, and shows which seats at the table can hear you. Nothing is recorded and nothing leaves the phone.

Built by [Name] and [Name] of Deep Run High School, Glen Allen, Virginia, for the 2026 Congressional App Challenge in Virginia's First District.

## Live app

[Live URL: added after the first deploy]

It needs HTTPS, a microphone, and one earbud; wired earbuds with an inline microphone are the tested setup. Tested devices and browser versions are listed before submission: [Android phone, Chrome version] and [iPhone, iOS version]. The iOS caveats are under Limitations.

## Who it is for

- People whose voice has grown quiet from Parkinson's. About 1.1 million Americans live with Parkinson's; 89% have a speech or voice disorder and 3 to 4% receive speech treatment ([Trail 2005](https://pubmed.ncbi.nlm.nih.gov/16340101/)).
- People with an aging voice: 29% of independent older adults report a current voice disorder ([Roy 2007](https://pubmed.ncbi.nlm.nih.gov/17429872/)).
- The people across the table from them, who often have hearing loss of their own: 55% of adults 75 and over have disabling hearing loss, and fewer than 30% of adults 70 and over who could benefit have used a hearing aid ([NIDCD](https://www.nidcd.nih.gov/health/statistics/quick-statistics-hearing)). A hearing aid raises the noise with the speech. The only place signal-to-noise is made is at the talker, and that is where this app works.

## Run and test

Requires Node 22 and pnpm 10.

```sh
pnpm install
pnpm dev                         # http://localhost:3000; builds the audio worklet and service worker first
pnpm check                       # typecheck (app and service worker), lint, format check, unit tests
pnpm build && pnpm start         # production build on port 3000
python3 validation/analyze.py    # the validation tables, from validation/data.csv
```

The microphone works only over HTTPS or on localhost. The unit tests check every core function against published or hand-worked reference values: the A-weighting curve at ten frequencies within 0.5 dB of the IEC 61672 table, a full-scale sine at -3.01 dBFS, the controller settling inside its dead-band in the predicted number of steps for every published Lombard slope, the NIOSH allowances, the self-test schedule for a thousand seeds, and the reach model's worked examples.

## How it works

### The loop

1. The earbud microphone feeds an AudioWorklet that emits one frame every 20 ms: the level in dBFS, the A-weighted level (IEC 61672, three biquads), the pitch by autocorrelation, and a clipping flag. Echo cancellation, noise suppression and automatic gain control are requested off, so the meter reads what the microphone hears.
2. A voice detector decides whether the user is the one speaking: an adaptive noise floor that rises 3 dB per second, a margin above it, three consecutive frames (60 ms) to open, a 300 ms hangover to close, a vote from the user's own pitch range learned in the self-test, and a vote from the syllable-rate modulation of the sound. The earbud microphone hears the user's mouth about 16 dB louder than a partner one meter away, which is the geometry the detector relies on.
3. A gate ramps the chatter in over 40 ms and out over 150 ms so nothing clicks, and the chatter plays into one ear only while the gate is open.
4. The chatter is six-talker babble, normalized to -20 dBFS RMS and looped seamlessly. When no recording is present, six talkers are synthesized from formant resonators with syllable rhythm, pauses and pitch drift, so the sound has the spectral tilt and the modulation of speech without a word in it.
5. After each utterance of at least 0.8 s, measured from 150 ms after the gate opens because the voice takes about that long to answer ([Bauer 2006](https://pubmed.ncbi.nlm.nih.gov/16642849/)), an integral controller moves the chatter level by the loudness error, clamped to 3 dB per step with a 1.5 dB dead-band, between an explicit off state and a cap:

$$e_n = T - L_{eq,n}, \qquad G_{n+1} = \mathrm{clamp}\big(G_n + \mathrm{clamp}(k\,e_n, -3, +3),\ G_{\mathrm{off}},\ 0\big)$$

With the reflex modeled as voice = baseline + s times the noise above onset, the error obeys $e_{n+1} = (1 - sk)\,e_n$, stable when $0 < sk < 2$, so $k = 1$ converges for every published slope. The default target is +4 dB over the user's own baseline, adjustable from 3 to 8. 6. The day's estimated noise dose is counted against the NIOSH allowance, 85 dBA for 8 hours with a 3 dB exchange rate, from an assumed in-ear cap of 80 dBA: $T_{\mathrm{allow}}(L) = 8\,\mathrm{h} \times 2^{(85 - L)/3}$. 7. The self-test reads ten sentences, boosts five of them at random with no run longer than three, and prints the user's own gain: the mean level of the boosted sentences minus the mean of the others. It also stores the baseline and the pitch range the detector uses. A gain under 2 dB is reported as weak.

### The map

Speech falls with distance; in a room the direct sound drops about 4 to 6 dB per doubling, and the app uses 5 until the room's own slope is measured:

$$L(d) = L_1 - \alpha \log_2 \frac{d}{1\,\mathrm{m}}$$

A listener needs the speech to stand above the room noise by a margin that depends on their hearing. Normal-hearing listeners need about +2 dB over four-talker babble for half the key words ([Killion 2004](https://pubmed.ncbi.nlm.nih.gov/15532670/)) and about 6 dB more for nearly all of them at the median slope of published intelligibility functions ([MacPherson and Akeroyd 2014](https://pubmed.ncbi.nlm.nih.gov/24906905/)); hearing loss adds its own signal-to-noise loss, taken at the midpoints of the QuickSIN categories. When the room's noise is a steady hum rather than voices, the threshold is 5 dB lower ([Nilsson 1994](https://pubmed.ncbi.nlm.nih.gov/8132902/)).

$$S_{\mathrm{req}} = 8\ (\text{hears well}),\ 13\ (\text{some trouble in noise}),\ 19\ (\text{hearing aids, or a lot of trouble}),\qquad r = 2^{(L_1 - N - S_{\mathrm{req}})/\alpha}$$

The reach is clamped between 0.3 and 6 m. Every 5 dB of room noise halves it; a 4 dB gain in the voice multiplies it by 1.74. Each seat reads its own class: "hears you" with 3 dB or more to spare, "straining" within 3 dB either way, "too far" below that. The screen is for the family, propped facing them or in a pocket, because visual feedback of loudness is the one condition under which speakers learn to suppress the reflex ([Pick 1989](https://pubmed.ncbi.nlm.nih.gov/2926004/)).

### Sources

| Source                                                                              | What it supports                                                                                                                              |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Pick and colleagues 1989](https://pubmed.ncbi.nlm.nih.gov/2926004/)                | The Lombard response is automatic; visual feedback of vocal intensity lets speakers inhibit it                                                |
| [Ho, Bradshaw and Iansek 2000](https://pubmed.ncbi.nlm.nih.gov/11104195/)           | Many people with Parkinson's hear their quiet voice as normal, so reminders fade                                                              |
| [Adams and Lang 1992](https://pubmed.ncbi.nlm.nih.gov/1446099/)                     | All ten patients spoke louder in noise; portable voice-activated maskers proposed                                                             |
| [Stathopoulos and colleagues 2014](https://pubmed.ncbi.nlm.nih.gov/24438910/)       | 26 of 33 people with Parkinson's spoke louder with babble in one ear                                                                          |
| [Adams and colleagues 2020](https://pubmed.ncbi.nlm.nih.gov/32389143/)              | A player with nonstop 80 dB noise gained 7 to 10 dB with both ears and 3.3 dB with one; nobody was still using it at four months              |
| [Richardson and colleagues 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9937051/) | A one-ear, speech-triggered device matched eight weeks of voice therapy at about 3 dB with far less effort; the gain ends when the noise ends |
| [Bottalico and colleagues 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9023576/)  | Adults over 60 rise about 0.3 to 0.5 dB per dB of noise above roughly 58 dBA                                                                  |
| [Bauer and colleagues 2006](https://pubmed.ncbi.nlm.nih.gov/16642849/)              | Loudness compensation takes about 157 ms, the part of each sentence the controller does not count                                             |
| [Summers and colleagues 1988](https://pubmed.ncbi.nlm.nih.gov/3183209/)             | Speech produced in noise is clearer than quiet speech amplified to the same level                                                             |
| [Lu and Cooke 2008](https://pubmed.ncbi.nlm.nih.gov/19045809/)                      | The intelligibility gain of noise-induced speech grows with the number of talkers and the level                                               |
| [Killion and colleagues 2004](https://pubmed.ncbi.nlm.nih.gov/15532670/)            | QuickSIN: the signal-to-noise ratio a listener needs in babble, and how hearing loss raises it                                                |
| [Nilsson, Soli and Sullivan 1994](https://pubmed.ncbi.nlm.nih.gov/8132902/)         | HINT: the sentence threshold in steady noise sits about 5 dB below the babble threshold                                                       |
| [MacPherson and Akeroyd 2014](https://pubmed.ncbi.nlm.nih.gov/24906905/)            | The median intelligibility slope is 6.6 percentage points per dB                                                                              |
| [NIOSH](https://www.cdc.gov/niosh/noise/about/noise.html)                           | 85 dBA for 8 hours with a 3 dB exchange rate                                                                                                  |
| IEC 61672                                                                           | The A-weighting curve the meter is tested against                                                                                             |

## Validation

The protocol in [validation/protocol.md](validation/protocol.md) was fixed before the first trial. It has seven parts: A, the gain with one earbud over ten paired sentences per speaker, measured by a second phone's sound level meter one meter away; B, how often the chatter opens on the partner while the user is silent; C, how many sentences the controller takes to settle; D, the change in the clarity index; E, the gain with both earbuds, reported as the labeled restaurant-mode number; F, the room's own falloff between 1 m and 2 m, which sets the map's slope; G, camera seating against a tape measure, if that feature ships. Raw rows go in [validation/data.csv](validation/data.csv) and `python3 validation/analyze.py` prints the tables below.

Part A, gain with one earbud (results to be added from Sunday's session):

| Participant | Pairs | Off (dBA) | On (dBA) | Gain (dB) | SD  | 95% CI | Paired t, p | Pairs at 3 dB or more |
| ----------- | ----- | --------- | -------- | --------- | --- | ------ | ----------- | --------------------- |
| A           | 10    |           |          |           |     |        |             |                       |
| B           | 10    |           |          |           |     |        |             |                       |
| Pooled      |       |           |          |           |     |        |             |                       |

Parts B to F follow in the same format once measured. Caveats that print with the table: healthy speakers, a phone-based meter accurate to about 2 dB, one room, one session; the Lombard gain in a real conversation with a real partner may differ; the effect lasts only while the chatter plays; none of this is a clinical claim.

## Repository layout

```
src/core        pure TypeScript, no browser APIs, fully tested: dsp (level, A-weighting, biquads, pitch, modulation, babble synthesis, loop), vad, gate, controller, exposure, selftest, session, reach, listeners, room, clarity
src/platform    the microphone and audio graph, the AudioWorklet processor, babble loading, the engine, storage, wake lock, service worker
src/components  the shell (navigation, command palette), reusable controls, the reach canvas, and one component per screen
src/app         Next.js routes: /, /people, /room, /self-test, /report, /settings, /science
src/styles      design tokens and plain CSS, paper and night themes, high contrast and color-vision palettes, text size
tests/core      Vitest suites with reference values from the standards and papers above
validation      the protocol, the raw data sheet and the analysis script
scripts         bundles the worklet and service worker with esbuild; the Next config runs it whenever a build or the dev server starts with the bundles out of date
```

## Libraries and licenses

| Package                                      | Version                 | License    | Used for                                        |
| -------------------------------------------- | ----------------------- | ---------- | ----------------------------------------------- |
| next                                         | 15.5.28                 | MIT        | App Router, static build, PWA headers           |
| react, react-dom                             | 19.3.1                  | MIT        | Interface                                       |
| lucide-react                                 | 1.61.0                  | ISC        | Icons                                           |
| typescript                                   | 5.9.3                   | Apache-2.0 | Strict types, app and service worker            |
| vitest                                       | 5.0.5                   | MIT        | Unit tests                                      |
| esbuild                                      | 0.28.2                  | MIT        | Bundles the AudioWorklet and the service worker |
| eslint, eslint-config-next, @eslint/eslintrc | 9.39.5, 15.5.28, 3.3.7  | MIT        | Lint                                            |
| prettier                                     | 3.9.10                  | MIT        | Formatting                                      |
| @types/node, @types/react, @types/react-dom  | 22.20.5, 19.3.0, 19.3.0 | MIT        | Type declarations                               |

No audio library is used: the metering, detection, gating, control, synthesis and reach code is in `src/core` and `src/platform`. No machine-learning model and no network service is used.

The typeface is General Sans by Indian Type Foundry, loaded at runtime from the Fontshare API. Fontshare's license allows free use in products but does not permit redistributing the font files, so none are committed to this repository; if the API is unreachable the interface falls back to the system sans-serif.

## AI disclosure

This project was built with an AI coding assistant (Claude by Anthropic) working from the team's own research document, design brief and build specification. The assistant was used for research and source finding, for planning, for drafting and reviewing code and tests, and for the copy on the Science screen; the team directed every stage, chose the mechanism, set the specification and the constants, and owns the entry. The team's AI-use log, kept during the build and completed before submission, records for each session the date, the tool, what it produced and who reviewed and changed it: [to be completed by the team]. Each teammate can explain the module they own and the constants it carries.

## Privacy

No sound is recorded or sent anywhere. The microphone feeds a level meter fifty times a second and the samples are discarded. The people at your table, the room measurement, your self-test and your reports are kept in your browser's local storage on this phone and can be cleared in Settings. There are no accounts, no analytics and no network requests after the page loads, apart from the font. The service worker caches the app's own files so it opens offline.

## Limitations

- The effect lasts only while the chatter plays. This is an aid you wear, like glasses, not training, and it is not a substitute for speech therapy.
- The map is a model: a 5 dB per doubling slope until the room is measured, published thresholds for average listeners, and A-weighted levels from a phone accurate to about 2 dB. It is right about direction and proportion before it is right about centimeters, and every distance it shows is an estimate. Beyond the point where a room's echo takes over, it overstates distance and understates how much clarity the room takes.
- Hearing is described in each listener's own words, not tested. A listener's real threshold can differ by several dB.
- Levels are estimates until the app is calibrated against a meter in Settings, and the level in the ear is estimated from the volume setting, never measured.
- Telling the user's voice from a partner's is a heuristic built on distance, pitch and the user's own voice from the self-test; a partner with a similar voice can still open the chatter. The validation reports how often.
- The screen must stay on; a wake lock keeps it awake where the browser supports one.
- On iOS, open WebKit regressions can make playback crackle with echo cancellation on and route output to the earpiece with it off, and Bluetooth output drops to mono while the microphone is open. Wired earbuds with an inline microphone are the reference setup, and Android Chrome is the primary demo device.
- A phone browser cannot run beside a phone call on iOS, so the use cases are in person: the table, the pharmacy counter, coffee hour, the car.
- The app has not been tested in people with cognitive impairment. It needs one free ear, so it is not for someone who wears hearing aids in both ears.
- It is not a medical device. A voice that changed suddenly, or hoarseness lasting more than three weeks, deserves a doctor's visit. With tinnitus or sound sensitivity, keep the level low or leave the chatter off.

## Credits

[Name], [Name]: Deep Run High School, Glen Allen, Virginia. Entry for the 2026 Congressional App Challenge, Virginia's First District.

The interface design system, typography and shell patterns were adapted from the team's own earlier project. The six-talker chatter, when a recording is present, is the team's own.

MIT License; see [LICENSE](LICENSE).
