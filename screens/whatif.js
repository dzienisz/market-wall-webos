// What if: what money spent 1, 5 or 10 years ago would be worth today, in the viewer's currency at the ECB's
// rate of each day. The stake is a round sum in that currency (1 000 € / 100 000 ¥).
(function () {
  var HORIZONS = [10, 5, 1], ROTATE_MS = 20 * 1000, BAR_MAX = 680, VAL_W = 330;
  var ASSETS = [
    { key: 'btc', colour: '#ff9f1c' },
    { key: 'spx', colour: '#5a8dff' },
    { key: 'gold', colour: '#ffd23f' },
    { key: 'cash', colour: '#c77dff' },
    { key: 'mat', colour: '#7d8699' }
  ];

  // 2016-10-01 -> "Oct 2016" / "10.2016"
  function month(iso) { return I18N.fullDate(iso).replace(/^\d+[ .]/, ''); }
  function yearsAgo(n) { var d = new Date(); d.setFullYear(d.getFullYear() - n); return Data.ymd(d); }

  // First value on or after `iso`: markets are shut at weekends, so look ten days ahead.
  function fredOn(id, iso) {
    return Data.fred(id, iso, Data.addDays(iso, 10), Data.FOREVER).then(function (rows) { if (!rows.length) throw new Error('no data'); return rows[0][1]; });
  }
  function fredLatest(id) {
    var today = Data.today();
    return Data.fred(id, Data.addDays(today, -12), today, Data.HOUR).then(function (rows) { return rows[rows.length - 1][1]; });
  }
  // Gold in złoty per gram from the Polish central bank, the one keyless source with ten years of daily prices;
  // it's converted to the viewer's currency like everything else.
  function nbpGoldOn(iso) {
    return Data.json('https://api.nbp.pl/api/cenyzlota/' + iso + '/' + Data.addDays(iso, 10) + '/?format=json', Data.FOREVER)
      .then(function (j) { return j[0].cena; });
  }
  // What money kept since `then` is worth today: { keep: share of its buying power left, from, to } or null.
  // Yearly consumer prices from the World Bank for the currency's country; it has none for the euro area, so the
  // euro uses Eurostat's monthly HICP through FRED. A yearly series can't measure a one-year horizon (it would
  // compare a year with itself), so that one is left out.
  function inflation(code, then) {
    if (code === 'EUR') {
      return Data.fred('CP0000EZ19M086NEST', then.slice(0, 7) + '-01', null, Data.DAY).then(function (rows) {
        if (rows.length < 2) return null;
        var a = rows[0], b = rows[rows.length - 1];
        return { keep: a[1] / b[1], from: month(a[0]), to: month(b[0]) };
      });
    }
    return Data.json('https://api.worldbank.org/v2/country/' + Currency.country(code) + '/indicator/FP.CPI.TOTL?format=json&per_page=20', Data.DAY)
      .then(function (j) {
        var byYear = {}, years = [], y = then.slice(0, 4);
        j[1].forEach(function (r) { if (r.value !== null) { byYear[r.date] = r.value; years.push(r.date); } });
        years.sort();
        var latest = years[years.length - 1];
        return byYear[y] && y < latest ? { keep: byYear[y] / byYear[latest], from: y, to: latest } : null;
      });
  }
  // A source that fails leaves its row out instead of blanking the whole screen.
  function orNull(p) { return p.catch(function () { return null; }); }

  F.register({
    id: 'whatif',
    color: '#ffd23f',
    icon: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#ffd23f" fill-opacity=".14"/><path d="M16 12h16M16 36h16" stroke="#f3f5f9" stroke-width="2.6" stroke-linecap="round"/><path d="M18 12c0 7 12 7 12 12s-12 5-12 12M30 12c0 7-12 7-12 12s12 5 12 12" fill="none" stroke="#f3f5f9" stroke-width="2.2"/><path d="M20 33.5c1.5-2 6.5-2 8 0l1 2.5H19z" fill="#ffd23f"/></svg>',
    strings: {
      en: {
        'whatif.title': 'What if', 'whatif.desc': 'What money spent 1, 5 or 10 years ago would be worth today',
        'whatif.q': 'If you had spent {s} {when} on…', 'whatif.ago1': 'a year ago', 'whatif.agoN': '{n} years ago',
        'whatif.tab1': '1 year', 'whatif.tabN': '{n} years',
        'whatif.btc': 'Bitcoin', 'whatif.spx': 'S&amp;P 500', 'whatif.gold': 'Gold', 'whatif.cash.USD': 'US dollars', 'whatif.cash.EUR': 'Euros', 'whatif.mat': 'A mattress',
        'whatif.then': 'then {v}', 'whatif.thenPts': 'then {v} points', 'whatif.thenGram': 'then {v} per gram', 'whatif.infl': 'inflation {a}–{b}',
        'whatif.hist': 'historical prices', 'whatif.empty': 'Couldn’t load historical prices. Trying again with the next period, in 20 seconds.',
        'whatif.status': 'Up and down change the period', 'whatif.src': 'FRED (Coinbase; S&P 500 without dividends; Eurostat), NBP, ECB, World Bank'
      },
      pl: {
        'whatif.title': 'FOMO-metr', 'whatif.desc': 'Ile dziś byłyby warte pieniądze wydane rok, 5 albo 10 lat temu',
        'whatif.q': 'Gdybyś {when} wydał {s} na…', 'whatif.ago1': 'rok temu', 'whatif.agoN': '{n} lat temu',
        'whatif.tab1': '1 rok', 'whatif.tabN': '{n} lat',
        'whatif.btc': 'Bitcoin', 'whatif.spx': 'S&amp;P 500', 'whatif.gold': 'Złoto', 'whatif.cash.USD': 'Dolary', 'whatif.cash.EUR': 'Euro', 'whatif.mat': 'Materac',
        'whatif.then': 'wtedy {v}', 'whatif.thenPts': 'wtedy {v} pkt', 'whatif.thenGram': 'wtedy {v} za gram', 'whatif.infl': 'inflacja {a}–{b}',
        'whatif.hist': 'ceny historyczne', 'whatif.empty': 'Nie udało się pobrać cen historycznych. Spróbuję ponownie przy następnym okresie, za 20 sekund.',
        'whatif.status': 'Strzałki góra i dół zmieniają okres', 'whatif.src': 'FRED (Coinbase, S&P 500 bez dywidend, Eurostat), NBP, EBC, Bank Światowy'
      }
    },

    html: '<div class="fm-head"><div class="fm-q" id="fm-q">&nbsp;</div><div class="fm-tabs" id="fm-tabs"></div></div><div class="fm-rows" id="fm-rows"></div>',
    css: [
      '.fm-head { display: flex; justify-content: space-between; align-items: baseline; height: 110px; padding-top: 10px; }',
      '.fm-q { font-size: 46px; font-weight: 600; white-space: nowrap; } .fm-q span { color: var(--muted); font-weight: 400; }',
      '.fm-tabs { white-space: nowrap; } .fm-tabs span { display: inline-block; font-size: 28px; padding: 8px 24px; border-radius: 30px; color: var(--muted); margin-left: 12px; }',
      '.fm-tabs span.on { background: #f3f5f9; color: #000; font-weight: 600; }',
      '.fm-row { display: grid; grid-template-columns: 300px minmax(0, 1fr) 330px 300px; grid-column-gap: 32px; align-items: center; height: 124px; border-top: 1px solid var(--rule); }',
      '.fm-row:last-child { border-bottom: 1px solid var(--rule); }',
      '.fm-name { font-size: 46px; font-weight: 600; white-space: nowrap; } .fm-note { font-size: 22px; color: var(--muted); margin-top: 2px; white-space: nowrap; }',
      '.fm-bar { height: 34px; border-radius: 10px; transition: width 1s ease; min-width: 8px; }',
      '.fm-val { font-size: 64px; font-weight: 800; letter-spacing: -1.5px; text-align: right; white-space: nowrap; }',
      '.fm-ch { font-size: 36px; font-weight: 800; text-align: right; white-space: nowrap; }',
      '.fm-empty { font-size: 40px; color: var(--muted); padding-top: 120px; max-width: 1100px; line-height: 1.3; }'
    ].join('\n'),

    // Up/down picks a longer or shorter horizon and pauses the automatic rotation.
    onKey: function (k, KEY) {
      if (k !== KEY.UP && k !== KEY.DOWN) return false;
      if (this._move) this._move(k === KEY.UP ? -1 : 1);
      return true;
    },

    start: function (root, F) {
      var $ = F.$, fmt = F.fmt, h = 0, self = this, manual = false;
      var code = Settings.get('currency'), stake = Currency.stake(code), foreign = code === 'USD' ? 'EUR' : 'USD';
      function money(v) { return Currency.money(v, code, 0); }

      function tabs() {
        $('fm-tabs').innerHTML = HORIZONS.map(function (n, i) {
          return '<span class="' + (i === h ? 'on' : '') + '">' + (n === 1 ? t('whatif.tab1') : t('whatif.tabN', { n: n })) + '</span>';
        }).join('');
      }

      function show() {
        var n = HORIZONS[h], then = yearsAgo(n);
        tabs();
        $('fm-q').innerHTML = t('whatif.q', { s: money(stake), when: n === 1 ? t('whatif.ago1') : t('whatif.agoN', { n: n }) }) + ' <span>' + I18N.fullDate(then) + '</span>';
        return Promise.all([
          orNull(Data.rates()), orNull(Data.rates(then)),
          orNull(fredLatest('CBBTCUSD')), orNull(fredLatest('SP500')),
          orNull(Data.json('https://api.nbp.pl/api/cenyzlota/?format=json', Data.HOUR).then(function (j) { return j[0].cena; })),
          orNull(fredOn('CBBTCUSD', then)), orNull(fredOn('SP500', then)), orNull(nbpGoldOn(then)),
          orNull(inflation(code, then))
        ]).then(function (r) {
          var fxNow = r[0], fxThen = r[1], btcNow = r[2], spxNow = r[3], goldNow = r[4], btcThen = r[5], spxThen = r[6], goldThen = r[7], inf = r[8];
          if (!fxNow || !fxThen || !fxNow[code] || !fxThen[code]) throw new Error('fx');
          // Units of the viewer's currency per dollar, and per złoty (for NBP's gold), then and now.
          var perUsdNow = fxNow[code], perUsdThen = fxThen[code];
          var perPlnNow = perUsdNow / fxNow.PLN, perPlnThen = perUsdThen / fxThen.PLN;
          function grow(pThen, pNow) { return stake / pThen * pNow; }
          var values = {
            btc: btcNow && btcThen ? grow(btcThen * perUsdThen, btcNow * perUsdNow) : null,
            spx: spxNow && spxThen ? grow(spxThen * perUsdThen, spxNow * perUsdNow) : null,
            gold: goldNow && goldThen ? grow(goldThen * perPlnThen, goldNow * perPlnNow) : null,
            cash: grow(perUsdThen / fxThen[foreign], perUsdNow / fxNow[foreign]),
            mat: inf ? stake * inf.keep : null
          };
          var notes = {
            btc: btcThen ? t('whatif.then', { v: Currency.money(btcThen * perUsdThen, code, 0) }) : '',
            spx: spxThen ? t('whatif.thenPts', { v: fmt(spxThen, 0) }) : '',
            gold: goldThen ? t('whatif.thenGram', { v: Currency.money(goldThen * perPlnThen, code, 2) }) : '',
            cash: t('whatif.then', { v: Currency.auto(perUsdThen / fxThen[foreign], code) }),
            mat: inf ? t('whatif.infl', { a: inf.from, b: inf.to }) : ''
          };
          var list = ASSETS.filter(function (a) { return values[a.key] !== null; })
            .sort(function (a, b) { return values[b.key] - values[a.key]; });
          var lost = [];
          ['btc', 'spx', 'gold'].forEach(function (k) { if (values[k] === null) lost.push(t('whatif.' + k).replace('&amp;', '&')); });
          var max = values[list[0].key];
          $('fm-rows').innerHTML = list.map(function (a) {
            var v = values[a.key], ch = (v / stake - 1) * 100, text = money(v);
            var size = Math.min(64, Math.floor(VAL_W / (text.length * 0.56)));
            var name = a.key === 'cash' ? t('whatif.cash.' + foreign) : t('whatif.' + a.key);
            return '<div class="fm-row"><div><div class="fm-name">' + name + '</div><div class="fm-note">' + notes[a.key] + '</div></div>' +
              '<div><div class="fm-bar" style="width:' + Math.max(8, v / max * BAR_MAX).toFixed(0) + 'px;background:' + a.colour + '"></div></div>' +
              '<div class="fm-val num" style="font-size:' + size + 'px">' + text + '</div>' +
              '<div class="fm-ch num ' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '−') + fmt(Math.abs(ch), Math.abs(ch) < 10 ? 1 : 0) + '%</div></div>';
          }).join('');
          F.report(lost);
        }).catch(function () {
          F.report([t('whatif.hist')]);
          if (!$('fm-rows').children.length) $('fm-rows').innerHTML = '<div class="fm-empty">' + t('whatif.empty') + '</div>';
        });
      }

      self._move = function (d) {
        manual = true;
        h = Math.max(0, Math.min(HORIZONS.length - 1, h + d));
        show();
      };
      F.sources(t('whatif.src'));
      F.status(t('whatif.status'));
      show();
      F.every(function () { if (!manual) { h = (h + 1) % HORIZONS.length; show(); } }, ROTATE_MS);
      return function () { self._move = null; };
    }
  });
})();
