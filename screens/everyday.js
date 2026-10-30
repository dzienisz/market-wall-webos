// Everyday prices: big numbers in everyday units, one at a time. The Big Mac is priced for the viewer's
// currency from The Economist's Big Mac index; Polish viewers also get kebabs, Fiat Pandas and beer.
(function () {
  var ROTATE_MS = 10 * 1000;
  var BIGMAC_CSV = 'https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv';

  // One big flat illustration per unit, on the right of the number.
  var ART = {
    bigmac: '<svg viewBox="0 0 200 200"><path d="M30 90 Q30 36 100 36 Q170 36 170 90 Z" fill="#e0a04a"/><g fill="#fff3d6"><ellipse cx="70" cy="58" rx="4" ry="2.4"/><ellipse cx="100" cy="50" rx="4" ry="2.4"/><ellipse cx="128" cy="60" rx="4" ry="2.4"/><ellipse cx="86" cy="72" rx="4" ry="2.4"/><ellipse cx="116" cy="76" rx="4" ry="2.4"/></g><path d="M26 98 Q50 90 70 100 Q90 90 110 100 Q130 90 150 100 Q166 92 174 98 L174 106 L26 106 Z" fill="#5fbf4a"/><rect x="28" y="106" width="144" height="12" rx="4" fill="#ffd23f"/><rect x="30" y="118" width="140" height="26" rx="12" fill="#7a3b1e"/><path d="M30 150 L170 150 Q170 172 100 172 Q30 172 30 150 Z" fill="#e0a04a"/></svg>',
    kebab: '<svg viewBox="0 0 200 200"><path d="M40 60 Q100 20 160 60 L112 182 Q100 192 88 182 Z" fill="#d9a35b"/><path d="M52 66 Q100 36 148 66 L138 92 Q100 70 62 92 Z" fill="#5fbf4a"/><path d="M62 92 Q100 70 138 92 L130 112 Q100 94 70 112 Z" fill="#e8564a"/><path d="M70 112 Q100 94 130 112 L122 132 Q100 118 78 132 Z" fill="#8a4b2a"/><path d="M78 132 Q100 118 122 132 L114 150 Q100 140 86 150 Z" fill="#f2efe6"/><path d="M40 60 Q100 20 160 60" fill="none" stroke="#b9823f" stroke-width="8" stroke-linecap="round"/></svg>',
    panda: '<svg viewBox="0 0 200 200"><path d="M24 130 L34 92 Q38 78 54 76 L138 76 Q154 78 160 92 L176 120 L176 140 Q176 148 168 148 L32 148 Q24 148 24 140 Z" fill="#e8564a"/><path d="M48 92 L58 84 L96 84 L96 110 L42 110 Z" fill="#9fd3f5"/><path d="M104 84 L136 84 L152 110 L104 110 Z" fill="#9fd3f5"/><circle cx="60" cy="150" r="20" fill="#1b1f27"/><circle cx="60" cy="150" r="9" fill="#7d8699"/><circle cx="144" cy="150" r="20" fill="#1b1f27"/><circle cx="144" cy="150" r="9" fill="#7d8699"/><rect x="164" y="122" width="12" height="8" rx="2" fill="#ffd23f"/></svg>',
    ps5: '<svg viewBox="0 0 200 200"><path d="M46 70 Q100 56 154 70 Q182 78 186 120 Q190 156 166 158 Q150 160 136 136 L64 136 Q50 160 34 158 Q10 156 14 120 Q18 78 46 70 Z" fill="#eef1f7"/><path d="M64 120 L136 120 L136 136 L64 136 Z" fill="#1b1f27"/><circle cx="58" cy="98" r="14" fill="#1b1f27"/><g fill="#5a8dff"><circle cx="142" cy="86" r="6"/><circle cx="156" cy="100" r="6"/><circle cx="128" cy="100" r="6"/><circle cx="142" cy="114" r="6"/></g><circle cx="80" cy="126" r="8" fill="#7d8699"/><circle cx="120" cy="126" r="8" fill="#7d8699"/></svg>',
    beer: '<svg viewBox="0 0 200 200"><rect x="58" y="34" width="84" height="140" rx="16" fill="#3b8f4a"/><rect x="58" y="34" width="84" height="16" rx="8" fill="#c9ced8"/><rect x="58" y="160" width="84" height="14" rx="7" fill="#c9ced8"/><rect x="66" y="74" width="68" height="56" rx="8" fill="#f2efe6"/><path d="M84 92 L100 84 L116 92 L116 112 L100 120 L84 112 Z" fill="#ffd23f"/><rect x="78" y="40" width="20" height="5" rx="2.5" fill="#7d8699"/></svg>',
    live: '<svg viewBox="0 0 200 200"><g fill="#34e27a"><rect x="40" y="128" width="120" height="22" rx="6"/><rect x="48" y="104" width="120" height="22" rx="6" fill-opacity=".8"/><rect x="36" y="80" width="120" height="22" rx="6" fill-opacity=".6"/></g><circle cx="140" cy="58" r="30" fill="#ffd23f"/><path d="M140 44v28M126 58h28" stroke="#7a5a00" stroke-width="8" stroke-linecap="round"/></svg>'
  };

  // Units with their plural forms. Polish extras are rough shop prices in złoty, there for fun.
  var UNITS = {
    bigmac: { forms: { en: ['Big Mac', 'Big Macs'], pl: ['Big Mac', 'Big Maki', 'Big Maków'] } },
    kebab: { pln: 35, forms: { en: ['kebab', 'kebabs'], pl: ['kebab', 'kebaby', 'kebabów'] } },
    panda: { pln: 69000, forms: { en: ['Fiat Panda', 'Fiat Pandas'], pl: ['Fiat Panda', 'Fiaty Panda', 'Fiatów Panda'] } },
    ps5: { pln: 2300, forms: { en: ['PlayStation 5', 'PlayStation 5s'], pl: ['konsola PS5', 'konsole PS5', 'konsol PS5'] } },
    beer: { pln: 4.5, forms: { en: ['can of beer', 'cans of beer'], pl: ['puszka piwa', 'puszki piwa', 'puszek piwa'] } }
  };

  // The latest Big Mac price in a currency: { price, date } or null.
  function bigMac(code) {
    return Data.text(BIGMAC_CSV, 12 * Data.HOUR).then(function (csv) {
      var best = null;
      csv.split('\n').forEach(function (line) {
        var c = line.split(',');
        if (c[2] === code && (!best || c[0] > best.date)) best = { date: c[0], price: parseFloat(c[4]) };
      });
      return best;
    });
  }

  F.register({
    id: 'everyday',
    color: '#ff5c7a',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#ff5c7a" fill-opacity=".14"/><circle cx="24" cy="24" r="13" fill="none" stroke="#f3f5f9" stroke-width="2.4"/><circle cx="19.5" cy="21" r="1.8" fill="#f3f5f9"/><circle cx="28.5" cy="21" r="1.8" fill="#f3f5f9"/><path d="M18 27c1.6 3 4 4 6 4s4.4-1 6-4z" fill="#ff5c7a"/></svg>',
    strings: {
      en: {
        'everyday.title': 'In Big Macs', 'everyday.desc': 'Bitcoin, gold and a company’s profit counted in Big Macs',
        'ev.btc': 'One bitcoin is', 'ev.goldOz': 'An ounce of gold is', 'ev.goldKg': 'A kilogram bar of gold is',
        'ev.perMin': '{c} makes every minute', 'ev.year': '{c}’s yearly profit is', 'ev.live': 'Since you started watching, {c} has made',
        'ev.atBtc': 'bitcoin at {v}', 'ev.atGold': 'gold at {v} an ounce', 'ev.atProfit': '{c} net profit {y}: {v}', 'ev.going': 'and counting',
        'ev.unitBigmac': 'a Big Mac at {v} (The Economist, {d})', 'ev.unitPln': 'a {u} at about {v}',
        'ev.src': 'CoinGecko, gold-api.com, The Economist’s Big Mac index, annual reports'
      },
      pl: {
        'everyday.title': 'Przelicznik absurdu', 'everyday.desc': 'Bitcoin, złoto i zysk firmy w Big Macach, kebabach i Pandach',
        'ev.btc': 'Jeden bitcoin to', 'ev.goldOz': 'Uncja złota to', 'ev.goldKg': 'Kilogramowa sztabka złota to',
        'ev.perMin': '{c} zarabia na minutę', 'ev.year': 'Roczny zysk {c} to', 'ev.live': 'Odkąd tu patrzysz, {c} zarobiło na',
        'ev.atBtc': 'bitcoin po {v}', 'ev.atGold': 'złoto po {v} za uncję', 'ev.atProfit': 'zysk netto {c} za {y}: {v}', 'ev.going': 'i liczy dalej',
        'ev.unitBigmac': 'Big Mac po {v} (The Economist, {d})', 'ev.unitPln': '{u} po ok. {v}',
        'ev.src': 'CoinGecko, gold-api.com, indeks Big Maca The Economist, raporty roczne'
      }
    },

    html: '<div class="ab"><div class="ab-card" id="ab-card"><div class="ab-art" id="ab-art"></div><div class="ab-lead" id="ab-lead">&nbsp;</div><div class="ab-n num" id="ab-n">—</div><div class="ab-unit" id="ab-unit">&nbsp;</div><div class="ab-foot" id="ab-foot">&nbsp;</div></div><div class="ab-dots" id="ab-dots"></div></div>',
    css: [
      '.ab { position: relative; height: 840px; padding: 70px 0 0 40px; }',
      '.ab-art { position: absolute; right: 40px; top: 90px; width: 520px; height: 520px; }',
      '.ab-art svg { width: 520px; height: 520px; display: block; }',
      '.ab-card { transition: opacity .6s ease; }',
      '.ab-card.out { opacity: 0; }',
      '.ab-lead { font-size: 56px; color: var(--muted); }',
      '.ab-n { font-size: 300px; font-weight: 800; letter-spacing: -10px; line-height: .95; margin-top: 10px; white-space: nowrap; }',
      '.ab-unit { font-size: 92px; font-weight: 600; margin-top: 6px; }',
      '.ab-foot { font-size: 28px; color: var(--faint); margin-top: 36px; max-width: 1100px; }',
      '.ab-dots { position: absolute; left: 40px; bottom: 90px; }',
      '.ab-dots i { display: inline-block; width: 14px; height: 14px; border-radius: 7px; background: #262b35; margin-right: 12px; }',
      '.ab-dots i.on { width: 44px; background: var(--muted); }'
    ].join('\n'),

    start: function (root, F) {
      var $ = F.$, i = 0, openedAt = Date.now();
      var code = Settings.get('currency'), company = Companies.current();
      var fx = null, btc = null, goldOz = null, mac = null;

      // A unit's price in the viewer's currency, and how to say where it comes from.
      function unitPrice(key) {
        if (key === 'bigmac') return mac ? mac.price : null;
        return fx ? fx.from(UNITS[key].pln, 'PLN') : null;
      }
      function unitFoot(key) {
        if (key === 'bigmac') return t('ev.unitBigmac', { v: Currency.money(mac.price, code, 2), d: I18N.fullDate(mac.date) });
        return t('ev.unitPln', { u: I18N.unit(1, UNITS[key].forms), v: Currency.money(unitPrice(key), code, UNITS[key].pln < 100 ? 2 : 0) });
      }

      // Each fact: lead-in, amount in the viewer's currency (or 'live'), unit, colour, what the amount is, art.
      function facts() {
        var list = [], pl = code === 'PLN';
        var profit = company && fx ? fx.from(company.profit, company.currency) : null;
        var perSec = profit ? profit / (365 * 24 * 3600) : null;
        var atProfit = company && profit ? t('ev.atProfit', { c: company.name, y: company.year, v: Currency.big(profit, code) }) : '';
        if (btc) list.push([t('ev.btc'), btc, 'bigmac', '#ff9f1c', t('ev.atBtc', { v: Currency.money(btc, code, 0) })]);
        if (goldOz) list.push([t('ev.goldOz'), goldOz, 'bigmac', '#ffd23f', t('ev.atGold', { v: Currency.money(goldOz, code, 0) })]);
        if (perSec) list.push([t('ev.perMin', { c: company.name }), perSec * 60, 'bigmac', '#34e27a', atProfit]);
        if (pl && btc) list.push([t('ev.btc'), btc, 'kebab', '#ff9f1c', t('ev.atBtc', { v: Currency.money(btc, code, 0) })]);
        if (pl && goldOz) list.push([t('ev.goldKg'), goldOz * 1000 / Assets.TROY_OZ_G, 'panda', '#ffd23f', t('ev.atGold', { v: Currency.money(goldOz, code, 0) })]);
        if (pl && btc) list.push([t('ev.btc'), btc, 'ps5', '#ff9f1c', t('ev.atBtc', { v: Currency.money(btc, code, 0) })]);
        if (pl && profit) list.push([t('ev.year', { c: company.name }), profit, 'beer', '#34e27a', atProfit]);
        if (perSec) list.push([t('ev.live', { c: company.name }), 'live', pl ? 'kebab' : 'bigmac', '#34e27a', t('ev.going')]);
        return list.filter(function (f) { return unitPrice(f[2]); }).map(function (f) { f.perSec = perSec; return f; });
      }

      var liveTimer = null;
      function draw(f) {
        clearInterval(liveTimer);
        $('ab-lead').textContent = f[0];
        var n = $('ab-n'), price = unitPrice(f[2]);
        n.style.color = f[3];
        // Shrink long numbers (143 million beers) so they still fit the width.
        function setN(v) {
          var r = Math.round(v), text = I18N.fmt(r, 0);
          n.textContent = text;
          n.style.fontSize = Math.min(300, Math.floor(1080 / (text.length * 0.6))) + 'px';
          $('ab-unit').textContent = I18N.unit(r, UNITS[f[2]].forms);
        }
        if (f[1] === 'live') {
          var tickLive = function () { setN((Date.now() - openedAt) / 1000 * f.perSec / price); };
          tickLive();
          liveTimer = setInterval(tickLive, 500);
        } else setN(f[1] / price);
        $('ab-foot').textContent = f[4] + (f[1] === 'live' ? '' : ', ' + unitFoot(f[2]));
        $('ab-art').innerHTML = f[1] === 'live' ? ART.live : ART[f[2]];
      }

      function next() {
        var list = facts();
        if (!list.length) return;
        i = i % list.length;
        var f = list[i];
        $('ab-dots').innerHTML = list.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('');
        var card = $('ab-card');
        card.className = 'ab-card out';
        F.after(function () { draw(f); card.className = 'ab-card'; }, 600);
        i++;
      }

      function refresh() {
        var missing = [];
        return Data.fx().then(function (x) {
          fx = x;
          var a = Assets.cgPrices().then(function (j) { btc = fx.usd(j.bitcoin.usd); }).catch(function () { missing.push('Bitcoin'); });
          var b = Data.json('https://api.gold-api.com/price/XAU', 5 * Data.MIN).then(function (j) { goldOz = fx.usd(j.price); }).catch(function () { missing.push(t('a.gold')); });
          // Without a Big Mac price for this currency, use the US one converted.
          var c = bigMac(code).then(function (m) {
            if (m) { mac = m; return; }
            return bigMac('USD').then(function (u) { mac = { price: fx.usd(u.price), date: u.date }; });
          }).catch(function () { missing.push('Big Mac'); });
          return Promise.all([a, b, c]);
        }, function () { missing.push(t('core.fx')); }).then(function () { F.report(missing); });
      }

      F.sources(t('ev.src'));
      refresh().then(next);
      F.every(next, ROTATE_MS);
      F.every(refresh, 5 * Data.MIN);
      return function () { clearInterval(liveTimer); };
    }
  });
})();
