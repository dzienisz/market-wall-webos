// Everything the board can show. Each asset knows how to fetch its price (in the viewer's currency), its change,
// and a short history for the sparkline. Settings → Board picks which ones, in this order.
var Assets = (function () {
  var TROY_OZ_G = 31.1034768;

  I18N.add({
    en: {
      'a.gold': 'Gold', 'a.silver': 'Silver', 'a.brent': 'Brent crude', 'a.fx.USD': 'US dollar', 'a.fx.EUR': 'Euro',
      'a.fx.GBP': 'British pound', 'a.fx.CHF': 'Swiss franc', 'a.fx.JPY': 'Japanese yen', 'a.fx.CNY': 'Chinese yuan',
      'a.24h': '24 h', 'a.session': 'session', 'a.day': 'day', 'a.days': '{n} days',
      'a.perOz': 'per ounce, {g} per gram', 'a.close': 'close {d}', 'a.ecb': 'ECB rate {d}', 'a.perBarrel': 'per barrel, {d}',
      'a.inUsd': '{v} in US dollars', 'a.points': 'points'
    },
    pl: {
      'a.gold': 'Złoto', 'a.silver': 'Srebro', 'a.brent': 'Ropa Brent', 'a.fx.USD': 'Dolar', 'a.fx.EUR': 'Euro',
      'a.fx.GBP': 'Funt', 'a.fx.CHF': 'Frank szwajcarski', 'a.fx.JPY': 'Jen', 'a.fx.CNY': 'Juan',
      'a.24h': '24 h', 'a.session': 'sesja', 'a.day': 'dzień', 'a.days': '{n} dni',
      'a.perOz': 'za uncję, {g} za gram', 'a.close': 'zamknięcie {d}', 'a.ecb': 'kurs EBC z {d}', 'a.perBarrel': 'za baryłkę, {d}',
      'a.inUsd': '{v} w dolarach', 'a.points': 'pkt'
    }
  });

  // ---- icons ----------------------------------------------------------------------------------------
  function disc(color, inner) {
    return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="' + color + '" fill-opacity=".16"/>' + inner + '</svg>';
  }
  function coin(color, label) {
    var size = label.length > 3 ? 8.5 : label.length > 2 ? 10 : 12;
    return disc(color, '<circle cx="24" cy="24" r="14" fill="' + color + '"/><text x="24" y="' + (24 + size * 0.36) + '" text-anchor="middle" font-size="' + size +
      '" font-weight="800" fill="#000" font-family="Bricolage, Arial">' + label + '</text>');
  }
  function bars(color) {
    return disc(color, '<path d="M15 14v20M24 17v18M33 12v18" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/><rect x="12" y="20" width="6" height="9" rx="1.5" fill="' + color +
      '"/><rect x="21" y="23" width="6" height="7" rx="1.5" fill="' + color + '" fill-opacity=".55"/><rect x="30" y="15" width="6" height="10" rx="1.5" fill="' + color + '"/>');
  }
  function note(color, symbol) {
    return disc(color, '<rect x="9" y="15" width="30" height="18" rx="3" fill="' + color + '"/><circle cx="24" cy="24" r="6.5" fill="#000" fill-opacity=".22"/><text x="24" y="28.2" text-anchor="middle" font-size="' +
      (symbol.length > 1 ? 7.5 : 11) + '" font-weight="800" fill="#000" font-family="Bricolage, Arial">' + symbol + '</text>');
  }
  var ICON = {
    btc: disc('#ff9f1c', '<circle cx="24" cy="24" r="14" fill="#ff9f1c"/><path d="M20 16.5h5.2a3.6 3.6 0 0 1 0 7.2H20zM20 23.7h6a3.7 3.7 0 0 1 0 7.4h-6zM20 16.5v14.6M22 14.2v2.3M25.4 14.2v2.3M22 31.1v2.4M25.4 31.1v2.4" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    gold: disc('#ffd23f', '<path d="M10 34h12l-2.2-7h-7.6zM26 34h12l-2.2-7h-7.6zM18 25h12l-2.2-7h-7.6z" fill="#ffd23f"/><path d="M14.5 29.5h4M30.5 29.5h4M22.5 20.5h4" stroke="#7a5a00" stroke-width="1.6" stroke-linecap="round"/>'),
    silver: disc('#a9c4ee', '<path d="M14 30v4c0 1.9 4.5 3.4 10 3.4s10-1.5 10-3.4v-4M14 24v4c0 1.9 4.5 3.4 10 3.4s10-1.5 10-3.4v-4M14 18v4c0 1.9 4.5 3.4 10 3.4s10-1.5 10-3.4v-4" fill="#a9c4ee" fill-opacity=".55" stroke="#a9c4ee" stroke-width="2"/><ellipse cx="24" cy="17.5" rx="10" ry="3.4" fill="#a9c4ee"/>'),
    barrel: disc('#e07a5f', '<rect x="15" y="11" width="18" height="26" rx="5" fill="#e07a5f"/><path d="M15 18h18M15 30h18" stroke="#000" stroke-opacity=".35" stroke-width="2"/><path d="M24 20c-2 3-3 4.4-3 5.6a3 3 0 0 0 6 0c0-1.2-1-2.6-3-5.6z" fill="#000" fill-opacity=".45"/>')
  };

  // ---- shared fetches -------------------------------------------------------------------------------
  var CG_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'binancecoin', 'dogecoin', 'cardano', 'pax-gold', 'kinesis-silver'];
  function cgPrices() {
    return Data.json('https://api.coingecko.com/api/v3/simple/price?ids=' + CG_IDS.join(',') + '&vs_currencies=usd&include_24hr_change=true', 55000);
  }
  function cgHistory(id, days) {
    return Data.json('https://api.coingecko.com/api/v3/coins/' + id + '/market_chart?vs_currency=usd&days=' + days + (days > 7 ? '&interval=daily' : ''), 30 * Data.MIN)
      .then(function (j) { return j.prices.map(function (p) { return p[1]; }); });
  }
  function fredRecent(id) { return Data.fred(id, Data.addDays(Data.today(), -45), null, 30 * Data.MIN); }
  function last2(rows) {
    var v = rows[rows.length - 1][1], prev = rows[rows.length - 2][1];
    return { v: v, change: (v - prev) / prev * 100, date: rows[rows.length - 1][0] };
  }

  // ---- kinds ----------------------------------------------------------------------------------------
  function crypto(id, cg, sym, color, name, icon) {
    return {
      id: id, kind: 'crypto', color: color, icon: icon || coin(color, sym), name: function () { return name; },
      quote: function (fx) {
        return cgPrices().then(function (j) {
          var p = j[cg].usd;
          return {
            value: p, text: Currency.auto(fx.usd(p), fx.code), change: j[cg].usd_24h_change, period: t('a.24h'),
            sub: fx.code === 'USD' ? sym : t('a.inUsd', { v: Currency.auto(p, 'USD') })
          };
        });
      },
      history: function () { return cgHistory(cg, 7).then(function (v) { return { values: v, label: t('a.days', { n: 7 }) }; }); }
    };
  }

  // Spot metals from gold-api.com. Its history is paid, so 24h change and the chart come from PAX Gold and
  // Kinesis Silver, tokens backed by one ounce each.
  function metal(id, sym, proxy, color, icon) {
    return {
      id: id, kind: 'metal', color: color, icon: icon, name: function () { return t('a.' + id); },
      quote: function (fx) {
        return Promise.all([Data.json('https://api.gold-api.com/price/' + sym, 55000), cgPrices().catch(function () { return null; })]).then(function (r) {
          var p = fx.usd(r[0].price);
          return {
            value: p, text: Currency.money(p, fx.code, p < 100 ? 2 : 0),
            change: r[1] ? r[1][proxy].usd_24h_change : null, period: t('a.24h'),
            sub: t('a.perOz', { g: Currency.auto(p / TROY_OZ_G, fx.code) })
          };
        });
      },
      history: function () { return cgHistory(proxy, 30).then(function (v) { return { values: v, label: t('a.days', { n: 30 }) }; }); }
    };
  }

  // Daily closes from FRED. Index points are the same in any currency; a price per barrel is converted.
  function fredAsset(id, series, color, icon, name, inCurrency) {
    return {
      id: id, kind: 'index', color: color, icon: icon, name: name,
      quote: function (fx) {
        return fredRecent(series).then(function (rows) {
          var q = last2(rows), v = inCurrency ? fx.usd(q.v) : q.v;
          return {
            value: v, text: inCurrency ? Currency.money(v, fx.code, 2) : I18N.fmt(v, 2), change: q.change, period: t('a.session'),
            sub: t(inCurrency ? 'a.perBarrel' : 'a.close', { d: I18N.shortDate(q.date) })
          };
        });
      },
      history: function () { return fredRecent(series).then(function (rows) { return { values: rows.slice(-22).map(function (r) { return r[1]; }), label: t('a.days', { n: 30 }) }; }); }
    };
  }

  // One unit of a foreign currency in the viewer's, at the ECB's daily reference rate.
  function fxAsset(code, symbol, color) {
    function series() {
      var to = Settings.get('currency');
      return Data.json('https://api.frankfurter.dev/v1/' + Data.addDays(Data.today(), -30) + '..?from=' + code + '&to=' + to, 30 * Data.MIN).then(function (j) {
        var days = Object.keys(j.rates).sort();
        return { days: days, values: days.map(function (d) { return j.rates[d][to]; }), to: to };
      });
    }
    return {
      id: 'fx-' + code.toLowerCase(), kind: 'fx', code: code, color: color, icon: note(color, symbol), name: function () { return t('a.fx.' + code); },
      quote: function () {
        return series().then(function (s) {
          var v = s.values[s.values.length - 1], prev = s.values[s.values.length - 2];
          return { value: v, text: Currency.auto(v, s.to), change: (v - prev) / prev * 100, period: t('a.day'), sub: t('a.ecb', { d: I18N.shortDate(s.days[s.days.length - 1]) }) };
        });
      },
      history: function () { return series().then(function (s) { return { values: s.values, label: t('a.days', { n: 30 }) }; }); }
    };
  }

  function fixed(n) { return function () { return n; }; }
  var LIST = [
    crypto('bitcoin', 'bitcoin', 'BTC', '#ff9f1c', 'Bitcoin', ICON.btc),
    crypto('ethereum', 'ethereum', 'ETH', '#8c9eff', 'Ethereum'),
    crypto('solana', 'solana', 'SOL', '#b77dff', 'Solana'),
    crypto('xrp', 'ripple', 'XRP', '#5ad1e6', 'XRP'),
    crypto('bnb', 'binancecoin', 'BNB', '#f3ba2f', 'BNB'),
    crypto('dogecoin', 'dogecoin', 'DOGE', '#d9b45a', 'Dogecoin'),
    crypto('cardano', 'cardano', 'ADA', '#5a8dff', 'Cardano'),
    metal('gold', 'XAU', 'pax-gold', '#ffd23f', ICON.gold),
    metal('silver', 'XAG', 'kinesis-silver', '#a9c4ee', ICON.silver),
    fredAsset('sp500', 'SP500', '#5a8dff', bars('#5a8dff'), fixed('S&P 500')),
    fredAsset('nasdaq', 'NASDAQCOM', '#3ddc97', bars('#3ddc97'), fixed('Nasdaq')),
    fredAsset('dow', 'DJIA', '#7fb2ff', bars('#7fb2ff'), fixed('Dow Jones')),
    fredAsset('nikkei', 'NIKKEI225', '#ff7a90', bars('#ff7a90'), fixed('Nikkei 225')),
    fredAsset('brent', 'DCOILBRENTEU', '#e07a5f', ICON.barrel, function () { return t('a.brent'); }, true),
    fxAsset('USD', '$', '#c77dff'),
    fxAsset('EUR', '€', '#6c9dff'),
    fxAsset('GBP', '£', '#ff8fab'),
    fxAsset('CHF', 'Fr', '#ff5c5c'),
    fxAsset('JPY', '¥', '#f6f1e9'),
    fxAsset('CNY', '元', '#ff6b4a')
  ];
  var BY_ID = {};
  LIST.forEach(function (a) { BY_ID[a.id] = a; });

  // The viewer's board, minus anything that makes no sense (the dollar priced in dollars) or no longer exists.
  function board() {
    var cur = Settings.get('currency');
    return (Settings.get('board') || []).map(function (id) { return BY_ID[id]; })
      .filter(function (a) { return a && !(a.kind === 'fx' && a.code === cur); });
  }

  return { LIST: LIST, byId: function (id) { return BY_ID[id]; }, board: board, ICON: ICON, TROY_OZ_G: TROY_OZ_G, cgPrices: cgPrices };
})();
