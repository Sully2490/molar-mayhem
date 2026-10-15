export function reducedMotion() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function toastHtml() {
  return `
    <p class="toast" data-toast role="status" aria-live="polite" hidden></p>
    <div class="confetti" data-confetti hidden aria-hidden="true"></div>
  `;
}

export function showToast(root, text) {
  const toast = root.querySelector('[data-toast]');
  if (!toast) return;
  toast.hidden = false;
  toast.textContent = text;
}

export function showConfetti(root) {
  if (reducedMotion()) return;
  const box = root.querySelector('[data-confetti]');
  if (!box) return;
  box.hidden = false;
  box.replaceChildren();
  for (let i = 0; i < 18; i += 1) {
    const bit = document.createElement('span');
    bit.className = 'confetti-bit';
    bit.style.setProperty('--x', `${(i * 37) % 100}%`);
    bit.style.setProperty('--delay', `${(i % 6) * 40}ms`);
    box.append(bit);
  }
}
