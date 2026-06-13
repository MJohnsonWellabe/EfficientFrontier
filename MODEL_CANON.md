# MODEL CANON — Capital Deployment / Efficient Frontier

**Purpose.** This is the single source of truth for the model's validated behavior. Any session (Claude Code, a Project, a teammate) reads this first. **Nothing here is changed casually** — these are values you reconciled to machine precision against the source workbook (`EffFrontierEngine`). If a code change alters any of these, the change is wrong until proven otherwise.

> Status note: the numbers and mechanics below are captured from your build sessions. Treat this file as *yours* — confirm each item against your workbook on first use and correct anything I transcribed imperfectly. The two items I could **not** fully capture are flagged `⚠ CONFIRM`.

---

## 1. Validated targets (the regression gate)

Standalone VNB basis (`buildVNB` with the default, full-data month width; PN acq/maint +1 shift active):

| Product | VNB IRR | VNB NPV |
|---|---|---|
| Medicare Supplement (MS) | `0.21938929` | `$633.23M` |
| Preneed (PN) | `0.10667571` | `$33.553M` |
| Hospital Indemnity (HI) | `0.17163078` | `$29.458M` |

MS recalc IRR under workbook scalars: `0.17763524`

Baseline RBC ratios, 2026–2030: `5.36 / 4.67 / 3.80 / 3.76 / 4.33` (minimum `3.76` in **2029**).

> **Refresh note (2026-06-13).** The **PN VNB** (`0.10667571 / $33.553M`) and the **MS recalc IRR** (`0.17763524`) were **re-derived from the current `EfficientFrontier-29.html` workbook** and replace the prior transcriptions `0.14688215 / $6.574M` and `0.17833333`, which were stale from an earlier dataset (PN's sales/in-force inputs in -29 differ materially). MS VNB, HI VNB, and all RBC ratios were already exact and are unchanged. All five numbers above now reproduce to full precision via `runner/validate.js`.

**Rule:** any engine edit must re-produce all of the above to full precision before it is "done." Run `node runner/validate.js` — it is the executable form of this gate. See `BUILD_STANDARDS.md` → Validation gate.

---

## 2. Directed mechanics (intentional design decisions)

These are choices you made deliberately. They are not up for "cleanup."

- **Persistency as a lapse-rate shock.** Shocked retention = `1 − (1 − base retention) × lapse_scalar`, bounded to `[0, 1]`, applied **from a policy's second year onward**.
- **Preneed loading scales per life only** and does **not** respond to the claims shock.
- **Surplus TAC under a scenario uses full-book income deltas** (not new-business only): `MS after-tax income + PN after-tax income + HI distributable earnings`, with a **one-year-ahead offset**.
- **Required capital = PostCov × 1.03**, with **no** additional conservatism factor.
- **All-Other TS charges and the G2 / I2 manual add-ins are frozen** across all scenarios.

---

## 3. Intentional inconsistencies replicated from the source workbook

These look like bugs. They are not. They exist to match `EffFrontierEngine` exactly. **Do not "fix" them.**

- **PN acq/maint +1 month shift is disabled** in the stacked VNB layout (it is active only in the standalone display).
- **Charge-scaling month index advances one month per year**, not 12.
- **HI uses distributable earnings** (not after-tax income) for the TAC income delta.

---

## 4. Known corrections made *to* the workbook (do not re-introduce the originals)

Where the source workbook was genuinely wrong, you corrected it. These corrections are canonical:

- Inverted TS scaling formula in the 2026+ cohort recalc rows → corrected to direct `recalc / original` scaling.
- PN in-force was bypassing the persistency regime → corrected to use the same year-based build/persistency switch as MS and HI.
- Phantom terminal surplus release from the 360-vs-374-month grid difference → handled via tail pass-through logic.

---

## 5. Configuration defaults

- **Sales bounds:** MS `200–400`, PN `100–250`, HI `15–25`
- **Hurdle rates:** MS `12%`, PN `10%`, HI `10%`
- **Stochastic grid:** `100` LHS scenarios × `40` stochastic runs
- **Constraints:** seven total. ⚠ CONFIRM — enumerate the full seven (with defaults) from your Configuration tab and paste them here. RBC floor is one of them; per the strategy work the floor is **450%**.

---

## 6. Stochastic σ assumptions — OPEN ITEM

The per-product σ for claims and lapse currently driving the stochastic engine are **assumed**, not empirical. This is the open thread: deriving them from seriatim **aggregate A/E ratio** distributions (process risk vs. systematic/parameter risk decomposition), per the most recent working session.

⚠ CONFIRM / TO DO: record the current placeholder σ values here, then replace with empirically derived ones once the seriatim work lands. Note whether the distribution is actually normal (likely not) and what that means for the LHS sampling.

---

## 8. Forward sales growth — scenario draws ONLY (never the baseline)

The forward sales projection compounds each sampled scenario's 2026 anchor by a per-product,
per-year growth schedule for 2027–2035. This is a **deterministic config assumption**, not a
sampled/stochastic/LHS dimension — the efficient-frontier sampler still samples only the 2026
anchors.

- **Where it lives.** `src/frontier.js → mkScalars` (the only changed mechanic). It rewrites
  `updSales` for the sampled scenario draws and nothing else. With an **all-zero** schedule it
  reduces to the original flat projection **byte-for-byte**.
- **Baseline is sacred.** The baseline path (`frontier.js → computeBaseline`, used by the VNB /
  RBC tabs and the canon §1 gate) **never reads `S.growth`**. No growth setting can move any
  §1 number. If §1 moves, growth has leaked into the baseline and the change is wrong.
- **2026 is the anchor.** Year 2026 is the sampled value and is **never** grown; only 2027–2035
  compound, year over year: `sales[y] = sales[y-1] × (1 + rate[y])`.

**Default schedule** (decimals; editable in the Configuration tab under each product's sales anchor):

| Product | 2027 | 2028 | 2029 | 2030 | 2031–2035 |
|---|---|---|---|---|---|
| Medicare Supplement (MS) | 0% | 0% | 0% | 0% | 0% |
| Preneed (PN) | 10% | 10% | 10% | 6% | 6% |
| Hospital Indemnity (HI) | 5% | 5% | 5% | 5% | 5% |

**Invariants (both verified 2026-06-13):**

1. **Baseline untouched.** With the default schedule loaded, every MODEL_CANON §1 target
   reproduces to full precision (`node runner/validate.js`) — identical to a zero-growth load.
2. **Zero growth = old static frontier.** With all growth at 0%, the decomposed efficient
   frontier matches the legacy single-file frontier **exactly** (1700 field checks across all
   100 LHS scenarios and their stochastic draws, 0 diffs — legacy engine + flat sales vs the
   decomposed engine + `frontier.js` at zero growth). Seeded RNG (`STOCH_SEED = 20260612`)
   makes this reproducible.

**Expected live behavior.** Under the default schedule, the frontier's *feasible set* and
*frontier membership* shift (capital/RBC reflect 2027+ growth: e.g. 90→85 feasible, 32→30
frontier at the 100×100 default). The scatter **coordinates** (2026-issue PVDE / risk) do not
move, because those axes are 2026-issue-only by existing design and growth is a 2027+ effect that
flows through the full-book capital path (full-book PVDE and `minRBC` do move). This is correct,
not a leak.

---

## 7. Application surface (six tabs)

`Configuration` · `Efficient Frontier` (scatter + table) · `VNB by Product` · `RBC & Surplus` · `Debug` (peer-review sections) · `Methodology`

The HTML app is a **viewer**, not the compute environment. Heavy runs go through the headless `runner/` (see `BUILD_STANDARDS.md`).
