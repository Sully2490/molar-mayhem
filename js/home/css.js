function ensureStylesheet(href, marker) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[${marker}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute(marker, '');
  document.head.appendChild(link);
}

export function ensureLearnCss() {
  ensureStylesheet('css/learn/learn.css', 'data-mm-learn');
}

export function ensureHomeCss() {
  ensureLearnCss();
  ensureStylesheet('css/home/home.css', 'data-mm-home');
}
