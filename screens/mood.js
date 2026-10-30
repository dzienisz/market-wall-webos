// Market mood: the crypto Fear & Greed gauge as the hero, with crypto totals, ECB rates and gold in your currency.
(function () {
  var CX = 380, CY = 340, R = 300, STROKE = 56;
  var BANDS = [[0, 25, '#e0324f'], [25, 45, '#f08a3c'], [45, 55, '#6b7385'], [55, 75, '#7fd38f'], [75, 100, '#2fbf6f']];
  var RATES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY'];

  function point(v, r) {
    var a = Math.PI * (1 - v / 100);
    return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
  }
  function arc(v0, v1) {
    var p0 = point(v0, R), p1 = point(v1, R);
    return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + R + ' ' + R + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
  }
  function bandColour(v) { for (var i = 0; i < BANDS.length; i++) if (v <= BANDS[i][1]) return BANDS[i][2]; return BANDS[4][2]; }

  function gauge(v) {
    var m = point(v, R);
    var arcs = BANDS.map(function (b) {
      // Small gaps between bands; the band the marker sits in is drawn at full strength.
      var on = v >= b[0] && v <= b[1];
      return '<path d="' + arc(b[0] + 0.6, b[1] - 0.6) + '" fill="none" stroke="' + b[2] + '" stroke-opacity="' + (on ? 1 : 0.35) + '" stroke-width="' + STROKE + '"/>';
    }).join('');
    // A ring on the arc marks the value, so nothing crosses the big number in the middle.
    return '<svg viewBox="0 0 760 380" width="760" height="380">' + arcs +
      '<circle cx="' + m[0].toFixed(1) + '" cy="' + m[1].toFixed(1) + '" r="' + (STROKE / 2 + 8) + '" fill="#000" stroke="#f3f5f9" stroke-width="9"/>' +
      '<text x="' + (CX - R) + '" y="' + (CY + 40) + '" text-anchor="middle" font-size="24" fill="#7d8699">0</text>' +
      '<text x="' + (CX + R) + '" y="' + (CY + 40) + '" text-anchor="middle" font-size="24" fill="#7d8699">100</text></svg>' +
      '<div class="ns-val num">' + v + '</div>';
  }

  function stat(id, label) {
    return '<div class="ns-row"><div class="ns-label">' + label + '</div><div class="ns-right"><div class="ns-v num waiting" id="' + id + '">—</div><div class="ns-ch" id="' + id + '-ch">&nbsp;</div></div></div>';
  }

  F.register({
    id: 'mood',
    color: '#f08a3c',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#f08a3c" fill-opacity=".14"/><path d="M10 31a14 14 0 0 1 8-12.6" fill="none" stroke="#e0324f" stroke-width="4" stroke-linecap="round"/><path d="M21 17.3a14 14 0 0 1 6 0" fill="none" stroke="#6b7385" stroke-width="4" stroke-linecap="round"/><path d="M30 18.4A14 14 0 0 1 38 31" fill="none" stroke="#2fbf6f" stroke-width="4" stroke-linecap="round"/><path d="M24 31l6-9" stroke="#f3f5f9" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="31" r="2.6" fill="#f3f5f9"/></svg>',
    strings: {
      en: {
        'mood.title': 'Market mood', 'mood.desc': 'Fear and greed in crypto, plus exchange rates and gold in your currency',
        'mood.gauge': 'Fear and greed in the crypto market', 'mood.30d': 'last 30 days',
        'mood.Extreme Fear': 'extreme fear', 'mood.Fear': 'fear', 'mood.Neutral': 'neutral', 'mood.Greed': 'greed', 'mood.Extreme Greed': 'extreme greed',
        'mood.crypto': 'Crypto', 'mood.markets': 'Markets', 'mood.cap': 'All crypto', 'mood.dom': 'Bitcoin’s share', 'mood.ofAll': 'of the market', 'mood.in24': 'in 24 h',
        'mood.rates': 'ECB rates, {d}', 'mood.gold': 'Gold per gram', 'mood.day': 'day',
        'mood.fng': 'fear and greed', 'mood.src': 'alternative.me, CoinGecko, ECB, gold-api.com'
      },
      pl: {
        'mood.title': 'Nastroje rynku', 'mood.desc': 'Strach i chciwość na rynku krypto, do tego kursy walut i złoto',
        'mood.gauge': 'Strach i chciwość na rynku krypto', 'mood.30d': 'ostatnie 30 dni',
        'mood.Extreme Fear': 'skrajny strach', 'mood.Fear': 'strach', 'mood.Neutral': 'neutralnie', 'mood.Greed': 'chciwość', 'mood.Extreme Greed': 'skrajna chciwość',
        'mood.crypto': 'Kryptowaluty', 'mood.markets': 'Rynki', 'mood.cap': 'Całe krypto', 'mood.dom': 'Udział bitcoina', 'mood.ofAll': 'całego rynku', 'mood.in24': 'w 24 h',
        'mood.rates': 'Kursy EBC z {d}', 'mood.gold': 'Złoto za gram', 'mood.day': 'dzień',
        'mood.fng': 'strach i chciwość', 'mood.src': 'alternative.me, CoinGecko, EBC, gold-api.com'
      }
    },
    css: [
      '.ns { display: grid; grid-template-columns: 820px 1fr; grid-column-gap: 88px; padding-top: 10px; }',
      '.ns-title { font-size: 32px; color: var(--muted); margin-bottom: 18px; }',
      '.ns-gauge { position: relative; width: 760px; height: 380px; }',
      '.ns-val { position: absolute; left: 0; right: 0; top: 176px; text-align: center; font-size: 170px; font-weight: 800; letter-spacing: -4px; line-height: 1; }',
      '.ns-class { text-align: center; width: 760px; font-size: 56px; font-weight: 600; margin-top: 4px; }',
      '.ns-hist { margin-top: 34px; width: 760px; } .ns-hl { font-size: 22px; color: var(--muted); margin-bottom: 8px; }',
      '.ns-spark { width: 760px; height: 110px; display: block; overflow: visible; }',
      '.ns-sec { font-size: 26px; color: var(--muted); margin: 22px 0 6px; } .ns-sec:first-child { margin-top: 0; }',
      '.ns-row { display: flex; justify-content: space-between; align-items: center; height: 92px; border-top: 1px solid var(--rule); }',
      '.ns-label { font-size: 40px; font-weight: 600; white-space: nowrap; } .ns-right { text-align: right; }',
      '.ns-v { font-size: 52px; font-weight: 800; letter-spacing: -1px; line-height: 1.05; white-space: nowrap; } .ns-ch { font-size: 22px; color: var(--muted); }'
    ].join('\n'),

    start: function (root, F) {
      var $ = F.$, fmt = F.fmt, missing = {}, first = true;
      var cur = Settings.get('currency');
      var shown = RATES.filter(function (c) { return c !== cur; }).slice(0, 4);

      root.innerHTML = '<div class="ns">' +
        '<div class="ns-left"><div class="ns-title">' + t('mood.gauge') + '</div><div id="ns-gauge" class="ns-gauge"></div>' +
        '<div class="ns-class" id="ns-class">&nbsp;</div><div class="ns-hist"><div class="ns-hl">' + t('mood.30d') + '</div><svg id="ns-spark" class="ns-spark"></svg></div></div>' +
        '<div class="ns-col">' +
        '<div class="ns-sec">' + t('mood.markets') + '</div>' + stat('ns-cap', t('mood.cap')) + stat('ns-dom', t('mood.dom')) + stat('ns-gold', t('mood.gold')) +
        '<div class="ns-sec" id="ns-rates-sec">&nbsp;</div>' +
        shown.map(function (c) { return stat('ns-' + c, t('a.fx.' + c)); }).join('') +
        '</div></div>';

      function setStat(id, text, change, unit) {
        var el = $(id);
        el.className = 'ns-v num';
        el.textContent = text;
        var ch = $(id + '-ch');
        if (change === null || change === undefined) { ch.innerHTML = unit || '&nbsp;'; return; }
        ch.innerHTML = '<span class="' + (change >= 0 ? 'up' : 'down') + '">' + (change >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(change), 2) + '%</span> ' + (unit || '');
      }
      function gone(k) { return function () { missing[k] = true; }; }

      function refresh() {
        var fng = Data.json('https://api.alternative.me/fng/?limit=30', Data.HOUR).then(function (j) {
          var d = j.data, v = parseInt(d[0].value, 10);
          $('ns-gauge').innerHTML = gauge(v);
          var cls = $('ns-class');
          cls.textContent = t('mood.' + d[0].value_classification);
          cls.style.color = bandColour(v);
          F.spark($('ns-spark'), d.slice().reverse().map(function (x) { return parseInt(x.value, 10); }), bandColour(v), 760, 110, first);
          delete missing[t('mood.fng')];
        }).catch(gone(t('mood.fng')));

        var rest = Data.fx().then(function (fx) {
          var global = Data.json('https://api.coingecko.com/api/v3/global', 5 * Data.MIN).then(function (j) {
            var d = j.data;
            setStat('ns-cap', Currency.big(fx.usd(d.total_market_cap.usd), fx.code), d.market_cap_change_percentage_24h_usd, t('mood.in24'));
            setStat('ns-dom', fmt(d.market_cap_percentage.btc, 1) + '%', null, t('mood.ofAll'));
            delete missing[t('mood.crypto')];
          }).catch(gone(t('mood.crypto')));

          // Two most recent ECB days, for each rate and its change.
          var rates = Data.json('https://api.frankfurter.dev/v1/' + Data.addDays(Data.today(), -10) + '..?from=USD', Data.HOUR).then(function (j) {
            var days = Object.keys(j.rates).sort(), now = j.rates[days[days.length - 1]], prev = j.rates[days[days.length - 2]];
            function inCur(tbl, c) { var u = c === 'USD' ? 1 : tbl[c], mine = fx.code === 'USD' ? 1 : tbl[fx.code]; return mine / u; }
            shown.forEach(function (c) {
              var v = inCur(now, c), p = inCur(prev, c);
              setStat('ns-' + c, Currency.auto(v, fx.code), (v - p) / p * 100, t('mood.day'));
            });
            $('ns-rates-sec').textContent = t('mood.rates', { d: I18N.shortDate(days[days.length - 1]) });
            delete missing[t('core.fx')];
          }).catch(gone(t('core.fx')));

          var gold = Promise.all([Data.json('https://api.gold-api.com/price/XAU', 55000), Assets.cgPrices().catch(function () { return null; })]).then(function (r) {
            setStat('ns-gold', Currency.money(fx.usd(r[0].price) / Assets.TROY_OZ_G, fx.code, 2), r[1] ? r[1]['pax-gold'].usd_24h_change : null, t('a.24h'));
            delete missing[t('a.gold')];
          }).catch(gone(t('a.gold')));
          return Promise.all([global, rates, gold]);
        }, gone(t('core.fx')));

        return Promise.all([fng, rest]).then(function () { first = false; F.report(Object.keys(missing)); });
      }

      F.sources(t('mood.src'));
      refresh();
      F.every(refresh, 5 * Data.MIN);
    }
  });
})();
