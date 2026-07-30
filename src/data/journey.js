/**
 * Camera waypoints and hotspots, keyed to the numbered floor plan.
 *
 * The tour walks the plan in the order a customer moves through it: the street,
 * in through the doors, the island, each side wall, then the counter. No
 * backtracking.
 */

export const WAYPOINTS = [
  {
    id: 'approach',
    stage: 1,
    name: 'Street & approach',
    label: 'The frontage',
    job: 'Legible from across the street. Reads as a good shop, not a dispensary.',
    // A 10m frontage needs real standoff: this is roughly a 35mm lens from the
    // far kerb. fov is vertical.
    position: [0.8, 1.6, 17.6],
    target: [0, 3.1, 0.4],
    fov: 45,
    interior: false,
  },
  {
    id: 'entry',
    stage: 2,
    name: 'Entry & foyer',
    label: 'Threshold',
    job: 'Decompression. The whole room legible in one look, nothing to work out.',
    // Just inside the doors. Standing further in put the near end of the island
    // less than 2m from the lens and it swallowed the frame; from here it sits
    // in the middle distance and the arch carries the shot, as the reference does.
    position: [0, 1.68, -0.55],
    target: [0, 1.72, -8.4],
    fov: 58,
    interior: true,
    // Travel in through the doorway rather than through the glass.
    via: [[0, 1.62, 4.4], [0, 1.63, 0.5]],
  },
  {
    id: 'island',
    stage: 3,
    name: 'The vape stand',
    label: 'Centre floor',
    job: 'Browsable from all four sides. Nothing behind glass, nothing to ask for.',
    position: [1.75, 1.6, -3.1],
    target: [-0.35, 1.0, -5.6],
    fov: 54,
    interior: true,
  },
  {
    id: 'bays-left',
    stage: 4,
    name: 'Tea, gummies & gum',
    label: 'Left wall',
    job: 'Make choice legible. Borrowable vocabulary on every shelf.',
    position: [-1.5, 1.62, -2.6],
    target: [-4.7, 1.5, -5.6],
    fov: 58,
    interior: true,
  },
  {
    id: 'bays-right',
    stage: 5,
    name: 'Drinks, mensch & merch',
    label: 'Right wall',
    job: 'The same grammar, mirrored. Whatever your ritual is, there is a way in.',
    position: [1.5, 1.62, -2.6],
    target: [4.7, 1.5, -5.6],
    fov: 58,
    interior: true,
    via: [[0, 1.62, -2.2]],
  },
  {
    id: 'counter',
    stage: 6,
    name: 'The counter',
    label: 'After-care',
    job: 'Confidence rehearsed, not just purchased.',
    // Beside the island rather than down its centreline — the island runs
    // z -3.2 to -7.0, so the axial view stood inside it.
    position: [2.15, 1.62, -5.0],
    target: [0.15, 1.45, -8.25],
    fov: 56,
    interior: true,
    via: [[2.3, 1.62, -3.4]],
  },
];

/**
 * Hotspots. `position` is the world anchor; the marker floats there and the
 * panel opens on click (or Enter, when reached by keyboard).
 */
export const HOTSPOTS = [
  {
    id: 'fascia',
    stage: 1,
    kind: 'craft',
    position: [0, 3.85, 0.2],
    title: 'The fascia',
    kicker: 'Signwritten, not printed',
    body:
      'GRAND. in cream on bottle green, lined out in gold, with the gilded full stop ' +
      'that appears on every instance of the wordmark. The lettering is modelled as ' +
      'extruded geometry rather than a decal so the gold catches the light the way ' +
      'real gilding does. Eight recessed downlights on the cornice soffit wash the ' +
      'board after dark — no lightbox, nothing that glows.',
  },
  {
    id: 'hangingsign',
    stage: 1,
    kind: 'craft',
    position: [-5.62, 2.55, 0.72],
    title: 'The hanging sign',
    kicker: 'Legible along the pavement',
    body:
      'A projecting green disc on a brass bracket, double-sided, reading GRAND. over ' +
      'CANNABIS DISPENSARY. A flat fascia is only legible head-on; the hanging sign is ' +
      'what does the work for somebody walking towards the shop rather than standing ' +
      'across from it.',
  },
  {
    id: 'roundel',
    stage: 1,
    kind: 'responsibility',
    position: [1.07, 1.55, 0.24],
    title: 'The 18+ roundel',
    kicker: 'Responsibility, at 56mm',
    body:
      'A brass roundel beside the doors at door height, and an age check at the till. ' +
      'Responsibility is legible to anyone looking for it and invisible to everyone ' +
      'else — the opposite of a warning label. No security glass, no shutter, no ' +
      'bollard on this frontage.',
  },
  {
    id: 'mat',
    stage: 2,
    kind: 'craft',
    position: [0, 0.1, -1.15],
    title: 'The threshold',
    kicker: 'Level, and no counter in the way',
    body:
      'The doors open onto a flush brass threshold and a GRAND. mat — no step, so the ' +
      'shopfront never quietly tells a wheelchair user this shop is not for them. From ' +
      'here the whole room is legible in one look: island in the middle, product down ' +
      'both walls, counter at the back. Nothing to work out before you start.',
  },
  {
    id: 'island',
    stage: 3,
    kind: 'range',
    position: [0, 1.16, -5.1],
    title: 'The vape stand',
    kicker: 'Plan item 2 · the centre of the room',
    body:
      'A pill-shaped island in bottle green, ringed with gold banding under a light oak ' +
      'top, standing on a sage rug. Five groups down its length, each with its own ' +
      'card in plain English. You can walk all the way round it and pick things up.',
    items: [
      ['Vape', 'Premium devices & cartridges.', false],
      ['Flower', 'Hand trimmed. Lab tested.', true],
      ['Pre-rolls', 'Perfectly rolled. Always ready.', false],
      ['Tinctures', 'Precise dosing. Naturally balanced.', false],
      ['Topicals', 'Feel the relief. Naturally.', false],
    ],
    footnote: 'Sales floor 78.0m² of a 102.5m² unit — the island is what makes it browsable.',
  },
  {
    id: 'tea',
    stage: 4,
    kind: 'service',
    position: [-4.55, 1.95, -6.9],
    title: 'Tea',
    kicker: 'Plan item 3 · the granny test, made literal',
    body:
      'The most ordinary, most Irish ritual there is, given the best bay in the shop. ' +
      'Tea leads emotionally for exactly the reason the strategy says it should: it is ' +
      'the product a first-time customer can picture themselves buying before they can ' +
      'picture buying anything else.',
  },
  {
    id: 'gummies',
    stage: 4,
    kind: 'range',
    position: [-4.55, 1.95, -4.1],
    title: 'Gummies',
    kicker: 'Plan item 4 · a precise first dose',
    body:
      'Four flavours, each pouch carrying its dose on the front in grotesque rather ' +
      'than buried in the small print. Gummies are where most first purchases should ' +
      'start, because the dose is exact and nothing has to be lit.',
    items: [
      ['Sour Bears', '10mg THC · the everyday', false],
      ['Watermelon', '10mg THC', false],
      ['Peach', '10mg THC', false],
      ['Mixed Fruit', '10mg THC', false],
    ],
  },
  {
    id: 'bayframe',
    stage: 4,
    kind: 'craft',
    position: [-4.55, 2.72, -1.3],
    title: 'The wall bays',
    kicker: 'Six of them, one grammar',
    body:
      'Base cupboards in bottle green under a light oak top, an arched recess lined in ' +
      'Forest Ink, three gold-framed shelves with the strip light hidden behind the ' +
      'brass edge, a gilded header, and a planter on the cornice. Identical on both ' +
      'walls, so the room reads as one system rather than six fittings.',
  },
  {
    id: 'drinks',
    stage: 5,
    kind: 'range',
    position: [4.55, 1.95, -6.9],
    title: 'Drinks',
    kicker: 'Plan item 6 · refresh, reset, rise',
    body:
      'Infused cans at a fixed 10mg, in the same three flavours every time so the ' +
      'shelf becomes familiar. A can is the least ceremonious way into the category ' +
      'that exists — no kit, no technique, nothing to learn.',
  },
  {
    id: 'merch',
    stage: 5,
    kind: 'craft',
    position: [4.55, 1.95, -1.3],
    title: 'Merch',
    kicker: 'Plan item 8 · wear it, live it',
    body:
      'Caps, totes and tees in bottle green and cream. Merch is the cheapest ' +
      'advertising a brand with advertising restrictions can buy, and the only ' +
      'touchpoint that leaves the shop and keeps working.',
  },
  {
    id: 'counter',
    stage: 6,
    kind: 'service',
    position: [0, 1.3, -7.3],
    title: 'The counter',
    kicker: 'Plan item 9 · curved, not a barricade',
    body:
      'Five and a half metres of bottle green with rounded ends, a light oak top and a ' +
      'brass nosing, with GRAND. gilded across the front. Two till screens sit back on ' +
      'the staff side and face away from the customer. It is a place to be served at, ' +
      'not a pharmacy hatch to be processed through.',
  },
  {
    id: 'arch',
    stage: 6,
    kind: 'craft',
    position: [0, 2.5, -8.3],
    title: 'The arched niche',
    kicker: 'The wordmark, in relief',
    body:
      'A plaster arch in the rear wall with the wordmark modelled in relief and lit ' +
      'from above, flanked by two lit shelf units and, behind, the storage room and ' +
      'staff room. It is the shot every customer photographs, which is exactly why the ' +
      'gold stop is the only gold in it.',
  },
  {
    id: 'dosage',
    stage: 6,
    kind: 'dosage',
    position: [1.7, 1.2, -7.3],
    title: 'The Grand Scale',
    kicker: 'The dosage system',
    body:
      'One scale, used identically on every shelf card, every pack and every receipt. ' +
      'Three steps, in plain Irish English, set in grotesque so it informs rather than ' +
      'reassures.',
    items: [
      ['One · Gentle', '2.5mg · a half glass of wine. Where every first visit starts.', false],
      ['Two · Easy', '5mg · a pint. The everyday middle.', false],
      ['Three · Grand', '10mg · a double. Know yourself first.', false],
    ],
    footnote:
      'Start at One. Wait a full hour before you decide it isn\'t working — that hour ' +
      'is the advice, not the small print.',
  },
];

/**
 * Inventions and departures, flagged for approval or overrule.
 */
export const ASSUMPTIONS = [
  'The reference elevation and one interior poster carry a cannabis leaf. That is on ' +
    'the brief\'s absolute-exclusions list, so the framed base panels and the ' +
    '"Nature. Science. Balance." print carry the wordmark instead. Set USE_LEAF_MARK ' +
    'in src/data/brand.js to follow the reference literally.',
  'The Grand Scale (2.5 / 5 / 10mg, named Gentle / Easy / Grand) is invented here. ' +
    'The reference packaging shows a flat 10mg; the master strategy lists the ' +
    'information & dosage system as unresolved.',
  'Ceiling height is 3.6m and the upper storey runs to 9.0m. The plan fixes the ' +
    '10.0 × 10.25m footprint but is silent on section.',
  '"MENSCH" is carried through from the plan as the wellness line, dressed with ' +
    'tinctures and topicals. The strategy deck does not define it.',
  'Hosts and customers are not modelled. Figures at archviz standard read as ' +
    'mannequins in real time, and "stock-photo smiles" is on the exclusion list — the ' +
    'set is staged as open and just-vacated instead.',
  'The neighbouring units are plain stone frontages. The plan and elevation show only ' +
    'the GRAND. unit.',
];
