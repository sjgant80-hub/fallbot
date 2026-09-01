// fallbot · fallbot.mjs — THE REPLY LAW.
//
// Grok's documented failure mode is confident wrongness: answers that SOUND right, delivered
// where nobody verifies. fallbot's law makes bluffing structurally impossible:
//
//   · SUMMON  — a mention with an actual ask, or nothing happens.
//   · COMPOSE — the answer is built ONLY from sentences the bot actually read, each carrying
//               its receipt (which source, verbatim). If nothing it read supports an answer,
//               the answer IS "I don't have that" — the honest empty. A bot that cannot say
//               "I don't know" is a bluffing machine with good grammar.
//   · REVIEW  — the polish gate: a fluent draft (a local model may rephrase) is re-checked
//               sentence by sentence against the sources; support below κ (0.618) is named
//               UNGROUNDED. Fluency never launders fabrication.
//   · RAIL    — nothing posts without the doors, in order: review clean → scrubbed → the
//               sanctioned rail → money touches a human. The posting law, compiled.
//
// Pure and total: garbage in → { ok:false, why }, never a throw mid-reply.

export const KAPPA = 0.618;   // the grounding threshold: support below this is not knowledge

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const str = (v) => typeof v === 'string' && v.length > 0;
const round3 = (x) => Math.round(x * 1000) / 1000;

const tokens = (s) => (String(s).toLowerCase().match(/[a-z0-9]{3,}/g) || []);
const sentences = (s) => String(s).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 0);

/** SUMMON — find "@<name> <ask>" in a message. A mention with no ask is refused, not guessed. */
export function summon(text, name = 'fallbot') {
  if (!str(text)) return { ok: false, why: 'nothing to read' };
  if (!str(name)) return { ok: false, why: 'the bot needs a name to be summoned by' };
  const at = text.toLowerCase().indexOf('@' + name.toLowerCase());
  if (at < 0) return { ok: false, why: `not summoned — no @${name} in the message` };
  const ask = text.slice(at + name.length + 1).trim();
  if (!ask) return { ok: false, why: 'summoned with nothing to do — an @ and silence' };
  return { ok: true, ask };
}

/** GROUND — one claim against the sources: support = |claim ∩ source| / |claim| tokens,
 *  best source wins. Grounded iff support ≥ κ. Deterministic; ties go to the earlier source. */
export function ground(claim, sources) {
  if (!str(claim)) return { ok: false, why: 'a claim must be a non-empty string' };
  if (!Array.isArray(sources) || sources.length === 0 || !sources.every(str))
    return { ok: false, why: 'sources must be a non-empty list of texts — grounding against nothing is bluffing' };
  const ct = [...new Set(tokens(claim))];
  if (ct.length === 0) return { ok: false, why: 'the claim carries no checkable words' };
  let best = 0, at = 0;
  sources.forEach((s, i) => {
    const st = new Set(tokens(s));
    const hit = ct.filter((t) => st.has(t)).length / ct.length;
    if (hit > best) { best = hit; at = i; }
  });
  return { ok: true, support: round3(best), source: at, grounded: best >= KAPPA };
}

/**
 * COMPOSE — the answer, built ONLY from source sentences. Rank every source sentence by
 * overlap with the ask; keep up to three that clear the floor (κ/2 — relevance, not proof:
 * each kept sentence IS verbatim from a source, so it needs no grounding check). Every kept
 * sentence carries its receipt. Nothing clears the floor → the honest empty.
 */
export function compose(ask, sources) {
  if (!str(ask)) return { ok: false, why: 'no ask' };
  if (!Array.isArray(sources) || sources.length === 0 || !sources.every(str))
    return { ok: false, why: 'sources must be a non-empty list of texts — a bot that read nothing has nothing to say' };
  const at = [...new Set(tokens(ask))];
  if (at.length === 0) return { ok: false, why: 'the ask carries no checkable words' };
  const ranked = [];
  sources.forEach((src, si) => {
    for (const sent of sentences(src)) {
      const stoks = new Set(tokens(sent));
      const rel = at.filter((t) => stoks.has(t)).length / at.length;
      if (rel >= KAPPA / 2) ranked.push({ sentence: sent, source: si, relevance: round3(rel) });
    }
  });
  ranked.sort((a, b) => b.relevance - a.relevance || a.source - b.source);
  const picked = ranked.slice(0, 3);
  if (picked.length === 0)
    return { ok: true, answer: null, receipts: [], why: "nothing I read supports an answer — I don't have that" };
  return { ok: true, answer: picked.map((p) => p.sentence).join(' '), receipts: picked };
}

/** REVIEW — the polish gate. Every sentence of a draft must ground in the sources at κ;
 *  what fails is named UNGROUNDED with its best support. Fluency never launders fabrication. */
export function review(draft, sources) {
  if (!str(draft)) return { ok: false, why: 'no draft to review' };
  const grounded = [], ungrounded = [];
  for (const sent of sentences(draft)) {
    const g = ground(sent, sources);
    if (!g.ok) return { ok: false, why: g.why };
    if (g.grounded) grounded.push({ sentence: sent, support: g.support, source: g.source });
    else ungrounded.push({ sentence: sent, support: g.support });
  }
  return { ok: true, grounded, ungrounded, clean: ungrounded.length === 0,
    verdict: ungrounded.length === 0
      ? `every sentence grounded at κ — fit to post`
      : `${ungrounded.length} sentence(s) UNGROUNDED — fluent, but not knowledge. Cut them or refuse.` };
}

/** RAIL — the posting doors, in order, first failure speaks. Nothing posts around them. */
export function railGate(ctx) {
  const c = obj(ctx);
  if (!c) return { ok: false, why: 'ctx must be an object' };
  for (const k of ['reviewClean', 'scrubbed', 'railSanctioned', 'touchesMoney'])
    if (typeof c[k] !== 'boolean') return { ok: false, why: `ctx.${k} must be a boolean — the doors do not take "probably"` };
  if (!c.reviewClean) return { ok: false, why: 'review: ungrounded sentences in the draft — the bot does not post what it cannot show it read' };
  if (!c.scrubbed) return { ok: false, why: 'scrub: the draft has not passed the sovereignty scrubber — no scrubber, no post' };
  if (!c.railSanctioned) return { ok: false, why: 'rail: no sanctioned rail — the outbox waits for the RAIL, never a signature' };
  if (c.touchesMoney) return { ok: false, why: 'money: this reply touches money — a human door, always' };
  return { ok: true, post: true };
}
