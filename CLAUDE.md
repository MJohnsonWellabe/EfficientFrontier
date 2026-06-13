# CLAUDE.md — Project memory for Claude Code

You are working on a **capital deployment / efficient frontier** model for Wellabe: it finds the mix of new-business sales across **Medicare Supplement (MS)**, **Preneed (PN)**, and **Hospital Indemnity (HI)** that maximizes portfolio IRR (value of new business) subject to capital/RBC constraints over **2026–2030**.

## Read these first, every session
1. **`MODEL_CANON.md`** — validated targets, directed mechanics, and intentional inconsistencies. This is ground truth. Do not change canonical values to make code "cleaner."
2. **`BUILD_STANDARDS.md`** — the definition of done. Every change passes it.

## Standing rules
- **The validation gate is absolute.** Any edit to an engine module must re-produce every target in `MODEL_CANON.md §1` to full precision before it's complete. If you can't verify it, say so — do not claim success.
- **Replicate the intentional inconsistencies** in `MODEL_CANON.md §3`. They match the source workbook on purpose.
- **The HTML app is a thin viewer.** Heavy compute belongs in `runner/`, headless. Don't push large grids into the browser.
- **Data lives in `data/`, not embedded in code.** No gzip+base64 blobs in the HTML.

## Architecture (target state)
- `src/` — the engine, decomposed into modules: `vnb` (monthly income statements per cohort → IRR/NPV), `ev-recalc` (sales/claims/lapse scalars + two-regime in-force roll-forward), `rbc-surplus` (NAIC covariance charges, required capital, scenario TAC).
- `runner/` — headless scenario runner (100 LHS × 40 stochastic) that writes results.
- `viewer/` — the six-tab HTML app, reading results + `data/`.
- `data/` — workbook-derived inputs.

## Migration note (current state → target)
The working model currently exists as a **single self-contained `index.html`** with engines inlined and workbook data gzip+base64 embedded. First job when asked: decompose that file into the structure above **without changing any computed result** — verify against the validation gate after the split.

## Open item
Per-product stochastic σ for claims and lapse are currently assumed. They are being re-derived from seriatim aggregate A/E ratios (process vs. systematic risk). See `MODEL_CANON.md §6`.
