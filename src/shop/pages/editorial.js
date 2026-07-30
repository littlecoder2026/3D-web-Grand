/**
 * About us, the blog index, and blog posts.
 *
 * The copy is written in the brand voice from the strategy: Irish, plain, the
 * joke always on the moment and never on the customer.
 */

import { crumbs, esc, masthead } from '../layout.js';
import { notFound } from './shop.js';

export const POSTS = [
  {
    slug: 'your-first-visit',
    title: 'What actually happens on your first visit',
    date: '2026-04-12',
    read: 4,
    category: 'First time',
    standfirst:
      'Nobody is going to quiz you at the door. Here is the whole thing, start to finish, so you can read it in your own time instead of working it out in front of a stranger.',
    body: [
      ['p', 'The fear is never really about cannabis. It is about looking like you do not know what you are doing, in front of somebody who does. So here is the entire visit written down, which is the cheapest way we know of taking that away.'],
      ['h2', 'You walk in'],
      ['p', 'There is no step at the door and no counter in front of you. What you see first is the room: an island in the middle, product down both walls, the counter at the back. A host will say hello. That is it — nobody asks you what you are after until you want to be asked.'],
      ['h2', 'You have a look'],
      ['p', 'Everything is out where you can pick it up. Every shelf ticket says the name, what it smells like in three plain words, how strong it is on the Grand Scale, and one line about when people tend to reach for it. You are meant to read them. That is what they are for.'],
      ['h2', 'You ask, or you do not'],
      ['p', 'If you would rather work it out yourself, work it out yourself. If you would rather ask, ask — and "I have no idea what I am doing" is a completely normal opening line here. It is the one our hosts hear most often.'],
      ['h2', 'You buy something'],
      ['p', 'The counter is curved rather than a barricade, the screens face away from you, and the card you leave with has the dose on it in numbers. We will tell you to start at One and wait a full hour. That hour is the advice, not the small print.'],
      ['p', 'Then you go home and have a cup of tea. Grand.'],
    ],
  },
  {
    slug: 'the-grand-scale',
    title: 'Why we put the dose on the front',
    date: '2026-03-28',
    read: 3,
    category: 'Responsibility',
    standfirst:
      'Three steps, three numbers, one scale — on every ticket, every pack and every card. Here is the thinking.',
    body: [
      ['p', 'Most of what goes wrong for a first-time customer is not danger. It is a bad guess. Somebody takes too much because nothing was happening, and then has an evening they were not planning on.'],
      ['h2', 'One scale, everywhere'],
      ['p', 'So we built one scale and refused to let it vary. One is Gentle, at 2.5mg — about a half glass of wine, and where every first visit starts. Two is Easy, at 5mg — a pint, the everyday middle. Three is Grand, at 10mg — a double, and know yourself first.'],
      ['p', 'Those words appear on the shelf ticket, on the pack, on the card in the bag and on the receipt. Three filled pips means Grand whether you are looking at a tin of tea or a can of lemon lime. You only have to learn it once.'],
      ['h2', 'Not a warning label'],
      ['p', 'There is a version of this that is all red triangles and capital letters, and it does not work — it either frightens people off or it gets ignored. Responsibility that reads as a legal disclaimer is decoration. Responsibility that reads as useful advice gets followed.'],
      ['p', 'So the scale is set in the same grotesque as the wayfinding, in the same green as everything else, and it tells you what to do rather than what not to do: start at One, wait an hour.'],
    ],
  },
  {
    slug: 'meet-the-growers',
    title: 'Máire, Cormac and Aoife',
    date: '2026-03-02',
    read: 5,
    category: 'Provenance',
    standfirst:
      'Our flower is grown two hundred metres from the shop. Here are the three people who grow it, and why their names are on the jar.',
    body: [
      ['p', 'There is a framed card in the vestibule with three names on it and a licence number. People stop and read it, which is exactly what it is for.'],
      ['h2', 'Two hundred metres'],
      ['p', 'The grow is a converted joinery works off the same street. Máire runs the room, Cormac does the nutrition and the testing schedule, and Aoife trims — all of it by hand, which is slower and better and the reason the jars cost what they cost.'],
      ['h2', 'Why the names are on it'],
      ['p', 'Because a name is the shortest possible provenance statement, and because the same logic runs through every category Ireland has already learned to trust. You know who brews your beer and who roasts your coffee. There is no reason this should be the exception.'],
      ['h2', 'What that means for you'],
      ['p', 'Every jar carries the grower, the harvest date and the lab reference. If a batch is not right, we know whose it was and so do you. That is not a marketing position, it is just how a shop should work.'],
    ],
  },
  {
    slug: 'why-tea-leads',
    title: 'Why the tea gets the best bay in the shop',
    date: '2026-02-14',
    read: 3,
    category: 'Design',
    standfirst:
      'Of everything we sell, tea is the thing most people can picture themselves buying. That is worth the best shelf in the room.',
    body: [
      ['p', 'Walk in and look left. The first full bay, the one at eye height with the arch and the light in it, is tea. Not flower, not vape. Tea.'],
      ['h2', 'The most ordinary ritual there is'],
      ['p', 'Ireland has an entire emotional vocabulary built around putting the kettle on. Nobody needs to be taught how to use a teabag, nobody is embarrassed to be seen buying one, and nobody has to learn a technique. It is the shortest distance between where a nervous first-time customer is standing and something they already understand.'],
      ['h2', 'The granny test, made literal'],
      ['p', 'Our governing principle is whether a seventy-eight-year-old Irish woman would walk past the shopfront and feel it belongs on her high street. Tea in the best bay is that principle turned into a floor plan. If she came in, there would be something in here she recognised immediately.'],
      ['p', 'The rest of the range is for people who already know what they want. The tea is for everybody else, which is most people.'],
    ],
  },
];

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------------------

export function about() {
  const html = `
    ${crumbs([{ href: '#/', label: 'Home' }, { label: 'About us' }])}
    ${masthead({
      eyebrow: 'About us',
      title: 'A good local that happens to sell cannabis.',
      standfirst:
        'We are not trying to sell you cannabis. We are trying to remove the fear of looking clueless in front of a stranger.',
    })}

    <section class="wrap prose">
      <p class="prose__lede">
        Ireland has done this twice already. Craft beer went from fifteen breweries to
        more than seventy through taprooms and tours and a shared language that let
        ordinary people feel informed. Specialty coffee went mainstream through welcoming
        cafés and baristas who were glad to be asked. Both times the pattern was the same:
        a knowledgeable host, a warm and specific place, and a vocabulary newcomers could
        borrow.
      </p>
      <p>
        Cannabis has to beat unfamiliarity <em>and</em> stigma at once, which is why
        responsibility is a founding pillar here rather than a footnote. But the model is
        not new and it is not complicated. Run it like a good local.
      </p>

      <h2>What we actually decided</h2>
      <ul class="prose__list">
        <li><strong>A host, not a guard.</strong> Eye contact before transaction. Nobody is asked what they want until they want to be asked.</li>
        <li><strong>The dose on the front.</strong> One scale, three steps, in plain English, everywhere.</li>
        <li><strong>No clichés.</strong> No leaf, no neon, no tie-dye, no clinical white. The discipline not to do them is the point.</li>
        <li><strong>Everything out where you can reach it.</strong> Nothing behind security glass. A shop, not a pharmacy hatch.</li>
        <li><strong>A level threshold.</strong> No step at the door, because a 150mm upstand is how a shopfront quietly tells somebody it is not for them.</li>
      </ul>

      <h2>The tests we hold everything to</h2>
      <div class="tests">
        <div class="tests__item">
          <h3>The granny test</h3>
          <p>Would a 78-year-old Irish woman walk past this shopfront and feel it belongs on her high street? If not, redesign it.</p>
        </div>
        <div class="tests__item">
          <h3>The litmus test</h3>
          <p>Would this sit comfortably beside a premium Irish whiskey distillery or a specialty coffee roastery? If not, it isn't GRAND.</p>
        </div>
        <div class="tests__item">
          <h3>The confidence test</h3>
          <p>Does this make a first-time customer feel more capable, not less? Every decision answers this or it is the wrong decision.</p>
        </div>
      </div>

      <h2>Where the name comes from</h2>
      <p>
        “Grand” is the most Irish word there is — the everyday answer that means
        everything is alright. It signals reassurance and ease, it carries a premium second
        meaning, and it lets the tagline be the customer's own state of mind rather than
        something we tell them. <em>Grand, I've got this.</em>
      </p>

      <p class="prose__note">
        A design showcase for ICAD Upstarts 2026. Nothing on this site is for sale.
      </p>

      <p><a class="btn btn--solid" href="./index.html">Walk the store in 3D →</a></p>
    </section>
  `;
  return { html };
}

// ---------------------------------------------------------------------------

export function blog() {
  const [lead, ...rest] = POSTS;
  const html = `
    ${crumbs([{ href: '#/', label: 'Home' }, { label: 'Blog' }])}
    ${masthead({
      eyebrow: 'Blog',
      title: 'Notes from the shop.',
      standfirst:
        'How the place works, who grows what, and everything we would rather you read here than have to ask at the counter.',
    })}

    <section class="wrap">
      <a class="lead" href="#/blog/${lead.slug}">
        <div class="lead__art" aria-hidden="true">
          <span class="lead__cat">${esc(lead.category)}</span>
        </div>
        <div class="lead__copy">
          <p class="post__meta">${fmtDate(lead.date)} · ${lead.read} min read</p>
          <h2 class="lead__title">${esc(lead.title)}</h2>
          <p class="lead__standfirst">${esc(lead.standfirst)}</p>
          <span class="lead__more">Read it →</span>
        </div>
      </a>

      <div class="posts">
        ${rest
          .map(
            (p) => `
          <a class="post" href="#/blog/${p.slug}">
            <span class="post__cat">${esc(p.category)}</span>
            <h3 class="post__title">${esc(p.title)}</h3>
            <p class="post__meta">${fmtDate(p.date)} · ${p.read} min read</p>
            <p class="post__standfirst">${esc(p.standfirst)}</p>
          </a>`,
          )
          .join('')}
      </div>
    </section>
  `;
  return { html };
}

export function post(route) {
  const p = POSTS.find((x) => x.slug === route.parts[1]);
  if (!p) return notFound('That post is not here.');

  const body = p.body
    .map(([tag, text]) => (tag === 'h2' ? `<h2>${esc(text)}</h2>` : `<p>${esc(text)}</p>`))
    .join('');

  const others = POSTS.filter((x) => x.slug !== p.slug).slice(0, 3);

  const html = `
    ${crumbs([{ href: '#/', label: 'Home' }, { href: '#/blog', label: 'Blog' }, { label: p.title }])}
    ${masthead({ eyebrow: p.category, title: p.title, standfirst: p.standfirst })}

    <article class="wrap prose">
      <p class="post__meta post__meta--lead">${fmtDate(p.date)} · ${p.read} min read</p>
      ${body}
      <p class="prose__note">
        Questions this didn't answer? <a href="#/contact">Ask us</a> — or
        <a href="./index.html">have a walk around the shop</a>.
      </p>
    </article>

    <section class="band wrap">
      <header class="band__head"><h2 class="band__title">More from the shop</h2></header>
      <div class="posts">
        ${others
          .map(
            (o) => `
          <a class="post" href="#/blog/${o.slug}">
            <span class="post__cat">${esc(o.category)}</span>
            <h3 class="post__title">${esc(o.title)}</h3>
            <p class="post__meta">${fmtDate(o.date)} · ${o.read} min read</p>
          </a>`,
          )
          .join('')}
      </div>
    </section>
  `;
  return { html };
}
