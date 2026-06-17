// run.js — headless efficient-frontier runner (100 LHS × 100 stochastic by default).
// Loads the decomposed engine + shared frontier compute + data/, runs the frontier the
// same way the browser viewer does (seeded, so results are reproducible and identical),
// and writes a results JSON the viewer / verification can consume.
//
// Usage:  node runner/run.js [default|zero] [outFile]
//   default  -> apply the default growth schedule (PN/HI grow, MS flat)
//   zero     -> all growth = 0 (reproduces the legacy static frontier; the default)
'use strict';
var fs = require('fs');
var path = require('path');
var EFENG = require('../src/engine.js');
var FRONTIER = require('../src/frontier.js');
var D = require('./defaults.js');

var ROOT = path.join(__dirname, '..');
var DATA = path.join(ROOT, 'data');

function runFrontier(S, F) {
  var n = S.nScen, ns = S.nStoch;
  F.setSeed(F.STOCH_SEED);                          // reseed: reproducible sales draws + shock bank
  var msA = F.lhs(n, S.bounds.MS[0], S.bounds.MS[1]),
      pnA = F.lhs(n, S.bounds.PN[0], S.bounds.PN[1]),
      hiA = F.lhs(n, S.bounds.HI[0], S.bounds.HI[1]);
  var BANK = F.buildShockBank(ns);                  // ONE bank reused across all scenarios (CRN)
  S.results = [];
  for (var i = 0; i < n; i++) {
    var sales = { MS: msA[i], PN: pnA[i], HI: hiA[i] };
    var mc = { MS: 1, PN: 1, HI: 1 }, ml = { MS: 1, PN: 1, HI: 1 };
    var det = F.buildScen(sales, mc, ml);
    var sIRRs = [], sNPVs = [], sDD = [], sMinRBC = [];
    for (var k = 0; k < ns; k++) {
      var _s = F.shockFromBank(BANK[k]);
      if (S.slowMode) {                                                        // Slow mode: full RBC recompute per draw
        var sm = F.buildScen(sales, _s.cm, _s.lm, { combined: _s.nm, proc: _s.nmProc });
        var dd = 0; for (var yy = 2026; yy <= 2055; yy++) { var cv = sm.cumDE26[yy]; if (cv != null && cv < dd) dd = cv; }
        sIRRs.push(sm.irr26); sNPVs.push(sm.npv26); sDD.push(dd); sMinRBC.push(sm.minRBC);
      } else {
        var sm = F.stochMetrics(sales, _s.cm, _s.lm, _s.nm);
        sIRRs.push(sm.irr); sNPVs.push(sm.npv); sDD.push(sm.dd);
      }
    }
    var dr = F.downsideRisk(sNPVs, sDD, det.npv26), risk = dr.risk;
    var fails = F.evalCons(det, S.slowMode ? { irrs: sIRRs, minRBCs: sMinRBC } : { irrs: sIRRs });
    S.results.push({
      id: i + 1, sales: sales, portIRR: det.irr26, portNPV: det.npv26, wtdIRR: det.wtdIRR, risk: risk,
      portIRRAll: det.portIRR, portNPVAll: det.portNPV, irr26: det.irr26, npv26: det.npv26,
      minRBC: det.minRBC, riskSD: dr.sd, cte90: dr.cte90, semidev: dr.semidev, ddMed: dr.ddMed, ddWorst: dr.ddWorst,
      stochIRRs: sIRRs, stochNPVs: sNPVs, stochDD: sDD, stochMinRBC: S.slowMode ? sMinRBC : null,
      failures: fails, feasible: fails.length === 0, isFrontier: false
    });
  }
  F.markFrontier(S.results);
  return S.results;
}

function main() {
  var mode = (process.argv[2] || 'zero').toLowerCase();
  var growth = (mode === 'default') ? D.defaultGrowth() : D.zeroGrowth();
  var S = D.buildState(EFENG, DATA, growth);
  if (process.argv.indexOf('slow') >= 0) S.slowMode = true;   // Slow mode: per-draw trough-RBC tail
  var F = FRONTIER.create(S, EFENG);
  F.computeBaseline();
  var results = runFrontier(S, F);

  var out = {
    meta: {
      mode: mode, generatedAt: new Date().toISOString(),
      seed: F.STOCH_SEED, nScen: S.nScen, nStoch: S.nStoch,
      bounds: S.bounds, growth: S.growth
    },
    baseline: {
      vnb: {
        MS: { irr: S.baseline.vnbs.MS.r.irr, npvDE: S.baseline.vnbs.MS.r.npvDE },
        PN: { irr: S.baseline.vnbs.PN.r.irr, npvDE: S.baseline.vnbs.PN.r.npvDE },
        HI: { irr: S.baseline.vnbs.HI.r.irr, npvDE: S.baseline.vnbs.HI.r.npvDE }
      },
      rbc: [2026, 2027, 2028, 2029, 2030].map(function (y) { return S.baseline.surplusCalc[y].ratio; }),
      npv26: S.baseline.npv26, portIRR: S.baseline.portIRR, minRBC: S.baseline.minRBC
    },
    scenarios: results.map(function (r) {
      return {
        id: r.id, sales: r.sales, npv26: r.npv26, irr26: r.irr26, wtdIRR: r.wtdIRR,
        risk: r.risk, riskSD: r.riskSD, cte90: r.cte90, ddWorst: r.ddWorst, minRBC: r.minRBC,
        feasible: r.feasible, isFrontier: r.isFrontier, failCodes: r.failures.map(function (f) { return f.code; }),
        stochIRRs: r.stochIRRs, stochNPVs: r.stochNPVs, stochDD: r.stochDD
      };
    })
  };
  var dir = path.join(__dirname, 'results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  var outFile = process.argv[3] || path.join(dir, 'frontier_' + mode + '.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n');
  var nf = results.filter(function (r) { return r.isFrontier; }).length;
  var nfe = results.filter(function (r) { return r.feasible; }).length;
  console.log('mode=' + mode + '  scenarios=' + results.length + '  feasible=' + nfe + '  frontier=' + nf);
  console.log('baseline VNB IRR  MS/PN/HI = ' + ['MS', 'PN', 'HI'].map(function (c) { return out.baseline.vnb[c].irr.toFixed(8); }).join(' / '));
  console.log('baseline RBC 26-30 = ' + out.baseline.rbc.map(function (x) { return x.toFixed(2); }).join(' / '));
  console.log('wrote ' + outFile);
}

main();
