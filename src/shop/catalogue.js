/**
 * The catalogue.
 *
 * Categories mirror the store exactly: the six wall bays from the floor plan
 * (tea, gummies, chewing gum, drinks, mensch, merch) plus the three groups off
 * the central island (flower, pre-rolls, vape). Walk the shop online and you are
 * walking the same room.
 *
 * Every product carries its strength on the Grand Scale — the same three-pip
 * system used on the shelf tickets and the dosage card in the store. That is the
 * responsibility pillar doing its job at product level rather than as a warning
 * label bolted on at checkout.
 */

/** The Grand Scale. One scale, everywhere. */
export const SCALE = [
  { step: 1, name: 'Gentle', mg: 2.5, note: 'A half glass of wine. Where every first visit starts.' },
  { step: 2, name: 'Easy', mg: 5, note: 'A pint. The everyday middle.' },
  { step: 3, name: 'Grand', mg: 10, note: 'A double. Know yourself first.' },
];

export const CATEGORIES = [
  {
    id: 'tea',
    name: 'Tea',
    plan: 3,
    tagline: 'For the mind, body & soul.',
    blurb:
      'The most ordinary, most Irish ritual there is. If you have ever made a pot for ' +
      'somebody having a hard week, you already know how to use this.',
  },
  {
    id: 'gummies',
    name: 'Gummies',
    plan: 4,
    tagline: 'Good vibes. Anytime.',
    blurb:
      'Where most first purchases should start: the dose is exact, nothing has to be ' +
      'lit, and there is no technique to get wrong.',
  },
  {
    id: 'gum',
    name: 'Chewing gum',
    plan: 5,
    tagline: 'Fresh breath. Elevated.',
    blurb: 'Pocket-sized, fast and measured. The least ceremonious thing we sell.',
  },
  {
    id: 'drinks',
    name: 'Drinks',
    plan: 6,
    tagline: 'Refresh. Reset. Rise.',
    blurb:
      'Infused cans at a fixed dose, in the same three flavours every time, so the ' +
      'shelf becomes familiar rather than a decision.',
  },
  {
    id: 'mensch',
    name: 'Mensch',
    plan: 7,
    tagline: 'Precise dosing. Naturally balanced.',
    blurb:
      'The wellness end of the range: tinctures you measure by the drop and balms you ' +
      'rub in. Nothing here is smoked and nothing here is a shortcut.',
  },
  {
    id: 'flower',
    name: 'Flower',
    plan: null,
    tagline: 'Hand trimmed. Lab tested.',
    blurb:
      'Grown two hundred metres from the shop, trimmed by hand, tested by a lab whose ' +
      'name is on the jar. The craft end of the range.',
  },
  {
    id: 'prerolls',
    name: 'Pre-rolls',
    plan: null,
    tagline: 'Perfectly rolled. Always ready.',
    blurb: 'For anybody who would rather not learn to roll, which is most people.',
  },
  {
    id: 'vape',
    name: 'Vape',
    plan: null,
    tagline: 'Premium devices & cartridges.',
    blurb: 'Discreet, less smell, and the easiest thing in the range to put down again.',
  },
  {
    id: 'merch',
    name: 'Merch',
    plan: 8,
    tagline: 'Wear it. Live it.',
    blurb:
      'Caps, totes and tees in bottle green and cream. The only touchpoint that leaves ' +
      'the shop and keeps working.',
  },
];

/**
 * `form` selects the packshot silhouette. `tone` is the pack colour and is the
 * only place a product is allowed to depart from the palette — flavour needs to
 * be legible on a shelf.
 */
export const PRODUCTS = [
  // ── Tea ───────────────────────────────────────────────────────────────────
  {
    id: 'tea-barmbrack',
    name: 'Barmbrack',
    category: 'tea',
    form: 'carton',
    price: 12,
    scale: 1,
    notes: 'sweet · malt · orange',
    when: 'Sunday afternoon, nothing on.',
    tone: '#7A5C3A',
    hero: true,
    body:
      'Blended to taste like the loaf: malt, dried fruit and a strip of orange peel. ' +
      'Twenty bags, one to a cup, and the dose is the same in every single one.',
  },
  {
    id: 'tea-dublin-dry',
    name: 'Dublin Dry',
    category: 'tea',
    form: 'carton',
    price: 12,
    scale: 2,
    notes: 'pine · pepper · citrus',
    when: 'A Friday, with the match on.',
    tone: '#3E5C46',
    body: 'Brisk and a bit peppery. The one to make when somebody calls round unexpectedly.',
  },
  {
    id: 'tea-liffeyside',
    name: 'Liffeyside',
    category: 'tea',
    form: 'carton',
    price: 12,
    scale: 1,
    notes: 'grass · mint · pear',
    when: 'A first go — most people start here.',
    tone: '#4A6B72',
    body:
      'The gentlest thing in the shop and the one our hosts hand over most often. If you ' +
      'have never done this before, do this.',
  },
  {
    id: 'tea-loose',
    name: 'The Nine, loose leaf',
    category: 'tea',
    form: 'tin',
    price: 18,
    scale: 2,
    notes: 'earth · cocoa · hay',
    when: 'After a long one.',
    tone: '#5C4A33',
    body: 'A hundred grams loose, in a tin worth keeping. Two grams to a pot, four minutes.',
  },

  // ── Gummies ───────────────────────────────────────────────────────────────
  {
    id: 'gum-sour-bears',
    name: 'Sour Bears',
    category: 'gummies',
    form: 'pouch',
    price: 16,
    scale: 3,
    notes: 'lemon · lime · sharp',
    when: 'The everyday.',
    tone: '#5E6B36',
    hero: true,
    body:
      'Ten bears, ten milligrams each, scored down the middle so half a bear is a real ' +
      'and sensible amount to take.',
  },
  {
    id: 'gum-watermelon',
    name: 'Watermelon',
    category: 'gummies',
    form: 'pouch',
    price: 16,
    scale: 3,
    notes: 'melon · sugar · cool',
    when: 'Warm evenings.',
    tone: '#8E2F3E',
    body: 'Ten pieces, ten milligrams each. Tastes like the ice pop, behaves like nothing of the sort.',
  },
  {
    id: 'gum-peach',
    name: 'Peach',
    category: 'gummies',
    form: 'pouch',
    price: 16,
    scale: 2,
    notes: 'peach · honey · soft',
    when: 'A quiet one.',
    tone: '#B4682A',
    body: 'Five milligrams a piece — the everyday middle of the Grand Scale.',
  },
  {
    id: 'gum-mixed',
    name: 'Mixed Fruit',
    category: 'gummies',
    form: 'pouch',
    price: 16,
    scale: 2,
    notes: 'berry · citrus · apple',
    when: 'Sharing, if you must.',
    tone: '#6B7333',
    body: 'Four flavours in the bag. Five milligrams a piece, so nobody has to do maths.',
  },

  // ── Chewing gum ───────────────────────────────────────────────────────────
  {
    id: 'chew-peppermint',
    name: 'Peppermint',
    category: 'gum',
    form: 'carton',
    price: 8,
    scale: 1,
    notes: 'mint · clean · brisk',
    when: 'On the way somewhere.',
    tone: '#E7E1D0',
    ink: '#163A2B',
    body: 'Ten pieces, 2.5mg each. Fast, measured, and it fits in the coin pocket of a pair of jeans.',
  },
  {
    id: 'chew-spearmint',
    name: 'Spearmint',
    category: 'gum',
    form: 'carton',
    price: 8,
    scale: 1,
    notes: 'mint · sweet · soft',
    when: 'On the way home.',
    tone: '#D8DCC9',
    ink: '#163A2B',
    body: 'The softer of the two mints. Ten pieces, 2.5mg each.',
  },

  // ── Drinks ────────────────────────────────────────────────────────────────
  {
    id: 'drink-lemon-lime',
    name: 'Lemon Lime',
    category: 'drinks',
    form: 'can',
    price: 6,
    scale: 3,
    notes: 'lemon · lime · dry',
    when: 'Instead of the second pint.',
    tone: '#4F7A3F',
    hero: true,
    body:
      'Three hundred and thirty millilitres, ten milligrams, and dry rather than sweet — ' +
      'built to sit in the hand the way a beer does.',
  },
  {
    id: 'drink-blood-orange',
    name: 'Blood Orange',
    category: 'drinks',
    form: 'can',
    price: 6,
    scale: 3,
    notes: 'orange · bitter · bright',
    when: 'Early evening.',
    tone: '#B2612A',
    body: 'Bitter orange and a little salt. Ten milligrams a can.',
  },
  {
    id: 'drink-berry-hibiscus',
    name: 'Berry Hibiscus',
    category: 'drinks',
    form: 'can',
    price: 6,
    scale: 2,
    notes: 'berry · floral · tart',
    when: 'Sunday, in the garden.',
    tone: '#6D3F66',
    body: 'Five milligrams, and the only one of the three the whole table tends to agree on.',
  },

  // ── Mensch ────────────────────────────────────────────────────────────────
  {
    id: 'mensch-balance',
    name: 'Balance drops',
    category: 'mensch',
    form: 'bottle',
    price: 34,
    scale: 1,
    notes: 'neutral · clean · faint',
    when: 'Daily, with breakfast.',
    tone: '#3B5A4A',
    body:
      'Thirty millilitres with a graduated dropper, so the dose is a number rather than ' +
      'a guess. 2.5mg to the half-dropper.',
  },
  {
    id: 'mensch-night',
    name: 'Night drops',
    category: 'mensch',
    form: 'bottle',
    price: 36,
    scale: 2,
    notes: 'chamomile · vanilla · warm',
    when: 'An hour before bed.',
    tone: '#2E4258',
    body: 'The same dropper, five milligrams to the half. Take it earlier than you think you should.',
  },
  {
    id: 'mensch-relief',
    name: 'Relief balm',
    category: 'mensch',
    form: 'jar',
    price: 24,
    scale: 1,
    notes: 'beeswax · rosemary · pine',
    when: 'Knees, after the hill.',
    tone: '#8A7A4E',
    body: 'Sixty millilitres of beeswax balm. It goes on the skin and it stays there — nothing enters the bloodstream.',
  },
  {
    id: 'mensch-muscle',
    name: 'Muscle rub',
    category: 'mensch',
    form: 'jar',
    price: 26,
    scale: 2,
    notes: 'menthol · eucalyptus · sharp',
    when: 'The morning after the gym.',
    tone: '#4A6B6B',
    body: 'Menthol and eucalyptus over the same balm base. Warms as you work it in.',
  },

  // ── Flower ────────────────────────────────────────────────────────────────
  {
    id: 'flower-lime-kush',
    name: 'Lime Kush',
    category: 'flower',
    form: 'jar',
    price: 42,
    scale: 3,
    notes: 'lime · pine · pepper',
    when: 'Late, and you know yourself.',
    tone: '#6F7F4A',
    hero: true,
    body:
      'Three and a half grams, hand trimmed, in a jar with the grower, the harvest date ' +
      'and the lab reference on the label. Ask a host to open one and have a smell first.',
  },
  {
    id: 'flower-gelato',
    name: 'Gelato',
    category: 'flower',
    form: 'jar',
    price: 44,
    scale: 3,
    notes: 'cream · berry · sweet',
    when: 'A slow Saturday.',
    tone: '#7A6E8A',
    body: 'Three and a half grams. Sweeter on the nose than it is in the glass.',
  },
  {
    id: 'flower-purple-haze',
    name: 'Purple Haze',
    category: 'flower',
    form: 'jar',
    price: 44,
    scale: 3,
    notes: 'grape · earth · spice',
    when: 'With people you know well.',
    tone: '#5A4A72',
    body: 'Three and a half grams, and the one most likely to start a conversation about itself.',
  },
  {
    id: 'flower-atlantic',
    name: 'Atlantic',
    category: 'flower',
    form: 'jar',
    price: 40,
    scale: 2,
    notes: 'salt · gorse · lemon',
    when: 'After a walk on a bad day.',
    tone: '#4A6472',
    body: 'Grown in Clare, and it tastes like it. Three and a half grams.',
  },

  // ── Pre-rolls ─────────────────────────────────────────────────────────────
  {
    id: 'preroll-nine-five',
    name: 'The Nine · five pack',
    category: 'prerolls',
    form: 'tube',
    price: 30,
    scale: 2,
    notes: 'earth · cocoa · hay',
    when: 'A round, for once.',
    tone: '#5C4A33',
    body: 'Five half-gram pre-rolls in a tube. Rolled the same way every time, which is the point.',
  },
  {
    id: 'preroll-liffeyside-three',
    name: 'Liffeyside · three pack',
    category: 'prerolls',
    form: 'tube',
    price: 20,
    scale: 1,
    notes: 'grass · mint · pear',
    when: 'A first go.',
    tone: '#4A6B72',
    body: 'Three half-gram pre-rolls of the gentlest flower we grow.',
  },

  // ── Vape ──────────────────────────────────────────────────────────────────
  {
    id: 'vape-device',
    name: 'The everyday device',
    category: 'vape',
    form: 'device',
    price: 48,
    scale: null,
    notes: 'brass · matte · pocket',
    when: 'Discreet, less smell.',
    tone: '#3A3F3B',
    hero: true,
    body:
      'Brushed aluminium with a brass band, three heat settings and a USB-C port. Takes ' +
      'any of our cartridges. No app, no lights, nothing to pair.',
  },
  {
    id: 'vape-cart-dublin',
    name: 'Dublin Dry cartridge',
    category: 'vape',
    form: 'device',
    price: 32,
    scale: 3,
    notes: 'pine · pepper · citrus',
    when: 'Refill.',
    tone: '#3E5C46',
    body: 'Half a gram, ceramic core, and it screws onto the everyday device in one turn.',
  },

  // ── Merch ─────────────────────────────────────────────────────────────────
  {
    id: 'merch-cap',
    name: 'The cap',
    category: 'merch',
    form: 'cap',
    price: 28,
    scale: null,
    notes: 'cotton twill · brass · six panel',
    when: 'Every day, apparently.',
    tone: '#22432F',
    body: 'Bottle green six-panel with the wordmark embroidered small on the front and a brass buckle.',
  },
  {
    id: 'merch-tote',
    name: 'The tote',
    category: 'merch',
    form: 'tote',
    price: 18,
    scale: null,
    notes: 'canvas · unbleached · roomy',
    when: 'The messages.',
    tone: '#DED6C2',
    ink: '#163A2B',
    body: 'Sixteen-ounce unbleached canvas, long handles, and it holds a full shop.',
  },
  {
    id: 'merch-tee',
    name: 'The tee',
    category: 'merch',
    form: 'tee',
    price: 32,
    scale: null,
    notes: 'heavy cotton · boxy · soft',
    when: 'Weekends.',
    tone: '#22432F',
    body: 'Two hundred and forty gram cotton, boxy cut, wordmark small on the chest.',
  },
];

export const byId = (id) => PRODUCTS.find((p) => p.id === id);
export const byCategory = (id) => PRODUCTS.filter((p) => p.category === id);
export const categoryById = (id) => CATEGORIES.find((c) => c.id === id);
export const heroes = () => PRODUCTS.filter((p) => p.hero);

export const money = (n) => `€${n.toFixed(2)}`;

/** The dose in milligrams for a product's Grand Scale step. */
export const doseOf = (p) => (p.scale ? SCALE[p.scale - 1].mg : null);
export const scaleName = (p) => (p.scale ? SCALE[p.scale - 1].name : null);

// ---------------------------------------------------------------------------
// Photography
//
// Shot per category rather than per SKU, which is how the packaging system was
// produced — one pack design per category, the flavour or strain changing on
// the face. Tea and merch have no photography yet and fall back to the drawn
// packshot, so the grid never shows a hole.
//
// Every shot is on a white sweep, so the site frames them in a white arched
// alcove rather than on the cream page — the same lit niche the products sit in
// on the shop wall.
// ---------------------------------------------------------------------------

export const CATEGORY_PHOTO = {
  gum: 'gum',
  drinks: 'drinks',
  gummies: 'gummies',
  mensch: 'mensch',
  prerolls: 'prerolls',
  vape: 'vape',
  flower: 'flower',
};

/** Secondary views, shown on the product page only. */
export const EXTRA_PHOTOS = {
  flower: ['flower-pouch'],
};

export const photoFor = (p) => CATEGORY_PHOTO[p.category] || null;
export const extraPhotosFor = (p) => EXTRA_PHOTOS[p.category] || [];
export const hasPhoto = (p) => Boolean(CATEGORY_PHOTO[p.category]);

// ---------------------------------------------------------------------------
// Variants
//
// Read off the packs themselves: the gum carton states 20 pieces at 2mg, the
// can 355ml at 10mg, the flower pouch 3.5g, the gummy jar ten at 10mg, the
// dropper 30ml at 500/500, the pre-roll tin five. Those are the base variant of
// each category; the rest are the sizes a real shop would carry alongside.
//
// `delta` is added to the product's base price. The base variant is always the
// one the photographed pack shows, so the shot and the default selection agree.
// ---------------------------------------------------------------------------

const V = (name, values) => ({ name, values });
const opt = (label, delta = 0, note = '') => ({ label, delta, note });

export const CATEGORY_VARIANTS = {
  tea: [V('Pack', [opt('20 bags'), opt('40 bags', 8, 'Save €4')])],

  gummies: [
    V('Pack', [opt('10 gummies · 100mg jar'), opt('20 gummies · 200mg jar', 13, 'Save €3')]),
  ],

  gum: [V('Pack', [opt('20 pieces'), opt('40 pieces · 2 packs', 6, 'Save €2')])],

  drinks: [
    V('Pack', [opt('Single can · 355ml'), opt('Four pack', 17, 'Save €7'), opt('Twelve pack', 48, 'Save €24')]),
  ],

  mensch: [
    V('Size', [opt('30ml'), opt('15ml', -14)]),
    V('Strength', [opt('500mg CBD · 500mg THC'), opt('1000mg CBD · 250mg THC', 12)]),
  ],

  flower: [V('Weight', [opt('3.5g'), opt('7g', 34, 'Save €8'), opt('14g', 62, 'Save €22')])],

  prerolls: [V('Pack', [opt('5 pre-rolls · 3.5g'), opt('3 pre-rolls · 2.1g', -10)])],

  vape: [V('Size', [opt('1g · 1000mg THC'), opt('0.5g · 500mg THC', -12)])],

  merch: [V('Size', [opt('S'), opt('M'), opt('L'), opt('XL')])],
};

/**
 * Variants for a product. Balms are sold by the tin rather than the bottle, and
 * merch that isn't a garment is one-size — so a couple of categories need the
 * override rather than the category default.
 */
export function variantsFor(p) {
  if (p.category === 'mensch' && p.form === 'jar') {
    return [V('Size', [opt('50ml tin'), opt('100ml tin', 11, 'Save €3')])];
  }
  if (p.category === 'merch' && p.form !== 'tee') {
    return [V('Size', [opt('One size')])];
  }
  if (p.category === 'vape' && p.form === 'device' && p.id === 'vape-device') {
    return [V('Finish', [opt('Bottle green'), opt('Forest ink', 0)])];
  }
  return CATEGORY_VARIANTS[p.category] || [];
}

/** The variant a product page opens on — the one the photograph shows. */
export const defaultVariant = (p) =>
  variantsFor(p).map((g) => ({ name: g.name, label: g.values[0].label, delta: g.values[0].delta }));

/** Price for a chosen set of variant labels. */
export function priceWith(p, chosen = []) {
  const groups = variantsFor(p);
  let total = p.price;
  chosen.forEach((c, i) => {
    const g = groups[i];
    if (!g) return;
    const v = g.values.find((x) => x.label === c);
    if (v) total += v.delta;
  });
  return total;
}
