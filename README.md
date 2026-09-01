# fallbot — the reply bot that cannot bluff

**LIVE: https://sjgant80-hub.github.io/fallbot/**

Summon it like grok — `@fallbot` and a question, anywhere in a thread. The difference is a
law, not a vibe.

## The research (done with sididy, the estate's resident mind)

**What grok is trying to do:** be the ambient intelligence layer of a platform — summoned by
mention in a live feed, reads the thread, answers in real time, fact-checks on demand, and is
growing agentic (teach-a-task, account linking, post/timeline/mention tools). The ambition is
real and worth taking seriously.

**Where it breaks, documented:** a study measured [94% incorrect citations](https://www.eweek.com/news/ai-chatbot-citation-problem/);
fact-checkers catalogue answers wrong ["not by a whisker, but by miles"](https://www.altnews.in/you-know-nothing-grok-why-xs-ai-bot-cant-be-a-trusted-with-fact-checks/) —
delivered fluently, in a medium where nobody verifies. And beneath the accuracy problem,
sididy's weakness map from the estate's doctrine: **rented** (a platform's terms, not yours) ·
**unauditable** (no way to check why it said what it said) · **engagement-metric** (optimizes
their number, not your goal) · **platform-locked** (one feed) · **hallucinates confidently**
(the fatal one).

## The answer: a reply LAW, not a bigger model

[`fallbot.mjs`](fallbot.mjs) — witness-gated **26/26, zero argued exemptions**:

- **summon** — `@fallbot` + an actual ask, or nothing happens.
- **compose** — the answer is built **only from sentences the bot actually read**, each
  carrying its receipt (which source, verbatim, at what relevance). Nothing relevant →
  *"nothing I read supports an answer — I don't have that."* The anti-hallucination property
  is a fuzz **invariant**: across 300 random threads, everything composed is verbatim from a
  source, always.
- **review** — the polish gate: a fluent draft (a local model may rephrase) is re-grounded
  sentence by sentence at κ = 0.618; what fails is named **UNGROUNDED** with its support.
  Fluency never launders fabrication — the demo injects a plausible lie and watches it die.
- **railGate** — nothing posts around the doors, in order: review clean → scrubbed
  ([fallscrub](https://github.com/sjgant80-hub/fallscrub)) → the sanctioned rail
  ([fallpost](https://github.com/sjgant80-hub/fallpost)) → money is a human door, always.

## How it composes (the estate already had the parts)

[botler](https://github.com/sjgant80-hub/botler) — the sovereign conversational body ·
[fall-kit](https://sjgant80-hub.github.io/fall-kit/) — the local-first cascade (WebLLM →
your own key) that makes answers fluent while REVIEW keeps them honest ·
[fallpost](https://github.com/sjgant80-hub/fallpost) + fallscrub — the posting rail and its
sovereignty gate · [fallgravity](https://sjgant80-hub.github.io/fallgravity/) — pre-scores
anything that will be posted. Point your local model at `localhost:11434/v1` and the loop is
yours end to end — no meter, no landlord.

## The honest wire

- This repo ships the **law and the live demo** — extractive, deterministic, gated. The
  fluent voice comes from a local model composing *behind* review; the law is what makes that
  safe.
- No real-time platform ingestion is claimed: you bring the thread, the bot brings the
  honesty. (Wiring a real feed means wiring the rail — the doors above are already the shape.)
- sididy's research stream cut at its third answer (the 4k-context local model); the reply
  law fills the slot its answer would have named. Its weakness map and organ composition
  stand as delivered.

## Run it

```bash
node --test        # the reply law against its falsifiable examples
```

---

*Built on the **Konomi architecture**, created by **Thomas Frumkin**
([konomi-systems.com](https://konomi-systems.com)) — lineage Thomas → Jim → Simon. The estate
builds WITH Konomi. MIT.*
