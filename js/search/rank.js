const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'in', 'for', 'is', 'on', 'at']);
const KIND_ORDER = { lesson: 0, term: 1, problem: 2 };

export function tokenize(text) {
  return String(text ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export function buildIndex(records) {
  const items = [];
  const postings = new Map();
  for (const record of records ?? []) {
    const titleTokens = tokenize(record.title);
    const textTokens = tokenize(record.text);
    const item = {
      id: record.id,
      kind: record.kind,
      title: String(record.title ?? ''),
      text: String(record.text ?? ''),
      href: record.href,
      chapter: record.chapter ?? null,
      problemId: record.problemId,
      titleTokens,
      textTokens,
    };
    const index = items.length;
    items.push(item);
    const seen = new Set();
    for (const token of titleTokens) addPosting(postings, token, index, seen);
    for (const token of textTokens) addPosting(postings, token, index, seen);
  }
  return { items, postings, keys: [...postings.keys()].sort() };
}

/**
 * Rank records that contain every query word. Title hits outrank body hits.
 * Prefixes of two or more letters match, so "sig" finds "significant".
 */
export function search(index, query, limit = 20) {
  if (!index?.items) return [];
  const tokens = tokenize(query).filter((token) => !STOP.has(token));
  if (tokens.length === 0) return [];
  const groups = tokens.map((token) => postingsFor(index, token));
  let ids = groups[0];
  for (let i = 1; i < groups.length; i += 1) ids = intersect(ids, groups[i]);
  const ranked = [];
  for (const id of ids) {
    const item = index.items[id];
    const score = scoreItem(item, tokens);
    if (score <= 0) continue;
    ranked.push({
      id: item.id,
      kind: item.kind,
      title: item.title,
      href: item.href,
      chapter: item.chapter,
      problemId: item.problemId,
      snippet: snippetFor(item),
      score,
    });
  }
  ranked.sort((left, right) => (
    right.score - left.score
    || (KIND_ORDER[left.kind] ?? 9) - (KIND_ORDER[right.kind] ?? 9)
    || left.title.localeCompare(right.title)
  ));
  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}

function addPosting(postings, token, index, seen) {
  if (!token || seen.has(token)) return;
  seen.add(token);
  let list = postings.get(token);
  if (!list) {
    list = [];
    postings.set(token, list);
  }
  list.push(index);
}

function postingsFor(index, token) {
  if (index.postings.has(token)) return index.postings.get(token);
  if (token.length < 2) return [];
  const { keys } = index;
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (keys[mid] < token) low = mid + 1;
    else high = mid;
  }
  const matches = [];
  for (let i = low; i < keys.length && keys[i].startsWith(token); i += 1) {
    matches.push(...index.postings.get(keys[i]));
  }
  return [...new Set(matches)];
}

function intersect(left, right) {
  if (!left?.length || !right?.length) return [];
  const set = new Set(right);
  return left.filter((id) => set.has(id));
}

function scoreItem(item, tokens) {
  let score = 0;
  const title = new Set(item.titleTokens);
  const text = new Set(item.textTokens);
  for (const token of tokens) {
    if (title.has(token)) score += 8;
    else if ([...title].some((word) => word.startsWith(token))) score += 5;
    else if (text.has(token)) score += 3;
    else if ([...text].some((word) => word.startsWith(token))) score += 1;
  }
  return score;
}

function snippetFor(item) {
  const source = item.kind === 'problem' ? item.title : (item.text || item.title);
  const clean = String(source).replace(/\s+/g, ' ').trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}...` : clean;
}
