// Crypto map: the 24 largest coins as a treemap. Tile area is market cap, colour is the 24h change.
(function () {
  var W = 1728, H = 742, GAP = 4, COUNT = 24;
  // Stablecoins sit at ~0% and would be big grey tiles; wrapped/staked tokens duplicate BTC and ETH.
  var SKIP = /usd|^dai$|^buidl$|^figr|^xaut$|^paxg$/i;
  var SKIP_NAME = /wrapped|staked|bridged|restaked|liquid staking/i;

  // Squarified treemap (Bruls, Huizing, van Wijk): rows along the shorter side, keeping tiles close to square.
  function worst(row, side) {
    var s = 0, mx = 0, mn = Infinity;
    row.forEach(function (r) { s += r.a; if (r.a > mx) mx = r.a; if (r.a < mn) mn = r.a; });
    return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn));
  }
  function squarify(items, x, y, w, h) {
    var out = [], rest = items.slice();
    while (rest.length) {
      var side = Math.min(w, h), row = [rest[0]], i = 1;
      while (i < rest.length && worst(row.concat([rest[i]]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      rest = rest.slice(row.length);
      var sum = row.reduce(function (s, r) { return s + r.a; }, 0);
      if (w >= h) {
        var cw = sum / h, cy = y;
        row.forEach(function (r) { var rh = r.a / cw; out.push({ it: r, x: x, y: cy, w: cw, h: rh }); cy += rh; });
        x += cw; w -= cw;
      } else {
        var rh2 = sum / w, cx = x;
        row.forEach(function (r) { var rw = r.a / rh2; out.push({ it: r, x: cx, y: y, w: rw, h: rh2 }); cx += rw; });
        y += rh2; h -= rh2;
      }
    }
    return out;
  }

  // Dark, not bright: big colour fields that stay put for hours are what burns into an OLED.
  function mix(a, b, t_) { return Math.round(a + (b - a) * t_); }
  function colour(ch) {
    var k = Math.min(1, Math.abs(ch) / 8), base = [38, 43, 53];
    var to = ch >= 0 ? [27, 132, 82] : [168, 34, 62];
    return 'rgb(' + mix(base[0], to[0], k) + ',' + mix(base[1], to[1], k) + ',' + mix(base[2], to[2], k) + ')';
  }

  F.register({
    id: 'cryptomap',
    color: '#3ddc97',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#3ddc97" fill-opacity=".14"/><rect x="11" y="11" width="15" height="15" rx="2" fill="#3ddc97"/><rect x="28" y="11" width="9" height="9" rx="2" fill="#ff5c7a"/><rect x="28" y="22" width="9" height="4" rx="1.5" fill="#3ddc97" fill-opacity=".55"/><rect x="11" y="28" width="9" height="9" rx="2" fill="#ff5c7a" fill-opacity=".7"/><rect x="22" y="28" width="15" height="9" rx="2" fill="#3ddc97" fill-opacity=".8"/></svg>',
    strings: {
      en: {
        'cryptomap.title': 'Crypto map', 'cryptomap.desc': 'The 24 largest coins: size is market cap, colour is the 24 h change',
        'cryptomap.head': 'The whole crypto market <b>{cap}</b> ({ch} in 24 h), bitcoin <b>{btc}%</b> of it',
        'cryptomap.ranking': 'ranking', 'cryptomap.total': 'market total', 'cryptomap.src': 'CoinGecko, without stablecoins and wrapped tokens'
      },
      pl: {
        'cryptomap.title': 'Mapa krypto', 'cryptomap.desc': '24 największe kryptowaluty, wielkość to kapitalizacja, kolor to zmiana',
        'cryptomap.head': 'Cały rynek kryptowalut <b>{cap}</b> ({ch} w 24 h), z tego bitcoin <b>{btc}%</b>',
        'cryptomap.ranking': 'ranking', 'cryptomap.total': 'cały rynek', 'cryptomap.src': 'CoinGecko, bez stablecoinów i tokenów opakowanych'
      }
    },

    html: '<div class="mp-head" id="mp-head">&nbsp;</div><div class="mp-map" id="mp-map"></div>',
    css: [
      '.mp-head { font-size: 34px; color: var(--muted); height: 72px; padding-top: 8px; white-space: nowrap; }',
      '.mp-head b { color: var(--ink); font-weight: 600; }',
      '.mp-map { position: relative; width: 1728px; height: 742px; }',
      '.mp-t { position: absolute; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: #fff; }',
      '.mp-t img { border-radius: 50%; margin-bottom: 6px; }',
      '.mp-sym { font-weight: 800; line-height: 1; letter-spacing: -1px; }',
      '.mp-ch { font-weight: 600; opacity: .92; margin-top: 4px; }',
      '.mp-px { color: rgba(255,255,255,.65); margin-top: 2px; white-space: nowrap; }'
    ].join('\n'),

    start: function (root, F) {
      var fmt = F.fmt, $ = F.$, missing = {};

      function render(coins, fx) {
        var list = coins.filter(function (c) { return !SKIP.test(c.symbol) && !SKIP_NAME.test(c.name) && c.market_cap; }).slice(0, COUNT);
        var total = list.reduce(function (s, c) { return s + c.market_cap; }, 0);
        var items = list.map(function (c) { return { c: c, a: c.market_cap / total * W * H }; });
        $('mp-map').innerHTML = squarify(items, 0, 0, W, H).map(function (tile) {
          var c = tile.it.c, w = tile.w - GAP, h = tile.h - GAP, side = Math.min(w, h);
          var ch = c.price_change_percentage_24h || 0;
          // The ticker has to fit the tile's width as well as its size; one that can't stay readable is left out.
          var label = c.symbol.toUpperCase();
          var sym = Math.min(110, side * 0.26, w * 0.86 / (label.length * 0.62));
          var inner = '';
          if (side > 150 && c.image) inner += '<img src="' + c.image + '" width="' + Math.round(sym * 0.9) + '" height="' + Math.round(sym * 0.9) + '">';
          if (sym >= 18) inner += '<div class="mp-sym" style="font-size:' + Math.round(sym) + 'px">' + label + '</div>';
          if (side > 70 && sym >= 18) inner += '<div class="mp-ch num" style="font-size:' + Math.round(Math.max(16, sym * 0.42)) + 'px">' + (ch >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(ch), 1) + '%</div>';
          if (side > 200) inner += '<div class="mp-px num" style="font-size:' + Math.round(sym * 0.32) + 'px">' + Currency.auto(fx.usd(c.current_price), fx.code) + '</div>';
          return '<div class="mp-t" style="left:' + tile.x.toFixed(1) + 'px;top:' + tile.y.toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;background:' + colour(ch) + '">' + inner + '</div>';
        }).join('');
      }

      function refresh() {
        return Data.fx().then(function (fx) {
          var markets = Data.json('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=60&page=1', 55000)
            .then(function (j) { render(j, fx); delete missing[t('cryptomap.ranking')]; })
            .catch(function () { missing[t('cryptomap.ranking')] = true; });
          var global = Data.json('https://api.coingecko.com/api/v3/global', 5 * Data.MIN).then(function (j) {
            var d = j.data, ch = d.market_cap_change_percentage_24h_usd;
            $('mp-head').innerHTML = t('cryptomap.head', {
              cap: Currency.big(fx.usd(d.total_market_cap.usd), fx.code),
              ch: '<span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(ch), 2) + '%</span>',
              btc: fmt(d.market_cap_percentage.btc, 1)
            });
            delete missing[t('cryptomap.total')];
          }).catch(function () { missing[t('cryptomap.total')] = true; });
          return Promise.all([markets, global]);
        }).then(function () { F.report(Object.keys(missing)); }, function () { F.report([t('core.fx')]); });
      }

      F.sources(t('cryptomap.src'));
      refresh();
      F.every(refresh, 60 * 1000);
    }
  });
})();
