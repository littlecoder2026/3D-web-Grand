/**
 * The age gate and the intro card.
 *
 * "An age-gate splash in Fraunces that itself passes the granny test" —
 * storyboard Part 6. Set in WARREN, which is the current display face. It asks
 * once, plainly, with no dark patterns and no pre-ticked anything, and being
 * turned away is written to be pleasant rather than punitive.
 *
 * The answer is deliberately NOT persisted. A shared exhibition machine should
 * ask the next person too.
 */

export function runAgeGate() {
  const gate = document.getElementById('ageGate');
  const denied = document.getElementById('ageDenied');
  const yes = document.getElementById('gateYes');
  const no = document.getElementById('gateNo');
  const back = document.getElementById('gateBack');

  gate.hidden = false;
  yes.focus();

  return new Promise((resolve) => {
    const onYes = () => {
      gate.hidden = true;
      cleanup();
      resolve(true);
    };
    const onNo = () => {
      gate.hidden = true;
      denied.hidden = false;
      back.focus();
    };
    const onBack = () => {
      denied.hidden = true;
      gate.hidden = false;
      yes.focus();
    };
    const onKey = (e) => {
      if (e.key === 'Enter' && !gate.hidden && document.activeElement === document.body) onYes();
    };
    function cleanup() {
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      back.removeEventListener('click', onBack);
      window.removeEventListener('keydown', onKey);
    }
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    back.addEventListener('click', onBack);
    window.addEventListener('keydown', onKey);
  });
}

/**
 * The intro card: take the tour, or walk it yourself.
 * @returns {Promise<'tour'|'explore'>}
 */
export function runIntro() {
  const intro = document.getElementById('intro');
  const tour = document.getElementById('introTour');
  const explore = document.getElementById('introExplore');

  intro.hidden = false;
  tour.focus();

  return new Promise((resolve) => {
    const onTour = () => {
      intro.hidden = true;
      resolve('tour');
    };
    const onExplore = () => {
      intro.hidden = true;
      resolve('explore');
    };
    tour.addEventListener('click', onTour, { once: true });
    explore.addEventListener('click', onExplore, { once: true });
  });
}
