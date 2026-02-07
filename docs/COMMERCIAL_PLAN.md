# Commercial Product Plan

**Goal:** Turn the app into a commercial-ready product. Auth (e.g. Auth0) will be added separately.

---

## 1. Positioning (already in place)

- **Tagline:** AI Market Intelligence with Evidence
- **Differentiators:** Evidence-backed AI, regime + policy + volatility, provenance (Live/Demo, DataStatusBadge, Evidence Mode), no hype copy
- **Avoid:** "Another Bloomberg for retail"

---

## 2. Completed for commercial readiness

| Item | Status |
|------|--------|
| Real volatility (VIX / SPY realized) | Done |
| Policy risk = Trump index + policy news intensity | Done (intensity from headlines) |
| Live vs Demo mode; no fake-by-default | Done |
| Data-consistency contract (Action Lens gating) | Done |
| Evidence provenance (source, as-of, status) | Done |
| Empty states + retry when no data | Done |
| Policy news intensity API + client wiring | Done |

---

## 3. Next steps (post–Auth0)

1. **Auth & entitlements**
   - Add Auth0 (or equivalent).
   - After auth: plan tiers (e.g. Free / Pro / Team) and gate features or usage by tier.

2. **Pricing page**
   - Placeholder Pricing page added; replace with real plans and CTA when auth and billing are ready.

3. **Data breadth**
   - Add or rotate a second data provider (e.g. Polygon, NewsAPI) for headlines/prices to reduce single-provider risk and improve uptime.

4. **Policy / GDELT**
   - Optionally replace or supplement keyword-based policy intensity with GDELT (or similar) for a more robust policy/news signal.

5. **Monetization**
   - Define Free vs paid (e.g. Daily Brief + Action Lens + Evidence as core; Pro = more history, alerts, exports).
   - Integrate billing (Stripe, etc.) after auth.

6. **Landing / marketing**
   - Product page describes value prop and differentiation.
   - When going live: add a proper landing (or point domain root to app) and basic SEO.

---

## 4. What we skipped (by design)

- **Auth:** To be added later (e.g. Auth0).
- **Checkout / billing:** Placeholder only until auth and plan definitions exist.
- **Full GDELT pipeline:** Using headline-based policy intensity for now; GDELT can be added later.

---

## 5. File-level changes (this pass)

- `docs/COMMERCIAL_PLAN.md` — this plan
- `server/routes.ts` — GET `/api/policy/news-intensity`
- `client/src/lib/api.ts` — `getPolicyNewsIntensity()`
- `client/src/pages/daily-brief.tsx` — use policy news intensity in policy risk
- `client/src/pages/dashboard.tsx` — use policy news intensity in policy risk
- `client/src/pages/product.tsx` — Product/About (value prop, differentiation)
- `client/src/pages/pricing.tsx` — Placeholder pricing page
- `client/src/App.tsx` — Routes for `/product`, `/pricing`
- `client/src/components/layout/sidebar.tsx` — Link to Product (and optionally Pricing)
- `docs/ROADMAP.md` — Short “Commercial” section pointing to this plan
