# Event Impact Engine — Design Spec

**Goal:** “This event historically moves BTC by +2.3% over 48h” — event → asset mapping, historical impact, confidence bands.

---

## 1. Outcomes

- **Event → asset mapping:** For each event type (e.g. CPI, FOMC, NFP), which assets/tickers are affected and with what typical magnitude.
- **Historical impact backtesting:** Per (event type, asset) we store or compute:
  - Mean % move over a chosen horizon (e.g. 24h, 48h) after the event.
  - Optional: direction (up/down) frequency.
- **Confidence bands:** e.g. 10th/90th percentile or ±1 std dev of the move, so we can say “typically between -1.2% and +4.1% over 48h”.

---

## 2. Data model (extend existing)

**Existing:** `shared/schema.ts` has `EconomicEvent`, `EconomicImpact` (affectedAssets, directionByAsset, reasoning). Events come from `/api/events/upcoming` and calendar; impact today is rule-based in `/api/econ/analyze`.

**Add:**

- **Event type / canonical event id:** Normalize events to a stable key (e.g. `cpi_yoy_us`, `fomc_decision_us`, `nfp_us`) so we can aggregate history.
- **EventImpactStats (new type):**
  - `eventType: string`
  - `assetId: string` (symbol or asset class)
  - `horizonHours: number` (e.g. 24, 48)
  - `meanMovePct: number`
  - `stdDevPct?: number`
  - `percentile10Pct?: number`
  - `percentile90Pct?: number`
  - `sampleCount: number`
  - `lastUpdated: string` (ISO)
- **Event → asset mapping:** Either:
  - Derived from backtest (which assets we have history for), or
  - Curated list per event type (e.g. CPI → BTC, SPY, DXY, TLT) that we backtest and fill.

---

## 3. Backtesting (how to get the numbers)

- **Inputs:** Historical event dates (from calendar/DB or mock) + historical price series per asset (Alpha Vantage / existing price source).
- **Logic:** For each (eventType, eventDate):
  - Take asset close before event (e.g. 1h before release).
  - Take close at +24h and +48h.
  - Compute % return; store per (eventType, asset, horizon).
- **Aggregate:** Mean, std dev, 10th/90th percentiles per (eventType, asset, horizon).
- **Output:** Populate `EventImpactStats` (in-memory, DB, or static JSON for MVP).

Start with a small set of event types (e.g. CPI, FOMC, NFP) and assets (e.g. SPY, BTC, DXY, TLT) to validate.

---

## 4. API

- **GET `/api/events/impact?eventType=cpi_yoy_us&horizon=48`**  
  Returns list of `EventImpactStats` for that event type and horizon (and optionally asset filter).

- **GET `/api/events/upcoming` (enhanced)**  
  For each upcoming event, optionally include:
  - `impactPreview: { [assetId]: { meanMovePct, percentile10Pct, percentile90Pct, horizonHours } }`  
  so the calendar can show “CPI historically moves BTC +2.3% (range -1.2% to +4.1%) over 48h”.

- **GET `/api/events/impact/for-asset?symbol=BTC&horizon=48`**  
  Returns events that have impact stats for this asset, sorted by |meanMovePct|. Use on asset detail / daily brief.

---

## 5. UI touchpoints

- **Economic calendar:** Next to each high-impact event, show 1–3 key assets with “Historically: BTC +2.3% (48h)” and optional confidence band.
- **Asset overview / daily brief:** “Upcoming events that typically move this asset” with mean move and band.
- **Existing `/api/econ/analyze`:** Can stay for qualitative direction; Event Impact Engine adds the **measured** layer (numbers + bands).

---

## 6. Phasing

1. **MVP:** Event type normalization + static or mock `EventImpactStats` for 2–3 event types and 3–4 assets; expose via GET `/api/events/impact` and optional `impactPreview` on upcoming events. ✅
2. **Backtest pipeline:** Script or job that, given event dates + price history, computes and stores (or exports) `EventImpactStats`. ✅
   - **Script:** `npm run backtest:event-impact` → reads `infra/dev/event-dates.history.json`, uses synthetic weekday price series, writes `infra/dev/event-impact-stats.json`.
   - **Server:** On startup, loads `event-impact-stats.json` when present (or `EVENT_IMPACT_STATS_PATH`); otherwise uses built-in mock.
3. **Confidence bands:** Add percentile or std dev to the pipeline and API. ✅ (in backtest output and API).
4. **Full integration:** Calendar + asset pages + daily brief showing “this event historically moves X by Y% (Z band)”. ✅ Calendar (Events tab), Asset overview ("Events That Historically Move {symbol}"), Daily brief ("Historically (48h):" in What to Watch Next).

---

## 7. Files to touch (reference)

- `shared/schema.ts` — add `EventImpactStats`, optional `eventType` / `canonicalEventId` on event payloads.
- `server/routes.ts` — add `/api/events/impact` and optional `impactPreview` in events/upcoming; keep `/api/econ/analyze` for qualitative analysis.
- `client/src/lib/api.ts` — types and client for new endpoints.
- Calendar / asset UI — show impact stats and bands where available.

This keeps the Event Impact Engine consistent with existing events and economic impact while adding the measurable, backtested layer that differentiates the product.
