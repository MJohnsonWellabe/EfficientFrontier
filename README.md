# Efficient Frontier — Capital Deployment Model

Browser-viewable model that finds the efficient frontier of new-business mixes across Medicare Supplement, Preneed, and Hospital Indemnity — maximizing portfolio IRR subject to RBC/capital constraints over 2026–2030.

## Repo layout
```
efficient-frontier/
├── CLAUDE.md            # Claude Code reads this automatically — standing rules + architecture
├── MODEL_CANON.md       # validated targets, mechanics, intentional inconsistencies (source of truth)
├── BUILD_STANDARDS.md   # definition of done / recurring-bug checklist
├── data/                # workbook-derived inputs (NOT embedded in code)
├── src/                 # engine modules: vnb, ev-recalc, rbc-surplus
├── runner/              # headless scenario runner (100 LHS × 40 stochastic)
└── viewer/              # thin six-tab HTML app over results
```

## How to migrate your existing single-file app
1. Drop your current working file in as `legacy/index.html` (create the folder).
2. In Claude Code, from the repo root, ask:
   > "Read CLAUDE.md and MODEL_CANON.md. Decompose legacy/index.html into the structure described, moving the embedded workbook data into data/ and the inlined engines into src/. Change no computed result. Then re-run the validation gate in BUILD_STANDARDS.md and show me the numbers vs. MODEL_CANON §1."
3. Review the diff, confirm the targets still match to full precision, commit.

After that, every future change is a targeted edit against files on disk — no more re-emitting the whole file through a chat window.
