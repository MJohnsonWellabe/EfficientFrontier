/* worker.js — runs the heavy efficient-frontier sweep off the main thread.
   A dedicated worker's compute loop is not subject to background-tab timer throttling, so the
   run keeps progressing (and the UI never freezes) whether or not the tab is focused. It loads
   the SAME engine modules as the viewer and calls the SAME src/frontier.js runSweep, so results
   are bit-identical to a main-thread run for a given seed. */
importScripts('../src/vnb.js', '../src/ev-recalc.js', '../src/rbc-surplus.js', '../src/frontier.js');

// Rebuild the engine state from the posted texts + config (mirrors the viewer's init + readInputs
// and the runner's buildState — the engine reads these fields off S).
function buildStateFromMsg(d) {
  var EFENG = self.EFENG;
  var S = Object.assign({}, d.cfg);            // bounds, hurdles, cons, growth, surplusNote, seed,
                                               // nScen, nStoch, slowMode, σ tables, origSales, years, params
  S.ev = EFENG.loadEV(d.evText);
  S.ts = EFENG.loadTS(d.tsText);
  S.surplus = EFENG.loadSurplus(d.surplusText);
  S.results = [];
  return S;
}

self.onmessage = function (e) {
  var d = e.data;
  if (!d || d.type !== 'run') return;
  try {
    var S = buildStateFromMsg(d);
    var F = self.EFFRONTIER.create(S, self.EFENG);
    F.computeBaseline();
    F.runSweep({ onProgress: function (done, n) { self.postMessage({ type: 'progress', done: done, n: n }); } })
      .then(function (results) { self.postMessage({ type: 'done', results: results }); })
      .catch(function (err) { self.postMessage({ type: 'error', message: String((err && err.stack) || err) }); });
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.stack) || err) });
  }
};
