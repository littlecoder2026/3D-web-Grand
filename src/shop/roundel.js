/**
 * The GRAND. roundel — the seal that appears on every pack.
 *
 * Drawn as inline SVG rather than shipped as a PNG, for the same reasons the
 * packshots are: there is no background to knock out because there is no raster
 * to begin with, it stays crisp at any size, it costs no request (so it still
 * works from a USB stick at the exhibition), and it is styled from the same
 * tokens as the rest of the site — so it cannot drift out of palette.
 *
 * Construction, from the printed seal:
 *   · a bottle-green disc, a shade deeper than the UI green
 *   · a single gold hairline ring, inset
 *   · GRAND · IRELAND arced over the top, letterspaced, in the display face
 *   · the G, large enough to break well past the centre of the disc
 *
 * Colours are written as presentation attributes so the mark is correct even
 * with no stylesheet at all, and re-stated as custom properties in shop.css so
 * the palette stays in one place. They are deliberately not `var()` in the
 * attributes themselves: substitution into SVG presentation attributes is not
 * supported across browsers, Safari included.
 */

const VB = 400;
const C = VB / 2;

/**
 * Radii and sizes, measured off the printed seal and normalised to this
 * viewBox: gold ring at 0.855 of the radius, legend baseline at 0.735, the G
 * standing 0.55 of the full diameter with its foot just below centre.
 */
const R_RING = 171;
const R_TEXT = 147;
const LEGEND_SIZE = 17;
const LEGEND_TRACK = 7;
const G_SIZE = 300;
const G_BASELINE = 317;

/** Arc for the legend: the upper half, left to right, so it reads upright. */
const ARC = `M ${C - R_TEXT},${C} A ${R_TEXT},${R_TEXT} 0 0 1 ${C + R_TEXT},${C}`;

let seq = 0;

/**
 * @param {object} [o]
 * @param {string} [o.className]  extra class on the <svg>
 * @param {string} [o.title]      accessible name; omit to mark it decorative
 * @param {string} [o.legend]     the arced text
 * @returns {string} an <svg> string, transparent outside the disc
 */
export function roundel({ className = '', title = '', legend = 'GRAND · IRELAND' } = {}) {
  // Unique per instance: two roundels on one page must not share a path id.
  const id = `roundel-arc-${++seq}`;
  const a11y = title
    ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true" focusable="false"';

  return `<svg class="roundel${className ? ` ${className}` : ''}" viewBox="0 0 ${VB} ${VB}"
     xmlns="http://www.w3.org/2000/svg" ${a11y}>
  <defs><path id="${id}" d="${ARC}" fill="none" /></defs>

  <circle class="roundel__disc" cx="${C}" cy="${C}" r="${C}" fill="#0e3325" />

  <circle class="roundel__ring" cx="${C}" cy="${C}" r="${R_RING}"
          fill="none" stroke="#c8922e" stroke-width="2" />

  <text class="roundel__legend" fill="#f4eede" font-size="${LEGEND_SIZE}"
        letter-spacing="${LEGEND_TRACK}" text-anchor="middle">
    <textPath href="#${id}" startOffset="50%">${legend}</textPath>
  </text>

  <text class="roundel__g" x="${C}" y="${G_BASELINE}" fill="#f4eede"
        font-size="${G_SIZE}" text-anchor="middle">G</text>
</svg>`;
}
