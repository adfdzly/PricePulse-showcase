/*
 * PricePulse demo dataset.
 * Every number here is synthetic and generated in the browser from a fixed seed.
 * Product names are used only to make the demo feel realistic; prices, listings,
 * history and predictions do not reflect any real marketplace data.
 */
(function () {
  'use strict';

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20260611);
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function round(n) { return Math.round(n); }

  var PLATFORMS = [
    { id: 'lazada', name: 'Lazada', color: '#7b61ff' },
    { id: 'shopee', name: 'Shopee', color: '#ff6f3c' }
  ];

  // [brand, model, category, base price RM, variants [ram, storage]]
  var CATALOG = [
    ['Apple', 'iPhone 16 Pro Max', 'Phone', 6299, [[8, 256], [8, 512]]],
    ['Apple', 'iPhone 16', 'Phone', 4299, [[8, 128], [8, 256]]],
    ['Apple', 'iPhone 15', 'Phone', 3599, [[6, 128], [6, 256]]],
    ['Apple', 'iPad Air 11 M2', 'Tablet', 2999, [[8, 128], [8, 256]]],
    ['Apple', 'iPad 10th Gen', 'Tablet', 1599, [[4, 64], [4, 256]]],
    ['Samsung', 'Galaxy S25 Ultra', 'Phone', 5899, [[12, 256], [12, 512]]],
    ['Samsung', 'Galaxy S24 FE', 'Phone', 2799, [[8, 128], [8, 256]]],
    ['Samsung', 'Galaxy A56 5G', 'Phone', 1799, [[8, 128], [12, 256]]],
    ['Samsung', 'Galaxy A16', 'Phone', 799, [[4, 128], [8, 256]]],
    ['Samsung', 'Galaxy Tab S10 FE', 'Tablet', 2199, [[8, 128], [12, 256]]],
    ['Samsung', 'Galaxy Tab A9+', 'Tablet', 899, [[4, 64], [8, 128]]],
    ['Xiaomi', 'Xiaomi 15', 'Phone', 3699, [[12, 256], [12, 512]]],
    ['Xiaomi', 'Redmi Note 14 Pro', 'Phone', 1299, [[8, 256], [12, 512]]],
    ['Xiaomi', 'Redmi 14C', 'Phone', 449, [[4, 128], [8, 256]]],
    ['Xiaomi', 'Poco X7 Pro', 'Phone', 1399, [[8, 256], [12, 512]]],
    ['Xiaomi', 'Redmi Pad Pro', 'Tablet', 1199, [[6, 128], [8, 256]]],
    ['Oppo', 'Reno13 5G', 'Phone', 2199, [[12, 256], [12, 512]]],
    ['Oppo', 'A3x', 'Phone', 499, [[4, 64], [4, 128]]],
    ['Oppo', 'Pad 3', 'Tablet', 1899, [[8, 256]]],
    ['Vivo', 'V50', 'Phone', 2099, [[12, 256], [12, 512]]],
    ['Vivo', 'Y29', 'Phone', 699, [[6, 128], [8, 256]]],
    ['Vivo', 'X200 Pro', 'Phone', 4999, [[16, 512]]],
    ['Honor', 'Magic7 Pro', 'Phone', 4299, [[12, 512]]],
    ['Honor', 'X9c', 'Phone', 1599, [[12, 256], [12, 512]]],
    ['Honor', 'Pad X9', 'Tablet', 899, [[4, 128], [8, 128]]],
    ['Realme', '14 Pro+', 'Phone', 1999, [[12, 256], [12, 512]]],
    ['Realme', 'C75', 'Phone', 699, [[8, 128], [8, 256]]],
    ['Huawei', 'nova 13', 'Phone', 1999, [[12, 256], [12, 512]]],
    ['Huawei', 'MatePad 11.5', 'Tablet', 1399, [[8, 128], [8, 256]]],
    ['Infinix', 'Note 40 Pro', 'Phone', 999, [[8, 256], [12, 256]]]
  ];

  var WEEKS = 16;
  var today = new Date('2026-11-09T00:00:00');
  var weekLabels = [];
  for (var w = WEEKS - 1; w >= 0; w--) {
    var d = new Date(today); d.setDate(d.getDate() - w * 7);
    weekLabels.push(d.toISOString().slice(0, 10));
  }

  // Shared "sale event" weeks (mid-month and double-digit style promos)
  var PROMO_WEEKS = [3, 8, 13];

  var products = [];
  var id = 1001;
  CATALOG.forEach(function (row) {
    var brand = row[0], model = row[1], category = row[2], base = row[3];
    row[4].forEach(function (v, vi) {
      var price0 = base * (1 + vi * 0.18);
      var drift = (rand() - 0.55) * 0.012;       // weekly drift
      var vol = 0.008 + rand() * 0.025;           // volatility
      var series = {};
      PLATFORMS.forEach(function (p, pi) {
        var offset = 1 + (rand() - 0.5) * 0.08;
        var price = price0 * offset;
        var arr = [];
        for (var k = 0; k < WEEKS; k++) {
          price = price * (1 + drift + (rand() - 0.5) * vol * 2);
          var shown = price;
          if (PROMO_WEEKS.indexOf(k) !== -1 && rand() < 0.45) shown = price * (0.88 + rand() * 0.09);
          arr.push(round(shown));
        }
        series[p.id] = arr;
      });

      var latest = {}, low = Infinity, lowPlat = null;
      Object.keys(series).forEach(function (pid) {
        var last = series[pid][WEEKS - 1];
        latest[pid] = last;
        if (last < low) { low = last; lowPlat = pid; }
      });
      var allTimeLow = Infinity;
      Object.keys(series).forEach(function (pid) {
        series[pid].forEach(function (x) { if (x < allTimeLow) allTimeLow = x; });
      });

      // weekly min across platforms
      var weeklyMin = [];
      for (var k2 = 0; k2 < WEEKS; k2++) {
        var m = Infinity;
        Object.keys(series).forEach(function (pid) { if (series[pid][k2] < m) m = series[pid][k2]; });
        weeklyMin.push(m);
      }
      var prev = weeklyMin[WEEKS - 2];
      var changePct = (low - prev) / prev;

      // Synthetic "model output": mostly STABLE, like the real class balance.
      var r = rand();
      var trend = 'STABLE';
      if (drift < -0.004 && r < 0.55) trend = 'DOWN';
      else if (drift > 0.002 && r < 0.45) trend = 'UP';
      else if (r < 0.08) trend = pick(['UP', 'DOWN']);
      var confidence = trend === 'STABLE' ? 0.55 + rand() * 0.35 : 0.42 + rand() * 0.3;

      var listings = 0;
      Object.keys(series).forEach(function () { listings += 2 + Math.floor(rand() * 14); });

      products.push({
        id: id++,
        brand: brand,
        name: brand === 'Apple' || model.indexOf(brand) === 0 ? model : brand + ' ' + model,
        category: category,
        ram: v[0],
        storage: v[1],
        series: series,
        latest: latest,
        lowest: low,
        lowestPlatform: lowPlat,
        allTimeLow: allTimeLow,
        weeklyMin: weeklyMin,
        changePct: changePct,
        trend: trend,
        confidence: Math.round(confidence * 100) / 100,
        listings: listings,
        sold: Math.floor(rand() * 9000) + 50,
        rating: Math.round((4 + rand()) * 10) / 10
      });
    });
  });

  // Staff-panel style job history (synthetic)
  var jobs = [];
  for (var j = 0; j < 8; j++) {
    var jd = new Date(today); jd.setDate(jd.getDate() - j * 7);
    jobs.push({
      batch: 120 - j,
      date: jd.toISOString().slice(0, 10),
      status: j === 5 ? 'FAILED' : 'SUCCESS',
      scraped: j === 5 ? 412 : 1800 + Math.floor(rand() * 900),
      products: j === 5 ? 0 : 58 + Math.floor(rand() * 6),
      durationMin: j === 5 ? 31 : 14 + Math.floor(rand() * 9)
    });
  }

  var promos = [
    { date: '2026-11-11', title: '11.11 Mega Sale', kind: 'promo' },
    { date: '2026-11-25', title: 'Payday Sale', kind: 'promo' },
    { date: '2026-11-28', title: 'Black Friday', kind: 'promo' },
    { date: '2026-12-12', title: '12.12 Birthday Sale', kind: 'promo' },
    { date: '2026-11-18', title: 'Weekly pipeline run', kind: 'note' },
    { date: '2026-11-04', title: 'Weekly pipeline run', kind: 'note' }
  ];

  // Model evaluation figures shown on the Insights page. These mirror the
  // published write-up in docs/ML.md (walk-forward evaluation).
  var modelEval = {
    version: 'v2.0',
    algorithm: 'Random Forest (balanced_subsample) + confidence threshold',
    features: 28,
    band: 0.037,
    comparison: [
      { name: 'Always STABLE (baseline)', acc: 0.76, f1: 0.29 },
      { name: 'SVM', acc: 0.709, f1: 0.291 },
      { name: 'Random Forest (default)', acc: 0.712, f1: 0.360 },
      { name: 'XGBoost (default)', acc: 0.706, f1: 0.392 },
      { name: 'PricePulse v2.0', acc: 0.677, f1: 0.432 }
    ],
    importance: [
      ['price_vs_avg', 0.112], ['trend_3', 0.094], ['momentum', 0.081],
      ['price_change_pct', 0.077], ['momentum_pct', 0.069], ['vol_ratio', 0.061],
      ['rolling_std_3', 0.054], ['range_pct', 0.049], ['lag_1_change', 0.044],
      ['volatility_index', 0.041]
    ]
  };

  window.PP_DATA = {
    platforms: PLATFORMS,
    products: products,
    weeks: weekLabels,
    jobs: jobs,
    promos: promos,
    modelEval: modelEval
  };
})();
