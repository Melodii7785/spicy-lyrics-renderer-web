# spicy-lyrics-renderer-web

## a browser port of the original Spicy Lyrics renderer

hi. i made a thing.

well, technically, i ported a thing.

this repository contains a browser-compatible port of the original Spicy Lyrics rendering engine, separated from the rest of Lyric Thing™ so other projects can poke at it, reuse it, learn from it, or build their own lyrics player around it.

it renders lyrics. with the original renderer's timing and animation systems.

marvelous.

## what's in here?

there are currently two related bits of renderer work in this repository:

- `ported/` — the original Spicy Lyrics engine port. **this is the important bit of this repository.**
- `src/` — an earlier, standalone browser-native renderer experiment, with its own demo and tests. it is kept around rather than silently thrown into the sea.

the ported engine includes:

- the original syllable-synced lyrics applyer;
- the original line-synced lyrics applyer;
- the original static lyrics applyer;
- the original lyrics animator and setter;
- the lyrics virtualizer and active-line scrolling support;
- lyric data/state utilities;
- text handling utilities, including grapheme splitting and emphasis;
- spring and animation-frame helpers;
- the original lyrics CSS;
- a small browser adapter for the host page and playback clock.

the large animation and virtualizer modules are carried over from the original source rather than replaced with a new, vaguely similar implementation. we did not spend all that time porting the thing just to replace it with a div that says hello.

## repository layout

```text
ported/
  OriginalSpicyLyricsEngine.ts
  original/
    components/
    css/
    modules/
    utils/
src/
  animation/
  renderer.js
  timing.js
  ...
test/
```

`ported/original/` keeps the imported engine's internal directory layout intact. this is intentional: it keeps the original relative imports understandable and makes future updates less of a treasure hunt.

## using the original port

### requirements

the port is browser-side TypeScript. use it from a browser application with a TypeScript-aware bundler, such as Vite, or compile it as part of your own application.

the host application is responsible for:

- obtaining lyric data;
- obtaining the current playback position;
- updating that playback position while the song plays;
- providing a DOM element for the renderer;
- importing the renderer stylesheet.

this repository does **not** provide a music service integration, audio player, lyric provider, or authentication system. it is the renderer, not the entire music industry.

### import the renderer

in a TypeScript browser application:

```ts
import { OriginalSpicyLyricsEngine } from "./ported/OriginalSpicyLyricsEngine";
import "./ported/original/css/Lyrics/Mixed.css";

const host = document.querySelector<HTMLElement>("#lyrics");

if (!host) {
  throw new Error("where did the lyrics element go");
}

const lyrics = new OriginalSpicyLyricsEngine(host);
```

the stylesheet is important. the engine creates the lyric DOM, but the original CSS supplies its layout and visual styling.

### give it lyrics

the adapter accepts a Spicy Lyrics-style payload:

```ts
lyrics.apply(payload);
```

the payload's `Type` determines which original applyer is used:

| `Type` | Renderer | Expected content |
| --- | --- | --- |
| `"Syllable"` | Syllable-synced | `Content` entries with `Lead.Syllables` |
| `"Line"` | Line-synced | `Content` entries with `Text`, `StartTime`, and `EndTime` |
| `"Static"` | Static | `Lines`, or a `Content` array that can be converted into lines |

for static lyrics, `Lines` takes priority when it is a non-empty array. otherwise the adapter makes a simple line list from `Content`.

the adapter performs basic shape checks before handing data to the original applyers. it returns `true` when it applies usable lyrics and `false` when the supplied payload does not contain usable content.

### keep the playback clock updated

the renderer needs to know where the song is:

```ts
lyrics.setPosition(currentPlaybackPositionMs);
```

call this as your player position changes. the value is in **milliseconds**.

the adapter exposes a tiny playback-clock bridge for the original engine. it does not start playback or query a music service by itself.

### clear the renderer

```ts
lyrics.clear();
```

this clears the current lyric containers, resets the lyric type/state, and removes the renderer page from the host element.

## the adapter

`ported/OriginalSpicyLyricsEngine.ts` is the browser-facing adapter around the original engine.

it handles a few things that Spicetify normally provides:

- creating the page/container DOM expected by the original renderer;
- setting the active page container;
- exposing the playback position to the original code;
- selecting the syllable, line, or static applyer based on the payload;
- clearing previous lyric state before rendering a new payload.

the compatibility modules under `ported/original/components/` and `ported/original/utils/` provide the small browser-side pieces needed by the port. they are not a Spotify SDK, and they do not make requests to Spotify.

## current status

this is a **browser port**, not a polished drop-in npm package yet.

the engine has been integrated into Lyric Thing and used there as its original Spicy Lyrics renderer. this repository is the beginning of separating that work into a reusable project.

things that still need proper standalone-project attention:

- a stable public API and versioned releases;
- a dedicated integration example that consumes real lyric payloads;
- automated browser-level tests for the original renderer;
- documentation for the exact payload shapes and optional fields;
- a clean build/package setup for consumers who do not already use a TypeScript bundler.

if something does not work in your host app, check the browser console, make sure the original stylesheet is loaded, and verify that playback position is being sent in milliseconds. the renderer cannot guess what time it is in the song. probably.

## the older renderer experiment

the files under `src/` are a separate browser-native renderer experiment. they are not the original Spicy Lyrics engine and should not be confused with the port under `ported/`.

the existing demo and tests for that experiment remain available:

```sh
npm test
```

## credits and upstream

this project would not exist without the people who made the original renderer.

- **Spicy Lyrics** — original renderer source: https://github.com/Melodii7785/spicy-lyrics
- **Spicy AMLL** — related renderer work and inspiration: https://github.com/Melodii7785/spicy-amll
- **Lyric Thing™** — the browser integration where this port was brought to life: https://github.com/Melodii7785/lyric-thing-maybe

the imported source retains its original licensing and attribution. please read the license files before redistributing or incorporating this code into another project.

## license

GNU Affero General Public License v3.0 (AGPL-3.0).

see [LICENSE](./LICENSE) and [ported/original/LICENSE](./ported/original/LICENSE).

---

hi. it renders lyrics.

that's the whole thing.

wonderful.
