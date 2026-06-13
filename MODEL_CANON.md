# MODEL CANON — Capital Deployment / Efficient Frontier

**Purpose.** This is the single source of truth for the model's validated behavior. Any session (Claude Code, a Project, a teammate) reads this first. **Nothing here is changed casually** — these are values you reconciled to machine precision against the source workbook (`EffFrontierEngine`). If a code change alters any of these, the change is wrong until proven otherwise.

> Status note: the numbers and mechanics below are captured from your build sessions. Treat this file as *yours* — confirm each item against your workbook on first use and correct anything I transcribed imperfectly. The two items I could **not** fully capture are flagged `⚠ CONFIRM`.

---

## 1. Validated targets (the regression gate)

Standalone VNB basis:

| Product | VNB IRR | VNB NPV |
|---|---|---|
| Medicare Supplement (MS) | `0.21938929` | `$633.23M` |
| Preneed (PN) | `0.14688215` | `$6.574M` |
| Hospital Indemnity (HI) | `0.17163078` | `$29.458M` |

MS recalc IRR under workbook scalars: `0.17833333`

Baseline RBC ratios, 2026–2030: `5.36 / 4.67 / 3.80 / 3.76 / 4.33` (minimum `3.76` in **2029**).

**Rule:** any engine edit must re-produce all of the above to full precision before it is "done." See `BUILD_STANDARDS.md` → Validation gate.

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

## 7. Application surface (six tabs)

`Configuration` · `Efficient Frontier` (scatter + table) · `VNB by Product` · `RBC & Surplus` · `Debug` (peer-review sections) · `Methodology`

The HTML app is a **viewer**, not the compute environment. Heavy runs go through the headless `runner/` (see `BUILD_STANDARDS.md`).
