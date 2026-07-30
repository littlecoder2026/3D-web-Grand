/**
 * Packshots, drawn as inline SVG.
 *
 * There is no product photography for this project, so rather than fake it with
 * stock images the packs are drawn from the identity: the pack silhouette, the
 * wordmark with its gold stop, the flavour line in grotesque, and the dose. It
 * stays crisp at any size, costs no requests, and cannot go off-brand.
 *
 * Each form matches something actually modelled in the 3D store, so the shelf
 * online and the shelf in the room hold the same objects.
 */

const GOLD = '#C8922E';
const CREAM = '#F4EEDE';
const GREEN = '#163A2B';

/** The wordmark, as SVG text. Always with the gold full stop. */
function mark(x, y, size, ink) {
  return `
    <text x="${x}" y="${y}" font-family="Warren, Georgia, serif" font-size="${size}"
          fill="${ink}" text-anchor="middle" letter-spacing="${size * 0.02}">GRAND</text>
    <circle cx="${x + size * 1.02}" cy="${y - size * 0.08}" r="${size * 0.1}" fill="${GOLD}" />`;
}

function label(x, y, text, size, ink, opacity = 0.75) {
  return `
    <text x="${x}" y="${y}" font-family="Inter, Helvetica Neue, Arial, sans-serif"
          font-size="${size}" fill="${ink}" fill-opacity="${opacity}"
          text-anchor="middle" letter-spacing="${size * 0.09}"
          style="text-transform:uppercase">${text}</text>`;
}

/** Dose lozenge — the same boxed figure that appears on the packs in the store. */
function dose(cx, cy, mg, ink) {
  if (!mg) return '';
  return `
    <rect x="${cx - 34}" y="${cy - 13}" width="68" height="26" rx="3"
          fill="none" stroke="${ink}" stroke-opacity="0.5" stroke-width="1.4" />
    <text x="${cx}" y="${cy + 5}" font-family="Inter, Helvetica Neue, Arial, sans-serif"
          font-size="12" fill="${ink}" fill-opacity="0.8" text-anchor="middle"
          letter-spacing="0.6">${mg}mg THC</text>`;
}

/**
 * @param {object} p        product from the catalogue
 * @param {number} mg       dose in milligrams, or null
 * @returns {string} an <svg> string, 300 x 340
 */
export function packshot(p, mg) {
  const tone = p.tone || GREEN;
  const ink = p.ink || CREAM;
  const W = 300;
  const H = 340;
  const nm = p.name.toUpperCase();

  // A soft ground shadow under every form, so packs sit rather than float.
  const ground = `<ellipse cx="150" cy="318" rx="86" ry="9" fill="${GREEN}" fill-opacity="0.1" />`;

  const forms = {
    // ── Folding carton: tea, gum ─────────────────────────────────────────────
    carton: () => `
      ${ground}
      <g>
        <rect x="88" y="52" width="124" height="256" rx="4" fill="${tone}" />
        <rect x="196" y="52" width="16" height="256" rx="3" fill="#000" fill-opacity="0.16" />
        <rect x="88" y="52" width="124" height="10" rx="3" fill="#fff" fill-opacity="0.1" />
        ${mark(146, 104, 26, ink)}
        ${label(150, 176, nm, 12, ink, 0.95)}
        ${label(150, 200, p.notes, 9.5, ink, 0.6)}
        ${dose(150, 264, mg, ink)}
      </g>`,

    // ── Stand-up pouch: gummies ──────────────────────────────────────────────
    pouch: () => `
      ${ground}
      <g>
        <path d="M74 84 Q74 62 96 62 L204 62 Q226 62 226 84 L226 286 Q226 308 204 308 L96 308 Q74 308 74 286 Z"
              fill="${tone}" />
        <path d="M74 84 Q74 62 96 62 L204 62 Q226 62 226 84 L226 96 L74 96 Z" fill="#fff" fill-opacity="0.12" />
        <rect x="94" y="48" width="112" height="16" rx="3" fill="${tone}" />
        <rect x="94" y="48" width="112" height="16" rx="3" fill="#000" fill-opacity="0.18" />
        <circle cx="150" cy="56" r="4" fill="${GREEN}" fill-opacity="0.35" />
        ${mark(146, 138, 26, ink)}
        ${label(150, 200, nm, 12, ink, 0.95)}
        ${label(150, 224, p.notes, 9.5, ink, 0.6)}
        ${dose(150, 278, mg, ink)}
      </g>`,

    // ── 330ml can: drinks ────────────────────────────────────────────────────
    can: () => `
      ${ground}
      <g>
        <rect x="104" y="60" width="92" height="248" rx="12" fill="${tone}" />
        <rect x="104" y="60" width="18" height="248" rx="9" fill="#fff" fill-opacity="0.14" />
        <rect x="178" y="60" width="18" height="248" rx="9" fill="#000" fill-opacity="0.18" />
        <ellipse cx="150" cy="62" rx="46" ry="9" fill="#B9B3A6" />
        <ellipse cx="150" cy="60" rx="38" ry="6" fill="#CFC9BC" />
        <rect x="104" y="150" width="92" height="1.5" fill="${GOLD}" fill-opacity="0.7" />
        <rect x="104" y="232" width="92" height="1.5" fill="${GOLD}" fill-opacity="0.7" />
        ${mark(147, 128, 22, ink)}
        ${label(150, 178, nm, 10.5, ink, 0.95)}
        ${label(150, 200, p.notes, 8.5, ink, 0.6)}
        ${dose(150, 268, mg, ink)}
      </g>`,

    // ── Glass jar: flower, balms ─────────────────────────────────────────────
    jar: () => `
      ${ground}
      <g>
        <rect x="92" y="120" width="116" height="188" rx="14" fill="#DCE3DC" fill-opacity="0.55" />
        <rect x="92" y="120" width="22" height="188" rx="11" fill="#fff" fill-opacity="0.5" />
        <rect x="186" y="120" width="22" height="188" rx="11" fill="${GREEN}" fill-opacity="0.1" />
        <!-- contents -->
        <rect x="100" y="196" width="100" height="106" rx="10" fill="${tone}" fill-opacity="0.92" />
        <circle cx="126" cy="212" r="15" fill="#000" fill-opacity="0.1" />
        <circle cx="168" cy="224" r="13" fill="#fff" fill-opacity="0.08" />
        <!-- brass lid -->
        <rect x="86" y="96" width="128" height="30" rx="7" fill="${GOLD}" />
        <rect x="86" y="96" width="128" height="10" rx="5" fill="#fff" fill-opacity="0.28" />
        <rect x="86" y="118" width="128" height="8" rx="3" fill="#000" fill-opacity="0.16" />
        <!-- neck label -->
        <rect x="98" y="140" width="104" height="48" rx="3" fill="${CREAM}" />
        <text x="150" y="160" font-family="Warren, Georgia, serif" font-size="17"
              fill="${GREEN}" text-anchor="middle">GRAND</text>
        <circle cx="196" cy="155" r="2.6" fill="${GOLD}" />
        ${label(150, 178, nm, 8.5, GREEN, 0.72)}
        ${dose(150, 288, mg, CREAM)}
      </g>`,

    // ── Dropper bottle: tinctures ────────────────────────────────────────────
    bottle: () => `
      ${ground}
      <g>
        <rect x="120" y="60" width="60" height="34" rx="6" fill="${GREEN}" />
        <rect x="132" y="88" width="36" height="18" rx="3" fill="${GOLD}" fill-opacity="0.85" />
        <path d="M108 112 Q108 104 118 104 L182 104 Q192 104 192 112 L192 292 Q192 308 176 308 L124 308 Q108 308 108 292 Z"
              fill="${tone}" />
        <path d="M108 112 Q108 104 118 104 L134 104 L134 308 L124 308 Q108 308 108 292 Z"
              fill="#fff" fill-opacity="0.12" />
        <rect x="118" y="150" width="64" height="96" rx="3" fill="${CREAM}" />
        <text x="150" y="172" font-family="Warren, Georgia, serif" font-size="15"
              fill="${GREEN}" text-anchor="middle">GRAND</text>
        <circle cx="189" cy="167" r="2.4" fill="${GOLD}" />
        ${label(150, 192, nm, 7.5, GREEN, 0.72)}
        ${label(150, 210, '30ml', 7.5, GREEN, 0.5)}
        ${dose(150, 232, mg, GREEN)}
      </g>`,

    // ── Pre-roll tube ────────────────────────────────────────────────────────
    tube: () => `
      ${ground}
      <g>
        <rect x="112" y="86" width="76" height="222" rx="34" fill="#DCE3DC" fill-opacity="0.5" />
        <rect x="112" y="86" width="18" height="222" rx="9" fill="#fff" fill-opacity="0.5" />
        <!-- the rolls inside -->
        <rect x="128" y="120" width="12" height="170" rx="6" fill="${CREAM}" />
        <rect x="144" y="112" width="12" height="178" rx="6" fill="${CREAM}" />
        <rect x="160" y="122" width="12" height="168" rx="6" fill="${CREAM}" />
        <rect x="128" y="248" width="44" height="42" fill="${tone}" fill-opacity="0.85" />
        <!-- green cap -->
        <rect x="106" y="62" width="88" height="34" rx="10" fill="${GREEN}" />
        <rect x="106" y="62" width="88" height="11" rx="5" fill="#fff" fill-opacity="0.12" />
        <rect x="110" y="150" width="80" height="62" rx="3" fill="${CREAM}" />
        <text x="150" y="172" font-family="Warren, Georgia, serif" font-size="16"
              fill="${GREEN}" text-anchor="middle">GRAND</text>
        <circle cx="192" cy="167" r="2.5" fill="${GOLD}" />
        ${label(150, 192, p.notes, 7, GREEN, 0.65)}
        ${dose(150, 208, mg, GREEN)}
      </g>`,

    // ── Loose-leaf tin ───────────────────────────────────────────────────────
    tin: () => `
      ${ground}
      <g>
        <rect x="82" y="118" width="136" height="190" rx="10" fill="${tone}" />
        <rect x="82" y="118" width="26" height="190" rx="10" fill="#fff" fill-opacity="0.12" />
        <rect x="192" y="118" width="26" height="190" rx="10" fill="#000" fill-opacity="0.16" />
        <rect x="76" y="98" width="148" height="28" rx="6" fill="${GOLD}" />
        <rect x="76" y="98" width="148" height="9" rx="4" fill="#fff" fill-opacity="0.3" />
        ${mark(146, 190, 26, ink)}
        ${label(150, 226, nm, 10.5, ink, 0.92)}
        ${label(150, 248, '100g loose leaf', 8.5, ink, 0.55)}
        ${dose(150, 288, mg, ink)}
      </g>`,

    // ── Vape device / cartridge ──────────────────────────────────────────────
    device: () => `
      ${ground}
      <g>
        <rect x="128" y="58" width="44" height="18" rx="7" fill="${GREEN}" />
        <rect x="122" y="74" width="56" height="228" rx="18" fill="${tone}" />
        <rect x="122" y="74" width="16" height="228" rx="8" fill="#fff" fill-opacity="0.16" />
        <rect x="162" y="74" width="16" height="228" rx="8" fill="#000" fill-opacity="0.2" />
        <rect x="122" y="150" width="56" height="7" fill="${GOLD}" />
        <circle cx="150" cy="200" r="9" fill="${CREAM}" fill-opacity="0.2" />
        <text x="150" y="262" font-family="Warren, Georgia, serif" font-size="14"
              fill="${CREAM}" text-anchor="middle">GRAND</text>
        <circle cx="181" cy="257" r="2.3" fill="${GOLD}" />
        ${dose(150, 300, mg, GREEN)}
      </g>`,

    // ── Merch ────────────────────────────────────────────────────────────────
    tee: () => `
      ${ground}
      <g>
        <path d="M108 92 L138 76 Q150 88 162 76 L192 92 L212 130 L186 142 L186 300 Q150 306 114 300 L114 142 L88 130 Z"
              fill="${tone}" />
        <path d="M138 76 Q150 88 162 76 L156 72 Q150 80 144 72 Z" fill="#000" fill-opacity="0.2" />
        <text x="150" y="184" font-family="Warren, Georgia, serif" font-size="20"
              fill="${ink}" text-anchor="middle">GRAND</text>
        <circle cx="192" cy="177" r="3.4" fill="${GOLD}" />
      </g>`,

    cap: () => `
      ${ground}
      <g>
        <path d="M84 232 Q84 130 150 130 Q216 130 216 232 Z" fill="${tone}" />
        <path d="M84 232 Q84 130 150 130 Q128 152 122 232 Z" fill="#fff" fill-opacity="0.1" />
        <path d="M72 232 Q150 214 228 232 Q230 262 150 262 Q70 262 72 232 Z" fill="${tone}" />
        <path d="M72 232 Q150 214 228 232 Q150 240 72 232 Z" fill="#000" fill-opacity="0.22" />
        <rect x="146" y="130" width="8" height="102" fill="#000" fill-opacity="0.12" />
        <text x="150" y="204" font-family="Warren, Georgia, serif" font-size="17"
              fill="${ink}" text-anchor="middle">GRAND</text>
        <circle cx="177" cy="198" r="3" fill="${GOLD}" />
      </g>`,

    tote: () => `
      ${ground}
      <g>
        <path d="M112 108 Q112 68 150 68 Q188 68 188 108" fill="none" stroke="${tone}"
              stroke-width="9" stroke-linecap="round" />
        <rect x="88" y="104" width="124" height="196" rx="6" fill="${tone}" />
        <rect x="88" y="104" width="124" height="10" fill="#000" fill-opacity="0.1" />
        <text x="150" y="212" font-family="Warren, Georgia, serif" font-size="22"
              fill="${ink}" text-anchor="middle">GRAND</text>
        <circle cx="196" cy="205" r="3.6" fill="${GOLD}" />
      </g>`,
  };

  const body = (forms[p.form] || forms.carton)();

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img"
               aria-label="${p.name}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

/**
 * The three-pip Grand Scale indicator, matching the shelf tickets in the store.
 * `step` of null renders nothing — merch has no dose.
 */
export function pips(step) {
  if (!step) return '';
  const dots = [1, 2, 3]
    .map((i) => `<span class="pip${i <= step ? ' pip--on' : ''}"></span>`)
    .join('');
  return `<span class="pips" role="img" aria-label="Grand Scale ${step} of 3">${dots}</span>`;
}
