/**
 * WARREN — the display face, loaded at runtime rather than bundled.
 *
 * WARREN is a licensed commercial typeface. It is deliberately NOT committed to
 * this repository, and nothing here resolves it at build time, so the project
 * compiles and runs whether or not the file is present:
 *
 *   - present  → headings, the wordmark and the in-world signwriting are set in
 *                WARREN, and the fascia lettering is extruded from its outlines
 *   - absent   → everything falls back to Georgia through the CSS font stack,
 *                and the signwriting is drawn rather than extruded
 *
 * Drop `WARREN.woff` and `WARREN.otf` into `public/fonts/` to switch it on.
 * See public/fonts/README.md.
 *
 * Paths are resolved against `import.meta.env.BASE_URL` rather than hard-coded,
 * so this works served from the root, from a sub-path, and from `file://` on a
 * USB stick at the exhibition.
 */

/**
 * Absolute URL for a file in `public/`, correct under any base.
 *
 * Falls back to a plain relative path outside a browser, so the same modules can
 * be imported by the design-file generator under Node without a DOM.
 */
export function assetUrl(path) {
  const clean = path.replace(/^\//, '');
  const env = typeof import.meta !== 'undefined' ? import.meta.env : null;
  const base = (env && env.BASE_URL) || './';
  if (typeof window === 'undefined' || !window.location) return base + clean;
  return new URL(clean, new URL(base, window.location.href)).href;
}

export const WARREN_WOFF = 'fonts/WARREN.woff';
export const WARREN_OTF = 'fonts/WARREN.otf';

let _cssPromise = null;

/**
 * Register the WARREN webfont if it is available.
 *
 * Uses the FontFace API instead of a stylesheet `@font-face`, because a missing
 * `url()` in CSS is a hard build error under Vite — and the whole point here is
 * that the file is optional.
 *
 * @returns {Promise<boolean>} whether WARREN is actually available
 */
export function ensureDisplayFont() {
  if (_cssPromise) return _cssPromise;

  _cssPromise = (async () => {
    if (typeof FontFace === 'undefined' || !document.fonts) return false;
    try {
      const face = new FontFace('Warren', `url(${JSON.stringify(assetUrl(WARREN_WOFF))})`, {
        weight: '400',
        display: 'swap',
      });
      await face.load();
      document.fonts.add(face);
      return true;
    } catch {
      // Not an error: the licensed file simply isn't in this checkout.
      return false;
    }
  })();

  return _cssPromise;
}
