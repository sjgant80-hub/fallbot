// fallbot · appetite.mjs — THE APPETITE LAW (the LIFE the twelve-powers court named missing).
//
// Every honest empty — "nothing I read supports an answer — I don't have that" — is a signal:
// exactly the thing the bot should read next. This law turns refusal into appetite:
//
//   · FEED      — an unanswered ask joins the want-list. The same want asked again (rephrased
//                 or not — wants are keyed by their checkable tokens) GROWS instead of
//                 duplicating: hunger has a weight.
//   · HUNGRIEST — the one thing to go read about next: most-asked first, first-asked on ties.
//                 An empty list is the honest answer "the bot wants nothing — it could answer
//                 everything it was asked."
//   · SATE      — a want leaves the list ONLY when new reading actually covers it: sate()
//                 re-runs the compose law against the offered sources, and if the answer is
//                 still the honest empty, the want STAYS, with the reason. Hunger is not
//                 satisfied by the arrival of pages — only by pages that answer.
//
// This closes the loop: refuse → want → read → answer. The bot's ignorance is append-only
// honest, and its learning is proven the same way its answers are.
//
// Pure and total: garbage in → { ok:false, why }, never a throw mid-hunger.

import { compose } from './fallbot.mjs';

const str = (v) => typeof v === 'string' && v.length > 0;
const tokens = (s) => (String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []);

// grammar words carry no want: "the capital of Mongolia" and "capital of Mongolia" are ONE
// hunger. Question words are NOT here on purpose — "when was X paid" and "who paid X" are
// different wants, and flattening them would merge appetites that need different reading.
const STOP = new Set(['the', 'and', 'was', 'were', 'are', 'has', 'had', 'have', 'this', 'that', 'with', 'for', 'its', 'does', 'did', 'will', 'you', 'your']);

/** the want's identity: its sorted unique checkable tokens, grammar words dropped —
 *  rephrasings share a hunger. */
export function keyOf(ask) {
  if (!str(ask)) return { ok: false, why: 'no ask, no want' };
  const t = [...new Set(tokens(ask).filter((w) => !STOP.has(w)))].sort();
  if (t.length === 0) return { ok: false, why: 'the ask carries no checkable words — nothing to want' };
  return { ok: true, key: t.join(' ') };
}

/** FEED — fold one honest empty into the want-list. Returns a NEW list; never mutates. */
export function feed(list, ask) {
  if (!Array.isArray(list)) return { ok: false, why: 'the want-list must be a list' };
  const k = keyOf(ask);
  if (!k.ok) return k;
  for (const w of list) {
    if (!w || !str(w.key) || !str(w.ask) || !Number.isInteger(w.asked) || w.asked < 1)
      return { ok: false, why: 'the want-list holds a malformed want' };
  }
  const i = list.findIndex((w) => w.key === k.key);
  if (i >= 0) {
    const grown = list.map((w, j) => j === i ? { ...w, asked: w.asked + 1 } : { ...w });
    return { ok: true, list: grown, want: grown[i], grew: true };
  }
  const fresh = { key: k.key, ask, asked: 1 };
  return { ok: true, list: [...list.map((w) => ({ ...w })), fresh], want: fresh, grew: false };
}

/** HUNGRIEST — what to read about next: most-asked, ties to the earliest want. */
export function hungriest(list) {
  if (!Array.isArray(list)) return { ok: false, why: 'the want-list must be a list' };
  if (list.length === 0) return { ok: false, why: 'the bot wants nothing — it could answer everything it was asked' };
  let best = null, at = -1;
  list.forEach((w, i) => {
    if (!w || !str(w.key) || !Number.isInteger(w.asked)) { best = undefined; return; }
    if (best === undefined) return;
    if (!best || w.asked > best.asked) { best = w; at = i; }
  });
  if (best === undefined || best === null) return { ok: false, why: 'the want-list holds a malformed want' };
  return { ok: true, want: best, index: at,
    reason: `"${best.ask}" — asked ${best.asked} time(s)${best.asked > 1 ? ', the heaviest hunger' : ''}; go read about it` };
}

/**
 * SATE — offer new reading against one want. The want leaves the list ONLY if compose() can
 * now actually answer it from the offered sources; otherwise it stays, and the refusal says
 * why. Returns { list, answer, receipts } on success — the answer that ended the hunger.
 */
export function sate(list, key, sources) {
  if (!Array.isArray(list)) return { ok: false, why: 'the want-list must be a list' };
  if (!str(key)) return { ok: false, why: 'which want? key required' };
  const i = list.findIndex((w) => w && w.key === key);
  if (i < 0) return { ok: false, why: `no want with that key — nothing was hungry for it` };
  const c = compose(list[i].ask, sources);
  if (!c.ok) return { ok: false, why: c.why };
  if (c.answer === null) return { ok: false, why: 'still unread — the offered sources do not answer the want, so the hunger stays' };
  return { ok: true, list: list.filter((_, j) => j !== i).map((w) => ({ ...w })), answer: c.answer, receipts: c.receipts };
}
