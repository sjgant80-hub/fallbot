// appetite.test.mjs — the appetite law, falsifiable. Load-bearing: rephrasings share one
// hunger (the key is the checkable tokens), hunger has a weight and the heaviest leads,
// and a want leaves the list ONLY when reading actually answers it — pages that don't
// answer sate nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyOf, feed, hungriest, sate } from './appetite.mjs';

test('KEY — a want is its checkable tokens: rephrasings share one hunger', () => {
  const a = keyOf('when was the March invoice paid?');
  const b = keyOf('THE MARCH INVOICE — WHEN WAS IT PAID');
  assert.equal(a.key, b.key, 'word order, case and punctuation do not multiply hungers');
  // the browser-walk case that exposed the article bug: "the" must not split a hunger
  assert.equal(keyOf('what is the capital of Mongolia?').key, keyOf('capital of Mongolia — what is it?').key,
    'grammar words carry no want — caught live before it shipped');
  // question words DO distinguish wants: when-asked and who-asked need different reading
  assert.notEqual(keyOf('when did the payment happen').key, keyOf('who did the payment').key);
  assert.match(keyOf('').why, /no ask, no want/);
  assert.match(keyOf('a an of').why, /no checkable words — nothing to want/);
  assert.match(keyOf('the was and').why, /no checkable words/, 'pure grammar is not a want');
});

test('FEED — a new want joins at weight 1; the same want asked again GROWS', () => {
  const f1 = feed([], 'when was the March invoice paid?');
  assert.deepEqual(f1.want, { key: f1.want.key, ask: 'when was the March invoice paid?', asked: 1 });
  assert.equal(f1.grew, false);
  const f2 = feed(f1.list, 'the march invoice: when was it paid?');
  assert.equal(f2.grew, true, 'the rephrasing found the same hunger');
  assert.equal(f2.want.asked, 2);
  assert.equal(f2.list.length, 1, 'one hunger, weight two — never a duplicate');
  assert.equal(f1.list[0].asked, 1, 'feed never mutates the old list');
  const f3 = feed(f2.list, 'what is the capital of Mongolia?');
  assert.equal(f3.list.length, 2);
  assert.equal(f3.grew, false);
  assert.match(feed('x', 'ask').why, /must be a list/);
  assert.match(feed([], '').why, /no ask, no want/);
  assert.match(feed([{ key: 'k', ask: 'a', asked: 0 }], 'new ask').why, /malformed want/, 'weight zero is not a want');
  assert.match(feed([null], 'new ask').why, /malformed want/);
  // each clause failing ALONE is malformed — a guard needing two failures is theatre
  assert.match(feed([{ key: '', ask: 'a', asked: 1 }], 'new ask').why, /malformed want/, 'empty key alone');
  assert.match(feed([{ key: 'k', ask: '', asked: 1 }], 'new ask').why, /malformed want/, 'empty ask alone');
  assert.match(feed([{ key: 'k', ask: 'a', asked: 1.5 }], 'new ask').why, /malformed want/, 'fractional weight alone');
});

test('HUNGRIEST — heaviest first, ties to the earliest, empty is the honest nothing', () => {
  let list = feed([], 'first question here').list;
  list = feed(list, 'second question here').list;
  list = feed(list, 'second question here').list;
  const h = hungriest(list);
  assert.equal(h.want.ask, 'second question here', 'weight 2 outranks weight 1');
  assert.equal(h.index, 1);
  assert.match(h.reason, /asked 2 time\(s\), the heaviest hunger; go read about it/);
  // tie: both weight 1 → the EARLIER want leads
  let tie = feed([], 'alpha topic question').list;
  tie = feed(tie, 'beta topic question').list;
  assert.equal(hungriest(tie).want.ask, 'alpha topic question', 'ties go to the first-asked — FIFO, strict >');
  assert.match(hungriest([]).why, /the bot wants nothing — it could answer everything it was asked/);
  assert.match(hungriest('x').why, /must be a list/);
  assert.match(hungriest([{ key: 'k' }]).why, /malformed want/);
  assert.match(hungriest([{ key: '', ask: 'a', asked: 1 }]).why, /malformed want/, 'empty key alone');
  assert.match(hungriest([{ key: 'k', ask: 'a', asked: 'lots' }]).why, /malformed want/, 'non-integer weight alone');
  // the reason speaks plainly at weight one — the "heaviest hunger" epithet is EARNED at two
  const lone = hungriest(feed([], 'solitary question topic').list);
  assert.match(lone.reason, /asked 1 time\(s\); go read about it/);
  assert.ok(!/heaviest hunger/.test(lone.reason), 'a hunger of one is not yet the heaviest — the epithet has a boundary');
});

test('SATE — only reading that ANSWERS ends a hunger; pages that do not answer sate nothing', () => {
  const list = feed([], 'when was the March invoice paid?').list;
  const key = list[0].key;
  // irrelevant reading: the hunger stays, with the reason
  const still = sate(list, key, ['Golden-angle spacing keeps channels from colliding.']);
  assert.equal(still.ok, false);
  assert.match(still.why, /still unread — the offered sources do not answer the want, so the hunger stays/);
  // reading that answers: the want leaves, and the answer that ended it comes back with receipts
  const fed = sate(list, key, ['The invoice for March was paid on the 4th of April.']);
  assert.ok(fed.ok);
  assert.deepEqual(fed.list, [], 'the hunger is gone');
  assert.match(fed.answer, /The invoice for March was paid on the 4th of April\./);
  assert.equal(fed.receipts[0].source, 0, 'the answer that ended the hunger carries its receipt');
  assert.equal(list.length, 1, 'sate never mutates');
  assert.match(sate(list, 'no-such-key', ['x']).why, /nothing was hungry for it/);
  assert.match(sate(list, '', ['x']).why, /key required/);
  assert.match(sate('x', key, ['x']).why, /must be a list/);
  assert.match(sate(list, key, []).why, /read nothing has nothing to say/, 'compose refusals pass through honestly');
});

test('THE LOOP — refuse → want → read → answer, end to end, deterministic', () => {
  let list = [];
  for (const ask of ['how do the shards reassemble?', 'how do the shards reassemble?', 'what is the meeting time?']) {
    list = feed(list, ask).list;
  }
  const h = hungriest(list);
  assert.equal(h.want.asked, 2, 'the twice-asked question leads the reading list');
  const s = sate(list, h.want.key, ['Shards reassemble in any order because every shard carries its index. A missing shard is named.']);
  assert.ok(s.ok, 'the reading answers, the hunger ends');
  assert.equal(s.list.length, 1, 'the other hunger remains');
  assert.equal(hungriest(s.list).want.ask, 'what is the meeting time?');
  const again = feed(s.list, 'how do the shards reassemble?');
  assert.equal(again.grew, false, 'a sated hunger that returns starts fresh at 1 — history is not held against the asker');
});

test('THE FUZZ — 300 random feeds: weights only grow, keys never duplicate, hungriest is always a real want', () => {
  let seed = 616;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const TOPICS = ['invoice march paid', 'meeting thursday time', 'shards reassemble order', 'golden angle spacing', 'forecast danny revised'];
  let list = [];
  for (let t = 0; t < 300; t++) {
    const ask = TOPICS[Math.floor(rnd() * TOPICS.length)] + (rnd() > 0.5 ? '?' : ' — when');
    const f = feed(list, ask);
    assert.ok(f.ok);
    list = f.list;
    const keys = list.map((w) => w.key);
    assert.equal(new Set(keys).size, keys.length, 'one hunger per key, always');
    assert.ok(list.every((w) => w.asked >= 1), 'weights start at 1 and only grow');
    const h = hungriest(list);
    assert.ok(h.ok && list.some((w) => w.key === h.want.key), 'the hungriest is always a want that exists');
  }
  assert.ok(list.length <= 10, 'five topics, two phrasings — at most ten hungers, never 300');
});
