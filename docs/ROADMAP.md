# Product Roadmap: AI Market Intelligence with Evidence

**Positioning:** AI Market Intelligence with Evidence — *not* “another Bloomberg for retail.”

**Unfair advantages:** Evidence-backed AI · Cost-efficient infra · Cross-asset reasoning · Explainability (trust + compliance)

---

## Priority order (what to add next)

### 1. Event Impact Engine (Critical)

**What it is:** “This event historically moves BTC by +2.3% over 48h.”

**Add:**
- Event → asset mapping (which events move which tickers/asset classes)
- Historical impact backtesting (mean move, horizon e.g. 24h/48h)
- Confidence bands (e.g. 10th/90th percentile or std dev)

**Why:** MrktEdge and Fiscal win on context; you win on **measured impact**.

**Existing surface:** `shared/schema.ts` (`EconomicEvent`, `EconomicImpact`), `/api/events/upcoming`, `/api/econ/analyze` (rule-based impact only). Extend with historical impact and event→asset stats.

**Spec:** [EVENT_IMPACT_ENGINE.md](./EVENT_IMPACT_ENGINE.md)

---

### 2. AI Market Narratives (per-asset) ✅

**What it is:** Not just “news,” but **why** price moved.

**Example:** “TSLA fell 3.1% primarily due to margin compression concerns raised in earnings, amplified by negative options positioning.”

**Why:** Unusual Whales shows *what*; you explain *why*.

**Implemented:**
- **GET `/api/asset/narrative?symbol=TSLA&days=7&changePct=-3.1&period=7d`** — per-asset “why it moved” narrative (summary + drivers + optional citations). Uses headlines for symbol + optional price context; OpenAI generates summary and evidence-backed drivers.
- **Asset overview:** “Why It Moved” card shows summary, drivers, and evidence citations when narrative is loaded.
- **Client:** `api.getAssetNarrative(symbol, days, options?)`, `useAssetNarrative(symbol, days, priceContext?)`.

---

### 3. Earnings call & filing ingestion ✅

**What it is:** Directly compete with Fiscal.ai on fundamentals + tone.

**Must-haves:**
- Earnings transcript summaries
- Exec tone change over time (previousToneScore in summary)
- Risk language detection (“uncertain”, “challenging”, etc.)

**Implemented:**
- **POST `/api/earnings/analyze-transcript`** — `{ symbol?, transcriptText, date? }` → AI summary, tone score (1–10), tone label (cautious/neutral/confident), risk phrases, risk level (low/medium/high). Fallback risk detection via keyword list.
- **GET `/api/earnings/transcript-summary?symbol=AAPL`** — Mock/sample summary for symbol (summary, tone, risk phrases) for UI without paste.
- **Earnings page:** “Transcript insights” card (summary, tone, risk level, risk phrases); “Paste transcript to analyze” collapsible with symbol + textarea + Analyze button.
- **Client:** `api.getEarningsTranscriptSummary(symbol)`, `api.analyzeEarningsTranscript(...)`, `useEarningsTranscriptSummary(symbol)`.

---

### 4. Options signal lite (not full flow) ✅

**Do not:** Clone Unusual Whales fully (expensive + noisy).

**Do:**
- Large OI changes
- IV spikes
- Put/Call regime shifts
- “Unusual for this ticker” flag
- Pair with AI explanation

**Implemented:**
- **GET `/api/options/signals?symbol=TSLA`** — Returns mock signals (IV spike, put/call shift, OI change, optional “unusual” flag) + one-sentence AI explanation (OpenAI when available).
- **Dashboard:** “Options Signals” card for first focus asset or SPY — shows signal badges and AI interpretation.
- **Client:** `api.getOptionsSignals(symbol)`, `useOptionsSignals(symbol)`.
- Signals are mock until a real options feed is connected; structure supports OI, IV, put/call, unusual + explanation.

---

### 5. Crypto on-chain signals (decision signals, not raw metrics) ✅

**Do not:** Rebuild Glassnode (raw metrics).

**Do:** Build **decision signals**, e.g.:
- Exchange inflow spike → sell pressure warning
- Dormant wallet activation
- Stablecoin supply delta → risk-on/off

**Implemented:**
- **GET `/api/crypto/onchain-signals`** — Returns decision-oriented signals (exchange inflow spike, dormant wallet activation, stablecoin supply delta) with `implication` and `suggestedAction` per signal; optional AI one-line summary. Mock data until a chain data provider is connected.
- **Dashboard:** “Crypto on-chain signals” card — each signal shows label (badge), implication, and “What to do” (suggested action). Designed around “what should a trader do with this?”
- **Client:** `api.getOnChainSignals()`, `useOnChainSignals()`.
- **Schema:** `OnChainSignal` (signalType, label, implication, suggestedAction, severity), `OnChainSignalsResponse`.

---

### 6. Cross-asset risk gauge (unique moat)

**What it is:** Single view of regime across equities, crypto, bonds.

**Example:** Equities risk-off, crypto risk-on, bonds tightening → AI insight: “Markets are internally conflicted → volatility regime likely.”

**Why:** Competitors don’t do this well; fits your cross-asset + explainability strengths.

**Existing surface:** Sentiment/regime types in schema, scenario page (SPY, GLD, TLT, etc.); unify into one “cross-asset regime” API + UI.

---

## Commercial product

- **Plan:** [COMMERCIAL_PLAN.md](./COMMERCIAL_PLAN.md) — positioning, completed items, next steps (auth, pricing, data breadth).
- **Done this pass:** Policy news intensity API + client wiring (Trump + news for policy risk), Product page (value prop, differentiation), placeholder Pricing page, sidebar Company section.
- **Skipped (by design):** Auth (Auth0 later), checkout/billing (placeholder only).

---

## Strategic positioning

| Avoid | Use instead |
|-------|-------------|
| “Another Bloomberg for retail” | **AI Market Intelligence with Evidence** |

**Messaging to lean on:**
- Evidence-backed AI (citations, sources)
- Cost-efficient infra
- Cross-asset reasoning
- Explainability (huge for trust + compliance)

---

## Implementation notes

- **Event Impact Engine** is the highest-leverage next step: it uses existing events + economic calendar and turns them into a measurable, differentiated feature.
- **Narratives** and **earnings/filings** build on existing AI and evidence infra.
- **Options lite** and **on-chain signals** should be “signal + explanation,” not raw data dumps.
- **Cross-asset risk gauge** can be introduced as a dedicated API and dashboard block once 1–3 are in place.
