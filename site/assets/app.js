/* PricePulse demo front end. Static, client-side only. */
(function () {
  'use strict';

  var D = window.PP_DATA;
  var view = document.getElementById('view');
  var charts = [];

  // ---------- helpers ----------
  var ICON = {
    dashboard: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    search: '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    bookmarkFill: '<path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    insights: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    pipeline: '<circle cx="5" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="19" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 6h9M6.3 8.2l4.4 7.6M17.7 8.2l-4.4 7.6" stroke="currentColor" stroke-width="1.8"/>',
    box: '<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    tag: '<path d="M3 12V3h9l9 9-9 9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/>',
    trendDown: '<path d="M3 7l6 6 4-4 8 8M21 11v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rm(n) { return 'RM ' + Math.round(n).toLocaleString('en-MY'); }
  function pct(n, digits) { return (n > 0 ? '+' : '') + (n * 100).toFixed(digits == null ? 1 : digits) + '%'; }
  function dirClass(n) { return n > 0.0005 ? 'up' : n < -0.0005 ? 'down' : 'flat'; }
  function plat(id) { for (var i = 0; i < D.platforms.length; i++) if (D.platforms[i].id === id) return D.platforms[i]; }
  function byId(id) { for (var i = 0; i < D.products.length; i++) if (D.products[i].id === id) return D.products[i]; }
  function trendPill(t) { return '<span class="pill pill-' + t + '">' + t + '</span>'; }
  var BRAND_COLORS = { Apple: '#4b5d7a', Samsung: '#1e4fa8', Xiaomi: '#e8711c', Oppo: '#1b8f6a', Vivo: '#3d5afe', Honor: '#2b7fb8', Realme: '#c9a400', Huawei: '#c62828', Infinix: '#6a1b9a' };
  function brandBg(b) { var c = BRAND_COLORS[b] || '#1d6fa8'; return 'linear-gradient(135deg,' + c + ',#0e1f3d)'; }
  function thumb(p) { return '<div class="thumb" style="background:' + brandBg(p.brand) + '">' + esc(p.brand.slice(0, 2)) + '</div>'; }
  function device(p) { return '<div class="device' + (p.category === 'Tablet' ? ' tablet' : '') + '"></div>'; }
  function spec(p) { return p.ram + 'GB + ' + p.storage + 'GB'; }

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('pp-demo-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('pp-demo-' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  var DEFAULT_BM = {};
  [1003, 1011, 1024, 1032, 1040].forEach(function (id, i) {
    var p = byId(id); if (p) DEFAULT_BM[id] = Math.round(p.lowest * (i % 2 ? 1.02 : 0.95) / 10) * 10;
  });
  var bookmarks = store.get('bookmarks', DEFAULT_BM);
  function isBm(id) { return Object.prototype.hasOwnProperty.call(bookmarks, id); }
  function toggleBm(id) {
    if (isBm(id)) { delete bookmarks[id]; toast('Removed from bookmarks'); }
    else { var p = byId(id); bookmarks[id] = Math.round(p.lowest * 0.95 / 10) * 10; toast('Bookmarked. Alert set at 5% below the current lowest price'); }
    store.set('bookmarks', bookmarks); renderNav();
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  function destroyCharts() { charts.forEach(function (c) { c.destroy(); }); charts = []; }
  function chart(id, cfg) {
    if (!window.Chart) return;
    var el = document.getElementById(id); if (!el) return;
    charts.push(new Chart(el, cfg));
  }
  if (window.Chart) {
    Chart.defaults.color = '#8fb3d6';
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.tooltip.backgroundColor = '#0e1f3d';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(66,165,245,.4)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.maintainAspectRatio = false;
  }
  function shortDate(s) { var d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  // ---------- nav ----------
  var NAV = [
    ['Main'],
    ['dashboard', 'Dashboard', 'dashboard'],
    ['search', 'Search Product', 'search'],
    ['bookmarks', 'Bookmarks', 'bookmark'],
    ['calendar', 'Promo Calendar', 'calendar'],
    ['Analytics'],
    ['insights', 'Trend Model', 'insights'],
    ['pipeline', 'Data Pipeline', 'pipeline']
  ];
  function renderNav() {
    var route = (location.hash.replace('#/', '').split('/')[0]) || 'dashboard';
    if (route === 'product') route = 'search';
    var n = Object.keys(bookmarks).length;
    document.getElementById('nav').innerHTML = NAV.map(function (it) {
      if (it.length === 1) return '<div class="nav-section">' + it[0] + '</div>';
      return '<a class="nav-item' + (route === it[0] ? ' active' : '') + '" href="#/' + it[0] + '">' + icon(it[2]) + it[1] +
        (it[0] === 'bookmarks' && n ? '<span class="nav-badge">' + n + '</span>' : '') + '</a>';
    }).join('');
  }

  // ---------- pages ----------
  function productCard(p, i) {
    return '<div class="product-card fade-up" style="animation-delay:' + Math.min(i, 12) * 0.03 + 's" data-go="' + p.id + '">' +
      '<div class="pc-img" style="background:' + brandBg(p.brand) + '">' + trendPill(p.trend) + device(p) +
      '<button class="pc-bm' + (isBm(p.id) ? ' on' : '') + '" data-bm="' + p.id + '" aria-label="Bookmark">' + icon(isBm(p.id) ? 'bookmarkFill' : 'bookmark') + '</button></div>' +
      '<div class="pc-body"><div class="pc-brand">' + esc(p.brand) + ' / ' + p.category + '</div>' +
      '<div class="pc-name">' + esc(p.name) + '</div><div class="pc-spec">' + spec(p) + ' &middot; ' + Object.keys(p.series).length + ' platforms</div>' +
      '<div class="pc-price"><span class="num">' + rm(p.lowest) + '</span><small class="' + dirClass(p.changePct) + '">' + pct(p.changePct) + ' wk</small>' +
      '<small>on ' + plat(p.lowestPlatform).name + '</small></div></div></div>';
  }

  function pageDashboard() {
    var ps = D.products;
    var drops = ps.slice().sort(function (a, b) { return a.changePct - b.changePct; });
    var gainers = drops.slice().reverse();
    var down = ps.filter(function (p) { return p.trend === 'DOWN'; }).length;
    var avgChange = ps.reduce(function (s, p) { return s + p.changePct; }, 0) / ps.length;

    var html = '<div class="page-intro fade-up"><h2>Good evening, Demo User</h2><p>Weekly snapshot of ' + ps.length +
      ' tracked phone and tablet variants across Lazada, Shopee and TikTok Shop. Last pipeline run: ' + shortDate(D.jobs[0].date) + '.</p></div>' +
      '<div class="grid grid-4">' +
      stat('Tracked variants', ps.length, 'across 9 brands', 'box', '#2196f3') +
      stat('Avg weekly change', pct(avgChange, 2), 'lowest price, week over week', 'tag', '#00bcd4') +
      stat('Predicted to drop', down, 'next-week DOWN calls', 'trendDown', '#69f0ae') +
      stat('Active alerts', Object.keys(bookmarks).length, 'from your bookmarks', 'bell', '#ffab40') +
      '</div>' +
      '<div class="grid grid-main mt"><div class="card fade-up d1"><div class="card-head"><div><div class="card-title">Average lowest price by platform</div><div class="card-sub">16 weeks, all tracked variants</div></div></div><div class="chart-wrap"><canvas id="c-plat"></canvas></div></div>' +
      '<div class="card fade-up d2"><div class="card-head"><div class="card-title">Next-week trend calls</div></div><div class="chart-wrap"><canvas id="c-trend"></canvas></div></div></div>' +
      '<div class="grid grid-2 mt">' + moverCard('Biggest drops this week', drops.slice(0, 5)) + moverCard('Biggest increases this week', gainers.slice(0, 5)) + '</div>' +
      '<div class="card mt fade-up"><div class="card-head"><div><div class="card-title">Weekly price movement heatmap</div><div class="card-sub">Week-over-week change of the lowest listed price, by brand</div></div></div><div id="heatmap" class="heatmap"></div></div>';
    view.innerHTML = html;

    // platform averages
    var datasets = D.platforms.map(function (pl) {
      var data = D.weeks.map(function (_, w) {
        var s = 0, n = 0;
        ps.forEach(function (p) { if (p.series[pl.id]) { s += p.series[pl.id][w] / p.series[pl.id][0]; n++; } });
        return n ? +(s / n * 100).toFixed(2) : null;
      });
      return { label: pl.name, data: data, borderColor: pl.color, backgroundColor: pl.color + '22', tension: 0.35, pointRadius: 0, borderWidth: 2, fill: false };
    });
    chart('c-plat', { type: 'line', data: { labels: D.weeks.map(shortDate), datasets: datasets },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + c.parsed.y.toFixed(1); } } } },
        scales: { y: { title: { display: true, text: 'Index (week 1 = 100)' } } } } });

    var counts = ['DOWN', 'STABLE', 'UP'].map(function (t) { return ps.filter(function (p) { return p.trend === t; }).length; });
    chart('c-trend', { type: 'doughnut', data: { labels: ['DOWN', 'STABLE', 'UP'], datasets: [{ data: counts, backgroundColor: ['#69f0ae', '#42a5f5', '#ef5350'], borderColor: '#0e1f3d', borderWidth: 3 }] },
      options: { cutout: '68%', plugins: { legend: { position: 'bottom' } } } });

    // heatmap by brand
    var brands = Object.keys(BRAND_COLORS);
    var hm = '';
    brands.forEach(function (b) {
      var bp = ps.filter(function (p) { return p.brand === b; });
      hm += '<div class="hm-label">' + b + '</div>';
      for (var w = 0; w < D.weeks.length; w++) {
        var ch = 0;
        if (w > 0) bp.forEach(function (p) { ch += (p.weeklyMin[w] - p.weeklyMin[w - 1]) / p.weeklyMin[w - 1]; });
        ch = w > 0 ? ch / bp.length : 0;
        var a = Math.min(Math.abs(ch) / 0.06, 1) * 0.85 + 0.08;
        var col = ch < 0 ? 'rgba(105,240,174,' + a + ')' : ch > 0 ? 'rgba(239,83,80,' + a + ')' : 'rgba(255,255,255,.06)';
        hm += '<div class="hm-cell" style="background:' + col + '" title="' + b + ', week of ' + D.weeks[w] + ': ' + pct(ch) + '"></div>';
      }
    });
    document.getElementById('heatmap').innerHTML = hm;
  }
  function stat(label, value, foot, ic, color) {
    return '<div class="card fade-up"><div class="stat-icon" style="background:' + color + '22;color:' + color + '">' + icon(ic) + '</div>' +
      '<div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div><div class="stat-foot">' + foot + '</div></div>';
  }
  function moverCard(title, items) {
    return '<div class="card fade-up"><div class="card-head"><div class="card-title">' + title + '</div><a href="#/search" class="card-sub">View all</a></div>' +
      items.map(function (p) {
        return '<div class="list-row" data-go="' + p.id + '">' + thumb(p) + '<div style="flex:1;min-width:0"><div class="list-name">' + esc(p.name) + '</div><div class="list-meta">' + spec(p) + '</div></div>' +
          '<div style="text-align:right"><div class="num">' + rm(p.lowest) + '</div><div class="list-meta ' + dirClass(p.changePct) + '">' + pct(p.changePct) + '</div></div></div>';
      }).join('') + '</div>';
  }

  var searchState = { q: '', brand: '', cat: '', trend: '', sort: 'relevance', max: '' };
  function pageSearch(params) {
    if (params && params.q != null) searchState.q = params.q;
    var brands = Array.from(new Set(D.products.map(function (p) { return p.brand; })));
    view.innerHTML = '<div class="page-intro fade-up"><h2>Search products</h2><p>Filter by brand, category, predicted trend or budget. Prices shown are the lowest current listing across platforms.</p></div>' +
      '<div class="filter-bar fade-up">' +
      '<input class="control" id="f-q" placeholder="Try &quot;galaxy&quot;, &quot;256&quot; or &quot;ipad&quot;" value="' + esc(searchState.q) + '">' +
      sel('f-brand', [['', 'All brands']].concat(brands.map(function (b) { return [b, b]; })), searchState.brand) +
      sel('f-cat', [['', 'All categories'], ['Phone', 'Phones'], ['Tablet', 'Tablets']], searchState.cat) +
      sel('f-trend', [['', 'Any trend'], ['DOWN', 'Predicted DOWN'], ['STABLE', 'Predicted STABLE'], ['UP', 'Predicted UP']], searchState.trend) +
      sel('f-max', [['', 'Any price'], ['1000', 'Under RM 1,000'], ['2000', 'Under RM 2,000'], ['4000', 'Under RM 4,000']], searchState.max) +
      sel('f-sort', [['relevance', 'Sort: relevance'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['drop', 'Biggest weekly drop']], searchState.sort) +
      '</div><div class="results-meta" id="r-meta"></div><div class="product-grid" id="r-grid"></div>';
    ['f-q', 'f-brand', 'f-cat', 'f-trend', 'f-max', 'f-sort'].forEach(function (id) {
      document.getElementById(id).addEventListener(id === 'f-q' ? 'input' : 'change', function () {
        searchState.q = val('f-q'); searchState.brand = val('f-brand'); searchState.cat = val('f-cat');
        searchState.trend = val('f-trend'); searchState.max = val('f-max'); searchState.sort = val('f-sort');
        renderResults();
      });
    });
    renderResults();
  }
  function val(id) { return document.getElementById(id).value; }
  function sel(id, opts, cur) {
    return '<select class="control" id="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  function renderResults() {
    var s = searchState, q = s.q.trim().toLowerCase();
    var terms = q ? q.split(/\s+/) : [];
    var list = D.products.filter(function (p) {
      var hay = (p.name + ' ' + p.brand + ' ' + p.category + ' ' + p.ram + 'gb ' + p.storage + 'gb ' + p.storage).toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) !== -1; }) &&
        (!s.brand || p.brand === s.brand) && (!s.cat || p.category === s.cat) &&
        (!s.trend || p.trend === s.trend) && (!s.max || p.lowest <= +s.max);
    });
    if (s.sort === 'price-asc') list.sort(function (a, b) { return a.lowest - b.lowest; });
    if (s.sort === 'price-desc') list.sort(function (a, b) { return b.lowest - a.lowest; });
    if (s.sort === 'drop') list.sort(function (a, b) { return a.changePct - b.changePct; });
    document.getElementById('r-meta').textContent = list.length + ' of ' + D.products.length + ' variants';
    document.getElementById('r-grid').innerHTML = list.length ? list.map(productCard).join('') :
      '<div class="empty" style="grid-column:1/-1">No products match these filters.</div>';
  }

  function pageProduct(id) {
    var p = byId(+id);
    if (!p) { view.innerHTML = '<div class="empty">Product not found. <a href="#/search">Back to search</a></div>'; return; }
    document.getElementById('page-title').textContent = 'Product Detail';
    var pids = Object.keys(p.series);
    var sorted = pids.slice().sort(function (a, b) { return p.latest[a] - p.latest[b]; });
    var highest = p.latest[sorted[sorted.length - 1]];
    var avg16 = p.weeklyMin.reduce(function (s, x) { return s + x; }, 0) / p.weeklyMin.length;
    var tCol = p.trend === 'DOWN' ? 'var(--accent2)' : p.trend === 'UP' ? '#ff8a80' : 'var(--blue-sky)';
    var tText = { DOWN: 'The model expects the lowest price to fall by more than 3.7% next week. Waiting may pay off.', UP: 'The model expects the lowest price to rise by more than 3.7% next week. Buying now may be cheaper.', STABLE: 'The model expects next week\'s lowest price to stay within 3.7% of this week.' }[p.trend];

    view.innerHTML = '<div class="crumb fade-up"><a href="#/search">Search</a> / ' + esc(p.brand) + ' / ' + esc(p.name) + '</div>' +
      '<div class="card fade-up"><div class="pd-head"><div class="pd-hero" style="background:' + brandBg(p.brand) + '">' + device(p) + '</div><div style="flex:1;min-width:240px">' +
      '<div class="pd-title">' + esc(p.name) + '</div><div class="pd-meta"><span class="pill pill-plat">' + p.category + '</span><span class="pill pill-plat">' + spec(p) + '</span>' +
      '<span class="pill pill-plat">' + p.listings + ' listings</span><span class="pill pill-plat">Rated ' + p.rating + ' / 5</span>' + trendPill(p.trend) + '</div>' +
      '<div class="pd-price"><span class="num">' + rm(p.lowest) + '</span><span class="' + dirClass(p.changePct) + '">' + pct(p.changePct) + ' vs last week</span>' +
      '<span class="card-sub">Save up to ' + rm(highest - p.lowest) + ' vs the priciest platform</span></div>' +
      '<div class="pd-actions"><button class="btn btn-primary" id="pd-bm">' + icon(isBm(p.id) ? 'bookmarkFill' : 'bookmark') + (isBm(p.id) ? 'Bookmarked' : 'Bookmark and alert') + '</button>' +
      '<button class="btn" id="pd-refresh">' + icon('refresh') + 'Refresh price</button></div></div></div></div>' +

      '<div class="grid grid-main mt"><div class="card fade-up d1"><div class="card-head"><div><div class="card-title">Price history</div><div class="card-sub">Weekly lowest listing per platform. Dips line up with sale events.</div></div></div><div class="chart-wrap"><canvas id="c-hist"></canvas></div></div>' +
      '<div class="card fade-up d2"><div class="card-title" style="margin-bottom:6px">Next-week prediction</div><div class="pred-box">' +
      '<div class="card-sub">Model ' + D.modelEval.version + '</div><div class="pred-trend" style="color:' + tCol + '">' + p.trend + '</div>' +
      '<div class="meter"><div style="width:' + Math.round(p.confidence * 100) + '%"></div></div><div class="card-sub">Confidence ' + Math.round(p.confidence * 100) + '%</div></div>' +
      '<p class="note" style="margin-top:12px">' + tText + ' Low-confidence UP and DOWN calls are redirected to STABLE by a tuned threshold.</p></div></div>' +

      '<div class="grid grid-2 mt"><div class="card fade-up"><div class="card-title" style="margin-bottom:6px">Platform comparison</div>' +
      sorted.map(function (pid, i) {
        var pl = plat(pid);
        return '<div class="plat-row"><div class="plat-logo" style="background:' + pl.color + '">' + pl.name[0] + '</div><div class="grow"><div>' + pl.name + (i === 0 ? '<span class="best">LOWEST</span>' : '') + '</div>' +
          '<div class="list-meta">' + (i === 0 ? 'Best current price' : '+' + rm(p.latest[pid] - p.lowest) + ' vs lowest') + '</div></div><div class="num">' + rm(p.latest[pid]) + '</div>' +
          '<button class="btn" data-visit="' + pl.name + '" aria-label="Visit ' + pl.name + '">' + icon('external') + '</button></div>';
      }).join('') + '</div>' +
      '<div class="card fade-up"><div class="card-title" style="margin-bottom:12px">16-week statistics</div><dl class="kv">' +
      '<dt>All-time low</dt><dd class="down">' + rm(p.allTimeLow) + '</dd>' +
      '<dt>16-week average (lowest)</dt><dd>' + rm(avg16) + '</dd>' +
      '<dt>Current vs average</dt><dd class="' + dirClass(p.lowest - avg16) + '">' + pct((p.lowest - avg16) / avg16) + '</dd>' +
      '<dt>Spread across platforms</dt><dd>' + rm(highest - p.lowest) + '</dd>' +
      '<dt>Units sold (all listings)</dt><dd>' + p.sold.toLocaleString('en-MY') + '</dd>' +
      '<dt>Data refreshed</dt><dd>' + shortDate(D.weeks[D.weeks.length - 1]) + '</dd></dl></div></div>';

    chart('c-hist', { type: 'line', data: { labels: D.weeks.map(shortDate), datasets: pids.map(function (pid) {
      var pl = plat(pid);
      return { label: pl.name, data: p.series[pid], borderColor: pl.color, backgroundColor: pl.color, tension: 0.3, pointRadius: 2.5, pointHoverRadius: 5, borderWidth: 2 };
    }) }, options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + rm(c.parsed.y); } } } },
      scales: { y: { ticks: { callback: function (v) { return 'RM ' + v.toLocaleString('en-MY'); } } } } } });

    document.getElementById('pd-bm').onclick = function () { toggleBm(p.id); pageProduct(p.id); };
    document.getElementById('pd-refresh').onclick = function () {
      var b = this; b.disabled = true; b.lastChild.textContent = 'Queued...';
      setTimeout(function () { b.lastChild.textContent = 'Scraping...'; }, 700);
      setTimeout(function () { b.disabled = false; b.lastChild.textContent = 'Refresh price'; toast('Price is up to date (demo: no live scraping)'); }, 1800);
    };
  }

  function pageBookmarks() {
    var ids = Object.keys(bookmarks).map(Number).filter(byId);
    var hits = ids.filter(function (id) { return byId(id).lowest <= bookmarks[id]; }).length;
    view.innerHTML = '<div class="page-intro fade-up"><h2>Bookmarks and price alerts</h2><p>Set a target price on any bookmark. After every weekly pipeline run, PricePulse emails you when the lowest price falls to your target. Changes here are saved in your browser only.</p></div>' +
      '<div class="grid grid-3"><div class="card fade-up">' + '<div class="stat-label">Bookmarked</div><div class="stat-value">' + ids.length + '</div></div>' +
      '<div class="card fade-up"><div class="stat-label">Alerts triggered</div><div class="stat-value down">' + hits + '</div></div>' +
      '<div class="card fade-up"><div class="stat-label">Watching</div><div class="stat-value">' + (ids.length - hits) + '</div></div></div>' +
      '<div class="card mt fade-up">' + (ids.length ? ids.map(function (id) {
        var p = byId(id), target = bookmarks[id], hit = p.lowest <= target;
        return '<div class="bm-row">' + thumb(p) + '<div style="min-width:0"><div class="list-name" data-go="' + p.id + '" style="cursor:pointer">' + esc(p.name) + '</div><div class="list-meta">' + spec(p) + ' &middot; ' + trendPill(p.trend) + '</div></div>' +
          '<div><div class="num">' + rm(p.lowest) + '</div><div class="' + (hit ? 'alert-hit' : 'alert-wait') + '">' + (hit ? 'Target reached' : rm(p.lowest - target) + ' to go') + '</div></div>' +
          '<label class="list-meta">Alert at <input class="control bm-target" type="number" step="10" min="0" value="' + target + '" data-target="' + id + '" aria-label="Target price"></label>' +
          '<button class="btn btn-warn" data-unbm="' + id + '">Remove</button></div>';
      }).join('') : '<div class="empty">No bookmarks yet. <a href="#/search">Find a product</a> and tap the bookmark icon.</div>') + '</div>';
    view.querySelectorAll('[data-target]').forEach(function (inp) {
      inp.addEventListener('change', function () { bookmarks[inp.dataset.target] = Math.max(0, +inp.value || 0); store.set('bookmarks', bookmarks); toast('Alert updated'); pageBookmarks(); });
    });
    view.querySelectorAll('[data-unbm]').forEach(function (b) { b.onclick = function () { toggleBm(+b.dataset.unbm); pageBookmarks(); }; });
  }

  var calMonth = new Date('2026-11-01T00:00:00');
  function pageCalendar() {
    var y = calMonth.getFullYear(), m = calMonth.getMonth();
    var first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - first.getDay());
    var events = D.promos.slice();
    Object.keys(bookmarks).forEach(function (id) {
      var p = byId(+id); if (p && p.lowest <= bookmarks[id]) events.push({ date: D.weeks[D.weeks.length - 1], title: 'Alert: ' + p.name, kind: 'alert' });
    });
    var cells = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) { cells += '<div class="cal-dow">' + d + '</div>'; });
    for (var i = 0; i < 42; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var evs = events.filter(function (e) { return e.date === key; });
      cells += '<div class="cal-day' + (d.getMonth() !== m ? ' muted' : '') + (key === '2026-11-11' ? ' today' : '') + '"><div>' + d.getDate() + '</div>' +
        evs.map(function (e) { return '<div class="cal-ev ' + e.kind + '" title="' + esc(e.title) + '">' + esc(e.title) + '</div>'; }).join('') + '</div>';
    }
    view.innerHTML = '<div class="page-intro fade-up"><h2>Promotion calendar</h2><p>Major Malaysian sale events, triggered alerts and personal notes in one view, so you can time purchases around double-date sales.</p></div>' +
      '<div class="card fade-up"><div class="card-head"><div class="card-title">' + first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</div>' +
      '<div style="display:flex;gap:8px"><button class="btn" id="cal-prev" aria-label="Previous month">Prev</button><button class="btn" id="cal-next" aria-label="Next month">Next</button></div></div>' +
      '<div class="cal">' + cells + '</div>' +
      '<div class="filter-bar" style="margin:14px 0 0;gap:16px"><span class="list-meta"><span class="plat-dot" style="background:var(--accent2)"></span> Sale event</span>' +
      '<span class="list-meta"><span class="plat-dot" style="background:var(--warn)"></span> Triggered alert</span><span class="list-meta"><span class="plat-dot" style="background:var(--purple)"></span> Note</span></div></div>';
    document.getElementById('cal-prev').onclick = function () { calMonth.setMonth(calMonth.getMonth() - 1); pageCalendar(); };
    document.getElementById('cal-next').onclick = function () { calMonth.setMonth(calMonth.getMonth() + 1); pageCalendar(); };
  }

  function pageInsights() {
    var M = D.modelEval;
    view.innerHTML = '<div class="page-intro fade-up"><h2>Trend prediction model</h2><p>A Random Forest classifier predicts whether each product\'s lowest price goes UP, DOWN or stays STABLE next week, using ' + M.features +
      ' features engineered from weekly price statistics. The figures below come from a leakage-free walk-forward evaluation (train on past weeks, predict the next one).</p></div>' +
      '<div class="grid grid-4">' + stat('Model version', M.version, 'versioned, with one-click rollback', 'insights', '#2196f3') +
      stat('Features', M.features, 'lags, momentum, volatility, listings', 'box', '#00bcd4') +
      stat('Move band', '3.7%', 'auto-selected per training run', 'tag', '#69f0ae') +
      stat('Macro F1', '0.43', 'best of the candidate models', 'trendDown', '#ffab40') + '</div>' +
      '<div class="grid grid-2 mt"><div class="card fade-up"><div class="card-head"><div><div class="card-title">Model comparison (walk-forward)</div><div class="card-sub">Accuracy vs macro F1 across UP / DOWN / STABLE</div></div></div><div class="chart-wrap"><canvas id="c-cmp"></canvas></div></div>' +
      '<div class="card fade-up"><div class="card-head"><div><div class="card-title">Top feature importances</div><div class="card-sub">Mean decrease in impurity</div></div></div><div class="chart-wrap"><canvas id="c-imp"></canvas></div></div></div>' +
      '<div class="card mt fade-up"><div class="card-title" style="margin-bottom:10px">What the numbers say</div><p class="note" style="font-size:13px;color:var(--t-secondary)">' +
      'Weekly prices are mostly flat, so a model that always answers STABLE scores about 76% accuracy while never catching a move. ' +
      'Every candidate (SVM, Random Forest, XGBoost) lands near that baseline on accuracy. The production model trades a few points of accuracy for the best macro F1: it is the only one that ' +
      'makes a real attempt at UP and DOWN calls, using class-balanced trees and a confidence threshold that sends uncertain moves back to STABLE. ' +
      'The biggest remaining lever is more weeks of history rather than a different algorithm.</p></div>';

    chart('c-cmp', { type: 'bar', data: { labels: M.comparison.map(function (c) { return c.name; }), datasets: [
      { label: 'Accuracy', data: M.comparison.map(function (c) { return c.acc; }), backgroundColor: '#42a5f5', borderRadius: 5 },
      { label: 'Macro F1', data: M.comparison.map(function (c) { return c.f1; }), backgroundColor: '#69f0ae', borderRadius: 5 }] },
      options: { indexAxis: 'y', scales: { x: { min: 0, max: 1 } }, plugins: { legend: { position: 'bottom' } } } });
    chart('c-imp', { type: 'bar', data: { labels: M.importance.map(function (r) { return r[0]; }), datasets: [{ label: 'Importance', data: M.importance.map(function (r) { return r[1]; }), backgroundColor: '#00bcd4', borderRadius: 5 }] },
      options: { indexAxis: 'y', layout: { padding: { left: 8 } }, plugins: { legend: { display: false } } } });
  }

  function pagePipeline() {
    var steps = [
      ['Scrape', 'Lazada and Shopee listings are collected in parallel by managed scraper actors, with API token rotation and per-run quotas.'],
      ['Clean', 'Platform-specific cleaners normalise titles, extract brand, RAM and storage, and map each listing to a canonical product.'],
      ['Aggregate', 'Listings are rolled up into weekly statistics per product: min, max, median, volatility, momentum and listing counts.'],
      ['Predict', 'The active model version scores every product for next week, with a confidence score per call.'],
      ['Load and alert', 'Results are bulk-written to MySQL, caches are refreshed and price alerts are emailed to users whose targets were hit.']
    ];
    view.innerHTML = '<div class="page-intro fade-up"><h2>Weekly data pipeline</h2><p>A scheduled Celery job runs the full pipeline every week. Staff can also trigger single-product refreshes, retrain the model, or roll back to an earlier model version from the staff panel.</p></div>' +
      '<div class="flow">' + steps.map(function (s, i) { return '<div class="flow-step fade-up" style="animation-delay:' + i * 0.06 + 's"><div class="n">PHASE ' + (i + 1) + '</div><h4>' + s[0] + '</h4><p>' + s[1] + '</p></div>'; }).join('') + '</div>' +
      '<div class="grid grid-main mt"><div class="card fade-up"><div class="card-head"><div><div class="card-title">Recent pipeline runs</div><div class="card-sub">Staff panel view (synthetic)</div></div></div><div class="table-wrap"><table><thead><tr><th>Batch</th><th>Date</th><th>Status</th><th>Listings</th><th>Products</th><th>Duration</th></tr></thead><tbody>' +
      D.jobs.map(function (j) { return '<tr><td>#' + j.batch + '</td><td>' + shortDate(j.date) + '</td><td class="status-' + j.status + '">' + j.status + '</td><td>' + j.scraped.toLocaleString('en-MY') + '</td><td>' + j.products + '</td><td>' + j.durationMin + ' min</td></tr>'; }).join('') +
      '</tbody></table></div></div><div class="card fade-up"><div class="card-head"><div class="card-title">Listings scraped per run</div></div><div class="chart-wrap sm"><canvas id="c-jobs"></canvas></div>' +
      '<p class="note" style="margin-top:10px">A failed run is retried on the next schedule; partial data never overwrites the last good batch.</p></div></div>';
    var js = D.jobs.slice().reverse();
    chart('c-jobs', { type: 'bar', data: { labels: js.map(function (j) { return '#' + j.batch; }), datasets: [{ data: js.map(function (j) { return j.scraped; }), backgroundColor: js.map(function (j) { return j.status === 'FAILED' ? '#ef5350' : '#42a5f5'; }), borderRadius: 5 }] },
      options: { plugins: { legend: { display: false } } } });
  }

  // ---------- router ----------
  var TITLES = { dashboard: 'Dashboard', search: 'Search Product', bookmarks: 'Bookmarks', calendar: 'Promo Calendar', insights: 'Trend Model', pipeline: 'Data Pipeline' };
  function route() {
    destroyCharts();
    document.body.classList.remove('nav-open');
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var name = parts[0] || 'dashboard';
    var query = {};
    if (name.indexOf('?') !== -1) {
      var qs = name.split('?'); name = qs[0];
      qs[1].split('&').forEach(function (kv) { var a = kv.split('='); query[a[0]] = decodeURIComponent(a[1] || ''); });
    }
    document.getElementById('page-title').textContent = TITLES[name] || 'PricePulse';
    if (name === 'search') pageSearch(query);
    else if (name === 'product') pageProduct(parts[1]);
    else if (name === 'bookmarks') pageBookmarks();
    else if (name === 'calendar') pageCalendar();
    else if (name === 'insights') pageInsights();
    else if (name === 'pipeline') pagePipeline();
    else pageDashboard();
    renderNav();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // delegated clicks
  view.addEventListener('click', function (e) {
    var bm = e.target.closest('[data-bm]');
    if (bm) {
      e.stopPropagation(); toggleBm(+bm.dataset.bm);
      bm.classList.toggle('on', isBm(+bm.dataset.bm)); bm.innerHTML = icon(isBm(+bm.dataset.bm) ? 'bookmarkFill' : 'bookmark');
      return;
    }
    var visit = e.target.closest('[data-visit]');
    if (visit) { toast('Opens the listing on ' + visit.dataset.visit + ' (disabled in the demo)'); return; }
    var go = e.target.closest('[data-go]');
    if (go) location.hash = '#/product/' + go.dataset.go;
  });
  document.getElementById('header-search').addEventListener('submit', function (e) {
    e.preventDefault();
    searchState.q = document.getElementById('header-q').value;
    if (location.hash.indexOf('#/search') === 0) route(); else location.hash = '#/search';
  });
  document.getElementById('hamburger').onclick = function () { document.body.classList.toggle('nav-open'); };
  document.getElementById('backdrop').onclick = function () { document.body.classList.remove('nav-open'); };

  route();
})();
