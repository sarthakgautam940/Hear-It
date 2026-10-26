# Hear It

Hear It helps people with Parkinson's be heard at their own table.

**Try it:** https://hear-it-iota.vercel.app

Made by Sarthak Gautam and Ryan Diwan, Deep Run High School, for the 2026 Congressional App Challenge (Virginia's 1st District).

## What it does

People with Parkinson's tend to get quieter over time, but to them their voice still sounds normal. That makes them hard to hear at the table, and reminders to speak up don't last. About 1.1 million Americans have Parkinson's, 89% of them have speech or voice problems, and only 3 to 4% get speech therapy.

Hear It uses a reflex everyone already has, the Lombard effect, first described in 1911: in a noisy room, you speak up without trying. Here's how it works: while you're talking, soft chatter plays in one earbud, and it stops when you pause. Your voice rises on its own, and a drawing of your table shows who can hear you, as each person turns toward you when your voice reaches them.

Nothing is ever recorded, and nothing leaves your phone.

## How to use it

1. **Set up your table.** Add the people you talk with most, how well they hear, and which chair they sit in. Hear It works out the distance from your chair to theirs.
2. **Put in one earbud,** in the ear that hears better.
3. **Do the voice check.** Read ten short sentences out loud. Chatter plays during five of them at random, so Hear It can see how much it lifts your voice.
4. **Check the room.** Hear It listens for ten seconds to measure how noisy it is.
5. **Talk.** Tap Start talking. The chatter only plays while you speak, and the table shows how far your voice reaches.
6. **Look back.** After each conversation you see who heard you, and History shows how it's going over time.

## More features

- It looks for the least chatter that works, down to none, to protect your hearing
- It keeps track of how much chatter you've heard against the NIOSH safe-listening limit
- Large buttons, dark mode, bigger text, and reduced motion
- Swipe to edit or delete, with Undo (you can also shake your phone to undo)
- Works offline, and you can add it to your home screen like an app
- On a computer it shows up inside a drawn iPhone, so it looks just like it does on a phone

## Under the hood

- **Listening:** The app measures your microphone 50 times a second, right on your phone, with an AudioWorklet in the Web Audio API. Only loudness numbers come out of it, never the sound.
- **Knowing it's you:** It learns the room's background noise, and after the voice check it knows your pitch range too, so other people's voices are less likely to set it off.
- **The chatter:** Six voices made entirely in code, not recordings of real people, mixed so it sounds like a busy room with no real words. It fades in and out so it doesn't click.
- **The least chatter that works:** After each sentence it turns the chatter up or down a little to keep you about 4 decibels louder than your normal voice (you can change this in Settings), and turns it off when you don't need it. This starts after the voice check.
- **How far your voice reaches:** It compares how loud you are with how loud the room is, how well each person hears, and how sound fades with distance. The distances are estimates, and they get more accurate if you calibrate with a sound meter in Settings.

## Built with

TypeScript, React and Next.js, plus the Web Audio API. There's no server: everything runs on the phone.

Open-source libraries: Next.js, React and lucide-react (icons). For building and testing: TypeScript, esbuild, Vitest, ESLint and Prettier. Fonts: Inter and Source Serif 4. The logo is drawn from the Atkinson Hyperlegible Next typeface. All three fonts use the SIL Open Font License.

## Run it yourself

You need Node.js 22 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

Then open http://localhost:3000. `pnpm check` runs all the checks and the unit tests.

## Good to know

- Hear It only helps while it's running, like glasses. It isn't a treatment, a medical device, or a replacement for speech therapy.
- We haven't tested it with people who have Parkinson's yet. That's the first thing we want to do next, with their speech therapists.

## AI use

We used Claude by Anthropic, through Claude Code and claude.ai's Research mode. It helped us research and narrow down more than a hundred ideas, find the studies behind this one, and work out how to measure sound inside a phone's browser. It wrote a good portion of the app's code from plans we made together, helped us debug, and helped rewrite the app's text as the design changed. We chose the idea, made the design decisions, and decided what went into the app.

## Sources

- [Parkinson's Foundation](https://www.parkinson.org/understanding-parkinsons/statistics): about 1.1 million Americans have Parkinson's
- [Trail and colleagues, 2005](https://pubmed.ncbi.nlm.nih.gov/16340101/): 89% have a speech or voice disorder, and 3 to 4% get speech treatment
- [Stathopoulos and colleagues, 2014](https://pubmed.ncbi.nlm.nih.gov/24438910/): 26 of 33 people with Parkinson's spoke louder with chatter in one ear
- [NIOSH](https://www.cdc.gov/niosh/noise/about/noise.html): the safe-listening limit, 85 dBA for 8 hours

More sources are in the app, under Settings, How it works.

## License

MIT. See [LICENSE](LICENSE).
