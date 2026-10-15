/** Escape text that will be inserted into HTML. */
export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function escapeAttr(text) {
  return escapeHtml(text).replaceAll("'", '&#39;');
}
