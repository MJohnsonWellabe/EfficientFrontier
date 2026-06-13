# CLAUDE.md — Project memory for Claude Code

You are working on a **capital deployment / efficient frontier** model for Wellabe: it finds the mix of new-business sales across **Medicare Supplement (MS)**, **Preneed (PN)**, and **Hospital Indemnity (HI)** that maximizes portfolio IRR (value of new business) subject to capital/RBC constraints over **2026–2030**.

## Read these first, every session
1. **`MODEL_CANON.md`** — validated targets, directed mechanics, and intentional inconsistencies. This is ground truth. Do not change canonical values to make code "cleaner."
2. **`BUILD_STANDARDS.md`** — the definition of done. Every change passes it.

## Standing rules
- **The validation gate is absolute.** Any edit to an engine module must re-produce every target in `MODEL_CANON.md §1` to full precision before it's complete. The executable gate is `node runner/validate.js`. If you can't verify it, say so — do not claim success.
- **Sales growth stays out of the baseline.** The forward sales-growth schedule (`MODEL_CANON.md §8`) is applied **only** to sampled efficient-frontier scenario draws, in `src/frontier.js → mkScalars`. The baseline path (`frontier.js → computeBaseline`, which anchors §1) must **never** read `S.growth`. If any §1 number moves when growth changes, growth has leaked into the baseline — that's a bug, not a feature.
- **Replicate the intentional inconsistencies** in `MODEL_CANON.md §3`. They match the source workbook on purpose.
- **The HTML app is a thin viewer.** Heavy compute belongs in `runner/`, headless. The viewer computes in-browser using the **same** `src/frontier.js` module the runner uses — one source of compute truth. Don't fork the math.
- **Data lives in `data/`, not embedded in code.** No gzip+base64 blobs in the HTML.

## Architecture (current state — decomposition complete)
- `src/` — the engine, decomposed into UMD modules (browser `window.EFENG` + Node `module.exports`):
  `vnb.js` (monthly income statements per cohort → IRR/NPV), `ev-recalc.js` (sales/claims/lapse
  scalars + two-regime in-force roll-forward), `rbc-surplus.js` (NAIC covariance charges, required
  capital, scenario TAC, surplus note). `engine.js` assembles the three for Node. `frontier.js` is
  the shared scenario/efficient-frontier compute (incl. the sales-growth `mkScalars`), used by both
  the viewer and the runner.
- `runner/` — headless scenario runner: `run.js` (100 LHS × 100 stochastic → `runner/results/*.json`),
  `defaults.js` (config defaults mirroring the viewer), `validate.js` (the §1 gate).
- `viewer/` — the six-tab HTML app: `index.html` loads the `src/` modules + Chart.js and fetches
  `data/`; `app.js` is the rendering/UI layer (DOM bindings inside `DOMContentLoaded` via `bindAll`).
- `data/` — workbook-derived inputs: `InputEV.csv`, `InputTS.csv`, `InputSurplus.csv`, `params.json`.
- `legacy/EfficientFrontier-29.html` — the proven single-file reference. **Do not edit or delete it.**

## Migration note (done)
The original single self-contained HTML (engines inlined, workbook data embedded) has been
decomposed into the structure above with **no computed result changed** — engine verified
bit-for-bit against the legacy engine (412 checks, 0 diffs) and the zero-growth frontier verified
identical to the legacy frontier (1700 checks, 0 diffs). Re-verify with `node runner/validate.js`
plus the zero-growth frontier diff after any engine/frontier edit.

## Open item
Per-product stochastic σ for claims and lapse are currently assumed. They are being re-derived from seriatim aggregate A/E ratios (process vs. systematic risk). See `MODEL_CANON.md §6`.
