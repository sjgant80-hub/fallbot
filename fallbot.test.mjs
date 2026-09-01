// fallbot.test.mjs — the reply law, falsifiable. The load-bearing properties: everything
// composed is VERBATIM from a source (the anti-hallucination invariant, fuzz-proven), the
// honest empty fires when the sources don't cover the ask, review names a fabricated sentence
// no matter how fluent it is, and the rail doors run in order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KAPPA, summon, ground, compose, review, railGate } from './fallbot.mjs';

const SOURCES = [
  'The invoice for March was paid on the 4th of April. The late fee was waived by the supplier.',
  'Golden-angle spacing keeps channels from colliding. It is used in the estate for placement and phases.',
  'The meeting moved to Thursday at 2pm. Danny will bring the revised forecast.',
];

test('SUMMON — a mention with an ask, or nothing happens', () => {
  assert.deepEqual(summon('hey @fallbot when was the March invoice paid?'), { ok: true, ask: 'when was the March invoice paid?' });
  assert.deepEqual(summon('HEY @FALLBOT check this'), { ok: true, ask: 'check this' }, 'case-blind');
  assert.match(summon('no bot here at all').why, /not summoned — no @fallbot/);
  assert.match(summon('@fallbot').why, /summoned with nothing to do/);
  assert.match(summon('@fallbot    ').why, /an @ and silence/);
  assert.match(summon('').why, /nothing to read/);
  assert.match(summon('x', '').why, /needs a name/);
  assert.deepEqual(summon('oi @didy what moved?', 'didy'), { ok: true, ask: 'what moved?' }, 'any name works');
});

test('GROUND — support is exact arithmetic; the κ boundary decides', () => {
  const g = ground('The invoice for March was paid', SOURCES);
  assert.ok(g.grounded && g.source === 0, 'a claim taken from source 0 grounds in source 0');
  assert.equal(g.support, 1, 'every checkable token present');
  const fabricated = ground('The invoice was paid in cash by a courier from Zurich', SOURCES);
  assert.ok(!fabricated.grounded, 'plausible + fluent + FALSE = ungrounded');
  assert.ok(fabricated.support < KAPPA, 'support ' + fabricated.support + ' < κ');
  assert.equal(KAPPA, 0.618);
  assert.match(ground('', SOURCES).why, /non-empty string/);
  assert.match(ground('claim', []).why, /grounding against nothing is bluffing/);
  assert.match(ground('claim', ['ok', '']).why, /non-empty list of texts/);
  assert.match(ground('a an of', SOURCES).why, /no checkable words/, 'stop-length tokens alone cannot be checked');
  // THE κ BOUNDARY, EXACTLY: 500 distinct tokens, 309 present → support = 309/500 = 0.618 to
  // the bit (the same double as the κ literal). At exactly κ, the claim IS grounded — inclusive.
  const claim500 = Array.from({ length: 500 }, (_, i) => 'tok' + String(i).padStart(3, '0')).join(' ');
  const src309 = Array.from({ length: 309 }, (_, i) => 'tok' + String(i).padStart(3, '0')).join(' ');
  const edge = ground(claim500, [src309]);
  assert.equal(edge.support, 0.618);
  assert.equal(edge.grounded, true, 'support exactly κ grounds — the boundary is inclusive, pinned to the bit');
  // ties between sources go to the EARLIER source, deterministically
  assert.equal(ground('The invoice for March was paid', [SOURCES[0], SOURCES[0]]).source, 0, 'a tie never drifts to the later copy');
});

test('COMPOSE — the answer is verbatim source sentences with receipts', () => {
  const r = compose('when was the March invoice paid?', SOURCES);
  assert.ok(r.answer.includes('The invoice for March was paid on the 4th of April.'));
  assert.ok(r.receipts.length >= 1 && r.receipts[0].source === 0, 'the receipt points at the source that said it');
  const allSourceSentences = SOURCES.flatMap((s) => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()));
  for (const rec of r.receipts) assert.ok(allSourceSentences.includes(rec.sentence), 'VERBATIM — never a word the bot did not read');
});

test('COMPOSE — the honest empty: sources that do not cover the ask produce "I don\'t have that"', () => {
  const r = compose('what is the capital of Mongolia?', SOURCES);
  assert.equal(r.ok, true);
  assert.equal(r.answer, null);
  assert.deepEqual(r.receipts, []);
  assert.match(r.why, /nothing I read supports an answer — I don't have that/);
  assert.match(compose('', SOURCES).why, /no ask/);
  assert.match(compose('question', []).why, /read nothing has nothing to say/);
  assert.match(compose('of an', SOURCES).why, /no checkable words/);
  // RANKING: the strongest sentence leads even when it lives in a LATER source — relevance
  // outranks source order; source order only breaks ties
  const two = ['The forecast covers spacing and channel plans loosely.', 'Golden angle spacing keeps every channel from colliding cleanly.'];
  const ranked = compose('golden angle spacing channel colliding', two);
  assert.equal(ranked.receipts.length, 2, 'both clear the floor — the sort has a real contest to settle');
  assert.equal(ranked.receipts[0].source, 1, 'the stronger sentence from the LATER source leads — relevance outranks source order');
  assert.ok(ranked.receipts[0].relevance > ranked.receipts[1].relevance);
  // THE FLOOR, EXACTLY: 1000-token ask, 309 present in one sentence → relevance = 309/1000 =
  // κ/2 to the bit (halving a double is exact). At exactly the floor, the sentence is KEPT.
  const ask1000 = Array.from({ length: 1000 }, (_, i) => 'tok' + String(i).padStart(4, '0')).join(' ');
  const sent309 = Array.from({ length: 309 }, (_, i) => 'tok' + String(i).padStart(4, '0')).join(' ') + '.';
  const floor = compose(ask1000, [sent309]);
  assert.equal(floor.receipts.length, 1, 'relevance exactly κ/2 clears the floor — inclusive, pinned to the bit');
  assert.equal(floor.receipts[0].relevance, 0.309);
});

test('REVIEW — fluency never launders fabrication: the injected lie is named', () => {
  const honest = 'The invoice for March was paid on the 4th of April. The late fee was waived by the supplier.';
  const rh = review(honest, SOURCES);
  assert.ok(rh.clean, 'verbatim truth reviews clean');
  assert.match(rh.verdict, /fit to post/);
  const polished = honest + ' The supplier also agreed to a 20% discount on all future orders.';
  const rp = review(polished, SOURCES);
  assert.equal(rp.clean, false);
  assert.equal(rp.ungrounded.length, 1, 'exactly the fabricated sentence');
  assert.match(rp.ungrounded[0].sentence, /20% discount/);
  assert.match(rp.verdict, /1 sentence\(s\) UNGROUNDED — fluent, but not knowledge/);
  assert.equal(rp.grounded.length, 2, 'the honest sentences still stand');
  assert.match(review('', SOURCES).why, /no draft/);
  assert.match(review('draft', []).why, /bluffing/);
  // a trailing space after the final period must not conjure an empty "sentence" — the honest
  // draft still reviews clean, whitespace and all
  const trailing = review('The invoice for March was paid on the 4th of April.   ', SOURCES);
  assert.equal(trailing.ok, true);
  assert.equal(trailing.clean, true, 'whitespace is not a claim');
});

test('RAIL — the doors in order: review → scrub → rail → money; first failure speaks', () => {
  const all = { reviewClean: true, scrubbed: true, railSanctioned: true, touchesMoney: false };
  assert.deepEqual(railGate(all), { ok: true, post: true });
  assert.match(railGate({ ...all, reviewClean: false, scrubbed: false, railSanctioned: false }).why, /^review:/, 'the first door speaks even when three fail');
  assert.match(railGate({ ...all, scrubbed: false, touchesMoney: true }).why, /^scrub: .*no scrubber, no post/);
  assert.match(railGate({ ...all, railSanctioned: false }).why, /^rail: .*the RAIL, never a signature/);
  assert.match(railGate({ ...all, touchesMoney: true }).why, /^money: .*a human door, always/);
  assert.match(railGate(null).why, /must be an object/);
  assert.match(railGate([]).why, /must be an object/);
  assert.match(railGate({ ...all, scrubbed: 'yes' }).why, /doors do not take "probably"/);
});

test('THE FUZZ — 300 random asks over random sources: everything composed is verbatim, review of a composed answer is always clean', () => {
  let seed = 8086;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const WORDS = ['invoice', 'march', 'paid', 'april', 'golden', 'angle', 'channel', 'meeting', 'thursday', 'forecast', 'supplier', 'estate', 'placement', 'danny', 'waived', 'revised', 'colliding', 'spacing'];
  for (let t = 0; t < 300; t++) {
    const mkSent = () => Array.from({ length: 4 + Math.floor(rnd() * 6) }, () => WORDS[Math.floor(rnd() * WORDS.length)]).join(' ') + '.';
    const sources = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => Array.from({ length: 1 + Math.floor(rnd() * 3) }, mkSent).join(' '));
    const ask = Array.from({ length: 2 + Math.floor(rnd() * 4) }, () => WORDS[Math.floor(rnd() * WORDS.length)]).join(' ') + '?';
    const r = compose(ask, sources);
    assert.ok(r.ok);
    const a2 = compose(ask, sources);
    assert.deepEqual(r, a2, 'no moods');
    if (r.answer !== null) {
      const all = sources.flatMap((s) => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()));
      for (const rec of r.receipts) {
        assert.ok(all.includes(rec.sentence), 'THE INVARIANT: composed = read, verbatim, always');
        assert.ok(rec.source >= 0 && rec.source < sources.length && sources[rec.source].includes(rec.sentence), 'the receipt is true');
      }
      const rv = review(r.answer, sources);
      assert.ok(rv.clean, 'what the bot composed from its reading always reviews clean');
    }
  }
});
