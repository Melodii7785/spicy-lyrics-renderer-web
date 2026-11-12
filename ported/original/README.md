# original Spicy Lyrics engine source

this directory contains the original Spicy Lyrics renderer source imported for the browser port.

the files are kept in their original relative layout so their internal imports remain intact.

## what's included

- the original lyrics animator and setter;
- the original lyrics virtualizer;
- syllable-, line-, and static-lyrics applyers;
- lyric state and data structures;
- scrolling helpers;
- text utilities, grapheme handling, and emphasis;
- spring and animation-frame utilities;
- the original lyrics stylesheet.

the browser adapter lives one directory above this one:

`../OriginalSpicyLyricsEngine.ts`

that adapter supplies the browser-side host container and playback-clock bridge used by the standalone port.

## upstream

the source was imported from [Melodii7785/spicy-lyrics](https://github.com/Melodii7785/spicy-lyrics).

the original license is retained in this directory. see `LICENSE` before redistributing or modifying the source.
