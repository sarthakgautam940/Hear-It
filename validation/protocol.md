# Validation protocol

Fixed before the first trial. Each part says what is measured, how, which rows it adds to `data.csv`, and the rule that counts as a pass. Every result is reported whatever it shows, including a miss, and `analyze.py` prints the tables that go in the README and on screen in the video.

## Equipment

- The phone running Hear It, with one wired earbud that has an inline microphone. The chatter level and the phone's volume are set to loud but comfortable once, written down, and left alone for the whole session.
- A second phone running the NIOSH Sound Level Meter app (iOS) or an equivalent sound level meter, flat on the table 1.0 m from the talker's mouth, on the same spot for every part. NIOSH measured its app within 2 dB of a reference meter.
- A quiet room, the same room for every part, with the television and appliances off unless a part says otherwise. A tape measure for Parts F and G.
- Participants: the teammates, and any older adult who agrees to take part. Each is a letter in the sheet (A, B, C) and never a name.

## Rules for every part

- The talker never sees the Hear It screen while reading. The phone faces away or sits in a shirt pocket. Watching a loudness meter is the one condition shown to suppress the reflex being measured.
- The same sentences, the same chair, the same distance to the meter. The meter is reset before each sentence and read after it; its LAeq for the sentence is the value recorded.
- Normal voice. The instruction is "say it the same way each time". Nobody is asked to be loud or quiet.
- The chatter is heard, so the condition is never hidden from the talker; the order is decided by a coin and the talker is told the result only sentence by sentence.
- A number whose stop was late by more than about two seconds gets a note. Nothing is deleted.

## Before the first part

1. Settings: Calibrate with a meter. Read one sentence while the second phone's meter sits at 1.0 m, and type the meter's reading into the field. Every level the app shows is then in dBA at 1 m.
2. Room: Listen for ten seconds with nobody speaking. Write down the app's reading and the meter's reading of the same ten seconds (they become Part F's room rows).
3. Self-test, once per participant: ten sentences, five with chatter at random. Its result is the app's own gain and clarity numbers and it sets the baseline the adaptive controller needs; it is also run 1 of Part D.

## The sheet

`data.csv` holds one measurement per row.

| Column      | Meaning                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| part        | A to G                                                                     |
| participant | A, B, C                                                                    |
| trial       | The pair, run or seat number, counted from 1 within the part               |
| condition   | Named below for each part                                                  |
| measure     | Named below for each part                                                  |
| value       | The number                                                                 |
| unit        | dBA, dB, count, s or m                                                     |
| reference   | The true value when there is one (Part G's tape distance); otherwise empty |
| volume      | The phone's volume setting as a percentage, where it matters               |
| notes       | Late stops, interruptions, anything unusual                                |
| recorded_at | Date and time, ISO 8601                                                    |

## Part A: gain with one earbud

The main result: does chatter in one ear make the talker louder, measured by the independent meter.

Setup in the app: Settings, Adaptive chatter off, chatter level at the chosen setting, Earbud ear set to the ear with the earbud. Table screen, phone facing away.

Procedure: ten pairs per participant, each pair the same Rainbow Passage sentence read twice, once with chatter off and once with chatter on. A coin decides whether the pair starts off or on, and the two conditions alternate within the pair. For an on sentence, tap Start, wait for "Listening", read, tap Stop. For an off sentence, read with the app stopped and the earbud still in. Reset the meter before each sentence.

Rows: `A, participant, pair 1 to 10, off or on, laeq, value, dBA`, with the volume column filled in.

Pass: a mean paired gain of at least 3 dB for each participant, reported with the standard deviation of the pair differences, the 95% confidence interval from the t distribution with nine degrees of freedom, the paired t test, and the count of pairs at 3 dB or more. A pooled row combines every pair.

## Part B: specificity

The complaint that ended the last device was noise that fired on the dinner partner. This measures how often that happens.

Setup: as Part A, Table screen live, the talker silent with the earbud in.

Procedure: a partner reads ten Rainbow Passage sentences at a normal level from 1.0 m while the talker says nothing and counts every burst of chatter they hear. A teammate times the reading from the first word to the last. Repeat with the partner at 0.5 m as a stress case. The Report's sentence count for each run is written in notes as a check; it counts only openings that lasted 0.8 s or more.

Rows: `B, participant, run 1, partner_1m or partner_0.5m, false_opens, count` and `B, participant, run 1, partner_1m or partner_0.5m, duration, value, s`.

Pass: fewer than 2 false openings per minute at 1 m. The 0.5 m result is reported whatever it is.

## Part C: controller settling

The thermostat: how many sentences the adaptive controller takes to find a level and hold it.

Setup: Settings, Adaptive chatter on, chatter level 0 so the controller starts from off; the self-test must have been run, because the target is set above its baseline.

Procedure: Table screen, Start, read Rainbow Passage sentences one at a time with a two-second pause between them, twelve sentences, Stop. The Report's "How the chatter behaved" rows give the number of sentences after which the level held for three in a row and the level at the end. Three runs per participant.

Rows: `C, participant, run 1 to 3, adaptive, utterances_to_settle, value, count` and `C, participant, run 1 to 3, adaptive, final_level, value, dB` (dB below the loudest setting, as a negative number; write "off" in notes when the Report says Off, and leave utterances_to_settle out of a run the Report calls "Still finding its level", with a note).

Pass: settled within six sentences in every run.

## Part D: clarity

Noise-induced speech is clearer as well as louder, which an amplifier cannot change. This measures the direction of the change in the app's clarity index, the energy above 1 kHz against the energy below it.

Procedure: the self-test, run twice per participant (run 1 before Part C, run 2 after Part E). Its result shows "Clearer" with the mean clarity index with chatter and without.

Rows: `D, participant, run 1 or 2, on, clarity, value, dB` and `D, participant, run 1 or 2, off, clarity, value, dB`. The self-test's own gain goes in notes beside the run.

Pass: direction only. A positive change is expected; the number is reported honestly even if it is zero or negative, and no threshold is claimed.

## Part E: gain with both earbuds

The labeled restaurant mode, never substituted for Part A.

Setup: as Part A with Earbud ear set to Both ears and both earbuds in.

Procedure: five pairs per participant, as in Part A.

Rows: `E, participant, pair 1 to 5, off or on_both, laeq, value, dBA`.

Pass: reported as the two-ear number beside Part A; no threshold.

## Part F: the room's own falloff

The map assumes the voice falls 5 dB each time the distance doubles until the room says otherwise.

Procedure: with the app stopped, the talker reads five Rainbow Passage sentences with the meter at 1.0 m and the same five with the meter at 2.0 m, measured with the tape. The room rows from the setup step are added here.

Rows: `F, participant, trial 1 to 5, 1m, laeq, value, dBA`; `F, participant, trial 1 to 5, 2m, laeq, value, dBA`; `F, participant, 1, room, noise_app, value, dBA`; `F, participant, 1, room, noise_meter, value, dBA`.

Pass: the measured drop between 1 m and 2 m is reported as the room's slope and is expected between 4 and 6 dB. If the pooled slope differs from 5 by more than 1 dB, `DEFAULT_ALPHA_DB_PER_DOUBLING` in `src/core/reach.ts` is set to the measured value before the video is recorded, and the Science screen's sentence about the slope says the measured number. The app's room reading is reported beside the meter's.

## Part G: camera seating

Only if the camera seating feature ships. The app estimates each seat's distance from one snapshot; this checks it against a tape.

Procedure: seat three people at measured distances of 1.0, 1.5, 2.0 and 2.5 m in turn, take the snapshot, and record the app's estimate for each.

Rows: `G, participant, seat 1 to 4, seat label, distance_est, value, m, reference` with the tape distance in the reference column.

Pass: reported as mean absolute error and bias in meters; no threshold.

## Running the analysis

```sh
python3 validation/analyze.py
```

It reads `validation/data.csv`, prints one Markdown table per part, and computes the t distribution itself, so it needs nothing beyond Python 3.10. The Part A table is pasted into the README and shown in the video for at least four seconds. Caveats that print with it: healthy speakers, a phone-based meter accurate to about 2 dB, one room, one session; the Lombard gain in a real conversation with a real partner may differ; the effect lasts only while the chatter plays; none of this is a clinical claim.
