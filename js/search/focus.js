export function focusModeIsOn(doc) {
  return Boolean(doc?.body?.classList?.contains('mm-focus'));
}

export function currentProblem(doc) {
  const fromActive = closestProblem(doc?.activeElement);
  if (fromActive) return fromActive;
  if (typeof doc?.querySelector !== 'function') return null;
  return doc.querySelector('[data-problem]') || doc.querySelector('.problem');
}

/** Hide the rest of the page and keep one problem on screen. */
export function enterFocusMode(doc, problem = currentProblem(doc)) {
  if (!doc?.body) return null;
  doc.body.classList.add('mm-focus');
  for (const node of [...(doc.querySelectorAll?.('.mm-focus-keep') ?? [])]) {
    node.classList.remove('mm-focus-keep');
  }
  if (problem) problem.classList.add('mm-focus-keep');
  setToggle(doc, true);
  return problem;
}

export function exitFocusMode(doc) {
  if (!doc?.body) return;
  doc.body.classList.remove('mm-focus');
  for (const node of [...(doc.querySelectorAll?.('.mm-focus-keep') ?? [])]) {
    node.classList.remove('mm-focus-keep');
  }
  setToggle(doc, false);
}

/** Escape leaves focus mode. The periodic-table Escape handler still runs. */
export function bindFocusModeKeys(doc) {
  if (!doc?.addEventListener) return () => {};
  const onKey = (event) => {
    if (event.key === 'Escape' && focusModeIsOn(doc)) exitFocusMode(doc);
  };
  doc.addEventListener('keydown', onKey);
  return () => doc.removeEventListener?.('keydown', onKey);
}

function setToggle(doc, on) {
  const toggle = doc.querySelector?.('[data-mm-focus]');
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  toggle.textContent = on ? 'Exit focus mode' : 'Focus mode';
}

function closestProblem(node) {
  if (!node) return null;
  if (typeof node.closest === 'function') {
    return node.closest('[data-problem]') || node.closest('.problem');
  }
  let current = node;
  while (current) {
    const marked = current.getAttribute?.('data-problem');
    if (marked != null || current.classList?.contains('problem')) return current;
    current = current.parentNode;
  }
  return null;
}
