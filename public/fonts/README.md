# Fonts

**WARREN is not in this repository.** It is a licensed commercial typeface and
redistributing it in a public repo would breach the licence, so it is gitignored.

The project builds and runs without it. Every heading, the wordmark and the
in-world signwriting fall back to Georgia through the CSS stack, and the fascia
lettering is drawn rather than extruded from real outlines.

## To switch it on

If you hold a WARREN licence, drop both files into this folder:

```
public/fonts/
  WARREN.woff   ← the webfont: headings, wordmark, all UI
  WARREN.otf    ← the outlines: extruded 3D signwriting on the fascia and
                  in the arched niche behind the counter
```

Reload. Nothing else to configure — `src/core/brandfont.js` registers the
webfont at runtime and `src/world/signage.js` picks up the outlines, both
resolved against `import.meta.env.BASE_URL` so they work served from a root,
from a sub-path, or from `file://`.

## Why it's loaded this way

A missing `url()` in a CSS `@font-face`, or a missing `?url` import in JS, is a
hard build error under Vite. Both would make the licensed file a build
dependency rather than an optional enhancement — which is exactly what it must
not be for a public repository. So the webfont is registered with the FontFace
API and the outlines are fetched, both with graceful failure.

## Substituting a different face

The identity calls for a high-contrast display serif (CI p4: WARREN for logo and
title, Georgia for text). If you want the relief signwriting without a WARREN
licence, any `.otf`/`.woff` pair will work — rename them to `WARREN.otf` and
`WARREN.woff`, or change `WARREN_OTF` / `WARREN_WOFF` in
`src/core/brandfont.js`.
